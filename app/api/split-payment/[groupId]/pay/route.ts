import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import Razorpay from "razorpay";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { SplitGroup, SplitMember } from "@/lib/types/split-payment";

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID!,
    key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// POST — create Razorpay order for a member's share
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ groupId: string }> },
) {
    try {
        const { groupId } = await context.params;
        const { memberIndex, paymentId, orderId, signature } = await request.json();

        // ── STEP 1: Create order (memberIndex provided, no paymentId) ──
        if (memberIndex !== undefined && !paymentId) {
            return await createMemberOrder(groupId, memberIndex, request);
        }

        // ── STEP 2: Verify payment (paymentId + orderId + signature provided) ──
        if (paymentId && orderId && signature) {
            return await verifyMemberPayment(groupId, memberIndex, paymentId, orderId, signature);
        }

        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    } catch (error) {
        console.error("Split pay error:", error);
        return NextResponse.json({ error: "Payment processing failed" }, { status: 500 });
    }
}

async function createMemberOrder(groupId: string, memberIndex: number, request: NextRequest) {
    // Auth check — member must be logged in
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
        return NextResponse.json({ error: "Login required to pay" }, { status: 401 });
    }
    const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
    const uid = decodedToken.uid;

    const groupRef = adminDb.collection("splitGroups").doc(groupId);
    const groupSnap = await groupRef.get();
    if (!groupSnap.exists) {
        return NextResponse.json({ error: "Group not found" }, { status: 404 });
    }

    const group = groupSnap.data() as SplitGroup;

    // Expiry check
    if (new Date() > new Date(group.expiresAt)) {
        return NextResponse.json({ error: "This split group has expired" }, { status: 410 });
    }

    if (group.status !== "pending") {
        return NextResponse.json({ error: `Group is ${group.status}` }, { status: 400 });
    }

    const member = group.members[memberIndex];
    if (!member) {
        return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    if (member.status === "paid") {
        return NextResponse.json({ error: "Already paid" }, { status: 400 });
    }

    // Create Razorpay order for member's share
    const amountInPaise = Math.round(member.amount * 100);
    const order = await razorpay.orders.create({
        amount: amountInPaise,
        currency: "INR",
        receipt: `split_${groupId}_${memberIndex}_${Date.now()}`,
    });

    // Save order id to member
    const updatedMembers = [...group.members];
    updatedMembers[memberIndex] = { ...member, orderId: order.id, uid };
    await groupRef.update({ members: updatedMembers });

    return NextResponse.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        memberName: member.name,
        memberAmount: member.amount,
    });
}

async function verifyMemberPayment(
    groupId: string,
    memberIndex: number,
    paymentId: string,
    orderId: string,
    signature: string,
) {
    // Verify Razorpay signature
    const crypto = await import("crypto");
    const body = `${orderId}|${paymentId}`;
    const expectedSig = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex");

    if (expectedSig !== signature) {
        return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const groupRef = adminDb.collection("splitGroups").doc(groupId);

    const result = await adminDb.runTransaction(async (tx) => {
        const groupSnap = await tx.get(groupRef);
        if (!groupSnap.exists) throw new Error("Group not found");

        const group = groupSnap.data() as SplitGroup;
        const member = group.members[memberIndex];

        if (!member || member.status === "paid") {
            throw new Error("Already paid or member not found");
        }

        // Mark member as paid
        const updatedMembers: SplitMember[] = group.members.map((m, i) =>
            i === memberIndex
                ? { ...m, status: "paid" as const, paymentId, paidAt: new Date().toISOString() }
                : m,
        );

        const newCollected = group.collectedAmount + member.amount;
        const allPaid = updatedMembers.every((m) => m.status === "paid");

        tx.update(groupRef, {
            members: updatedMembers,
            collectedAmount: newCollected,
            status: allPaid ? "confirmed" : "pending",
        });

        return { allPaid, group, updatedMembers, newCollected };
    });

    // If all paid → confirm booking in Turf document
    if (result.allPaid) {
        await confirmSplitBooking(groupId, result.group, paymentId);
    }

    return NextResponse.json({
        success: true,
        allPaid: result.allPaid,
        collectedAmount: result.newCollected,
        totalAmount: result.group.totalAmount,
        message: result.allPaid
            ? "All members paid! Booking confirmed."
            : `Payment received. Waiting for ${result.updatedMembers.filter((m) => m.status === "pending").length} more member(s).`,
    });
}

async function confirmSplitBooking(groupId: string, group: SplitGroup, lastPaymentId: string) {
    try {
        const turfRef = adminDb.collection("Turfs").doc(group.turfId);
        const turfSnap = await turfRef.get();
        if (!turfSnap.exists) return;

        const turfData = turfSnap.data() || {};
        let allSlots: Record<string, unknown>[] = [];
        if (Array.isArray(turfData.timeSlots)) {
            allSlots = turfData.timeSlots;
        } else if (turfData.timeSlots && typeof turfData.timeSlots === "object") {
            allSlots = Object.values(turfData.timeSlots);
        }

        // Replace blocked slots with confirmed slots
        const pricePerSlot = group.totalAmount / group.timeSlots.length;
        const commission = pricePerSlot * 0.05;
        const payout = pricePerSlot - commission;

        const updated = allSlots.map((s) => {
            const slot = s as { splitGroupId?: string; status?: string; timeSlot?: string };
            if (slot.splitGroupId === groupId && slot.status === "blocked") {
                return {
                    ...s,
                    status: "confirmed",
                    transactionId: lastPaymentId,
                    price: Math.round(pricePerSlot * 100) / 100,
                    commission: Math.round(commission * 100) / 100,
                    payout: Math.round(payout * 100) / 100,
                    paid: "Not Paid to Owner",
                    bookingDate: new Date().toISOString(),
                };
            }
            return s;
        });

        await turfRef.update({ timeSlots: updated });
    } catch (err) {
        console.error("Error confirming split booking:", err);
    }
}

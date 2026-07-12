import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { SplitGroup, SplitMember } from "@/lib/types/split-payment";
import { sendSplitPaymentEmail } from "@/lib/email/send-split-payment";

export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const decodedToken = await getAuth().verifySessionCookie(
      sessionCookie,
      true,
    );
    const organizerUid = decodedToken.uid;

    const {
      turfId,
      turfName,
      timeSlots,
      daySlot,
      monthSlot,
      totalAmount,
      members, // [{ name, phone, email, amount }] — includes organizer at [0]
    } = await request.json();

    if (!turfId || !timeSlots?.length || !members?.length || !totalAmount) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // 2. Check slot availability — no existing confirmed/pending/blocked booking
    const turfRef = adminDb.collection("Turfs").doc(turfId);
    const turfSnap = await turfRef.get();
    if (!turfSnap.exists) {
      return NextResponse.json({ error: "Turf not found" }, { status: 404 });
    }

    const turfData = turfSnap.data() || {};
    let existingBookings: {
      timeSlot?: string;
      monthSlot?: string;
      daySlot?: string;
      status?: string;
    }[] = [];
    if (Array.isArray(turfData.timeSlots)) {
      existingBookings = turfData.timeSlots;
    } else if (turfData.timeSlots && typeof turfData.timeSlots === "object") {
      existingBookings = Object.values(turfData.timeSlots);
    }

    const blockingStatuses = [
      "confirmed",
      "pending",
      "booked_offline",
      "blocked",
    ];
    const isConflict = timeSlots.some((slot: string) =>
      existingBookings.some(
        (b) =>
          b.timeSlot === slot &&
          b.monthSlot === monthSlot &&
          b.daySlot === daySlot &&
          blockingStatuses.includes(b.status || ""),
      ),
    );

    if (isConflict) {
      return NextResponse.json(
        { error: "One or more slots are already booked" },
        { status: 409 },
      );
    }

    // 3. Get organizer profile
    const organizerDoc = await adminDb
      .collection("users")
      .doc(organizerUid)
      .get();
    const organizerData = organizerDoc.data() || {};

    // 4. Build group document
    const splitCount = members.length;
    const perPersonAmount = Math.ceil(totalAmount / splitCount);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 60 * 1000); // 30 min TTL

    const groupMembers: SplitMember[] = members.map(
      (
        m: { name: string; phone: string; email?: string; amount: number },
        i: number,
      ) => ({
        uid: i === 0 ? organizerUid : undefined,
        name:
          m.name ||
          (i === 0 ? organizerData.name || "Organizer" : `Player ${i + 1}`),
        phone: m.phone,
        email: m.email || undefined,
        amount: m.amount || perPersonAmount,
        status: "pending" as const,
      }),
    );

    const groupRef = adminDb.collection("splitGroups").doc();
    const groupId = groupRef.id;

    const group: Omit<SplitGroup, "id"> = {
      turfId,
      turfName,
      timeSlots,
      daySlot,
      monthSlot,
      totalAmount,
      perPersonAmount,
      splitCount,
      organizerUid,
      organizerName: organizerData.name || "Organizer",
      organizerPhone: organizerData.mobile || members[0]?.phone || "",
      members: groupMembers,
      status: "pending",
      collectedAmount: 0,
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    };

    // 5. Block the slots in Turf document (status: "blocked")
    const blockedSlots = timeSlots.map((slot: string) => ({
      turfId,
      timeSlot: slot,
      daySlot,
      monthSlot,
      userUid: organizerUid,
      status: "blocked",
      splitGroupId: groupId,
      price: 0,
      transactionId: `split_${groupId}`,
      commission: 0,
      payout: 0,
      paid: "Not Paid to Owner",
      bookingDate: now.toISOString(),
    }));

    await adminDb.runTransaction(async (tx) => {
      tx.set(groupRef, group);
      tx.update(turfRef, {
        timeSlots: FieldValue.arrayUnion(...blockedSlots),
      });
    });

    // 6. Send one-click pay-link emails to all members with valid emails (fire-and-forget)
    const appBaseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      (request.nextUrl
        ? `${request.nextUrl.protocol}//${request.nextUrl.host}`
        : "");
    const payLink = `${appBaseUrl}/split-pay/${groupId}`;

    const emailTargets = groupMembers.filter(
      (m) => !!m.email && /\S+@\S+\.\S+/.test(m.email),
    );

    if (emailTargets.length > 0) {
      // Don't block the response on emails
      Promise.allSettled(
        emailTargets.map((m) =>
          sendSplitPaymentEmail({
            to: m.email!,
            memberName: m.name,
            organizerName: organizerData.name || "Your friend",
            turfName,
            timeSlots,
            daySlot,
            monthSlot,
            amount: m.amount,
            payLink,
            expiresAt: expiresAt.toISOString(),
          }),
        ),
      ).then((results) => {
        const failed = results.filter((r) => r.status === "rejected").length;
        if (failed > 0) {
          console.warn(
            `Split payment email: ${failed}/${results.length} failed`,
          );
        }
      });
    }

    return NextResponse.json(
      {
        groupId,
        group: { id: groupId, ...group },
        emailsSentTo: emailTargets.map((m) => m.email),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating split group:", error);
    return NextResponse.json(
      { error: "Failed to create split group" },
      { status: 500 },
    );
  }
}

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { validateApiKey, unauthorizedResponse, errorResponse, todayStr } from "../../../middleware";
import { resolveOwner, ownerNotFound } from "../../auth";

// POST /api/v1/owner/slot/toggle
// Body: { email, time, date, action: "block"|"unblock" }
export async function POST(request: NextRequest) {
    try {
        const ctx = await validateApiKey(request);
        if (!ctx) return unauthorizedResponse();

        const body = await request.json();
        const { email, time, date, action } = body;

        if (!email) return Response.json({ success: false, message: "email is required" }, { status: 400 });
        if (!time || !action || !["block", "unblock"].includes(action)) {
            return Response.json({ success: false, message: "Required: time, action ('block'|'unblock')" }, { status: 400 });
        }

        const owner = await resolveOwner(request, email);
        if (!owner) return ownerNotFound();

        const targetDateStr = date || todayStr();
        const targetDate = new Date(targetDateStr);
        const targetDay = targetDate.getDate();
        const targetMonth = targetDate.toLocaleString("en-US", { month: "short" });
        const monthSlot = `${targetDay} ${targetMonth}`;
        const daySlot = targetDate.toLocaleDateString("en-US", { weekday: "long" });

        const turfRef = adminDb.collection("Turfs").doc(owner.turfId);
        const turfSnap = await turfRef.get();
        if (!turfSnap.exists) return Response.json({ success: false, message: "Turf not found" }, { status: 404 });

        const turfData = turfSnap.data()!;
        let allSlots: Record<string, unknown>[] = [];
        if (Array.isArray(turfData.timeSlots)) allSlots = turfData.timeSlots;
        else if (turfData.timeSlots && typeof turfData.timeSlots === "object") allSlots = Object.values(turfData.timeSlots);

        const existing = allSlots.find((s) => {
            const ts = (s as { timeSlot?: string }).timeSlot || "";
            const ms = (s as { monthSlot?: string }).monthSlot || "";
            const parts = ms.trim().split(" ");
            if (parts.length !== 2) return false;
            return ts === time && parseInt(parts[0], 10) === targetDay && parts[1].toLowerCase() === targetMonth.toLowerCase();
        });

        const existingStatus = (existing as { status?: string } | undefined)?.status || "available";

        if (action === "block" && ["confirmed", "pending"].includes(existingStatus)) {
            return Response.json({ success: false, message: "Cannot block a slot that is already booked" }, { status: 422 });
        }
        if (action === "unblock" && existingStatus !== "blocked") {
            return Response.json({ success: false, message: "Slot is not blocked" }, { status: 422 });
        }

        if (action === "block") {
            if (existing) {
                const updated = allSlots.map((s) => {
                    const ts = (s as { timeSlot?: string }).timeSlot || "";
                    const ms = (s as { monthSlot?: string }).monthSlot || "";
                    const parts = ms.trim().split(" ");
                    if (parts.length !== 2) return s;
                    if (ts === time && parseInt(parts[0], 10) === targetDay && parts[1].toLowerCase() === targetMonth.toLowerCase()) {
                        return { ...s, status: "blocked" };
                    }
                    return s;
                });
                await turfRef.update({ timeSlots: updated });
            } else {
                await turfRef.update({
                    timeSlots: FieldValue.arrayUnion({
                        turfId: owner.turfId, timeSlot: time, daySlot, monthSlot,
                        userUid: `owner_${owner.ownerId}`, status: "blocked",
                        price: 0, transactionId: `block_${Date.now()}`,
                        commission: 0, payout: 0, paid: "Not Paid to Owner",
                        bookingDate: new Date().toISOString(), source: "owner_block",
                    }),
                });
            }
        } else {
            const filtered = allSlots.filter((s) => {
                const ts = (s as { timeSlot?: string }).timeSlot || "";
                const ms = (s as { monthSlot?: string }).monthSlot || "";
                const st = (s as { status?: string }).status || "";
                const parts = ms.trim().split(" ");
                if (parts.length !== 2) return true;
                return !(ts === time && parseInt(parts[0], 10) === targetDay && parts[1].toLowerCase() === targetMonth.toLowerCase() && st === "blocked");
            });
            await turfRef.update({ timeSlots: filtered });
        }

        return Response.json({
            success: true,
            message: `${time} — ${action === "block" ? "BLOCKED" : "UNBLOCKED"}`,
            slot: { time, status: action === "block" ? "blocked" : "available", date: targetDateStr },
        });
    } catch (error) {
        console.error("POST /api/v1/owner/slot/toggle error:", error);
        return errorResponse("Failed to toggle slot");
    }
}

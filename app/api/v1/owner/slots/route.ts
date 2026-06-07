import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { validateApiKey, unauthorizedResponse, errorResponse, formatDateLabel, todayStr } from "../../middleware";
import { resolveOwner, ownerNotFound, getBookingsForDate } from "../auth";

const SLOT_TIMES = ["6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM"];

// GET /api/v1/owner/slots?email=owner@venue.com&date=2026-05-23
export async function GET(request: NextRequest) {
    try {
        const ctx = await validateApiKey(request);
        if (!ctx) return unauthorizedResponse();

        const owner = await resolveOwner(request);
        if (!owner) return ownerNotFound();

        const date = request.nextUrl.searchParams.get("date") || todayStr();
        const targetDate = new Date(date);
        const targetDay = targetDate.getDate();
        const targetMonth = targetDate.toLocaleString("en-US", { month: "short" });

        const turfSnap = await adminDb.collection("Turfs").doc(owner.turfId).get();
        const turfData = turfSnap.data() || {};
        const dayBookings = getBookingsForDate(turfData.timeSlots, targetDay, targetMonth);

        const bookedMap: Record<string, { status: string; customer: string }> = {};
        dayBookings.forEach((b) => {
            const ts = (b as { timeSlot?: string }).timeSlot || "";
            const st = (b as { status?: string }).status || "";
            const cn = (b as { customerName?: string }).customerName || "";
            if (ts) bookedMap[ts] = { status: st, customer: cn };
        });

        let slotId = 1;
        const slots = SLOT_TIMES.map((time) => {
            const entry = bookedMap[time];
            let status = "available";
            let booked_by: string | undefined;
            if (entry) {
                if (["confirmed", "pending"].includes(entry.status)) { status = "booked"; booked_by = entry.customer || "Player"; }
                else if (entry.status === "blocked") status = "blocked";
            }
            return { id: slotId++, time, status, ...(booked_by ? { booked_by } : {}) };
        });

        return Response.json({ success: true, venue: owner.turfName, date, date_label: formatDateLabel(date), slots });
    } catch (error) {
        console.error("GET /api/v1/owner/slots error:", error);
        return errorResponse("Failed to fetch slots");
    }
}

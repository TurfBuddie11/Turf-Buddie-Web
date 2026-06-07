import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
    validateApiKey,
    unauthorizedResponse,
    notFoundResponse,
    errorResponse,
    formatDateLabel,
    todayStr,
} from "../../../middleware";

// Standard operating slots 6 AM – 9 PM
const SLOT_LABELS = [
    { time: "6 AM", start: "06:00", end: "07:00" },
    { time: "7 AM", start: "07:00", end: "08:00" },
    { time: "8 AM", start: "08:00", end: "09:00" },
    { time: "9 AM", start: "09:00", end: "10:00" },
    { time: "10 AM", start: "10:00", end: "11:00" },
    { time: "11 AM", start: "11:00", end: "12:00" },
    { time: "12 PM", start: "12:00", end: "13:00" },
    { time: "1 PM", start: "13:00", end: "14:00" },
    { time: "2 PM", start: "14:00", end: "15:00" },
    { time: "3 PM", start: "15:00", end: "16:00" },
    { time: "4 PM", start: "16:00", end: "17:00" },
    { time: "5 PM", start: "17:00", end: "18:00" },
    { time: "6 PM", start: "18:00", end: "19:00" },
    { time: "7 PM", start: "19:00", end: "20:00" },
    { time: "8 PM", start: "20:00", end: "21:00" },
];

// GET /api/v1/venues/:venueId/slots
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ venueId: string }> },
) {
    try {
        const ctx = await validateApiKey(request);
        if (!ctx) return unauthorizedResponse();

        const { venueId } = await context.params;
        const date = request.nextUrl.searchParams.get("date") || todayStr();

        const turfSnap = await adminDb.collection("Turfs").doc(venueId).get();
        if (!turfSnap.exists) return notFoundResponse("Venue not found");

        const turfData = turfSnap.data()!;

        // Parse existing bookings for this date
        let allBookings: Record<string, unknown>[] = [];
        if (Array.isArray(turfData.timeSlots)) {
            allBookings = turfData.timeSlots;
        } else if (turfData.timeSlots && typeof turfData.timeSlots === "object") {
            allBookings = Object.values(turfData.timeSlots);
        }

        const targetDate = new Date(date);
        const targetDay = targetDate.getDate();
        const targetMonth = targetDate.toLocaleString("en-US", { month: "short" });

        // Build a map: slotLabel → status
        const bookedMap: Record<string, string> = {};
        allBookings.forEach((b) => {
            const ms = (b as { monthSlot?: string }).monthSlot || "";
            const parts = ms.trim().split(" ");
            if (parts.length === 2) {
                const bDay = parseInt(parts[0], 10);
                const bMonth = parts[1];
                if (
                    bDay === targetDay &&
                    bMonth.toLowerCase() === targetMonth.toLowerCase()
                ) {
                    const ts = (b as { timeSlot?: string }).timeSlot || "";
                    const st = (b as { status?: string }).status || "";
                    if (ts) bookedMap[ts] = st;
                }
            }
        });

        // Build slot list with status
        let slotId = 1;
        const slots = SLOT_LABELS.map((s) => {
            // Match against "9 AM - 10 AM" format used in booking-flow
            const label12 = `${s.time} - ${SLOT_LABELS.find((x) => x.start === s.end)?.time || ""}`;
            const rawStatus = bookedMap[label12] || bookedMap[s.time] || "available";

            let status: "available" | "booked" | "blocked" = "available";
            if (["confirmed", "pending"].includes(rawStatus)) status = "booked";
            else if (rawStatus === "blocked") status = "blocked";

            return {
                id: slotId++,
                time: s.time,
                start: s.start,
                end: s.end,
                price: turfData.price || 800,
                status,
            };
        });

        return Response.json({
            success: true,
            venue: {
                id: venueId,
                name: turfData.name || "",
                sport: Array.isArray(turfData.sport) ? turfData.sport.join(", ") : turfData.sport || "",
                address: turfData.address || "",
            },
            date,
            date_label: formatDateLabel(date),
            slots,
        });
    } catch (error) {
        console.error("GET /api/v1/venues/:id/slots error:", error);
        return errorResponse("Failed to fetch slots");
    }
}

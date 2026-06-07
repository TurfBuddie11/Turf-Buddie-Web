import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import {
    validateApiKey,
    unauthorizedResponse,
    notFoundResponse,
    conflictResponse,
    errorResponse,
    formatDateLabel,
    generateRefCode,
    todayStr,
} from "../../../middleware";

// POST /api/v1/venues/:venueId/book
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ venueId: string }> },
) {
    try {
        const ctx = await validateApiKey(request);
        if (!ctx) return unauthorizedResponse();

        const { venueId } = await context.params;
        const body = await request.json();
        const { slot_id, customer_name, customer_phone, date } = body;

        // Validate required fields
        if (!slot_id || !customer_name || !customer_phone || !date) {
            return Response.json(
                { success: false, message: "Missing required fields: slot_id, customer_name, customer_phone, date" },
                { status: 400 },
            );
        }

        const turfRef = adminDb.collection("Turfs").doc(venueId);
        const turfSnap = await turfRef.get();
        if (!turfSnap.exists) return notFoundResponse("Venue not found");

        const turfData = turfSnap.data()!;

        // Standard slots list (same as slots route)
        const SLOT_LABELS = [
            { id: 1, time: "6 AM", start: "06:00", end: "07:00" },
            { id: 2, time: "7 AM", start: "07:00", end: "08:00" },
            { id: 3, time: "8 AM", start: "08:00", end: "09:00" },
            { id: 4, time: "9 AM", start: "09:00", end: "10:00" },
            { id: 5, time: "10 AM", start: "10:00", end: "11:00" },
            { id: 6, time: "11 AM", start: "11:00", end: "12:00" },
            { id: 7, time: "12 PM", start: "12:00", end: "13:00" },
            { id: 8, time: "1 PM", start: "13:00", end: "14:00" },
            { id: 9, time: "2 PM", start: "14:00", end: "15:00" },
            { id: 10, time: "3 PM", start: "15:00", end: "16:00" },
            { id: 11, time: "4 PM", start: "16:00", end: "17:00" },
            { id: 12, time: "5 PM", start: "17:00", end: "18:00" },
            { id: 13, time: "6 PM", start: "18:00", end: "19:00" },
            { id: 14, time: "7 PM", start: "19:00", end: "20:00" },
            { id: 15, time: "8 PM", start: "20:00", end: "21:00" },
        ];

        const slot = SLOT_LABELS.find((s) => s.id === Number(slot_id));
        if (!slot) return notFoundResponse("Slot not found");

        // Parse existing bookings to check conflict
        let allBookings: Record<string, unknown>[] = [];
        if (Array.isArray(turfData.timeSlots)) {
            allBookings = turfData.timeSlots;
        } else if (turfData.timeSlots && typeof turfData.timeSlots === "object") {
            allBookings = Object.values(turfData.timeSlots);
        }

        const targetDate = new Date(date);
        const targetDay = targetDate.getDate();
        const targetMonth = targetDate.toLocaleString("en-US", { month: "short" });
        const monthSlot = `${targetDay} ${targetMonth}`;
        const daySlot = targetDate.toLocaleDateString("en-US", { weekday: "long" });

        // Check if slot already booked/blocked for this date
        const isConflict = allBookings.some((b) => {
            const ms = (b as { monthSlot?: string }).monthSlot || "";
            const ts = (b as { timeSlot?: string }).timeSlot || "";
            const st = (b as { status?: string }).status || "";
            const parts = ms.trim().split(" ");
            if (parts.length !== 2) return false;
            const bDay = parseInt(parts[0], 10);
            const bMonth = parts[1];
            const sameDate =
                bDay === targetDay &&
                bMonth.toLowerCase() === targetMonth.toLowerCase();
            const sameSlot = ts === slot.time || ts.startsWith(slot.time);
            const blocking = ["confirmed", "pending", "blocked", "booked_offline"].includes(st);
            return sameDate && sameSlot && blocking;
        });

        if (isConflict) {
            return conflictResponse("Slot already booked", { slot: slot.time });
        }

        // Generate booking ref
        const refCode = generateRefCode();
        const paymentLink = `pay.turfbuddie.com/${refCode}`;
        const price = turfData.price || 800;

        // Write booking into Turfs.timeSlots array
        const newBooking = {
            turfId: venueId,
            timeSlot: slot.time,
            daySlot,
            monthSlot,
            userUid: `whatsapp_${customer_phone.replace(/\D/g, "")}`,
            status: "pending",
            paid: "Not Paid to Owner",
            price,
            transactionId: refCode,
            commission: Math.round(price * 0.05 * 100) / 100,
            payout: Math.round(price * 0.95 * 100) / 100,
            bookingDate: new Date().toISOString(),
            // WhatsApp booking extra fields
            customerName: customer_name,
            customerPhone: customer_phone,
            refCode,
            paymentLink,
            source: "whatsapp",
        };

        await turfRef.update({
            timeSlots: FieldValue.arrayUnion(newBooking),
        });

        const sport = Array.isArray(turfData.sport)
            ? turfData.sport.join(", ")
            : turfData.sport || "";

        return Response.json({
            success: true,
            message: "Booking confirmed",
            booking: {
                ref_code: refCode,
                venue: turfData.name || "",
                date,
                date_label: formatDateLabel(date),
                time: `${slot.start.replace(":", ":")} – ${slot.end.replace(":", ":")}`,
                time_label: slot.time,
                sport,
                price,
                payment_link: paymentLink,
                customer_name,
                customer_phone,
            },
        });
    } catch (error) {
        console.error("POST /api/v1/venues/:id/book error:", error);
        return errorResponse("Failed to create booking");
    }
}

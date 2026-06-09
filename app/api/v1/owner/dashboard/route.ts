import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { validateApiKey, unauthorizedResponse, errorResponse, formatDateLabel, todayStr } from "../../middleware";
import { resolveOwner, ownerNotFound, getBookingsForDate } from "../auth";

const SLOT_TIMES = ["6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "11 AM", "12 PM", "1 PM", "2 PM", "3 PM", "4 PM", "5 PM", "6 PM", "7 PM", "8 PM"];

// GET /api/v1/owner/dashboard?email=owner@venue.com&date=2026-05-23
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

        const realBookings = dayBookings.filter((b) =>
            ["confirmed", "pending"].includes((b as { status?: string }).status || ""),
        );

        const totalRevenue = realBookings.reduce((sum, b) => sum + ((b as { price?: number }).price || 0), 0);
        const paidCount = realBookings.filter((b) => (b as { status?: string }).status === "confirmed").length;
        const pendingCount = realBookings.length - paidCount;

        const bookedMap: Record<string, string> = {};
        dayBookings.forEach((b) => {
            const ts = (b as { timeSlot?: string }).timeSlot || "";
            const st = (b as { status?: string }).status || "";
            if (ts) bookedMap[ts] = st;
        });

        const slotsOverview = SLOT_TIMES.map((time) => {
            const raw = bookedMap[time] || "available";
            let status = "available";
            if (["confirmed", "pending"].includes(raw)) status = "booked";
            else if (raw === "blocked") status = "blocked";
            return { time, status };
        });

        const bookingsList = realBookings.map((b) => ({
            ref_code: (b as { refCode?: string; transactionId?: string }).refCode || (b as { transactionId?: string }).transactionId || "",
            customer: (b as { customerName?: string }).customerName || "Player",
            phone: (b as { customerPhone?: string }).customerPhone || "",
            time: (b as { timeSlot?: string }).timeSlot || "",
            price: (b as { price?: number }).price || 0,
            payment_status: (b as { status?: string }).status === "confirmed" ? "paid" : "pending",
        }));

        return Response.json({
            success: true,
            venue: owner.turfName,
            date,
            date_label: formatDateLabel(date),
            summary: { total_bookings: realBookings.length, total_revenue: totalRevenue, pending_payments: pendingCount, paid_payments: paidCount },
            bookings: bookingsList,
            slots_overview: slotsOverview,
        });
    } catch (error) {
        console.error("GET /api/v1/owner/dashboard error:", error);
        return errorResponse("Failed to fetch dashboard");
    }
}

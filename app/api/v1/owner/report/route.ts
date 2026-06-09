import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { validateApiKey, unauthorizedResponse, errorResponse, formatDateLabel, todayStr } from "../../middleware";
import { resolveOwner, ownerNotFound, getBookingsForDate } from "../auth";

// GET /api/v1/owner/report?email=owner@venue.com&date=2026-05-23
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
        const paidRevenue = realBookings.filter((b) => (b as { status?: string }).status === "confirmed")
            .reduce((sum, b) => sum + ((b as { price?: number }).price || 0), 0);
        const pendingRevenue = totalRevenue - paidRevenue;

        return Response.json({
            success: true,
            date,
            date_label: formatDateLabel(date),
            venue: owner.turfName,
            total_bookings: realBookings.length,
            total_revenue: totalRevenue,
            paid_revenue: paidRevenue,
            pending_revenue: pendingRevenue,
            bookings: realBookings.map((b) => ({
                ref_code: (b as { refCode?: string; transactionId?: string }).refCode || (b as { transactionId?: string }).transactionId || "",
                customer: (b as { customerName?: string }).customerName || "Player",
                phone: (b as { customerPhone?: string }).customerPhone || "",
                time: (b as { timeSlot?: string }).timeSlot || "",
                price: (b as { price?: number }).price || 0,
                payment_status: (b as { status?: string }).status === "confirmed" ? "paid" : "pending",
            })),
        });
    } catch (error) {
        console.error("GET /api/v1/owner/report error:", error);
        return errorResponse("Failed to fetch report");
    }
}

import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
    validateApiKey,
    unauthorizedResponse,
    errorResponse,
} from "../../middleware";

// GET /api/v1/player/bookings?phone=+919876543210
export async function GET(request: NextRequest) {
    try {
        const ctx = await validateApiKey(request);
        if (!ctx) return unauthorizedResponse();

        const phone = request.nextUrl.searchParams.get("phone");
        if (!phone) {
            return Response.json(
                { success: false, message: "phone query param is required" },
                { status: 400 },
            );
        }

        const normalizedPhone = phone.replace(/\s/g, "");

        // Search all Turfs for bookings matching this phone
        const turfsSnap = await adminDb.collection("Turfs").get();
        const bookings: Record<string, unknown>[] = [];

        turfsSnap.docs.forEach((doc) => {
            const data = doc.data();
            let slots: Record<string, unknown>[] = [];
            if (Array.isArray(data.timeSlots)) {
                slots = data.timeSlots;
            } else if (data.timeSlots && typeof data.timeSlots === "object") {
                slots = Object.values(data.timeSlots);
            }

            slots.forEach((s) => {
                const cp = (s as { customerPhone?: string }).customerPhone || "";
                if (cp.replace(/\s/g, "") === normalizedPhone) {
                    bookings.push({
                        ref_code: (s as { refCode?: string }).refCode || (s as { transactionId?: string }).transactionId || "",
                        venue: data.name || "",
                        date: (s as { bookingDate?: string }).bookingDate?.slice(0, 10) || "",
                        time: (s as { timeSlot?: string }).timeSlot || "",
                        price: (s as { price?: number }).price || 0,
                        payment_status: (s as { status?: string }).status === "confirmed" ? "paid" : "pending",
                        payment_link: (s as { paymentLink?: string }).paymentLink || "",
                    });
                }
            });
        });

        // Sort newest first
        bookings.sort((a, b) =>
            String(b.date || "").localeCompare(String(a.date || "")),
        );

        return Response.json({ success: true, bookings });
    } catch (error) {
        console.error("GET /api/v1/player/bookings error:", error);
        return errorResponse("Failed to fetch bookings");
    }
}

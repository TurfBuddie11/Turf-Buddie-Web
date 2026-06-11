import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

// Turf ke standard operating slots (9 AM - 9 PM, 13 slots)
const TOTAL_DAILY_SLOTS = 13;

export async function GET() {
    try {
        const turfsSnapshot = await adminDb.collection("Turfs").get();

        // Aaj ki date
        const today = new Date();
        const todayDay = today.getDate();
        const todayMonth = today.toLocaleString("en-US", { month: "short" });

        const turfs = await Promise.all(turfsSnapshot.docs.map(async (doc) => {
            const d = doc.data();

            // Turf ke timeSlots field se aaj ke booked slots count karo
            let bookedTodayCount = 0;
            const rawTimeSlots = d.timeSlots;
            let timeSlotArray: Record<string, unknown>[] = [];

            if (Array.isArray(rawTimeSlots)) {
                timeSlotArray = rawTimeSlots;
            } else if (rawTimeSlots && typeof rawTimeSlots === "object") {
                timeSlotArray = Object.values(rawTimeSlots);
            }

            timeSlotArray.forEach((slot) => {
                const monthSlot = (slot as { monthSlot?: string }).monthSlot || "";
                const status = ((slot as { status?: string }).status || "").toLowerCase();
                const parts = monthSlot.trim().split(" ");
                if (parts.length === 2) {
                    const slotDay = parseInt(parts[0], 10);
                    const slotMonth = parts[1];
                    const isToday =
                        slotDay === todayDay &&
                        slotMonth.toLowerCase() === todayMonth.toLowerCase();
                    const isBlocking = ["confirmed", "pending", "booked_offline", "blocked"].includes(status);
                    if (isToday && isBlocking) {
                        bookedTodayCount++;
                    }
                }
            });

            const availableSlotsToday = Math.max(0, TOTAL_DAILY_SLOTS - bookedTodayCount);

            return {
                id: doc.id,
                name: d.name || "",
                address: d.address || "",
                city: d.city || "",
                imageurl: d.imageurl || "",
                rating: d.rating || 0,
                price: d.price || 0,
                active: d.active !== false,
                sport: Array.isArray(d.sport) ? d.sport : d.sport ? [d.sport] : [],
                formats: Array.isArray(d.formats) ? d.formats : d.formats ? [d.formats] : [],
                amenities: Array.isArray(d.amenities) ? d.amenities : d.amenities ? [d.amenities] : [],
                availability: d.availability || "Open Now",
                coordinates: d.coordinates || "",
                availableSlotsToday,
                totalSlots: TOTAL_DAILY_SLOTS,
            };
        }));

        return NextResponse.json({ turfs }, { status: 200 });
    } catch (error) {
        console.error("Error fetching browse turfs:", error);
        return NextResponse.json({ error: "Failed to fetch turfs" }, { status: 500 });
    }
}

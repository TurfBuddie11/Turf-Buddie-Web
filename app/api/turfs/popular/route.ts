import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const turfsSnapshot = await adminDb.collection("Turfs").get();

    let bookingsSnapshot: FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    try {
      bookingsSnapshot = await adminDb.collection("Bookings").get();
    } catch {
      bookingsSnapshot = { docs: [], size: 0, empty: true } as unknown as FirebaseFirestore.QuerySnapshot<FirebaseFirestore.DocumentData>;
    }

    const bookingDataMap: Record<string, {
      count: number;
      slots: Record<string, number>;
    }> = {};

    bookingsSnapshot.docs.forEach((doc) => {
      const data = doc.data();
      const turfId = data.turfId;
      if (turfId) {
        if (!bookingDataMap[turfId]) {
          bookingDataMap[turfId] = { count: 0, slots: {} };
        }
        bookingDataMap[turfId].count += 1;
        const slot = data.timeSlot || "";
        if (slot) {
          bookingDataMap[turfId].slots[slot] = (bookingDataMap[turfId].slots[slot] || 0) + 1;
        }
      }
    });

    const turfs = turfsSnapshot.docs
      .map((doc) => {
        const turfData = doc.data();
        const bookingData = bookingDataMap[doc.id] || { count: 0, slots: {} };

        return {
          id: doc.id,
          name: turfData.name || "",
          address: turfData.address || "",
          city: turfData.city || "",
          imageurl: turfData.imageurl || "",
          rating: turfData.rating || 0,
          price: turfData.price || 0,
          active: turfData.active !== false,
          sport: turfData.sport || [],
          formats: turfData.formats || [],
          amenities: turfData.amenities || [],
          availability: turfData.availability || "Open Now",
          coordinates: turfData.coordinates || "",
          totalBookings: bookingData.count,
          totalBookingAmount: 0,
          totalCommission: 0,
          totalPayout: 0,
          avgBookingPrice: 0,
          slots: Object.keys(bookingData.slots).sort(),
          bookedSlots: bookingData.slots,
        };
      })
      .sort((a, b) => b.totalBookings - a.totalBookings)
      .slice(0, 6);

    return NextResponse.json({ turfs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching popular turfs:", error);
    return NextResponse.json(
      { error: "Failed to fetch popular turfs" },
      { status: 500 }
    );
  }
}

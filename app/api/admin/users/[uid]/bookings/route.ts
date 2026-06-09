import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  try {
    const { uid } = await params;

    if (!uid) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    const turfsSnapshot = await adminDb.collection("Turfs").get();
    const bookings: Record<string, unknown>[] = [];
    const now = new Date();

    for (const turfDoc of turfsSnapshot.docs) {
      const turfData = turfDoc.data();
      const timeSlotsObj = turfData.timeSlots || {};

      Object.values(timeSlotsObj).forEach((slot) => {
        const s = slot as Record<string, unknown>;
        if (s.userUid === uid) {
          const bookingDate = s.bookingDate as { _seconds?: number };
          const bookingDateObj = bookingDate?._seconds
            ? new Date(bookingDate._seconds * 1000)
            : new Date();

          bookings.push({
            id: s.transactionId || `${turfDoc.id}-${bookingDateObj.getTime()}`,
            turfId: turfDoc.id,
            turfName: turfData.name,
            timeSlot: s.timeSlot,
            price: s.price,
            date: bookingDateObj,
            monthSlot: s.monthSlot,
            daySlot: s.daySlot,
            status: s.status,
            transactionId: s.transactionId,
            paid: s.paid,
            payout: s.payout,
            commission: s.commission || s.commision,
          });
        }
      });
    }

    const upcomingBookings = bookings
      .filter((b) => b.date && (b.date as Date) >= now)
      .sort((a, b) => (a.date as Date).getTime() - (b.date as Date).getTime());

    const pastBookings = bookings
      .filter((b) => b.date && (b.date as Date) < now)
      .sort((a, b) => (b.date as Date).getTime() - (a.date as Date).getTime());

    return NextResponse.json({
      upcomingBookings,
      pastBookings,
      totalBookings: bookings.length,
    }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch bookings" }, { status: 500 });
  }
}

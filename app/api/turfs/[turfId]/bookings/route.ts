import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore"; // from admin SDK
import { adminDb } from "@/lib/firebase/admin"; // your admin firestore instance

type BookingSlot = {
  bookingDate?: Timestamp | string;
  daySlot?: string;
  monthSlot?: string;
  timeSlot?: string;
  userUid?: string;
  price?: number;
  status?: string;
  transactionId?: string;
  commission?: number;
  commision?: number; // typo retained for legacy compatibility
  payout?: number;
  paid?: string;
};

function parseBookingDate(booking: BookingSlot): Date | null {
  try {
    if (booking.bookingDate instanceof Timestamp) {
      return booking.bookingDate.toDate();
    }

    if (typeof booking.bookingDate === "string") {
      return new Date(booking.bookingDate);
    }

    if (booking.daySlot && booking.monthSlot) {
      const currentYear = new Date().getFullYear();
      const combinedDate = `${booking.monthSlot} ${currentYear}`;
      return new Date(combinedDate);
    }
  } catch (err) {
    console.log(err);
    console.warn("Failed to parse booking date:", booking);
  }
  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: { turfId: string } }
) {
  try {
    const { turfId } = context.params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!turfId || !date) {
      return NextResponse.json(
        { error: "Missing turfId or date parameter" },
        { status: 400 }
      );
    }

    const targetDate = new Date(date);
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    const selectedDate = new Date(targetDate.getTime() + IST_OFFSET);
    selectedDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const turfRef = adminDb.collection("Turfs").doc(turfId);
    const turfSnapshot = await turfRef.get();

    if (!turfSnapshot.exists) {
      return NextResponse.json(
        { error: `Turf with ID '${turfId}' not found.` },
        { status: 404 }
      );
    }

    const turfData = turfSnapshot.data() || {};
    const allBookingsInDoc = turfData.timeSlots || [];

    const dailyBookings = allBookingsInDoc.filter((booking: BookingSlot) => {
      const parsedDate = parseBookingDate(booking);
      if (!parsedDate) return false;

      const bookingIST = new Date(parsedDate.getTime() + IST_OFFSET);

      const isToday = bookingIST >= selectedDate && bookingIST <= endOfDay;
      const isBlockingStatus =
        booking.status &&
        ["confirmed", "pending", "booked_offline"].includes(booking.status);

      return isToday && isBlockingStatus;
    });

    const bookedSlots = dailyBookings
      .map((booking: BookingSlot) => booking.timeSlot)
      .filter(Boolean);

    return NextResponse.json({
      bookedSlots,
      bookings: dailyBookings,
    });
  } catch (error) {
    console.error("Error in bookings API:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings due to a server error." },
      { status: 500 }
    );
  }
}

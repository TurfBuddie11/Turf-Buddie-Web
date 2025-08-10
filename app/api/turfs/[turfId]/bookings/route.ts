import { NextRequest, NextResponse } from "next/server";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";

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
    // Case 1: bookingDate is Firestore Timestamp
    if (booking.bookingDate instanceof Timestamp) {
      return booking.bookingDate.toDate();
    }

    // Case 2: bookingDate is string or daySlot + monthSlot format
    if (typeof booking.bookingDate === "string") {
      return new Date(booking.bookingDate);
    }

    if (booking.daySlot && booking.monthSlot) {
      // Example: daySlot = "Monday", monthSlot = "21 Jul"
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
  { params }: { params: Promise<{ turfId: string }> }
) {
  try {
    const { turfId } = await params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");

    if (!turfId || !date) {
      return NextResponse.json(
        { error: "Missing turfId or date parameter" },
        { status: 400 }
      );
    }

    // Normalize date to IST start/end of day
    const targetDate = new Date(date);
    const IST_OFFSET = 5.5 * 60 * 60 * 1000; // 5h30m in ms
    const selectedDate = new Date(targetDate.getTime() + IST_OFFSET);
    selectedDate.setHours(0, 0, 0, 0);
    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const turfRef = doc(db, "Turfs", turfId);
    const turfSnapshot = await getDoc(turfRef);

    if (!turfSnapshot.exists()) {
      return NextResponse.json(
        { error: `Turf with ID '${turfId}' not found.` },
        { status: 404 }
      );
    }

    const turfData = turfSnapshot.data();
    const allBookingsInDoc = turfData.timeSlots || [];

    const dailyBookings = allBookingsInDoc.filter((booking: BookingSlot) => {
      const parsedDate = parseBookingDate(booking);
      if (!parsedDate) return false;

      // Apply IST offset for comparison
      const bookingIST = new Date(parsedDate.getTime() + IST_OFFSET);

      const isToday = bookingIST >= selectedDate && bookingIST <= endOfDay;
      const isBlockingStatus =
        booking.status &&
        [
          "confirmed",
          "pending",
          "booked_offline",
        ].includes(booking.status);

      return isToday && isBlockingStatus;
    });

    const bookedSlots = dailyBookings
      .map((booking: BookingSlot) => booking.timeSlot)
      .filter(Boolean);

    return NextResponse.json({
      bookedSlots,
      bookings: dailyBookings, // full data for UI if needed
    });
  } catch (error) {
    console.error("Error in bookings API:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings due to a server error." },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

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
  payout?: number;
  paid?: string;
};

function parseBookingDate(booking: BookingSlot): Date | null {
  try {
    if (booking.daySlot && booking.monthSlot) {
      const currentYear = new Date().getFullYear();
      const combinedDate = `${booking.monthSlot} ${currentYear}`;
      return new Date(combinedDate);
    }
  } catch (err) {
    console.warn("Failed to parse booking date:", booking, err);
  }
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const pathnameParts = request.nextUrl.pathname.split("/");
    const turfId = pathnameParts[pathnameParts.indexOf("turfs") + 1];

    const { searchParams } = request.nextUrl;
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

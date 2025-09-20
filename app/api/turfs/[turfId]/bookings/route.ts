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

function parseBookingDate(booking: BookingSlot, year: number): Date | null {
  try {
    if (booking.daySlot && booking.monthSlot) {
      const monthIndex = new Date(
        Date.parse(booking.monthSlot + " 1, 2000"),
      ).getMonth(); // Parse month name to index
      const day = parseInt(booking.daySlot, 10);
      if (!isNaN(monthIndex) && !isNaN(day)) {
        return new Date(year, monthIndex, day);
      }
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
    const dateParam = searchParams.get("date");

    if (!turfId || !dateParam) {
      return NextResponse.json(
        { error: "Missing turfId or date parameter" },
        { status: 400 },
      );
    }

    const targetDate = new Date(dateParam);
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth();
    const targetDay = targetDate.getDate();

    const turfRef = adminDb.collection("Turfs").doc(turfId);
    const turfSnapshot = await turfRef.get();

    if (!turfSnapshot.exists) {
      return NextResponse.json(
        { error: `Turf with ID '${turfId}' not found.` },
        { status: 404 },
      );
    }

    const turfData = turfSnapshot.data() || {};
    const allBookingsInDoc = turfData.timeSlots || [];

    const dailyBookings = allBookingsInDoc.filter((booking: BookingSlot) => {
      const parsedDate = parseBookingDate(booking, targetYear);
      if (!parsedDate) return false;

      const isSameDay =
        parsedDate.getFullYear() === targetYear &&
        parsedDate.getMonth() === targetMonth &&
        parsedDate.getDate() === targetDay;

      const isBlockingStatus =
        booking.status &&
        ["confirmed", "pending", "booked_offline"].includes(booking.status);

      return isSameDay && isBlockingStatus;
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
      { status: 500 },
    );
  }
}

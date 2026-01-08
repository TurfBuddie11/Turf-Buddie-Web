import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

type BookingSlot = {
  bookingDate?: Timestamp | { _seconds: number; _nanoseconds: number } | string;
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
    const targetDay = targetDate.getDate();
    const targetMonthName = targetDate.toLocaleString("en-US", {
      month: "short",
    });

    const turfRef = adminDb.collection("Turfs").doc(turfId);
    const turfSnapshot = await turfRef.get();

    if (!turfSnapshot.exists) {
      return NextResponse.json(
        { error: `Turf with ID '${turfId}' not found.` },
        { status: 404 },
      );
    }

    const turfData = turfSnapshot.data() || {};
    const allBookingsInDoc: BookingSlot[] = turfData.timeSlots || [];

    const dailyBookings = allBookingsInDoc.filter((booking: BookingSlot) => {
      if (!booking.monthSlot) return false;

      const parts = booking.monthSlot.trim().split(" ");
      if (parts.length !== 2) return false;

      const bookingDay = parseInt(parts[0], 10);
      const bookingMonth = parts[1];

      const isSameDay =
        bookingDay === targetDay &&
        bookingMonth.toLowerCase() === targetMonthName.toLowerCase();

      const status = booking.status?.toLowerCase() || "";
      const isBlockingStatus = [
        "confirmed",
        "pending",
        "booked_offline",
      ].includes(status);

      return isSameDay && isBlockingStatus;
    });

    const bookedSlots = dailyBookings
      .map((booking: BookingSlot) => booking.timeSlot)
      .filter((slot): slot is string => !!slot);

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

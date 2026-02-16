import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { Booking, WebhookBooking } from "@/lib/types/booking";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  try {
    const receivedSignature = request.headers.get("x-turfbuddie-signature");

    const rawBody = await request.text();

    const expectedSignature = crypto
      .createHmac("sha256", process.env.WEBHOOK_SECRET!)
      .update(rawBody)
      .digest("hex");

    if (!receivedSignature || receivedSignature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    const { date, turfId, timeSlot } = JSON.parse(rawBody);

    if (!turfId || !date || !timeSlot) {
      return NextResponse.json(
        { error: "Missing turfId or date or timeSlot parameter" },
        { status: 400 },
      );
    }

    const targetDate = new Date(date);
    const targetDay = targetDate.getDate();
    const targetMonthName = targetDate.toLocaleString("en-US", {
      month: "short",
    });

    const turfRef = adminDb.collection("Turfs").doc(turfId);

    await adminDb.runTransaction(async (transaction) => {
      const turfSnap = await transaction.get(turfRef);

      if (!turfSnap.exists) {
        throw new Error("TURF_NOT_FOUND");
      }

      const turfData = turfSnap.data() || {};
      const allBookings: Booking[] = turfData.timeSlots || [];

      const slotExists = allBookings.some((booking) => {
        if (!booking.monthSlot) return false;

        const parts = booking.monthSlot.trim().split(" ");
        if (parts.length !== 2) return false;

        const bookingDay = parseInt(parts[0], 10);
        const bookingMonth = parts[1];

        return (
          bookingDay === targetDay &&
          bookingMonth.toLowerCase() === targetMonthName.toLowerCase() &&
          booking.timeSlot === timeSlot
        );
      });

      if (slotExists) {
        throw new Error("SLOT_BOOKED");
      }

      const newBooking: WebhookBooking = {
        turfId,
        daySlot: String(targetDay),
        monthSlot: `${targetDay} ${targetMonthName}`,
        timeSlot,
        status: "blocked",
        bookingDate: Timestamp.now(),
      };

      transaction.update(turfRef, {
        timeSlots: [...allBookings, newBooking],
      });
    });

    return NextResponse.json({ success: true });
    //eslint-disable-next-line
  } catch (error: any) {
    if (error.message === "TURF_NOT_FOUND") {
      return NextResponse.json({ error: "Turf not found" }, { status: 404 });
    }

    console.error("Webhook transaction failed:", error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

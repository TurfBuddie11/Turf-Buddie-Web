import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import Razorpay from "razorpay";
import { Booking } from "@/lib/types/booking";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { paymentId, orderId, signature } = await request.json();

    if (!paymentId || !orderId || !signature) {
      return NextResponse.json(
        { error: "Missing required payment identifiers." },
        { status: 400 },
      );
    }

    // 1. Verify Razorpay signature
    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { verified: false, error: "Invalid payment signature." },
        { status: 400 },
      );
    }

    // 2. Fetch pending order from Firestore
    const pendingOrderRef = adminDb.collection("pendingOrders").doc(orderId);
    const pendingOrderDoc = await pendingOrderRef.get();

    if (!pendingOrderDoc.exists) {
      return NextResponse.json({
        verified: true,
        message: "Booking already processed or no pending order found.",
      });
    }

    const serverBookingData = pendingOrderDoc.data()!;
    const turfDocRef = adminDb
      .collection("Turfs")
      .doc(serverBookingData.turfId);
    const paymentDetails = await razorpay.payments.fetch(paymentId);

    // 3. Run Firestore transaction to confirm booking
    try {
      const newBookings = await adminDb.runTransaction(async (transaction) => {
        const turfDoc = await transaction.get(turfDocRef);
        if (!turfDoc.exists) throw new Error("Turf document not found.");

        const existingBookings: Booking[] = turfDoc.data()?.timeSlots || [];
        const requestedSlots: string[] = serverBookingData.timeSlots;

        const isConflict = requestedSlots.some((slotLabel) =>
          existingBookings.some(
            (existing) =>
              existing.timeSlot === slotLabel &&
              existing.monthSlot === serverBookingData.monthSlot &&
              existing.daySlot === serverBookingData.daySlot,
          ),
        );

        if (isConflict) throw new Error("SLOT_ALREADY_BOOKED");

        const totalAmount = serverBookingData.amount;
        const pricePerSlot = totalAmount / requestedSlots.length;
        const commission = pricePerSlot * 0.094;
        const payout = pricePerSlot - commission;

        const newBookingSlots: Booking[] = requestedSlots.map((slotLabel) => ({
          turfId: serverBookingData.turfId,
          daySlot: serverBookingData.daySlot,
          monthSlot: serverBookingData.monthSlot,
          userUid: serverBookingData.userUid,
          paid: serverBookingData.paid,
          timeSlot: slotLabel,
          price: Math.round(pricePerSlot * 100) / 100,
          transactionId: paymentId,
          status: "confirmed",
          bookingDate: new Date(paymentDetails.created_at * 1000),
          commission: Math.round(commission * 100) / 100,
          payout: Math.round(payout * 100) / 100,
        }));

        transaction.update(turfDocRef, {
          timeSlots: FieldValue.arrayUnion(...newBookingSlots),
        });
        transaction.delete(pendingOrderRef);

        return newBookingSlots;
      });

      return NextResponse.json({
        verified: true,
        booking: newBookings[0],
        bookings: newBookings,
      });
    } catch (error) {
      if (error instanceof Error && error.message === "SLOT_ALREADY_BOOKED") {
        await pendingOrderRef.delete();
        return NextResponse.json(
          {
            error:
              "One or more selected time slots are no longer available. Please contact support regarding your payment.",
          },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { error: "Verification failed.", details: errorMessage },
      { status: 500 },
    );
  }
}

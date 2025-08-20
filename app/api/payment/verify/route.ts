// app/api/payment/verify/route.ts

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
        { status: 400 }
      );
    }

    // 1. Verify the payment signature
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json(
        { verified: false, error: "Invalid payment signature." },
        { status: 400 }
      );
    }

    // 2. Fetch the pending order data from Firestore
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

    // 3. Run a Firestore transaction to check for conflicts and book atomically
    try {
      const newBookings = await adminDb.runTransaction(async (transaction) => {
        const turfDoc = await transaction.get(turfDocRef);
        if (!turfDoc.exists) {
          throw new Error("Turf document not found.");
        }

        const existingBookings: Booking[] = turfDoc.data()?.timeSlots || [];
        const requestedSlots: string[] = serverBookingData.timeSlots;

        // Check if any of the requested slots for the given date are already booked
        const isConflict = requestedSlots.some((requestedSlotLabel) =>
          existingBookings.some(
            (existingBooking) =>
              existingBooking.timeSlot === requestedSlotLabel &&
              existingBooking.monthSlot === serverBookingData.monthSlot &&
              existingBooking.daySlot === serverBookingData.daySlot
          )
        );

        if (isConflict) {
          // If a slot is already taken, throw a specific error to abort the transaction.
          throw new Error("SLOT_ALREADY_BOOKED");
        }

        // --- No conflict found, proceed to create the booking objects ---
        const totalAmount = serverBookingData.amount;
        const pricePerSlot = totalAmount / requestedSlots.length;
        const commissionPerSlot = pricePerSlot * 0.094; // 9.4% commission
        const payoutPerSlot = pricePerSlot - commissionPerSlot;

        const newBookingSlots: Booking[] = requestedSlots.map(
          (slotLabel: string) => ({
            // Properties from the original pending order
            turfId: serverBookingData.turfId,
            daySlot: serverBookingData.daySlot,
            monthSlot: serverBookingData.monthSlot,
            userUid: serverBookingData.userUid,
            paid: serverBookingData.paid,

            // Properties unique to this specific, confirmed slot booking
            timeSlot: slotLabel,
            price: Math.round(pricePerSlot * 100) / 100,
            transactionId: paymentId,
            status: "confirmed" as const,
            bookingDate: new Date(paymentDetails.created_at * 1000),
            commission: Math.round(commissionPerSlot * 100) / 100,
            payout: Math.round(payoutPerSlot * 100) / 100,
          })
        );

        // Perform writes within the transaction for atomicity
        transaction.update(turfDocRef, {
          timeSlots: FieldValue.arrayUnion(...newBookingSlots),
        });
        transaction.delete(pendingOrderRef);

        return newBookingSlots; // Return the created bookings on success
      });

      // If the transaction completes successfully:
      return NextResponse.json({
        verified: true,
        booking: newBookings[0],
        bookings: newBookings,
      });
    } catch (error) {
      // Catch errors from the transaction
      if (error instanceof Error) {
        if (error.message === "SLOT_ALREADY_BOOKED") {
          // REFUND LOGIC REMOVED AS REQUESTED

          // Clean up the now-failed pending order
          await pendingOrderRef.delete();

          return NextResponse.json(
            {
              error:
                "One or more selected time slots are no longer available. Please contact support regarding your payment.",
            },
            { status: 409 } // 409 Conflict
          );
        }
      }
      // Re-throw any other transaction errors (e.g., network issues, turf not found)
      throw error;
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return NextResponse.json(
      { error: "Verification failed.", details: errorMessage },
      { status: 500 }
    );
  }
}

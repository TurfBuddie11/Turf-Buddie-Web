import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { Booking } from "@/lib/types/booking";
import Razorpay from "razorpay";

// Initialize Razorpay client to fetch payment details
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  console.log("Payment verification request received.");
  try {
    const { paymentId, orderId, signature, bookingData } = await request.json();

    if (
      !paymentId ||
      !orderId ||
      !signature ||
      !bookingData ||
      !bookingData.turfId
    ) {
      return NextResponse.json(
        { error: "Missing required payment data or turfId." },
        { status: 400 }
      );
    }

    // 1. Verify Signature
    const body = orderId + "|" + paymentId;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === signature;

    if (isAuthentic) {
      const turfDocRef = adminDb.collection("Turfs").doc(bookingData.turfId);
      const pendingOrderRef = adminDb.collection("pendingOrders").doc(orderId);

      // 2. Check if booking already exists
      const turfDoc = await turfDocRef.get();
      if (turfDoc.exists) {
        const timeSlots = turfDoc.data()?.timeSlots || [];
        const alreadyExists = timeSlots.some(
          (slot: Booking) => slot.transactionId === paymentId
        );
        if (alreadyExists) {
          // If already confirmed, just ensure the pending order is deleted
          await pendingOrderRef.delete().catch(() => {});
          return NextResponse.json({
            verified: true,
            turfId: bookingData.turfId,
            message: "Booking already confirmed.",
          });
        }
      }

      // FIX: Fetch payment details to get the accurate creation time
      const paymentDetails = await razorpay.payments.fetch(paymentId);
      const paymentDate = new Date(paymentDetails.created_at * 1000);

      // 3. Prepare the final booking object
      const commission = bookingData.commission || bookingData.price * 0.094;
      const payout = bookingData.payout || bookingData.price - commission;

      const newBookingSlot = {
        daySlot: bookingData.daySlot,
        monthSlot: bookingData.monthSlot,
        timeSlot: bookingData.timeSlot,
        userUid: bookingData.userUid,
        price: bookingData.price,
        transactionId: paymentId,
        status: "confirmed",
        bookingDate: paymentDate, // Use accurate date
        commission: Math.round(commission * 1000) / 1000,
        payout: Math.round(payout * 1000) / 1000,
        paid: "Not Paid to Owner",
      };

      // 4. Use a batched write to update booking and delete pending order atomically
      const batch = adminDb.batch();
      batch.update(turfDocRef, {
        timeSlots: FieldValue.arrayUnion(newBookingSlot),
      });
      batch.delete(pendingOrderRef); // FIX: Delete the pending order
      await batch.commit();

      console.log(`Booking for ${orderId} verified and confirmed.`);
      return NextResponse.json({ verified: true, turfId: bookingData.turfId });
    } else {
      return NextResponse.json(
        { verified: false, error: "Invalid payment signature." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Overall payment verification error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

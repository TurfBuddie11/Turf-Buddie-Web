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

    const pendingOrderRef = adminDb.collection("pendingOrders").doc(orderId);
    const pendingOrderDoc = await pendingOrderRef.get();

    if (!pendingOrderDoc.exists) {
      return NextResponse.json({
        verified: true,
        message: "Booking already processed.",
      });
    }
    const serverBookingData = pendingOrderDoc.data()!;
    const turfDocRef = adminDb
      .collection("Turfs")
      .doc(serverBookingData.turfId);

    const turfDoc = await turfDocRef.get();
    if (
      turfDoc.exists &&
      turfDoc
        .data()
        ?.timeSlots?.some((s: Booking) => s.transactionId === paymentId)
    ) {
      await pendingOrderRef.delete().catch(() => {});
      return NextResponse.json({
        verified: true,
        message: "Booking already confirmed.",
      });
    }

    const paymentDetails = await razorpay.payments.fetch(paymentId);
    const price = serverBookingData.price;
    const commission = price * 0.094;
    const payout = price - commission;

    const newBookingSlot = {
      ...serverBookingData,
      price,
      transactionId: paymentId,
      status: "confirmed" as const,
      bookingDate: new Date(paymentDetails.created_at * 1000),
      commission: Math.round(commission * 1000) / 1000,
      payout: Math.round(payout * 1000) / 1000,
    };

    const batch = adminDb.batch();
    batch.update(turfDocRef, {
      timeSlots: FieldValue.arrayUnion(newBookingSlot),
    });
    batch.delete(pendingOrderRef);
    await batch.commit();

    return NextResponse.json({ verified: true, booking: newBookingSlot });
  } catch (error) {
    console.error("Payment verification error:", error);
    return NextResponse.json(
      { error: "Verification failed." },
      { status: 500 }
    );
  }
}

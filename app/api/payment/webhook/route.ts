import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { DocumentData, FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { Booking } from "@/lib/types/booking";

async function getBookingDetailsFromOrderId(
  orderId: string
): Promise<DocumentData | undefined> {
  const orderRef = adminDb.collection("pendingOrders").doc(orderId);
  const orderDoc = await orderRef.get();
  if (!orderDoc.exists) {
    console.log(
      `Webhook: No pending order found for orderId ${orderId}. It might have been processed already.`
    );
    return;
  }
  return orderDoc.data();
}

export async function POST(request: NextRequest) {
  const receivedSignature = request.headers.get("x-razorpay-signature");
  const body = await request.text();

  if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not defined");
  }

  // 1. Verify Webhook Signature
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (receivedSignature !== expectedSignature) {
    console.error("Invalid Webhook Signature");
    return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
  }

  try {
    const event = JSON.parse(body);

    if (event.event === "payment.captured") {
      const paymentEntity = event.payload.payment.entity;
      const paymentId = paymentEntity.id;
      const orderId = paymentEntity.order_id;
      const paymentDate = new Date(paymentEntity.created_at * 1000);

      const bookingData = await getBookingDetailsFromOrderId(orderId);
      if (!bookingData) {
        return NextResponse.json({
          status: "acknowledged",
          message: "Order already processed or not found.",
        });
      }

      const turfDocRef = adminDb.collection("Turfs").doc(bookingData.turfId);
      const pendingOrderRef = adminDb.collection("pendingOrders").doc(orderId);

      // 2. Check if booking already exists
      const turfDoc = await turfDocRef.get();
      if (turfDoc.exists) {
        const timeSlots = turfDoc.data()?.timeSlots || [];
        const alreadyExist = timeSlots.some(
          (slot: Booking) => slot.transactionId == paymentId
        );
        if (alreadyExist) {
          console.log(
            "Webhook: Booking already exists. Cleaning up pending order."
          );
          await pendingOrderRef.delete().catch(() => {});
          return NextResponse.json({
            verified: true,
            turfId: bookingData.turfId,
          });
        }
      }

      // 3. Prepare the final booking object
      const commission = bookingData.commision || bookingData.price * 0.094;
      const payout = bookingData.payout || bookingData.price - commission;

      const newBookingSlot = {
        daySlot: bookingData.daySlot,
        monthSlot: bookingData.monthSlot,
        timeSlot: bookingData.timeSlot,
        userUid: bookingData.userUid,
        price: bookingData.price,
        transactionId: paymentId,
        status: "confirmed",
        bookingDate: paymentDate, // Use accurate date from payload
        commission: Math.round(commission * 1000) / 1000,
        commision: Math.round(commission * 1000) / 1000, // Typo for consistency
        payout: Math.round(payout * 1000) / 1000,
        paid: "Not Paid to Owner",
      };

      // 4. BEST PRACTICE: Use a batched write for an atomic operation
      const batch = adminDb.batch();
      batch.update(turfDocRef, {
        timeSlots: FieldValue.arrayUnion(newBookingSlot),
      });
      batch.delete(pendingOrderRef);
      await batch.commit();

      console.log(`Webhook successfully processed order ${orderId}`);
      return NextResponse.json({ verified: true, turfId: bookingData.turfId });
    }

    return NextResponse.json({ status: "event_received" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

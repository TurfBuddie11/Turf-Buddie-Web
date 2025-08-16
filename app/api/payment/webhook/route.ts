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
  return orderDoc.exists ? orderDoc.data() : undefined;
}

export async function POST(request: NextRequest) {
  const receivedSignature = request.headers.get("x-razorpay-signature");
  const body = await request.text();

  try {
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (receivedSignature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    const event = JSON.parse(body);
    if (event.event === "payment.captured") {
      const paymentEntity = event.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      const serverBookingData = await getBookingDetailsFromOrderId(orderId);
      if (!serverBookingData) {
        return NextResponse.json({
          status: "acknowledged",
          message: "Order already processed or not found.",
        });
      }

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
        const pendingOrderRef = adminDb
          .collection("pendingOrders")
          .doc(orderId);
        await pendingOrderRef.delete().catch(() => {});
        return NextResponse.json({
          status: "acknowledged",
          message: "Booking already exists.",
        });
      }

      const price = serverBookingData.price;
      const commission = price * 0.094;
      const payout = price - commission;

      const newBookingSlot = {
        ...serverBookingData,
        transactionId: paymentId,
        status: "confirmed" as const,
        bookingDate: new Date(paymentEntity.created_at * 1000),
        commission: Math.round(commission * 1000) / 1000,
        payout: Math.round(payout * 1000) / 1000,
      };

      const pendingOrderRef = adminDb.collection("pendingOrders").doc(orderId);
      const batch = adminDb.batch();
      batch.update(turfDocRef, {
        timeSlots: FieldValue.arrayUnion(newBookingSlot),
      });
      batch.delete(pendingOrderRef);
      await batch.commit();
    }
    console.log("Webhook Payment Done");
    return NextResponse.json({ status: "event_received" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

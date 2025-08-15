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

  if (!orderDoc) {
    console.error(`Webhook Error: No data found for orderId ${orderId}`);
    return;
  }
  return orderDoc.data();
}

export async function POST(request: NextRequest) {
  console.log("Razorpay Webhook request recceived");
  const receivedSignature = request.headers.get("x-razorpay-signature");

  const body = await request.text();

  if (!receivedSignature) {
    return NextResponse.json(
      { error: "Unauthorised Request" },
      { status: 401 }
    );
  }

  if (!process.env.RAZORPAY_WEBHOOK_SECRET_KEY) {
    throw new Error("SECRET_KEY is not defined");
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
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

      const bookingData = await getBookingDetailsFromOrderId(orderId);

      if (!bookingData) {
        return NextResponse.json({ recieved: true });
      }

      const turfDocRef = adminDb.collection("Turfs").doc(bookingData.turfId);
      const turfDoc = await turfDocRef.get();
      if (turfDoc.exists) {
        const timeSlots = turfDoc.data()?.timeSlots || [];
        const alreadyExist = timeSlots.some(
          (slot: Booking) => slot.transactionId == paymentId
        );

        if (alreadyExist) {
          console.log("Webhook already exists. No action needed");
          return NextResponse.json({
            verified: true,
            turfId: bookingData.turfId,
          });
        }
      }

      const commision = bookingData.commision || bookingData.price * 0.094;
      const payout =
        bookingData.payout || bookingData.price - bookingData.commision;

      const newBookingSlot = {
        daySlot: bookingData.daySlot,
        monthSlot: bookingData.monthSlot,
        userUid: bookingData.userUid,
        transactionId: bookingData.transactionId,
        status: "confirmed",
        price: bookingData.price,
        bookingDate: new Date(paymentEntity.created_at * 1000),
        commision: commision,
        payout: payout,
        paid: "Not Paid to Owner",
      };

      await turfDocRef.update({
        timeSlots: FieldValue.arrayUnion(newBookingSlot),
      });

      return NextResponse.json({ veriried: true, turfId: bookingData.turfId });
    }
  } catch (error) {
    console.error("Error in processing webhhook:" + error);

    return NextResponse.json(
      { error: "Webhook handled failed" },
      { status: 500 }
    );
  }
}

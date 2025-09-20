import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { DocumentData } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { processBookingTransaction } from "@/lib/booking-service";

// Helper to fetch pending order details
async function getBookingDetailsFromOrderId(
  orderId: string,
): Promise<DocumentData | undefined> {
  const orderRef = adminDb.collection("pendingOrders").doc(orderId);
  const orderDoc = await orderRef.get();
  return orderDoc.exists ? orderDoc.data() : undefined;
}

export async function POST(request: NextRequest) {
  const receivedSignature = request.headers.get("x-razorpay-signature");
  const body = await request.text();

  try {
    // 1. Verify the webhook signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET!)
      .update(body)
      .digest("hex");

    if (receivedSignature !== expectedSignature) {
      return NextResponse.json({ error: "Invalid Signature" }, { status: 400 });
    }

    const event = JSON.parse(body);

    // 2. Process only when a payment is successfully captured
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

      // 3. Process the booking using the shared service
      const { success, error: bookingError } = await processBookingTransaction(
        orderId,
        paymentId,
        serverBookingData,
      );

      if (!success) {
        if (bookingError === "SLOT_ALREADY_BOOKED") {
          console.warn(
            `Webhook: Conflict detected for Order ID ${orderId}. Pending order deleted.`,
          );
        } else {
          console.error(
            `Webhook: Booking transaction failed for Order ID ${orderId}:`,
            bookingError,
          );
        }
      }
    }

    // 4. Acknowledge receipt of the event to Razorpay
    return NextResponse.json({ status: "event_received" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }
}

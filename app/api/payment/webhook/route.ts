import crypto from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { DocumentData, FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { Booking } from "@/lib/types/booking";

// Helper to fetch pending order details
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

      const turfDocRef = adminDb
        .collection("Turfs")
        .doc(serverBookingData.turfId);
      const pendingOrderRef = adminDb.collection("pendingOrders").doc(orderId);

      // 3. Use a Firestore transaction for atomic booking
      try {
        await adminDb.runTransaction(async (transaction) => {
          const turfDoc = await transaction.get(turfDocRef);
          if (!turfDoc.exists) {
            throw new Error("Turf document not found.");
          }

          const existingBookings: Booking[] = turfDoc.data()?.timeSlots || [];
          const requestedSlots: string[] = serverBookingData.timeSlots;

          // Check for booking conflicts
          const isConflict = requestedSlots.some((requestedSlotLabel) =>
            existingBookings.some(
              (existingBooking) =>
                existingBooking.timeSlot === requestedSlotLabel &&
                existingBooking.monthSlot === serverBookingData.monthSlot &&
                existingBooking.daySlot === serverBookingData.daySlot
            )
          );

          if (isConflict) {
            console.warn(
              `Webhook: Conflict detected for Order ID ${orderId}. Deleting pending order without booking.`
            );
            transaction.delete(pendingOrderRef);
            return; // Abort the booking part of the transaction
          }

          const totalAmount = serverBookingData.amount;
          const pricePerSlot = totalAmount / requestedSlots.length;
          const commissionPerSlot = pricePerSlot * 0.094;
          const payoutPerSlot = pricePerSlot - commissionPerSlot;

          const newBookingSlots: Booking[] = requestedSlots.map(
            (slotLabel: string) => ({
              turfId: serverBookingData.turfId,
              daySlot: serverBookingData.daySlot,
              monthSlot: serverBookingData.monthSlot,
              userUid: serverBookingData.userUid,
              paid: serverBookingData.paid,
              timeSlot: slotLabel,
              price: Math.round(pricePerSlot * 100) / 100,
              transactionId: paymentId,
              status: "confirmed" as const,
              bookingDate: new Date(paymentEntity.created_at * 1000),
              commission: Math.round(commissionPerSlot * 100) / 100,
              payout: Math.round(payoutPerSlot * 100) / 100,
            })
          );

          // Atomically update the turf document and delete the pending order
          transaction.update(turfDocRef, {
            timeSlots: FieldValue.arrayUnion(...newBookingSlots),
          });
          transaction.delete(pendingOrderRef);
        });
      } catch (error) {
        console.error(
          `Webhook: Transaction failed for Order ID ${orderId}:`,
          error
        );
      }
    }

    // 4. Acknowledge receipt of the event to Razorpay
    return NextResponse.json({ status: "event_received" });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

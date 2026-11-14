import { adminDb } from "@/lib/firebase/admin";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";
import { getRequestUid } from "@/lib/auth/request-user";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const uid = await getRequestUid(request);
    if (!uid) {
      return NextResponse.json(
        { error: "Please login again to continue." },
        { status: 401 },
      );
    }

    const { amount, bookingDetails } = await request.json();

    if (!amount || isNaN(amount) || amount <= 0 || !bookingDetails) {
      return NextResponse.json(
        { error: "Invalid amount or missing booking details" },
        { status: 400 },
      );
    }

    // Attach authenticated UID to booking details
    bookingDetails.userUid = uid;

    const amountInPaise = Math.round(parseFloat(amount) * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const pendingOrderRef = adminDb.collection("pendingOrders").doc(order.id);
    await pendingOrderRef.set({
      ...bookingDetails,
      amount,
      createdAt: new Date().toISOString(), // Optional: for TTL or audit
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Failed to create payment order" },
      { status: 500 },
    );
  }
}

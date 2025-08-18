// app/api/payment/create-order/route.ts

import { adminDb } from "@/lib/firebase/admin";
import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
  key_secret: process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET!,
});

export async function POST(request: NextRequest) {
  try {
    const { amount, bookingDetails } = await request.json();

    if (!amount || isNaN(amount) || amount <= 0 || !bookingDetails) {
      return NextResponse.json(
        { error: "Invalid amount or missing booking details" },
        { status: 400 }
      );
    }
    const amountInPaise = Math.round(parseFloat(amount) * 100);

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    // Create the secure pending order document in Firestore
    const pendingOrderRef = adminDb.collection("pendingOrders").doc(order.id);
    await pendingOrderRef.set({
      ...bookingDetails,
      price: amount,
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
      { status: 500 }
    );
  }
}

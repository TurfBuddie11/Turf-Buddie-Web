import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";
import Razorpay from "razorpay";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tournamentId = (await params).id;
    const body = await request.json();

    const { teamName, captainName, captainPhone, players } = body;

    if (!teamName || !captainName || !captainPhone || !players) {
      return NextResponse.json(
        { error: "Missing required team registration fields" },
        { status: 400 },
      );
    }

    const tournamentRef = adminDb.collection("Tournaments").doc(tournamentId);
    const tournamentDoc = await tournamentRef.get();

    if (!tournamentDoc.exists) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 },
      );
    }

    const tournamentData = tournamentDoc.data();
    if (!tournamentData) {
      return NextResponse.json(
        { error: "Tournament data not found" },
        { status: 404 },
      );
    }

    if (tournamentData.registeredTeams >= tournamentData.maxTeams) {
      return NextResponse.json(
        { error: "Tournament is full" },
        { status: 400 },
      );
    }

    const amountInPaise = Math.round(
      parseFloat(tournamentData.registrationFee) * 100,
    );

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    });

    const pendingOrderRef = adminDb
      .collection("pendingRegistrations")
      .doc(order.id);
    await pendingOrderRef.set({
      teamName,
      captainName,
      captainPhone,
      players,
      tournamentId,
      amount: tournamentData.registrationFee,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Team registration error";
    console.error("Team Registration Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

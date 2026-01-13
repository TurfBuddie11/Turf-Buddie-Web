import { adminDb } from "@/lib/firebase/admin";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { firestore } from "firebase-admin";

export async function POST(request: NextRequest) {
  try {
    const { orderId, paymentId, signature, tournamentId } =
      await request.json();

    if (!orderId || !paymentId || !signature || !tournamentId) {
      return NextResponse.json(
        { error: "Missing required payment verification fields" },
        { status: 400 },
      );
    }

    const body = `${orderId}|${paymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const pendingRegRef = adminDb
      .collection("pendingRegistrations")
      .doc(orderId);
    const pendingRegDoc = await pendingRegRef.get();

    if (!pendingRegDoc.exists) {
      return NextResponse.json(
        { error: "Pending registration not found" },
        { status: 404 },
      );
    }

    const pendingRegData = pendingRegDoc.data();
    if (!pendingRegData) {
      return NextResponse.json(
        { error: "Pending registration data not found" },
        { status: 404 },
      );
    }

    const tournamentRef = adminDb.collection("Tournaments").doc(tournamentId);

    // Add the team to a subcollection "teams" under the tournament document
    const newTeamRef = await tournamentRef.collection("teams").add({
      ...pendingRegData,
      registeredAt: firestore.FieldValue.serverTimestamp(),
    });

    // Increment registeredTeams count in the main tournament document
    await tournamentRef.update({
      registeredTeams: firestore.FieldValue.increment(1),
    });

    // Delete the pending registration document
    await pendingRegRef.delete();

    return NextResponse.json(
      {
        success: true,
        teamId: newTeamRef.id,
        message: "Team registered successfully after payment verification!",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Payment verification error";
    console.error("Payment Verification Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { headers } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: Request) {
  try {
    const authHeader = (await headers()).get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized: Missing or invalid token." },
        { status: 401 },
      );
    }
    const idToken = authHeader.split("Bearer ")[1];
    const decodedToken = await getAuth().verifyIdToken(idToken);
    const userId = decodedToken.uid;

    const { slots } = await request.json();

    if (typeof slots !== "number" || slots <= 0) {
      return NextResponse.json(
        { error: "Invalid number of slots provided." },
        { status: 400 },
      );
    }

    const pointsToAdd = slots * 30;
    const loyaltyPointsRef = adminDb.collection("loyalty_points").doc(userId);
    const loyaltyHistoryRef = adminDb.collection("loyalty_history").doc();

    await adminDb.runTransaction(async (transaction) => {
      const loyaltyDoc = await transaction.get(loyaltyPointsRef);
      const currentBalance = loyaltyDoc.data()?.balance || 0;
      const newBalance = currentBalance + pointsToAdd;

      transaction.set(
        loyaltyPointsRef,
        { balance: newBalance },
        { merge: true },
      );

      transaction.set(loyaltyHistoryRef, {
        userId,
        amount: pointsToAdd,
        type: "credit",
        reason: "Turf booking",
        timestamp: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ status: "success", pointsAdded: pointsToAdd });
  } catch (error) {
    // REFACTORED: Consistent and specific error response
    console.error("Error adding loyalty points:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An internal server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

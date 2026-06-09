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

    const { pointsToRedeem } = await request.json();

    if (typeof pointsToRedeem !== "number" || pointsToRedeem <= 0) {
      return NextResponse.json(
        { error: "Invalid number of points to redeem." },
        { status: 400 },
      );
    }

    const loyaltyPointsRef = adminDb.collection("loyalty_points").doc(userId);
    const loyaltyHistoryRef = adminDb.collection("loyalty_history").doc();

    await adminDb.runTransaction(async (transaction) => {
      const loyaltyDoc = await transaction.get(loyaltyPointsRef);

      if (!loyaltyDoc.exists) {
        throw new Error("User does not have a loyalty account.");
      }

      const currentBalance = loyaltyDoc.data()?.balance || 0;
      if (currentBalance < pointsToRedeem) {
        throw new Error("Insufficient loyalty points.");
      }

      const newBalance = currentBalance - pointsToRedeem;
      transaction.update(loyaltyPointsRef, { balance: newBalance });

      transaction.set(loyaltyHistoryRef, {
        userId,
        amount: pointsToRedeem,
        type: "debit",
        reason: "Redeemed for discount",
        timestamp: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({
      status: "success",
      pointsRedeemed: pointsToRedeem,
    });
  } catch (error) {
    console.error("Error redeeming loyalty points:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An internal server error occurred.";
    const status = message.includes("Insufficient") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

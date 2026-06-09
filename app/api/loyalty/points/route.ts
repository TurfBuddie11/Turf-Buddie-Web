import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { getAuth } from "firebase-admin/auth";
import { headers } from "next/headers";

export async function GET() {
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
    const uid = decodedToken.uid;

    const loyaltyRef = adminDb.collection("loyalty_points").doc(uid);
    const loyaltyDoc = await loyaltyRef.get();

    if (!loyaltyDoc.exists) {
      return NextResponse.json({ balance: 0 });
    }

    const loyaltyData = loyaltyDoc.data();
    return NextResponse.json({ balance: loyaltyData?.balance || 0 });
  } catch (error) {
    console.error("Error fetching loyalty points:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An internal server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

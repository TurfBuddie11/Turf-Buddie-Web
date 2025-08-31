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

    const historyRef = adminDb
      .collection("loyalty_history")
      .where("userId", "==", uid)
      .orderBy("timestamp", "desc");
    const historySnapshot = await historyRef.get();

    if (historySnapshot.empty) {
      return NextResponse.json([]); // Return an empty array if no history
    }

    const history = historySnapshot.docs.map((doc) => doc.data());
    return NextResponse.json(history);
  } catch (error) {
    // REFACTORED: Consistent and specific error response
    console.error("Error fetching loyalty history:", error);
    const message =
      error instanceof Error
        ? error.message
        : "An internal server error occurred.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

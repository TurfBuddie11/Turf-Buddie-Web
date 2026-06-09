import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const ownersSnapshot = await adminDb.collection("owners").get();

    const owners = ownersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        name: data.name || "Unknown",
        email: data.email || "",
      };
    });

    return NextResponse.json({ owners }, { status: 200 });
  } catch (error) {
    console.error("Error fetching owners:", error);
    return NextResponse.json(
      { error: "Failed to fetch owners" },
      { status: 500 }
    );
  }
}

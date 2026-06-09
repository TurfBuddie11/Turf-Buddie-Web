import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const collections = ["users", "owners", "User", "Owner", "Users", "Owners"];
    const results: Record<string, unknown[]> = {};

    for (const collName of collections) {
      try {
        const snapshot = await adminDb.collection(collName).get();
        results[collName] = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
      } catch {
        results[collName] = [];
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch" },
      { status: 500 }
    );
  }
}

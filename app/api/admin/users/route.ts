import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const [ownersSnapshot, usersSnapshot] = await Promise.all([
      adminDb.collection("owners").get(),
      adminDb.collection("users").get(),
    ]);

    const owners = ownersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        name: data.name || "Unknown",
        email: data.email || "",
        type: "owner",
        createdAt: data.createdAt,
        mobile: data.mobile || "",
        city: data.city || "",
        emailVerified: data.emailVerified || false,
      };
    });

    const users = usersSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        uid: doc.id,
        name: data.name || "Unknown",
        email: data.email || "",
        type: "user",
        createdAt: data.createdAt,
        mobile: data.mobile || "",
        city: data.city || "",
        emailVerified: data.emailVerified || false,
      };
    });

    const allUsers = [...owners, ...users].sort((a, b) => {
      const dateA = a.createdAt?.toDate?.() || new Date(0);
      const dateB = b.createdAt?.toDate?.() || new Date(0);
      return dateB.getTime() - dateA.getTime();
    });

    return NextResponse.json({ users: allUsers }, { status: 200 });
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

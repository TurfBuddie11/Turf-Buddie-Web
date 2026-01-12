import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get("admin-session")?.value;

    if (!sessionCookie) {
      return NextResponse.json({ isAuthenticated: false });
    }

    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true,
    );
    return NextResponse.json({ isAuthenticated: true, uid: decodedToken.uid });
  } catch (error) {
    console.error("Error verifying owner session cookie:", error);
    return NextResponse.json({ isAuthenticated: false });
  }
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { hasAdminClaim } from "@/lib/auth/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return NextResponse.json(
        { error: "ID token not found" },
        { status: 400 },
      );
    }

    // Any Firebase user can produce a valid ID token, so the admin role must
    // be checked here before an admin session is issued.
    let decoded;
    try {
      decoded = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired login" },
        { status: 401 },
      );
    }

    if (!hasAdminClaim(decoded)) {
      return NextResponse.json(
        { error: "This account does not have admin access" },
        { status: 403 },
      );
    }

    const expiresIn = parseInt(
      process.env.SESSION_COOKIE_EXPIRES_IN || "432000000",
      10,
    ); // Default to 5 days (5 * 24 * 60 * 60 * 1000)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieStore = await cookies();
    cookieStore.set("admin-session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: Math.floor(expiresIn / 1000),
      path: "/",
    });

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error creating admin session cookie:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

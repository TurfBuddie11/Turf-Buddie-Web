import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken) {
      return new NextResponse("ID token not found", { status: 400 });
    }

    const expiresIn = parseInt(
      process.env.SESSION_COOKIE_EXPIRES_IN || "432000000",
      10,
    ); // Default to 5 days (5 * 24 * 60 * 60 * 1000)
    const sessionCookie = await getAuth().createSessionCookie(idToken, {
      expiresIn,
    });

    const cookieStore = await cookies();
    cookieStore.set("session", sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: expiresIn,
      path: "/",
    });

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error creating session cookie:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

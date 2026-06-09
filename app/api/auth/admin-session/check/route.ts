import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const cookieStore = await cookies();

    // ── DEV ONLY: debug bypass ──────────────────────────────────────
    if (process.env.NODE_ENV === "development") {
      const debugCookie = cookieStore.get("admin-debug-bypass")?.value;
      const debugSecret = process.env.DEBUG_ADMIN_SECRET;
      if (debugSecret && debugCookie === debugSecret) {
        return NextResponse.json({ isAuthenticated: true, uid: "debug-admin", debug: true });
      }
    }
    // ────────────────────────────────────────────────────────────────

    const sessionCookie = cookieStore.get("admin-session")?.value;
    if (!sessionCookie) {
      return NextResponse.json({ isAuthenticated: false });
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);
    return NextResponse.json({ isAuthenticated: true, uid: decodedToken.uid });
  } catch (error) {
    console.error("Error verifying admin session cookie:", error);
    return NextResponse.json({ isAuthenticated: false });
  }
}

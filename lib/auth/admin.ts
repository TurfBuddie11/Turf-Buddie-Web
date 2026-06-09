import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";

export async function isAdminAuthenticated(): Promise<boolean> {
  try {
    const cookieStore = await cookies();

    if (process.env.NODE_ENV === "development") {
      const debugCookie = cookieStore.get("admin-debug-bypass")?.value;
      const debugSecret = process.env.DEBUG_ADMIN_SECRET;
      if (debugSecret && debugCookie === debugSecret) {
        return true;
      }
    }

    const sessionCookie = cookieStore.get("admin-session")?.value;
    if (!sessionCookie) return false;
    await adminAuth.verifySessionCookie(sessionCookie, true);
    return true;
  } catch {
    return false;
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

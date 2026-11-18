import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";

/**
 * Only Firebase users with the custom claim `admin: true` are admins.
 * Grant it with the Admin SDK: adminAuth.setCustomUserClaims(uid, { admin: true }).
 */
export function hasAdminClaim(token: DecodedIdToken): boolean {
  return token["admin"] === true;
}

/** Returns the admin's uid if the request has a valid admin session, else null. */
export async function getAdminUid(): Promise<string | null> {
  try {
    const cookieStore = await cookies();

    if (process.env.NODE_ENV === "development") {
      const debugCookie = cookieStore.get("admin-debug-bypass")?.value;
      const debugSecret = process.env.DEBUG_ADMIN_SECRET;
      if (debugSecret && debugCookie === debugSecret) {
        return "debug-admin";
      }
    }

    const sessionCookie = cookieStore.get("admin-session")?.value;
    if (!sessionCookie) return null;
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return hasAdminClaim(decoded) ? decoded.uid : null;
  } catch {
    return null;
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  return (await getAdminUid()) !== null;
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

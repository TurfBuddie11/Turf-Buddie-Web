import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/admin";

/**
 * Resolve the logged-in user's uid for an API request.
 *
 * Accepts either:
 *  - `Authorization: Bearer <Firebase ID token>` (works right after an
 *    in-page login, no reload needed), or
 *  - the `session` cookie set by /api/auth/session.
 *
 * Returns null when neither is present or valid (caller should 401).
 */
export async function getRequestUid(request: Request): Promise<string | null> {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.slice("Bearer ".length).trim();
    if (idToken) {
      try {
        const decoded = await adminAuth.verifyIdToken(idToken);
        return decoded.uid;
      } catch (err) {
        console.warn("[auth] invalid bearer token:", err);
      }
    }
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;
  if (sessionCookie) {
    try {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
      return decoded.uid;
    } catch (err) {
      console.warn("[auth] invalid/expired session cookie:", err);
    }
  }

  return null;
}

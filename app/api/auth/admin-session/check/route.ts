import { NextResponse } from "next/server";
import { getAdminUid } from "@/lib/auth/admin";

export async function GET() {
  const uid = await getAdminUid();
  if (!uid) {
    return NextResponse.json({ isAuthenticated: false });
  }
  return NextResponse.json({
    isAuthenticated: true,
    uid,
    ...(uid === "debug-admin" ? { debug: true } : {}),
  });
}

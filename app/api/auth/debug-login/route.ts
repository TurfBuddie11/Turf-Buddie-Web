import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Debug login only available in development" }, { status: 403 });
  }

  const cookieStore = await cookies();
  cookieStore.set("admin-session", "debug-admin-session", {
    httpOnly: true,
    secure: false,
    maxAge: 86400000,
    path: "/",
  });

  return NextResponse.json({ status: "success", uid: "debug-admin" });
}

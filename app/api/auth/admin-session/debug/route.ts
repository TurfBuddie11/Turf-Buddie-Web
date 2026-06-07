import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

// ⚠️ DEVELOPMENT ONLY — disabled in production
export async function POST(request: NextRequest) {
    if (process.env.NODE_ENV !== "development") {
        return NextResponse.json({ error: "Not available" }, { status: 403 });
    }

    const { password } = await request.json();
    const secret = process.env.DEBUG_ADMIN_SECRET || process.env.ADMIN_DEBUG_PASSWORD;

    if (!secret || password !== secret) {
        return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }

    const cookieStore = await cookies();
    cookieStore.set("admin-debug-bypass", secret, {
        httpOnly: true,
        secure: false,
        maxAge: 60 * 60 * 8, // 8 hours
        path: "/",
    });

    return NextResponse.json({ status: "ok" });
}

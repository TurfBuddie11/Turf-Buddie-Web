import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete("admin-session");

    return NextResponse.json({ status: "success" });
  } catch (error) {
    console.error("Error logging out owner:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

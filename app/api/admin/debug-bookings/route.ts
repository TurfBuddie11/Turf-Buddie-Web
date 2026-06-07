import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET() {
  try {
    const turfsSnapshot = await adminDb.collection("Turfs").get();
    const bookingsData: Record<string, unknown>[] = [];

    for (const turfDoc of turfsSnapshot.docs) {
      const turfData = turfDoc.data();
      const timeSlots = turfData.timeSlots || [];
      
      if (timeSlots.length > 0) {
        const confirmedBookings = timeSlots.filter((ts: Record<string, unknown>) => 
          ts.status && ["confirmed", "pending", "booked_offline"].includes(ts.status as string)
        );
        
        if (confirmedBookings.length > 0) {
          bookingsData.push({
            turfId: turfDoc.id,
            turfName: turfData.name,
            bookings: confirmedBookings.slice(0, 10),
          });
        }
      }
    }

    return NextResponse.json({ 
      totalBookings: bookingsData.reduce((sum, t) => sum + (t.bookings as unknown[]).length, 0),
      turfsWithBookings: bookingsData.length,
      sampleData: bookingsData.slice(0, 3)
    }, { status: 200 });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 });
  }
}

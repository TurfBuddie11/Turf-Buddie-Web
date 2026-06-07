import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { validateApiKey, unauthorizedResponse, errorResponse } from "../middleware";

// GET /api/v1/venues — list all active turfs
export async function GET(request: NextRequest) {
    try {
        const ctx = await validateApiKey(request);
        if (!ctx) return unauthorizedResponse();

        const { searchParams } = request.nextUrl;
        const city = searchParams.get("city")?.toLowerCase();
        const search = searchParams.get("search")?.toLowerCase();

        const snapshot = await adminDb.collection("Turfs").where("active", "==", true).get();

        let venues = snapshot.docs.map((doc) => {
            const d = doc.data();
            return {
                id: doc.id,
                name: d.name || "",
                sport: Array.isArray(d.sport) ? d.sport.join(", ") : d.sport || "",
                city: d.address?.split(",").slice(-2, -1)[0]?.trim() || "Nagpur",
                address: d.address || "",
                price: d.price || 0,
                rating: d.rating || 0,
            };
        });

        if (city) {
            venues = venues.filter((v) => v.city.toLowerCase().includes(city));
        }
        if (search) {
            venues = venues.filter(
                (v) =>
                    v.name.toLowerCase().includes(search) ||
                    v.address.toLowerCase().includes(search),
            );
        }

        return Response.json({ success: true, venues, total: venues.length });
    } catch (error) {
        console.error("GET /api/v1/venues error:", error);
        return errorResponse("Failed to fetch venues");
    }
}

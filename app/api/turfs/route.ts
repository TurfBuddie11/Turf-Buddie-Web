import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export async function GET() {
  try {
    const turfsSnapshot = await adminDb.collection("Turfs").get();

    const turfs = await Promise.all(
      turfsSnapshot.docs.map(async (doc) => {
        const turfData = doc.data();

        let ownerName = "Unknown";
        if (turfData.ownerId) {
          try {
            const ownerDoc = await adminDb
              .collection("Owners")
              .doc(turfData.ownerId)
              .get();
            if (ownerDoc.exists) {
              const ownerData = ownerDoc.data();
              ownerName = ownerData?.name || "Unknown";
            }
          } catch {
            ownerName = "Unknown";
          }
        }

        return {
          id: doc.id,
          ...turfData,
          ownerName,
        };
      })
    );

    return NextResponse.json({ turfs }, { status: 200 });
  } catch (error) {
    console.error("Error fetching turfs:", error);
    return NextResponse.json(
      { error: "Failed to fetch turfs" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const city = (formData.get("city") as string | null)?.trim() || null;
    const coordinates = formData.get("coordinates") as string;
    const price = formData.get("price") as string;
    const ownerId = formData.get("ownerId") as string | null;
    const image = formData.get("image") as File | null;

    let imageurl = "";
    if (image) {
      const buffer = await image.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const mimeType = image.type || "image/jpeg";
      imageurl = `data:${mimeType};base64,${base64}`;
    }

    const sport = formData.getAll("sport").filter(Boolean) as string[];
    const formats = formData.getAll("formats").filter(Boolean) as string[];
    const amenities = formData.getAll("amenities").filter(Boolean) as string[];
    const availability = (formData.get("availability") as string) || "Open Now";
    const active = formData.get("active") !== "false";
    const ratingValue = Number(formData.get("rating") || 0);

    const turfData: Record<string, unknown> = {
      name,
      address,
      city,
      coordinates,
      price: Number(price),
      imageurl,
      active,
      availability,
      formats,
      sport,
      amenities,
      rating: ratingValue || 0,
      createdAt: Timestamp.now(),
    };

    if (ownerId) {
      turfData.ownerId = ownerId;
    }

    const turfRef = await adminDb.collection("Turfs").add(turfData);

    return NextResponse.json(
      { turf: { id: turfRef.id, ...turfData } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating turf:", error);
    return NextResponse.json(
      { error: "Failed to create turf" },
      { status: 500 }
    );
  }
}

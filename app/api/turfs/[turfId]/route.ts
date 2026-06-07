import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { Timestamp } from "firebase-admin/firestore";

export async function GET(
  req: Request,
  context: RouteContext<'/api/turfs/[turfId]'>,
) {
  const { turfId } = await context.params;

  try {
    const turfRef = adminDb.collection("Turfs").doc(turfId);
    const turfSnap = await turfRef.get();

    if (!turfSnap.exists) {
      return NextResponse.json({ error: "Turf not found" }, { status: 404 });
    }

    const turfData = turfSnap.data() || {};
    let ownerName = "Unknown";

    if (turfData.ownerId) {
      try {
        const ownerDoc = await adminDb.collection("Owners").doc(turfData.ownerId).get();
        if (ownerDoc.exists) {
          const owner = ownerDoc.data();
          ownerName = owner?.name || "Unknown";
        }
      } catch {
        ownerName = "Unknown";
      }
    }

    return NextResponse.json(
      { turf: { id: turfId, ...turfData, ownerName } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error fetching turf details:", error);
    return NextResponse.json(
      { error: "Failed to fetch turf details" },
      { status: 500 },
    );
  }
}

export async function PUT(
  req: Request,
  context: RouteContext<'/api/turfs/[turfId]'>,
) {
  const { turfId } = await context.params;

  try {
    const formData = await req.formData();
    const name = formData.get("name") as string;
    const address = formData.get("address") as string;
    const coordinates = formData.get("coordinates") as string;
    const price = formData.get("price") as string;
    const ownerId = formData.get("ownerId") as string | null;
    const image = formData.get("image") as File | null;

    const turfRef = adminDb.collection("Turfs").doc(turfId);
    const turfSnap = await turfRef.get();

    if (!turfSnap.exists) {
      return NextResponse.json({ error: "Turf not found" }, { status: 404 });
    }

    const existingData = turfSnap.data() || {};
    let imageurl = existingData.imageurl || "";

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
      coordinates,
      price: Number(price),
      imageurl,
      active,
      availability,
      formats,
      sport,
      amenities,
      rating: ratingValue || 0,
      updatedAt: Timestamp.now(),
    };

    if (ownerId) {
      turfData.ownerId = ownerId;
    }

    await turfRef.update(turfData);

    return NextResponse.json(
      { turf: { id: turfId, ...existingData, ...turfData } },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating turf:", error);
    return NextResponse.json(
      { error: "Failed to update turf" },
      { status: 500 },
    );
  }
}

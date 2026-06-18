import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import {
  uploadFileToStorage,
  deleteFileFromStorage,
} from "@/lib/firebase/storage-admin";
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[GET /api/turfs/:turfId] Error:", { message: errorMessage, turfId });
    return NextResponse.json(
      { error: "Failed to fetch turf details", details: errorMessage },
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
    const cityRaw = formData.get("city") as string | null;
    const city = cityRaw ? cityRaw.trim() : null;
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
      // Upload to Firebase Storage instead of storing as base64 data URL.
      // Base64 in Firestore bloats documents and breaks the 1MB limit on
      // even moderate images. We also clean up the old image to avoid
      // orphaned files in storage.
      const safeName = (name || "turf").replace(/\s+/g, "-");
      if (imageurl && imageurl.startsWith("data:")) {
        imageurl = "";
      }
      const newUrl = await uploadFileToStorage(
        image,
        `Turf/${safeName}`,
        image.name || "image.jpg",
      );

      // Delete the old image (best-effort) to avoid orphaned files
      if (
        existingData.imageurl &&
        !existingData.imageurl.startsWith("data:") &&
        existingData.imageurl !== newUrl
      ) {
        await deleteFileFromStorage(existingData.imageurl);
      }

      imageurl = newUrl;
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
      city: city || null,
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
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error("[PUT /api/turfs/:turfId] Error updating turf:", {
      message: errorMessage,
      stack: errorStack,
      turfId,
    });
    return NextResponse.json(
      { error: "Failed to update turf", details: errorMessage },
      { status: 500 },
    );
  }
}

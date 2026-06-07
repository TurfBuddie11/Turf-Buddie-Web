import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export interface OwnerContext {
    ownerId: string;
    ownerName: string;
    turfId: string;
    turfName: string;
}

/**
 * Resolves owner context from `email` query param or request body.
 * No session token needed — API key (already validated) is the auth layer.
 */
export async function resolveOwner(
    request: NextRequest,
    bodyEmail?: string,
): Promise<OwnerContext | null> {
    // email from query param or passed body
    const email =
        bodyEmail ||
        request.nextUrl.searchParams.get("email") ||
        "";

    if (!email) return null;

    const ownerSnap = await adminDb
        .collection("owners")
        .where("email", "==", email.toLowerCase().trim())
        .limit(1)
        .get();

    if (ownerSnap.empty) return null;

    const ownerDoc = ownerSnap.docs[0];
    const ownerData = ownerDoc.data();

    // Find turf owned by this owner
    const turfSnap = await adminDb
        .collection("Turfs")
        .where("ownerId", "==", ownerDoc.id)
        .limit(1)
        .get();

    if (turfSnap.empty) return null;

    const turfDoc = turfSnap.docs[0];

    return {
        ownerId: ownerDoc.id,
        ownerName: ownerData.name || "",
        turfId: turfDoc.id,
        turfName: turfDoc.data().name || "",
    };
}

export function ownerNotFound() {
    return Response.json(
        { success: false, message: "No owner account found with this email" },
        { status: 404 },
    );
}

/** Parse bookings from Turf.timeSlots for a specific date */
export function getBookingsForDate(
    timeSlots: unknown,
    targetDay: number,
    targetMonth: string,
) {
    let allSlots: Record<string, unknown>[] = [];
    if (Array.isArray(timeSlots)) {
        allSlots = timeSlots;
    } else if (timeSlots && typeof timeSlots === "object") {
        allSlots = Object.values(timeSlots as Record<string, unknown>) as Record<string, unknown>[];
    }

    return allSlots.filter((b) => {
        const ms = (b as { monthSlot?: string }).monthSlot || "";
        const parts = ms.trim().split(" ");
        if (parts.length !== 2) return false;
        const bDay = parseInt(parts[0], 10);
        const bMonth = parts[1];
        return (
            bDay === targetDay &&
            bMonth.toLowerCase() === targetMonth.toLowerCase()
        );
    });
}

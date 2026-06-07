import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export interface ApiContext {
    venueId: string;
    venueName: string;
}

/**
 * Validates the Bearer API key from Authorization header.
 * Returns the venue context or null if invalid.
 */
export async function validateApiKey(request: NextRequest): Promise<ApiContext | null> {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return null;

    const apiKey = authHeader.slice(7).trim();
    if (!apiKey) return null;

    // Check against env-level master key first (for Hellotick global key)
    const masterKey = process.env.HELLOTICK_API_KEY;
    if (masterKey && apiKey === masterKey) {
        return { venueId: "all", venueName: "All Venues" };
    }

    // Check per-venue API key stored in Firestore Turfs collection
    const snapshot = await adminDb
        .collection("Turfs")
        .where("hellotickApiKey", "==", apiKey)
        .where("active", "==", true)
        .limit(1)
        .get();

    if (snapshot.empty) return null;

    const doc = snapshot.docs[0];
    return { venueId: doc.id, venueName: doc.data().name || "" };
}

export function unauthorizedResponse() {
    return Response.json(
        { success: false, message: "Invalid or missing API key" },
        { status: 401 },
    );
}

export function notFoundResponse(message = "Not found") {
    return Response.json({ success: false, message }, { status: 404 });
}

export function conflictResponse(message: string, extra?: Record<string, unknown>) {
    return Response.json({ success: false, message, ...extra }, { status: 409 });
}

export function errorResponse(message: string, status = 500) {
    return Response.json({ success: false, message }, { status });
}

/** Format a date as "Today, May 23" or "Fri, May 24" */
export function formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    const today = new Date();
    const isToday =
        d.getDate() === today.getDate() &&
        d.getMonth() === today.getMonth() &&
        d.getFullYear() === today.getFullYear();

    const monthDay = d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
    return isToday ? `Today, ${monthDay}` : `${d.toLocaleDateString("en-IN", { weekday: "short" })}, ${monthDay}`;
}

/** Today's date as YYYY-MM-DD */
export function todayStr(): string {
    return new Date().toISOString().slice(0, 10);
}

/** Generate booking ref code: TB-2305-0472 */
export function generateRefCode(): string {
    const now = new Date();
    const dm = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const rand = String(Math.floor(Math.random() * 9000) + 1000);
    return `TB-${dm}-${rand}`;
}

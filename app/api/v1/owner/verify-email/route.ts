import { NextRequest } from "next/server";
import { validateApiKey, unauthorizedResponse, errorResponse } from "../../middleware";
import { resolveOwner, ownerNotFound } from "../auth";

// POST /api/v1/owner/verify-email
// Auth: Bearer API key only — no session token needed
// Body: { email }
export async function POST(request: NextRequest) {
    try {
        const ctx = await validateApiKey(request);
        if (!ctx) return unauthorizedResponse();

        const { email } = await request.json();
        if (!email) {
            return Response.json({ success: false, message: "email is required" }, { status: 400 });
        }

        const owner = await resolveOwner(request, email);
        if (!owner) return ownerNotFound();

        return Response.json({
            success: true,
            message: "Email verified. You can now use owner endpoints with your email.",
            owner: {
                name: owner.ownerName,
                venue_id: owner.turfId,
                venue: owner.turfName,
            },
        });
    } catch (error) {
        console.error("POST /api/v1/owner/verify-email error:", error);
        return errorResponse("Failed to verify email");
    }
}

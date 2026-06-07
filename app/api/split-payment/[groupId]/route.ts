import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { SplitGroup } from "@/lib/types/split-payment";

// GET — fetch group details (public, for payment page)
export async function GET(
    _req: NextRequest,
    context: { params: Promise<{ groupId: string }> },
) {
    try {
        const { groupId } = await context.params;
        const groupSnap = await adminDb.collection("splitGroups").doc(groupId).get();

        if (!groupSnap.exists) {
            return NextResponse.json({ error: "Group not found" }, { status: 404 });
        }

        const group = { id: groupSnap.id, ...groupSnap.data() } as SplitGroup & { id: string };

        // Check expiry
        const expiresAt = new Date(group.expiresAt);
        if (new Date() > expiresAt && group.status === "pending") {
            await releaseBlockedSlots(groupId, group);
            await adminDb.collection("splitGroups").doc(groupId).update({ status: "expired" });
            return NextResponse.json({ error: "This split group has expired" }, { status: 410 });
        }

        return NextResponse.json({ group });
    } catch (error) {
        console.error("Error fetching split group:", error);
        return NextResponse.json({ error: "Failed to fetch group" }, { status: 500 });
    }
}

async function releaseBlockedSlots(
    groupId: string,
    group: Pick<SplitGroup, "turfId" | "timeSlots" | "daySlot" | "monthSlot">,
) {
    try {
        const turfRef = adminDb.collection("Turfs").doc(group.turfId);
        const turfSnap = await turfRef.get();
        if (!turfSnap.exists) return;

        const turfData = turfSnap.data() || {};
        let allSlots: Record<string, unknown>[] = [];
        if (Array.isArray(turfData.timeSlots)) {
            allSlots = turfData.timeSlots;
        } else if (turfData.timeSlots && typeof turfData.timeSlots === "object") {
            allSlots = Object.values(turfData.timeSlots);
        }

        const filtered = allSlots.filter(
            (s) =>
                !(
                    (s as { splitGroupId?: string }).splitGroupId === groupId &&
                    (s as { status?: string }).status === "blocked"
                ),
        );

        await turfRef.update({ timeSlots: filtered });
    } catch (err) {
        console.error("Error releasing blocked slots:", err);
    }
}

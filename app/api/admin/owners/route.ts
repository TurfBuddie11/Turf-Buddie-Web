import { NextResponse } from "next/server";
import { z } from "zod";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/auth/admin";

const optionalText = z
  .string()
  .trim()
  .max(200)
  .optional()
  .transform((v) => (v ? v : undefined));

const createOwnerSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.email("Enter a valid email").transform((v) => v.trim().toLowerCase()),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  mobile: optionalText,
  area: optionalText,
  city: optionalText,
  state: optionalText,
  pincode: optionalText,
  turfIds: z.array(z.string().min(1)).max(50).optional().default([]),
});

/** List all turf owners together with the turfs assigned to them. */
export async function GET() {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();

  try {
    const [ownersSnap, turfsSnap] = await Promise.all([
      adminDb.collection("owners").get(),
      adminDb.collection("Turfs").select("name", "ownerId").get(),
    ]);

    const turfsByOwner = new Map<string, { id: string; name: string }[]>();
    turfsSnap.docs.forEach((doc) => {
      const { ownerId, name } = doc.data();
      if (!ownerId) return;
      const list = turfsByOwner.get(ownerId) ?? [];
      list.push({ id: doc.id, name: name || "Unnamed turf" });
      turfsByOwner.set(ownerId, list);
    });

    const owners = ownersSnap.docs
      .map((doc) => {
        const data = doc.data();
        return {
          uid: doc.id,
          name: data.name || "Unknown",
          email: data.email || "",
          mobile: data.mobile || "",
          city: data.city || "",
          createdBy: data.createdBy || "self",
          createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null,
          turfs: turfsByOwner.get(doc.id) ?? [],
        };
      })
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));

    return NextResponse.json({ owners }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/owners] Error:", error);
    return NextResponse.json({ error: "Failed to fetch owners" }, { status: 500 });
  }
}

/**
 * Create a turf owner account (Firebase Auth user + `owners/{uid}` profile)
 * and optionally assign existing turfs to them. The owner can then sign in
 * at /owner/login with the email and password set here.
 */
export async function POST(req: Request) {
  if (!(await isAdminAuthenticated())) return unauthorizedResponse();

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createOwnerSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || "Invalid input";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const { name, email, password, turfIds, ...profile } = parsed.data;

  let uid: string;
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: false,
    });
    uid = userRecord.uid;
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    if (code === "auth/invalid-password" || code === "auth/invalid-email") {
      return NextResponse.json(
        { error: (error as Error).message },
        { status: 400 },
      );
    }
    console.error("[POST /api/admin/owners] createUser failed:", error);
    return NextResponse.json({ error: "Failed to create owner account" }, { status: 500 });
  }

  try {
    const ownerDoc: Record<string, unknown> = {
      uid,
      name,
      email,
      role: "owner",
      emailVerified: false,
      createdAt: Timestamp.now(),
      createdBy: "admin",
    };
    for (const [key, value] of Object.entries(profile)) {
      if (value !== undefined) ownerDoc[key] = value;
    }

    const batch = adminDb.batch();
    batch.set(adminDb.collection("owners").doc(uid), ownerDoc);

    const uniqueTurfIds = [...new Set(turfIds)];
    if (uniqueTurfIds.length) {
      const turfRefs = uniqueTurfIds.map((id) => adminDb.collection("Turfs").doc(id));
      const turfSnaps = await adminDb.getAll(...turfRefs);
      const missing = turfSnaps.filter((s) => !s.exists).map((s) => s.id);
      if (missing.length) {
        throw Object.assign(new Error(`Turf not found: ${missing.join(", ")}`), {
          status: 400,
        });
      }
      turfRefs.forEach((ref) =>
        batch.update(ref, { ownerId: uid, updatedAt: FieldValue.serverTimestamp() }),
      );
    }

    await batch.commit();

    return NextResponse.json(
      {
        owner: {
          uid,
          name,
          email,
          mobile: profile.mobile || "",
          city: profile.city || "",
          createdBy: "admin",
          createdAt: new Date().toISOString(),
          turfIds: uniqueTurfIds,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    // Roll back the auth user so the email can be reused on retry.
    await adminAuth.deleteUser(uid).catch((e) =>
      console.error("[POST /api/admin/owners] rollback deleteUser failed:", e),
    );
    const status = (error as { status?: number })?.status ?? 500;
    console.error("[POST /api/admin/owners] Firestore write failed:", error);
    return NextResponse.json(
      { error: status === 400 ? (error as Error).message : "Failed to save owner profile" },
      { status },
    );
  }
}

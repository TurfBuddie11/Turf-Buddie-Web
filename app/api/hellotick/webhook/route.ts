import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

const WEBHOOK_SECRET = process.env.HELLOTICK_WEBHOOK_SECRET || "";

const SUPPORTED_EVENTS = [
  "message.received",
  "message.sent",
  "message.status.update",
  "contact.created",
  "contact.updated",
  "contact.deleted",
  "group.created",
  "group.updated",
  "group.deleted",
  "autoreply.created",
  "autoreply.updated",
  "autoreply.deleted",
];

interface HellotickWebhookPayload {
  event?: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
}

function isValidSecret(request: NextRequest): boolean {
  if (!WEBHOOK_SECRET) return true;
  const headerSecret = request.headers.get("x-webhook-secret");
  const querySecret = request.nextUrl.searchParams.get("secret");
  return headerSecret === WEBHOOK_SECRET || querySecret === WEBHOOK_SECRET;
}

export async function POST(request: NextRequest) {
  if (!isValidSecret(request)) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 401 });
  }

  let body: HellotickWebhookPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = body.event;
  if (!event || typeof event !== "string") {
    return NextResponse.json(
      { error: "Missing 'event' field" },
      { status: 400 },
    );
  }

  const supported = SUPPORTED_EVENTS.includes(event);

  await adminDb.collection("whatsappWebhookEvents").add({
    event,
    payload: body,
    supported,
    createdAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({ ok: true, supported });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "hellotick-webhook",
    supportedEvents: SUPPORTED_EVENTS,
  });
}

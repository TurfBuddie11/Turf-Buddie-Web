import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { handleIncomingMessage } from "@/lib/hellotick/chatbot-final";

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

function extractPhoneFromContacts(
  contacts: unknown,
): string | undefined {
  if (!Array.isArray(contacts) || contacts.length === 0) return undefined;
  const c = contacts[0] as Record<string, unknown>;
  return (c.input as string) || (c.wa_id as string) || (c.phone as string);
}

function extractPhoneFromMessages(messages: unknown): string | undefined {
  if (!Array.isArray(messages) || messages.length === 0) return undefined;
  const m = messages[0] as Record<string, unknown>;
  return (m.from as string) || (m.phone as string);
}

function extractPhoneFromChat(chat: unknown): string | undefined {
  if (!chat || typeof chat !== "object") return undefined;
  const c = chat as Record<string, unknown>;
  const nested = c.contact as Record<string, unknown> | undefined;
  return (nested?.phone as string) || (c.phone as string);
}

function extractMessageText(payload: Record<string, unknown>): string | undefined {
  // Direct text fields
  const direct =
    (payload.text as string | undefined) ||
    (payload.body as string | undefined) ||
    (payload.message as string | undefined);
  if (direct) return direct;

  // Hellotick/WhatsApp Cloud API: messages[0].text.body
  const messages = payload.messages;
  if (Array.isArray(messages) && messages.length > 0) {
    const m = messages[0] as Record<string, unknown>;
    const textField = m.text as Record<string, unknown> | string | undefined;
    if (typeof textField === "string") return textField;
    if (textField && typeof textField === "object" && "body" in textField) {
      return String(textField.body);
    }
    // Also check for button responses
    const button = m.button as Record<string, unknown> | undefined;
    if (button?.text) return String(button.text);
  }
  return undefined;
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

  // Process incoming messages
  if (event === "message.received" && body.data) {
    // Hellotick wraps actual data under body.data.value
    const messageData = ((body.data as Record<string, unknown>).value ||
      body.data) as Record<string, unknown>;

    // Try multiple locations where Hellotick might put the phone number
    const from =
      (messageData.from as string | undefined) ||
      extractPhoneFromMessages(messageData.messages) ||
      extractPhoneFromContacts(messageData.contacts) ||
      extractPhoneFromChat(messageData.chat) ||
      (messageData.phone as string | undefined);

    if (!from) {
      console.warn(
        "[webhook] message.received without usable phone; skipping chatbot:",
        JSON.stringify(messageData).slice(0, 300),
      );
      await adminDb.collection("whatsappWebhookErrors").add({
        event,
        error: "No phone number in payload",
        payload: body,
        timestamp: new Date().toISOString(),
      });
    } else {
      try {
        await handleIncomingMessage({
          from,
          text: extractMessageText(messageData),
          type: (messageData.type as "text" | "image" | "video" | "document" | "audio" | "button" | "list") || "text",
          timestamp: messageData.timestamp
            ? Number(messageData.timestamp)
            : Date.now(),
        });

        console.log("[webhook] Message processed successfully");
      } catch (err) {
        console.error("[webhook] Error processing incoming message:", err);

        await adminDb.collection("whatsappWebhookErrors").add({
          event,
          error: err instanceof Error ? err.message : String(err),
          payload: body,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  return NextResponse.json({ ok: true, supported });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "hellotick-webhook",
    supportedEvents: SUPPORTED_EVENTS,
  });
}

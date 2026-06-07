import { NextRequest, NextResponse } from "next/server";
import { hellotick, hellotickConfig, normalizePhone } from "@/lib/hellotick/client";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/auth/admin";

export async function POST(request: NextRequest) {
  if (!hellotickConfig.hasKey) {
    return NextResponse.json(
      { error: "HELLOTICK_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const authed = await isAdminAuthenticated();
  if (!authed) return unauthorizedResponse();

  const body = await request.json().catch(() => ({}));
  const { phone, message, template, media } = body as {
    phone?: string;
    message?: string;
    template?: {
      name: string;
      language: { code: string };
      components?: Array<{
        type: string;
        parameters?: Array<Record<string, unknown>>;
        sub_type?: string;
        index?: number;
      }>;
    };
    media?: { type: "image" | "video" | "document" | "audio"; url: string; caption?: string; file_name?: string };
  };

  if (!phone) {
    return NextResponse.json(
      { error: "phone is required" },
      { status: 400 },
    );
  }

  const normalized = normalizePhone(phone);

  try {
    let result: unknown;
    if (template) {
      result = await hellotick.sendTemplate({ phone: normalized, template });
    } else if (media) {
      result = await hellotick.sendMedia({
        phone: normalized,
        media_type: media.type,
        media_url: media.url,
        caption: media.caption,
        file_name: media.file_name,
      });
    } else if (message) {
      result = await hellotick.sendText({ phone: normalized, message });
    } else {
      return NextResponse.json(
        { error: "Provide one of: message, template, or media" },
        { status: 400 },
      );
    }
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: number }).status) || 500
        : 500;
    return NextResponse.json(
      { ok: false, error: errorMessage },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

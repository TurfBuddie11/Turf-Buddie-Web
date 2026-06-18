const BASE_URL =
  process.env.HELLOTICK_BASE_URL || "https://panel.hellotick.in";
const API_KEY = process.env.HELLOTICK_API_KEY || "";

export interface HellotickContact {
  uuid?: string;
  name: string;
  phone: string;
  email?: string;
  groups?: string[];
  [key: string]: unknown;
}

export interface HellotickContactGroup {
  uuid?: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

export interface HellotickCannedReply {
  uuid?: string;
  title: string;
  message: string;
  shortcut?: string;
  [key: string]: unknown;
}

export interface HellotickTemplate {
  uuid?: string;
  name: string;
  language?: { code: string };
  status?: string;
  category?: string;
  components?: unknown[];
  [key: string]: unknown;
}

export interface HellotickSendTextPayload {
  phone: string;
  message: string;
}

export interface HellotickSendMediaPayload {
  phone: string;
  media_type: "image" | "video" | "document" | "audio";
  media_url: string;
  caption?: string;
  file_name?: string;
}

export interface HellotickSendTemplatePayload {
  phone: string;
  template: {
    name: string;
    language: { code: string };
    components?: Array<{
      type: string;
      parameters?: Array<Record<string, unknown>>;
      sub_type?: string;
      index?: number;
    }>;
  };
}

export interface HellotickInteractivePayload {
  phone: string;
  type: "button" | "list";
  header?: {
    type: "text" | "image" | "video" | "document";
    text?: string;
    image?: string;
    video?: string;
    document?: string;
  };
  body: {
    text: string;
  };
  footer?: {
    text: string;
  };
  action: {
    buttons?: Array<{
      type: "reply";
      reply: {
        id: string;
        title: string;
      };
    }>;
    button?: string;
    sections?: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>;
  };
}

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

async function call<T = unknown>(
  path: string,
  method: HttpMethod = "GET",
  body?: unknown,
  query?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  if (!API_KEY) {
    throw new Error(
      "HELLOTICK_API_KEY is not set. Add it to your .env file.",
    );
  }

  let url = `${BASE_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([k, v]) => {
      if (v !== undefined && v !== null) params.append(k, String(v));
    });
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  if (!res.ok) {
    const message =
      (data && typeof data === "object" && "message" in data
        ? String((data as Record<string, unknown>).message)
        : null) || `Hellotick API ${method} ${path} failed with ${res.status}`;
    const err = new Error(message) as Error & { status: number; body: unknown };
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return data as T;
}

export const hellotick = {
  // Contacts
  listContacts: (params?: Record<string, string | number | undefined>) =>
    call("/api/contacts", "GET", undefined, params),
  getContact: (uuid: string) => call(`/api/contacts/${uuid}`, "GET"),
  createContact: (data: HellotickContact) =>
    call("/api/contacts", "POST", data),
  updateContact: (uuid: string, data: Partial<HellotickContact>) =>
    call(`/api/contacts/${uuid}`, "PUT", data),
  deleteContact: (uuid: string) =>
    call(`/api/contacts/${uuid}`, "DELETE"),

  // Contact Groups
  listContactGroups: (params?: Record<string, string | number | undefined>) =>
    call("/api/contact-groups", "GET", undefined, params),
  getContactGroup: (uuid: string) =>
    call(`/api/contact-groups/${uuid}`, "GET"),
  createContactGroup: (data: HellotickContactGroup) =>
    call("/api/contact-groups", "POST", data),
  updateContactGroup: (uuid: string, data: Partial<HellotickContactGroup>) =>
    call(`/api/contact-groups/${uuid}`, "PUT", data),
  deleteContactGroup: (uuid: string) =>
    call(`/api/contact-groups/${uuid}`, "DELETE"),

  // Canned Replies
  listCannedReplies: (params?: Record<string, string | number | undefined>) =>
    call("/api/canned-replies", "GET", undefined, params),
  getCannedReply: (uuid: string) =>
    call(`/api/canned-replies/${uuid}`, "GET"),
  createCannedReply: (data: HellotickCannedReply) =>
    call("/api/canned-replies", "POST", data),
  updateCannedReply: (uuid: string, data: Partial<HellotickCannedReply>) =>
    call(`/api/canned-replies/${uuid}`, "PUT", data),
  deleteCannedReply: (uuid: string) =>
    call(`/api/canned-replies/${uuid}`, "DELETE"),

  // Templates (read-only — managed in HelloTick dashboard)
  listTemplates: (params?: Record<string, string | number | undefined>) =>
    call("/api/templates", "GET", undefined, params),

  // Send
  sendText: (data: HellotickSendTextPayload) =>
    call("/api/send", "POST", data),
  sendMedia: (data: HellotickSendMediaPayload) =>
    call("/api/send/media", "POST", data),
  sendTemplate: (data: HellotickSendTemplatePayload) =>
    call("/api/send/template", "POST", data),

  // Interactive messages - Try standard WhatsApp Cloud API format
  sendInteractive: async (data: HellotickInteractivePayload) => {
    // First try direct /api/send with interactive payload
    try {
      return await call("/api/send", "POST", data);
    } catch (err) {
      // Fallback: Try /api/send/interactive
      try {
        return await call("/api/send/interactive", "POST", data);
      } catch {
        // Last resort: Convert to rich text message with emojis
        const buttons = data.action.buttons || [];
        const buttonText = buttons.map((b, i) => `${i + 1}️⃣ ${b.reply.title}`).join('\n');
        const fullMessage = `${data.header?.text ? `*${data.header.text}*\n\n` : ''}${data.body.text}\n\n${buttonText}${data.footer?.text ? `\n\n_${data.footer.text}_` : ''}`;

        return await call("/api/send", "POST", {
          phone: data.phone,
          message: fullMessage,
        });
      }
    }
  },
};

export const hellotickConfig = {
  baseUrl: BASE_URL,
  hasKey: Boolean(API_KEY),
};

export function normalizePhone(phone: string | undefined | null): string {
  if (!phone) return "";
  const trimmed = phone.trim().replace(/\s+/g, "");
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

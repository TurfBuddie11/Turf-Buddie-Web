import { NextRequest, NextResponse } from "next/server";
import { hellotick, hellotickConfig } from "@/lib/hellotick/client";
import { isAdminAuthenticated, unauthorizedResponse } from "@/lib/auth/admin";

const ALLOWED_PREFIXES = [
  "/api/contacts",
  "/api/contact-groups",
  "/api/canned-replies",
  "/api/templates",
  "/api/send",
];

function isAllowed(path: string): boolean {
  return ALLOWED_PREFIXES.some(
    (p) => path === p || path.startsWith(`${p}/`),
  );
}

async function handle(request: NextRequest, params: Promise<{ path: string[] }>) {
  if (!hellotickConfig.hasKey) {
    return NextResponse.json(
      { error: "HELLOTICK_API_KEY is not configured" },
      { status: 500 },
    );
  }

  const authed = await isAdminAuthenticated();
  if (!authed) return unauthorizedResponse();

  const { path } = await params;
  const segments = path || [];
  const hellotickPath = `/api/${segments.join("/")}`;

  if (!isAllowed(hellotickPath)) {
    return NextResponse.json(
      { error: `Endpoint ${hellotickPath} is not allowed via proxy` },
      { status: 403 },
    );
  }

  const method = request.method;
  const body =
    method === "GET" || method === "DELETE"
      ? undefined
      : await request.json().catch(() => ({}));

  const search = Object.fromEntries(request.nextUrl.searchParams.entries());

  try {
    let result: unknown;
    const lowerPath = hellotickPath.toLowerCase();

    if (lowerPath === "/api/contacts" && method === "GET") {
      result = await hellotick.listContacts(search);
    } else if (lowerPath === "/api/contacts" && method === "POST") {
      result = await hellotick.createContact(body);
    } else if (lowerPath.match(/^\/api\/contacts\/[^/]+$/) && method === "GET") {
      result = await hellotick.getContact(segments[1]);
    } else if (lowerPath.match(/^\/api\/contacts\/[^/]+$/) && method === "PUT") {
      result = await hellotick.updateContact(segments[1], body);
    } else if (lowerPath.match(/^\/api\/contacts\/[^/]+$/) && method === "DELETE") {
      result = await hellotick.deleteContact(segments[1]);
    } else if (lowerPath === "/api/contact-groups" && method === "GET") {
      result = await hellotick.listContactGroups(search);
    } else if (lowerPath === "/api/contact-groups" && method === "POST") {
      result = await hellotick.createContactGroup(body);
    } else if (lowerPath.match(/^\/api\/contact-groups\/[^/]+$/) && method === "GET") {
      result = await hellotick.getContactGroup(segments[1]);
    } else if (lowerPath.match(/^\/api\/contact-groups\/[^/]+$/) && method === "PUT") {
      result = await hellotick.updateContactGroup(segments[1], body);
    } else if (lowerPath.match(/^\/api\/contact-groups\/[^/]+$/) && method === "DELETE") {
      result = await hellotick.deleteContactGroup(segments[1]);
    } else if (lowerPath === "/api/canned-replies" && method === "GET") {
      result = await hellotick.listCannedReplies(search);
    } else if (lowerPath === "/api/canned-replies" && method === "POST") {
      result = await hellotick.createCannedReply(body);
    } else if (lowerPath.match(/^\/api\/canned-replies\/[^/]+$/) && method === "GET") {
      result = await hellotick.getCannedReply(segments[1]);
    } else if (lowerPath.match(/^\/api\/canned-replies\/[^/]+$/) && method === "PUT") {
      result = await hellotick.updateCannedReply(segments[1], body);
    } else if (lowerPath.match(/^\/api\/canned-replies\/[^/]+$/) && method === "DELETE") {
      result = await hellotick.deleteCannedReply(segments[1]);
    } else if (lowerPath === "/api/templates" && method === "GET") {
      result = await hellotick.listTemplates(search);
    } else if (lowerPath === "/api/send" && method === "POST") {
      result = await hellotick.sendText(body);
    } else if (lowerPath === "/api/send/media" && method === "POST") {
      result = await hellotick.sendMedia(body);
    } else if (lowerPath === "/api/send/template" && method === "POST") {
      result = await hellotick.sendTemplate(body);
    } else {
      return NextResponse.json(
        { error: `Unsupported ${method} ${hellotickPath}` },
        { status: 405 },
      );
    }

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const status =
      err && typeof err === "object" && "status" in err
        ? Number((err as { status: number }).status) || 500
        : 500;
    console.error(`[hellotick proxy] ${method} ${hellotickPath} failed:`, message);
    return NextResponse.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return handle(request, ctx.params);
}
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return handle(request, ctx.params);
}
export async function PUT(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return handle(request, ctx.params);
}
export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return handle(request, ctx.params);
}
export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ path: string[] }> },
) {
  return handle(request, ctx.params);
}

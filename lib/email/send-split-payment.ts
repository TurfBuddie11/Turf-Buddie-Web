import nodemailer from "nodemailer";

let cachedTransporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    console.warn(
      "[email] SMTP env not configured (SMTP_HOST/SMTP_USER/SMTP_PASSWORD). Emails will be skipped.",
    );
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });

  return cachedTransporter;
}

export interface SplitPaymentEmailParams {
  to: string;
  memberName: string;
  organizerName: string;
  turfName: string;
  timeSlots: string[];
  daySlot: string;
  monthSlot: string;
  amount: number;
  payLink: string;
  expiresAt: string;
}

function buildSplitPaymentHtml(p: SplitPaymentEmailParams): string {
  const timeSlotsHtml = p.timeSlots
    .map((slot) => `<li style="margin:4px 0;color:#374151;">${slot}</li>`)
    .join("");

  const expires = new Date(p.expiresAt).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Pay your share — Turf Buddie</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#111827;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#16a34a 0%,#22c55e 100%);padding:28px 24px;text-align:center;">
              <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:12px;padding:8px 14px;font-weight:700;font-size:14px;letter-spacing:0.5px;color:#ffffff;">TURF BUDDIE</div>
              <h1 style="margin:14px 0 4px 0;color:#ffffff;font-size:22px;font-weight:700;">You're invited to split the turf 🏟</h1>
              <p style="margin:0;color:#dcfce7;font-size:14px;">${p.organizerName} booked a slot and added you as a teammate.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:28px 24px 8px 24px;">
              <p style="margin:0 0 16px 0;font-size:15px;color:#111827;">Hi <strong>${p.memberName}</strong>,</p>
              <p style="margin:0 0 20px 0;font-size:14px;color:#374151;line-height:1.6;">
                Tap the button below to pay your share in a single click. The slot is held for <strong>30 minutes</strong> — if everyone pays, the booking is confirmed automatically.
              </p>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px;margin:0 0 20px 0;">
                <tr>
                  <td>
                    <p style="margin:0 0 6px 0;font-size:12px;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Venue</p>
                    <p style="margin:0 0 12px 0;font-size:16px;color:#111827;font-weight:700;">${p.turfName}</p>

                    <p style="margin:0 0 6px 0;font-size:12px;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Date</p>
                    <p style="margin:0 0 12px 0;font-size:14px;color:#111827;">${p.daySlot}, ${p.monthSlot}</p>

                    <p style="margin:0 0 6px 0;font-size:12px;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Time</p>
                    <ul style="margin:0 0 12px 18px;padding:0;font-size:14px;color:#111827;">
                      ${timeSlotsHtml}
                    </ul>

                    <p style="margin:0 0 6px 0;font-size:12px;color:#15803d;text-transform:uppercase;letter-spacing:0.5px;font-weight:700;">Your share</p>
                    <p style="margin:0;font-size:28px;color:#16a34a;font-weight:800;">₹${p.amount}</p>
                  </td>
                </tr>
              </table>

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 8px 0;">
                    <a href="${p.payLink}" target="_blank" style="display:inline-block;background:#16a34a;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:14px 32px;border-radius:10px;box-shadow:0 4px 12px rgba(22,163,74,0.3);">Pay ₹${p.amount} Now →</a>
                  </td>
                </tr>
              </table>

              <p style="margin:18px 0 0 0;font-size:12px;color:#6b7280;text-align:center;word-break:break-all;">
                Or copy this link: <a href="${p.payLink}" style="color:#16a34a;">${p.payLink}</a>
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:18px 24px 0 24px;">
              <p style="margin:0;padding:12px 16px;background:#fef3c7;border-left:3px solid #f59e0b;border-radius:6px;font-size:13px;color:#78350f;line-height:1.5;">
                ⏰ Please pay before <strong>${expires}</strong>. The slot will be released if the full amount isn't collected in time.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:24px;text-align:center;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#9ca3af;">Sent by Turf Buddie · Vidarbha Vibes</p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">You received this because ${p.organizerName} added you to a turf booking.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendSplitPaymentEmail(
  params: SplitPaymentEmailParams,
): Promise<{ ok: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return { ok: false, error: "SMTP not configured" };
  }

  const from =
    process.env.SMTP_FROM || process.env.SMTP_USER || "noreply@turfbuddie.com";

  try {
    await transporter.sendMail({
      from,
      to: params.to,
      subject: `🏟 ${params.organizerName} invited you to split ₹${params.amount} for ${params.turfName}`,
      html: buildSplitPaymentHtml(params),
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown email error";
    console.error(`[email] Failed to send to ${params.to}:`, message);
    return { ok: false, error: message };
  }
}

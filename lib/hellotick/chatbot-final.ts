/**
 * WhatsApp Chatbot - TurfBuddie
 *
 * Triggers:
 *   PLAYERS  → select city → select turf → view/book slots
 *   OWNERS   → enter registered mobile number → verified directly against the
 *              owners collection (no OTP) → full owner panel for their turf
 *
 * Owner commands (after mobile verification):
 *   SLOTS TODAY / SLOTS 30APR  — slot availability for a date
 *   BOOK 5PM                   — offline booking on own turf
 *   BLOCK 10AM / UNBLOCK 7AM   — block / reopen a slot
 *   CLOSE ALL / OPEN ALL       — bulk block / reopen a whole day
 *   REPORT TODAY               — bookings + revenue summary
 *   CANCEL TB-1234-5678        — cancel a booking by reference
 *
 * Owner writes go to Turfs.timeSlots (the same array the website reads),
 * so changes reflect on the site instantly.
 *
 * Smart inputs:
 *   • City/turf can be picked by NUMBER or by typing the NAME
 *   • "6 PM TODAY" checks if that slot is available at the selected turf
 */

import { hellotick, normalizePhone } from "./client";
import { adminDb } from "@/lib/firebase/admin";

interface IncomingMessage {
  from: string;
  text?: string;
  type: "text" | "image" | "video" | "document" | "audio" | "button" | "list";
  timestamp?: number;
}

interface WhatsappSession {
  lastCommand?: string;
  waitingFor?: string;
  cities?: string[];
  selectedCity?: string;
  turfs?: Array<{ id: string; name: string }>;
  selectedTurf?: { id: string; name: string };
  availableSlots?: string[];
  ownerPhone?: string;
  ownerId?: string;
  ownerName?: string;
  ownerTurfId?: string;
  ownerTurfName?: string;
  ownerVerified?: boolean;
  updatedAt?: number;
  [key: string]: unknown;
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function logChat(
  phone: string,
  step: string,
  message: string,
  data?: unknown,
) {
  await adminDb.collection("whatsappChatLogs").add({
    phone,
    step,
    message,
    data: data || null,
    timestamp: new Date().toISOString(),
  });
}

function extractString(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  if (Array.isArray(value) && value.length > 0) return extractString(value[0]);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const k of ["name", "city", "cityName", "label", "displayName"]) {
      const v = extractString(obj[k]);
      if (v) return v;
    }
    for (const k of Object.keys(obj)) {
      const v = extractString(obj[k]);
      if (v) return v;
    }
  }
  return "";
}

async function getCities(): Promise<string[]> {
  const snap = await adminDb.collection("Turfs").get();
  const cities = new Set<string>();
  snap.docs.forEach((doc) => {
    const city = extractString(doc.data().city);
    if (city) cities.add(city);
  });
  return Array.from(cities).sort();
}

async function getTurfsInCity(
  city: string,
): Promise<Array<{ id: string; name: string }>> {
  const snap = await adminDb.collection("Turfs").get();
  const cityLower = city.toLowerCase().trim();
  return snap.docs
    .filter((doc) => extractString(doc.data().city).toLowerCase() === cityLower)
    .map((doc) => ({
      id: doc.id,
      name: (doc.data().name as string) || "Unnamed Turf",
    }));
}

function getToday(): { daySlot: string; monthSlot: string; formatted: string } {
  const now = new Date();
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return {
    daySlot: now.getDate().toString(),
    monthSlot: months[now.getMonth()],
    formatted: `${now.getDate()} ${months[now.getMonth()]}`,
  };
}

const ALL_SLOTS = [
  "6 AM - 7 AM",
  "7 AM - 8 AM",
  "8 AM - 9 AM",
  "9 AM - 10 AM",
  "10 AM - 11 AM",
  "11 AM - 12 PM",
  "12 PM - 1 PM",
  "1 PM - 2 PM",
  "2 PM - 3 PM",
  "3 PM - 4 PM",
  "4 PM - 5 PM",
  "5 PM - 6 PM",
  "6 PM - 7 PM",
  "7 PM - 8 PM",
  "8 PM - 9 PM",
];

async function getSlotsForToday(
  turfId: string,
): Promise<{ available: string[]; booked: string[] }> {
  const today = getToday();
  const snap = await adminDb
    .collection("Bookings")
    .where("turfId", "==", turfId)
    .where("daySlot", "==", today.daySlot)
    .where("monthSlot", "==", today.monthSlot)
    .get();

  const bookedSet = new Set<string>();
  snap.docs.forEach((doc) => {
    const slots = Array.isArray(doc.data().timeSlot)
      ? doc.data().timeSlot
      : [doc.data().timeSlot];
    slots.forEach((s: string) => bookedSet.add(s));
  });

  return {
    available: ALL_SLOTS.filter((s) => !bookedSet.has(s)),
    booked: ALL_SLOTS.filter((s) => bookedSet.has(s)),
  };
}

/**
 * Parse "6 PM", "6 PM TODAY", "6:00 PM", "6PM" → "6 PM - 7 PM"
 */
function parseTimeSlotQuery(text: string): string | null {
  const cleaned = text.replace(/\b(today|tonight|aaj)\b/gi, "").trim();
  const m = cleaned.match(/^(\d{1,2})(?:[:.]00)?\s*(am|pm)$/i);
  if (!m) return null;

  const h = parseInt(m[1]);
  const p = m[2].toUpperCase() as "AM" | "PM";
  if (h < 1 || h > 12) return null;

  let eh = h + 1;
  let ep = p;
  if (p === "AM" && h === 11) {
    eh = 12;
    ep = "PM";
  } else if (p === "PM" && h === 12) {
    eh = 1;
    ep = "PM";
  } else if (eh > 12) {
    eh = eh - 12;
  }

  return `${h} ${p} - ${eh} ${ep}`;
}

// ─── shared flow helpers ─────────────────────────────────────────────────────

async function showTurfsForCity(
  phone: string,
  city: string,
  cities: string[],
  sessionRef: FirebaseFirestore.DocumentReference,
) {
  const turfs = await getTurfsInCity(city);
  if (turfs.length === 0) {
    await hellotick.sendText({
      phone,
      message: `No turfs found in *${city}*.\n\nSend *PLAYERS* to try another city.`,
    });
    await logChat(phone, "no_turfs", `No turfs in ${city}`);
    return;
  }
  const turfList = turfs.map((t, i) => `${i + 1}. *${t.name}*`).join("\n");
  await hellotick.sendText({
    phone,
    message: `🏟️ *Turfs in ${city}*\n\n${turfList}\n\n_Reply with turf number or name_`,
  });
  await logChat(phone, "turf_selection", `Sent turfs in ${city}`, {
    city,
    count: turfs.length,
  });
  await sessionRef.set({
    lastCommand: "select_turf",
    waitingFor: "turf",
    selectedCity: city,
    turfs,
    cities,
    updatedAt: Date.now(),
  });
}

async function showSlotsForTurf(
  phone: string,
  turf: { id: string; name: string },
  sessionRef: FirebaseFirestore.DocumentReference,
) {
  const today = getToday();
  const { available, booked } = await getSlotsForToday(turf.id);

  const slotDisplay = ALL_SLOTS.map((slot) =>
    booked.includes(slot) ? `~~${slot}~~ ❌` : `*${slot}* ✅`,
  ).join("\n");

  if (available.length === 0) {
    await hellotick.sendText({
      phone,
      message: `*${turf.name}*\n📅 Today, ${today.formatted}\n\n${slotDisplay}\n\n_All slots booked. Send *PLAYERS* to try another turf._`,
    });
    return;
  }

  const quickActions = available
    .slice(0, 5)
    .map((slot, i) => `${i + 1}. ${slot}`)
    .join("\n");
  const msg =
    `*${turf.name}*\n📅 Today, ${today.formatted}\n\n` +
    `${slotDisplay}\n\n` +
    `*Quick book (reply with number):*\n${quickActions}\n\n` +
    `_Or send: *BOOK 5 PM - 6 PM*_`;

  await hellotick.sendText({ phone, message: msg });
  await logChat(phone, "show_slots", `Sent slots for ${turf.name}`, {
    turfId: turf.id,
    available: available.length,
  });
  await sessionRef.set({
    lastCommand: "view_slots",
    waitingFor: "booking",
    selectedTurf: turf,
    availableSlots: available,
    updatedAt: Date.now(),
  });
}

// ─── main handler ────────────────────────────────────────────────────────────

export async function handleIncomingMessage(
  message: IncomingMessage,
): Promise<void> {
  const phone = normalizePhone(message.from);
  const text = (message.text || "").trim().toUpperCase();

  if (!phone)
    throw new Error(
      `Empty phone. Payload: ${JSON.stringify(message).slice(0, 200)}`,
    );

  console.log("[chatbot] From:", phone, "→", text);

  await adminDb.collection("whatsappIncomingMessages").add({
    from: phone,
    text: message.text ?? null,
    type: message.type,
    timestamp: message.timestamp || Date.now(),
    processedAt: new Date().toISOString(),
  });

  const sessionRef = adminDb.collection("whatsappSessions").doc(phone);
  const sessionDoc = await sessionRef.get();
  const session: WhatsappSession = sessionDoc.exists
    ? (sessionDoc.data() as WhatsappSession)
    : {};

  try {
    // ── Welcome ──────────────────────────────────────────────────────────
    if (["HI", "HELLO", "START", "MENU", "HELP"].includes(text)) {
      const ctx = session.ownerVerified ? ownerCtxFromSession(session) : null;
      if (ctx) {
        await hellotick.sendText({
          phone,
          message: `🏟️ *Owner Panel — ${ctx.turfName}*\n👤 Logged in as ${ctx.ownerName}\n\n${OWNER_COMMANDS}`,
        });
        await logChat(phone, "owner_menu", "Sent owner menu");
      } else {
        const msg =
          `👋 *Welcome to TurfBuddie!*\n\n` +
          `I'm your smart turf booking assistant.\n\n` +
          `⚽ Send *PLAYERS* to browse & book slots\n` +
          `🏟️ Send *OWNERS* for the owner panel\n\n` +
          `_TurfBuddie_`;
        await hellotick.sendText({ phone, message: msg });
        await logChat(phone, "welcome", "Sent welcome");
        await sessionRef.set({ lastCommand: "welcome", updatedAt: Date.now() });
      }
    }

    // ── OWNERS → ask registered mobile (verified straight from DB) ───────
    else if (["OWNERS", "OWNER", "OWNER UPDATE"].includes(text)) {
      const ctx = session.ownerVerified ? ownerCtxFromSession(session) : null;
      if (ctx) {
        await showOwnerPanel(phone, ctx, `🏟️ *Owner Panel*`);
      } else {
        await askOwnerMobile(phone, sessionRef);
      }
    }

    // ── Owner mobile number entry ─────────────────────────────────────────
    else if (session.waitingFor === "owner_mobile") {
      await verifyOwnerMobile(phone, message.text || "", sessionRef);
    }

    // ── PLAYERS → ask city ────────────────────────────────────────────────
    else if (
      text === "PLAYERS" ||
      (!session.ownerVerified &&
        ["SLOTS", "SLOTS TODAY", "BOOK"].includes(text))
    ) {
      const cities = await getCities();
      if (cities.length === 0) {
        await hellotick.sendText({
          phone,
          message: "No cities available. Try again later.",
        });
        return;
      }
      const cityList = cities.map((c, i) => `${i + 1}. *${c}*`).join("\n");
      await hellotick.sendText({
        phone,
        message: `📍 *Select Your City*\n\n${cityList}\n\n_Reply with number or city name_`,
      });
      await logChat(phone, "city_selection", "Sent city list", {
        count: cities.length,
      });
      await sessionRef.set({
        lastCommand: "select_city",
        waitingFor: "city",
        cities,
        updatedAt: Date.now(),
      });
    }

    // ── Verified owner: everything else goes to the owner command router ─
    else if (session.ownerVerified) {
      const ctx = ownerCtxFromSession(session);
      if (!ctx) {
        await askOwnerMobile(phone, sessionRef);
      } else {
        await handleOwnerCommand(phone, text, ctx, sessionRef);
      }
    }

    // ── City selected by NUMBER ───────────────────────────────────────────
    else if (/^\d+$/.test(text) && session.waitingFor === "city") {
      const cities = session.cities || [];
      const idx = parseInt(text) - 1;
      if (!cities[idx]) {
        await hellotick.sendText({
          phone,
          message: `Invalid number. Reply with 1–${cities.length}`,
        });
        return;
      }
      await showTurfsForCity(phone, cities[idx], cities, sessionRef);
    }

    // ── City selected by NAME ─────────────────────────────────────────────
    else if (session.waitingFor === "city") {
      const cities = session.cities || [];
      const rawText = (message.text || "").trim();
      const match = cities.find((c) =>
        c.toLowerCase().includes(rawText.toLowerCase()),
      );
      if (match) {
        await showTurfsForCity(phone, match, cities, sessionRef);
      } else {
        const list = cities.map((c, i) => `${i + 1}. ${c}`).join("\n");
        await hellotick.sendText({
          phone,
          message: `❓ City not found.\n\nAvailable cities:\n${list}\n\n_Reply with number or exact city name_`,
        });
      }
    }

    // ── Turf selected by NUMBER ───────────────────────────────────────────
    else if (/^\d+$/.test(text) && session.waitingFor === "turf") {
      const turfs = session.turfs || [];
      const idx = parseInt(text) - 1;
      if (!turfs[idx]) {
        await hellotick.sendText({
          phone,
          message: `Invalid number. Reply with 1–${turfs.length}`,
        });
        return;
      }
      await showSlotsForTurf(phone, turfs[idx], sessionRef);
    }

    // ── Turf selected by NAME ─────────────────────────────────────────────
    else if (session.waitingFor === "turf") {
      const turfs = session.turfs || [];
      const rawText = (message.text || "").trim();
      const match = turfs.find((t) =>
        t.name.toLowerCase().includes(rawText.toLowerCase()),
      );
      if (match) {
        await showSlotsForTurf(phone, match, sessionRef);
      } else {
        const list = turfs.map((t, i) => `${i + 1}. ${t.name}`).join("\n");
        await hellotick.sendText({
          phone,
          message: `❓ Turf not found.\n\nAvailable turfs:\n${list}\n\n_Reply with number or turf name_`,
        });
      }
    }

    // ── Time slot query: "6 PM TODAY", "6 PM" ────────────────────────────
    else if (parseTimeSlotQuery(text) !== null) {
      const slotQuery = parseTimeSlotQuery(text)!;
      if (!session.selectedTurf) {
        await hellotick.sendText({
          phone,
          message: `Please select a turf first.\n\nSend *PLAYERS* to start.`,
        });
      } else {
        const { available, booked } = await getSlotsForToday(
          session.selectedTurf.id,
        );
        if (available.includes(slotQuery)) {
          await hellotick.sendText({
            phone,
            message: `✅ *${slotQuery}* is AVAILABLE at *${session.selectedTurf.name}*!\n\nTo book, send:\n*BOOK ${slotQuery}*`,
          });
        } else if (booked.includes(slotQuery)) {
          await hellotick.sendText({
            phone,
            message: `❌ *${slotQuery}* is already BOOKED at *${session.selectedTurf.name}*.\n\nSend *PLAYERS* to see other available times.`,
          });
        } else {
          await hellotick.sendText({
            phone,
            message: `*${slotQuery}* is not in today's schedule.\n\nSlots run from 6 AM to 9 PM.\n\nSend *PLAYERS* to view available slots.`,
          });
        }
      }
    }

    // ── Book by number (quick action from slot list) ──────────────────────
    else if (/^\d+$/.test(text) && session.waitingFor === "booking") {
      const slots = session.availableSlots || [];
      const idx = parseInt(text) - 1;
      if (!slots[idx]) {
        await hellotick.sendText({
          phone,
          message: `Invalid number. Reply with 1–${slots.length}`,
        });
        return;
      }
      if (!session.selectedTurf) {
        await hellotick.sendText({
          phone,
          message: "Please select a turf first. Send *PLAYERS* to start.",
        });
        return;
      }
      await processBooking(phone, session.selectedTurf, slots[idx]);
    }

    // ── BOOK command ──────────────────────────────────────────────────────
    else if (text.startsWith("BOOK ")) {
      if (!session.selectedTurf) {
        await hellotick.sendText({
          phone,
          message: "Please select a turf first. Send *PLAYERS* to start.",
        });
        return;
      }
      const slot = text.replace("BOOK ", "").trim();
      await processBooking(phone, session.selectedTurf, slot);
    }

    // ── Unknown ───────────────────────────────────────────────────────────
    else {
      await hellotick.sendText({
        phone,
        message: `I didn't understand that.\n\n⚽ Send *PLAYERS* to book a slot\n🏟️ Send *OWNERS* for owner panel\n💬 Send *HI* for the menu`,
      });
      await logChat(phone, "unknown_command", text);
    }
  } catch (error) {
    console.error("[chatbot] Error:", error);
    await hellotick.sendText({
      phone,
      message: "Sorry, something went wrong. Send *HI* to restart.",
    });
    await logChat(phone, "error", (error as Error).message);
  }
}

// ─── booking ─────────────────────────────────────────────────────────────────

async function processBooking(
  phone: string,
  turf: { id: string; name: string },
  timeSlot: string,
) {
  const today = getToday();

  const already = await adminDb
    .collection("Bookings")
    .where("turfId", "==", turf.id)
    .where("daySlot", "==", today.daySlot)
    .where("monthSlot", "==", today.monthSlot)
    .where("timeSlot", "==", timeSlot)
    .get();

  if (!already.empty) {
    await hellotick.sendText({
      phone,
      message: `Sorry, *${timeSlot}* is already booked.\n\nSend *PLAYERS* to see other times.`,
    });
    return;
  }

  const refCode = `TB-${Date.now().toString().slice(-4)}`;
  const bookingLink = `https://www.turfbuddie.com/turfs/${turf.id}?ref=${refCode}&slot=${encodeURIComponent(timeSlot)}`;

  const msg =
    `⚡ *Almost there!*\n\n` +
    `📍 ${turf.name}\n` +
    `📅 Today, ${today.formatted}\n` +
    `⏰ ${timeSlot}\n` +
    `🆔 Ref: ${refCode}\n\n` +
    `👉 *Tap to confirm & pay:*\n${bookingLink}\n\n` +
    `_Send *PLAYERS* to book another slot_`;

  await hellotick.sendText({ phone, message: msg });

  await adminDb.collection("pendingWhatsAppBookings").add({
    phone,
    turfId: turf.id,
    turfName: turf.name,
    timeSlot,
    daySlot: today.daySlot,
    monthSlot: today.monthSlot,
    refCode,
    paymentLink: bookingLink,
    status: "pending_payment",
    createdAt: new Date().toISOString(),
  });

  await logChat(phone, "booking_link_sent", "Booking link sent", {
    turf: turf.name,
    timeSlot,
    refCode,
  });

  await adminDb
    .collection("whatsappSessions")
    .doc(phone)
    .set(
      {
        lastCommand: "booked",
        waitingFor: null,
        availableSlots: null,
        updatedAt: Date.now(),
      },
      { merge: true },
    );
}

// ─── owner panel: helpers (Turfs.timeSlots — same array the website reads) ────

type SlotEntry = Record<string, unknown>;

interface OwnerCtx {
  ownerId: string;
  ownerName: string;
  turfId: string;
  turfName: string;
}

const OWNER_COMMANDS =
  `*Commands:*\n` +
  `• *SLOTS TODAY* / *SLOTS 30APR* — view slots for a date\n` +
  `• *BOOK 5PM* — book a slot (offline)\n` +
  `• *BLOCK 10AM* — block a slot\n` +
  `• *UNBLOCK 7AM* — reopen a blocked slot\n` +
  `• *CLOSE ALL* / *OPEN ALL* — block/open the whole day\n` +
  `• *REPORT TODAY* — daily bookings + revenue\n` +
  `• *CANCEL TB-1234-5678* — cancel a booking by ref\n` +
  `• *LOGOUT* — exit the owner panel\n\n` +
  `_TurfBuddie Owner Panel_`;

// Slot start labels 6 AM → 8 PM (each slot is 1 hour)
const SLOT_STARTS = [
  "6 AM",
  "7 AM",
  "8 AM",
  "9 AM",
  "10 AM",
  "11 AM",
  "12 PM",
  "1 PM",
  "2 PM",
  "3 PM",
  "4 PM",
  "5 PM",
  "6 PM",
  "7 PM",
  "8 PM",
];

const ACTIVE_BOOKED_STATUSES = ["confirmed", "pending", "booked_offline"];

function slotFullLabel(start: string): string {
  const i = SLOT_STARTS.indexOf(start);
  return `${start} - ${SLOT_STARTS[i + 1] || "9 PM"}`;
}

/** Parse "5PM", "5 PM", "5:00 PM", "5 PM - 6 PM" → "5 PM" (or null if invalid) */
function parseSlotTime(arg: string): string | null {
  const first = (arg || "").trim().toUpperCase().split(" - ")[0];
  const m = first.match(/^(\d{1,2})(?:[:.]00)?\s*(AM|PM)$/);
  if (!m) return null;
  const start = `${parseInt(m[1])} ${m[2]}`;
  return SLOT_STARTS.includes(start) ? start : null;
}

interface OwnerDate {
  day: number;
  month: string; // "Apr"
  weekday: string; // "Monday"
  label: string; // "30 Apr" — matches monthSlot format used by the website
  isToday: boolean;
}

const MONTH_FULL = [
  "JANUARY",
  "FEBRUARY",
  "MARCH",
  "APRIL",
  "MAY",
  "JUNE",
  "JULY",
  "AUGUST",
  "SEPTEMBER",
  "OCTOBER",
  "NOVEMBER",
  "DECEMBER",
];
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Parse "" / "TODAY" / "TOMORROW" / "30APR" / "30 APR" / "30 APRIL" → OwnerDate */
function parseDateArg(arg?: string): OwnerDate | null {
  const a = (arg || "").trim().toUpperCase();
  let d = new Date();
  if (a === "TOMORROW" || a === "KAL") {
    d.setDate(d.getDate() + 1);
  } else if (a && a !== "TODAY" && a !== "AAJ") {
    const m = a.match(/^(\d{1,2})\s*([A-Z]{3,9})$/);
    if (!m) return null;
    const day = parseInt(m[1]);
    const mi = MONTH_FULL.findIndex((name) => name.startsWith(m[2]));
    if (mi === -1 || day < 1 || day > 31) return null;
    d = new Date(new Date().getFullYear(), mi, day);
    if (d.getDate() !== day) return null; // rolled over (eg 31 Feb)
  }
  const now = new Date();
  return {
    day: d.getDate(),
    month: MONTH_SHORT[d.getMonth()],
    weekday: d.toLocaleDateString("en-US", { weekday: "long" }),
    label: `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`,
    isToday: d.getDate() === now.getDate() && d.getMonth() === now.getMonth(),
  };
}

function toSlotArray(v: unknown): SlotEntry[] {
  if (Array.isArray(v)) return [...v] as SlotEntry[];
  if (v && typeof v === "object") return Object.values(v) as SlotEntry[];
  return [];
}

function entryOnDate(e: SlotEntry, date: OwnerDate): boolean {
  const parts = String(e.monthSlot || "")
    .trim()
    .split(/\s+/);
  if (parts.length !== 2) return false;
  return (
    parseInt(parts[0]) === date.day &&
    parts[1].toLowerCase() === date.month.toLowerCase()
  );
}

/** An entry may hold one slot (timeSlot) or several (timeSlots array) */
function entryLabels(e: SlotEntry): string[] {
  if (Array.isArray(e.timeSlots)) return (e.timeSlots as unknown[]).map(String);
  return e.timeSlot ? [String(e.timeSlot)] : [];
}

/** Match both stored formats: "5 PM" (API) and "5 PM - 6 PM" (website) */
function entryHasSlot(e: SlotEntry, start: string): boolean {
  return entryLabels(e).some((raw) => {
    const ts = raw.trim();
    return (
      ts === start || ts.startsWith(`${start} -`) || ts.startsWith(`${start}-`)
    );
  });
}

function slotStatusFor(
  entries: SlotEntry[],
  date: OwnerDate,
  start: string,
): "available" | "booked" | "blocked" {
  let blocked = false;
  for (const e of entries) {
    if (!entryOnDate(e, date) || !entryHasSlot(e, start)) continue;
    const st = String(e.status || "").toLowerCase();
    if (ACTIVE_BOOKED_STATUSES.includes(st)) return "booked";
    if (st === "blocked") blocked = true;
  }
  return blocked ? "blocked" : "available";
}

async function buildOwnerSlotGrid(
  turfId: string,
  date: OwnerDate,
  preloaded?: SlotEntry[],
): Promise<string> {
  let entries = preloaded;
  if (!entries) {
    const snap = await adminDb.collection("Turfs").doc(turfId).get();
    entries = toSlotArray(snap.data()?.timeSlots);
  }
  return SLOT_STARTS.map((start) => {
    const status = slotStatusFor(entries!, date, start);
    const label = slotFullLabel(start);
    if (status === "booked") return `❌ ~${label}~ booked`;
    if (status === "blocked") return `🚫 ~${label}~ blocked`;
    return `✅ *${label}*`;
  }).join("\n");
}

/** Read-modify-write Turfs.timeSlots inside a transaction (safe vs concurrent bookings) */
async function mutateTurfSlots<T>(
  turfId: string,
  fn: (
    slots: SlotEntry[],
    turfData: SlotEntry,
  ) => { slots?: SlotEntry[]; result: T },
): Promise<T> {
  const ref = adminDb.collection("Turfs").doc(turfId);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const data = (snap.data() || {}) as SlotEntry;
    const { slots, result } = fn(toSlotArray(data.timeSlots), data);
    if (slots) tx.update(ref, { timeSlots: slots });
    return result;
  });
}

/** Ref code in the same style the website uses: TB-DDMM-XXXX */
function makeRefCode(): string {
  const now = new Date();
  const dm = `${String(now.getDate()).padStart(2, "0")}${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `TB-${dm}-${Math.floor(1000 + Math.random() * 9000)}`;
}

function ownerCtxFromSession(session: WhatsappSession): OwnerCtx | null {
  if (!session.ownerTurfId || !session.ownerTurfName) return null;
  return {
    ownerId: session.ownerId || "",
    ownerName: session.ownerName || "Owner",
    turfId: session.ownerTurfId,
    turfName: session.ownerTurfName,
  };
}

// ─── owner panel: mobile verification (direct DB check, no OTP) ───────────────

async function askOwnerMobile(
  phone: string,
  sessionRef: FirebaseFirestore.DocumentReference,
) {
  await hellotick.sendText({
    phone,
    message:
      `🔐 *Venue Owner Panel*\n\n` +
      `Please enter your *registered mobile number* to continue.\n\n` +
      `Eg: 9876543210\n\n` +
      `_We'll verify it against our owner records_`,
  });
  await logChat(phone, "owner_mobile_requested", "Asked for owner mobile");
  await sessionRef.set({
    lastCommand: "owner_mobile",
    waitingFor: "owner_mobile",
    updatedAt: Date.now(),
  });
}

async function verifyOwnerMobile(
  phone: string,
  rawText: string,
  sessionRef: FirebaseFirestore.DocumentReference,
) {
  const digits = rawText.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 12) {
    await hellotick.sendText({
      phone,
      message: `❌ That doesn't look like a valid mobile number.\n\nPlease send your *10-digit registered mobile number*.\nEg: 9876543210\n\n_Send *HI* to go back to the menu_`,
    });
    return;
  }
  const last10 = digits.slice(-10);

  // Owners store mobiles in mixed formats (10-digit, +91…) — match on last 10 digits
  const ownersSnap = await adminDb.collection("owners").get();
  const ownerDoc = ownersSnap.docs.find((doc) => {
    const d = doc.data();
    const stored = String(d.mobile || d.phone || d.phoneNumber || "").replace(
      /\D/g,
      "",
    );
    return stored.length >= 10 && stored.slice(-10) === last10;
  });

  if (!ownerDoc) {
    await hellotick.sendText({
      phone,
      message: `❌ *${last10}* is not registered as a turf owner.\n\nPlease check the number and try again, or contact support to register your turf.\n\n_Send *HI* to go back to the menu_`,
    });
    await logChat(phone, "owner_mobile_failed", `No owner found for ${last10}`);
    return;
  }

  const ownerName = (ownerDoc.data().name as string) || "Owner";
  const turfsSnap = await adminDb
    .collection("Turfs")
    .where("ownerId", "==", ownerDoc.id)
    .limit(1)
    .get();
  if (turfsSnap.empty) {
    await hellotick.sendText({
      phone,
      message: `Verified as *${ownerName}*, but no turf is linked to your account yet.\n\nContact support to link your turf.`,
    });
    await logChat(phone, "owner_no_turf", `Owner ${ownerDoc.id} has no turf`);
    return;
  }

  const turfDoc = turfsSnap.docs[0];
  const ctx: OwnerCtx = {
    ownerId: ownerDoc.id,
    ownerName,
    turfId: turfDoc.id,
    turfName: (turfDoc.data().name as string) || "Your Turf",
  };

  await sessionRef.set({
    lastCommand: "owner_verified",
    waitingFor: "owner_command",
    ownerVerified: true,
    ownerId: ctx.ownerId,
    ownerName: ctx.ownerName,
    ownerTurfId: ctx.turfId,
    ownerTurfName: ctx.turfName,
    ownerPhone: last10,
    updatedAt: Date.now(),
  });
  await logChat(phone, "owner_verified", "Owner verified via mobile", {
    ownerName,
    turfName: ctx.turfName,
    mobile: last10,
  });

  await showOwnerPanel(phone, ctx, `✅ *Verified! Welcome, ${ownerName}*`);
}

async function showOwnerPanel(phone: string, ctx: OwnerCtx, headline: string) {
  const today = parseDateArg("")!;
  const grid = await buildOwnerSlotGrid(ctx.turfId, today);
  await hellotick.sendText({
    phone,
    message: `${headline}\n📍 ${ctx.turfName}\n\n📅 Today, ${today.label}\n\n${grid}\n\n${OWNER_COMMANDS}`,
  });
}

// ─── owner panel: command router ──────────────────────────────────────────────

async function handleOwnerCommand(
  phone: string,
  text: string,
  ctx: OwnerCtx,
  sessionRef: FirebaseFirestore.DocumentReference,
): Promise<void> {
  const slotsM = text.match(/^SLOTS?(?:\s+(.+))?$/);
  const bookM = text.match(/^BOOK(?:\s+(.+))?$/);
  const blockM = text.match(/^BLOCK(?:\s+(.+))?$/);
  const unblockM = text.match(/^UNBLOCK(?:\s+(.+))?$/);
  const closeM = text.match(/^CLOSE\s*ALL(?:\s+(.+))?$/);
  const openM = text.match(/^OPEN\s*ALL(?:\s+(.+))?$/);
  const reportM = text.match(/^REPORT(?:\s+(.+))?$/);
  const cancelM = text.match(/^CANCEL(?:\s+(.+))?$/);

  if (closeM) await ownerCloseAll(phone, ctx, closeM[1]);
  else if (openM) await ownerOpenAll(phone, ctx, openM[1]);
  else if (unblockM) await ownerUnblock(phone, ctx, unblockM[1] || "");
  else if (blockM) await ownerBlock(phone, ctx, blockM[1] || "");
  else if (bookM) await ownerBook(phone, ctx, bookM[1] || "");
  else if (slotsM) await ownerShowSlots(phone, ctx, slotsM[1]);
  else if (reportM) await ownerReport(phone, ctx, reportM[1]);
  else if (cancelM) await ownerCancel(phone, ctx, cancelM[1] || "");
  else if (["LOGOUT", "EXIT"].includes(text)) {
    await sessionRef.set({
      lastCommand: "owner_logout",
      updatedAt: Date.now(),
    });
    await hellotick.sendText({
      phone,
      message: `👋 Logged out of the owner panel.\n\nSend *OWNER* to log in again, or *HI* for the menu.`,
    });
    await logChat(phone, "owner_logout", "Owner logged out");
  } else {
    await hellotick.sendText({
      phone,
      message: `🏟️ *Owner Panel — ${ctx.turfName}*\n\n${OWNER_COMMANDS}`,
    });
  }
}

// ─── owner panel: commands ────────────────────────────────────────────────────

async function ownerShowSlots(phone: string, ctx: OwnerCtx, dateArg?: string) {
  const date = parseDateArg(dateArg);
  if (!date) {
    await hellotick.sendText({
      phone,
      message: `❓ Couldn't read that date.\n\nTry: *SLOTS TODAY* or *SLOTS 30APR*`,
    });
    return;
  }
  const grid = await buildOwnerSlotGrid(ctx.turfId, date);
  await hellotick.sendText({
    phone,
    message:
      `🏟️ *${ctx.turfName}*\n📅 ${date.isToday ? "Today, " : ""}${date.label}\n\n${grid}\n\n` +
      `_*BLOCK 10AM* • *UNBLOCK 7AM* • *BOOK 5PM* • *REPORT TODAY*_`,
  });
  await logChat(phone, "owner_slots", `Sent slots for ${date.label}`, {
    turfId: ctx.turfId,
  });
}

async function ownerBook(phone: string, ctx: OwnerCtx, timeArg: string) {
  const start = parseSlotTime(timeArg);
  if (!start) {
    await hellotick.sendText({
      phone,
      message: `❓ Couldn't read that time.\n\nTry: *BOOK 5PM*\n_Slots run 6 AM – 9 PM_`,
    });
    return;
  }
  const date = parseDateArg("")!;
  const full = slotFullLabel(start);
  const refCode = makeRefCode();

  type BookResult = { ok: boolean; status: string; price: number };
  const out = await mutateTurfSlots<BookResult>(
    ctx.turfId,
    (slots, turfData) => {
      const status = slotStatusFor(slots, date, start);
      if (status !== "available")
        return { result: { ok: false, status, price: 0 } };
      const price = Number(turfData.price) || 800;
      slots.push({
        turfId: ctx.turfId,
        timeSlot: full,
        daySlot: date.weekday,
        monthSlot: date.label,
        userUid: `owner_offline_${ctx.ownerId || phone}`,
        status: "booked_offline",
        price,
        refCode,
        transactionId: refCode,
        paid: "Collected by Owner",
        source: "whatsapp_owner",
        bookingDate: new Date().toISOString(),
      });
      return { slots, result: { ok: true, status: "booked", price } };
    },
  );

  if (!out.ok) {
    await hellotick.sendText({
      phone,
      message: `❌ *${full}* is already ${out.status} today.\n\nSend *SLOTS TODAY* to see availability.`,
    });
    return;
  }
  await hellotick.sendText({
    phone,
    message:
      `⚡ *Booking Confirmed!*\n\n📍 ${ctx.turfName}\n📅 Today, ${full}\n💰 ₹${out.price}\n🆔 Ref: *${refCode}*\n\n` +
      `✅ Website updated instantly — slot now shows unavailable.\n\n` +
      `_Send *CANCEL ${refCode}* to undo_`,
  });
  await logChat(phone, "owner_booked", `Offline booking ${full}`, {
    refCode,
    turfId: ctx.turfId,
  });
}

async function ownerBlock(phone: string, ctx: OwnerCtx, timeArg: string) {
  const start = parseSlotTime(timeArg);
  if (!start) {
    await hellotick.sendText({
      phone,
      message: `❓ Couldn't read that time.\n\nTry: *BLOCK 10AM*\n_Slots run 6 AM – 9 PM_`,
    });
    return;
  }
  const date = parseDateArg("")!;
  const full = slotFullLabel(start);

  const out = await mutateTurfSlots(ctx.turfId, (slots) => {
    const status = slotStatusFor(slots, date, start);
    if (status !== "available") return { result: status };
    slots.push({
      turfId: ctx.turfId,
      timeSlot: full,
      daySlot: date.weekday,
      monthSlot: date.label,
      userUid: `owner_blocked_${ctx.ownerId || phone}`,
      status: "blocked",
      blockedBy: "owner",
      blockedVia: "whatsapp",
      bookingDate: new Date().toISOString(),
    });
    return { slots, result: "done" as const };
  });

  if (out === "booked") {
    await hellotick.sendText({
      phone,
      message: `❌ *${full}* is already booked by a player — it can't be blocked.\n\nUse *CANCEL [REF]* first if needed (see *REPORT TODAY*).`,
    });
  } else if (out === "blocked") {
    await hellotick.sendText({
      phone,
      message: `*${full}* is already blocked.\n\nSend *UNBLOCK ${start.replace(" ", "")}* to reopen it.`,
    });
  } else {
    await hellotick.sendText({
      phone,
      message: `🚫 *${full} BLOCKED*\n\n✅ Website updated instantly\n📲 Players will now see this slot as unavailable.\n\n_Send *UNBLOCK ${start.replace(" ", "")}* to reopen_`,
    });
    await logChat(phone, "slot_blocked", `Blocked ${full}`, {
      turfId: ctx.turfId,
    });
  }
}

async function ownerUnblock(phone: string, ctx: OwnerCtx, timeArg: string) {
  const start = parseSlotTime(timeArg);
  if (!start) {
    await hellotick.sendText({
      phone,
      message: `❓ Couldn't read that time.\n\nTry: *UNBLOCK 7AM*`,
    });
    return;
  }
  const date = parseDateArg("")!;
  const full = slotFullLabel(start);

  const removed = await mutateTurfSlots(ctx.turfId, (slots) => {
    const idx = slots.findIndex(
      (e) =>
        entryOnDate(e, date) &&
        entryHasSlot(e, start) &&
        String(e.status || "").toLowerCase() === "blocked",
    );
    if (idx === -1) return { result: false };
    slots.splice(idx, 1);
    return { slots, result: true };
  });

  if (!removed) {
    await hellotick.sendText({
      phone,
      message: `*${full}* is not blocked today.\n\nSend *SLOTS TODAY* to see current status.`,
    });
    return;
  }
  await hellotick.sendText({
    phone,
    message: `✅ *${full} UNBLOCKED*\n\n✅ Website updated instantly\n📲 Slot is now open for booking.\n\n_Send *SLOTS TODAY* to see status_`,
  });
  await logChat(phone, "slot_unblocked", `Unblocked ${full}`, {
    turfId: ctx.turfId,
  });
}

async function ownerCloseAll(phone: string, ctx: OwnerCtx, dateArg?: string) {
  const date = parseDateArg(dateArg);
  if (!date) {
    await hellotick.sendText({
      phone,
      message: `❓ Couldn't read that date.\n\nTry: *CLOSE ALL* or *CLOSE ALL 30APR*`,
    });
    return;
  }

  const blockedCount = await mutateTurfSlots(ctx.turfId, (slots) => {
    const open = SLOT_STARTS.filter(
      (s) => slotStatusFor(slots, date, s) === "available",
    );
    open.forEach((s) =>
      slots.push({
        turfId: ctx.turfId,
        timeSlot: slotFullLabel(s),
        daySlot: date.weekday,
        monthSlot: date.label,
        userUid: `owner_blocked_${ctx.ownerId || phone}`,
        status: "blocked",
        blockedBy: "owner",
        blockedVia: "whatsapp",
        bookingDate: new Date().toISOString(),
      }),
    );
    return open.length ? { slots, result: open.length } : { result: 0 };
  });

  if (blockedCount === 0) {
    await hellotick.sendText({
      phone,
      message: `No open slots left on ${date.label} — everything is already booked or blocked.`,
    });
    return;
  }
  await hellotick.sendText({
    phone,
    message: `🚫 *DAY CLOSED — ${date.label}*\n\n${blockedCount} open slots blocked.\n✅ Website updated instantly.\n\n_Send *OPEN ALL${date.isToday ? "" : ` ${date.day}${date.month.toUpperCase()}`}* to reopen_`,
  });
  await logChat(phone, "day_closed", `Closed all slots for ${date.label}`, {
    turfId: ctx.turfId,
    blockedCount,
  });
}

async function ownerOpenAll(phone: string, ctx: OwnerCtx, dateArg?: string) {
  const date = parseDateArg(dateArg);
  if (!date) {
    await hellotick.sendText({
      phone,
      message: `❓ Couldn't read that date.\n\nTry: *OPEN ALL* or *OPEN ALL 30APR*`,
    });
    return;
  }

  const removedCount = await mutateTurfSlots(ctx.turfId, (slots) => {
    const kept = slots.filter(
      (e) =>
        !(
          entryOnDate(e, date) &&
          String(e.status || "").toLowerCase() === "blocked"
        ),
    );
    const removed = slots.length - kept.length;
    return removed ? { slots: kept, result: removed } : { result: 0 };
  });

  if (removedCount === 0) {
    await hellotick.sendText({
      phone,
      message: `No blocked slots on ${date.label}.\n\nSend *SLOTS TODAY* to see current status.`,
    });
    return;
  }
  await hellotick.sendText({
    phone,
    message: `✅ *DAY OPENED — ${date.label}*\n\n${removedCount} blocked slots reopened.\n✅ Website updated instantly.\n\n_Bookings by players were not touched_`,
  });
  await logChat(phone, "day_opened", `Opened all slots for ${date.label}`, {
    turfId: ctx.turfId,
    removedCount,
  });
}

async function ownerReport(phone: string, ctx: OwnerCtx, dateArg?: string) {
  const date = parseDateArg(dateArg);
  if (!date) {
    await hellotick.sendText({
      phone,
      message: `❓ Couldn't read that date.\n\nTry: *REPORT TODAY* or *REPORT 30APR*`,
    });
    return;
  }

  const snap = await adminDb.collection("Turfs").doc(ctx.turfId).get();
  const entries = toSlotArray(snap.data()?.timeSlots).filter((e) =>
    entryOnDate(e, date),
  );

  const bookings = entries.filter((e) =>
    ACTIVE_BOOKED_STATUSES.includes(String(e.status || "").toLowerCase()),
  );
  const revenue = bookings.reduce(
    (sum, e) => sum + (Number(e.price) || 800),
    0,
  );

  const total = SLOT_STARTS.length;
  const bookedCount = SLOT_STARTS.filter(
    (s) => slotStatusFor(entries, date, s) === "booked",
  ).length;
  const blockedCount = SLOT_STARTS.filter(
    (s) => slotStatusFor(entries, date, s) === "blocked",
  ).length;
  const available = total - bookedCount - blockedCount;
  const occupancy = ((bookedCount / total) * 100).toFixed(0);

  const lines = bookings.map((e, i) => {
    const ref = String(e.refCode || e.transactionId || "—");
    const st = String(e.status || "").toLowerCase();
    const pay =
      st === "confirmed"
        ? "paid"
        : st === "booked_offline"
          ? "offline"
          : "pending";
    return `${i + 1}. ${entryLabels(e).join(", ")} — ₹${Number(e.price) || 800} — ${ref} (${pay})`;
  });

  const msg =
    `📊 *Report — ${date.isToday ? "Today, " : ""}${date.label}*\n📍 ${ctx.turfName}\n\n` +
    `✅ Booked: ${bookedCount} slots\n` +
    `🚫 Blocked: ${blockedCount} slots\n` +
    `⚡ Available: ${available} slots\n\n` +
    `💰 Revenue: ₹${revenue}\n` +
    `📈 Occupancy: ${occupancy}%\n\n` +
    (lines.length
      ? `*Bookings:*\n${lines.join("\n")}\n\n`
      : `_No bookings yet_\n\n`) +
    `_Send *CANCEL [REF]* to cancel a booking_`;

  await hellotick.sendText({ phone, message: msg });
  await logChat(phone, "owner_report", `Sent report for ${date.label}`, {
    turfId: ctx.turfId,
    bookedCount,
    blockedCount,
    revenue,
  });
}

async function ownerCancel(phone: string, ctx: OwnerCtx, refArg: string) {
  const ref = refArg.trim().toUpperCase();
  if (!ref) {
    await hellotick.sendText({
      phone,
      message: `❓ Please include the booking reference.\n\nEg: *CANCEL TB-1234-5678*\n\n_Find ref codes in *REPORT TODAY*_`,
    });
    return;
  }

  const out = await mutateTurfSlots(ctx.turfId, (slots) => {
    const idx = slots.findIndex((e) => {
      const r = String(e.refCode || e.transactionId || "").toUpperCase();
      const st = String(e.status || "").toLowerCase();
      return (
        r === ref && (ACTIVE_BOOKED_STATUSES.includes(st) || st === "blocked")
      );
    });
    if (idx === -1) return { result: null };
    const entry = slots[idx];
    const wasPaid = String(entry.status || "").toLowerCase() === "confirmed";
    slots[idx] = {
      ...entry,
      status: "cancelled",
      cancelledAt: new Date().toISOString(),
      cancelledVia: "whatsapp_owner",
    };
    return {
      slots,
      result: {
        label: entryLabels(entry).join(", "),
        monthSlot: String(entry.monthSlot || ""),
        wasPaid,
      },
    };
  });

  if (!out) {
    await hellotick.sendText({
      phone,
      message: `❌ No active booking found with ref *${ref}* at ${ctx.turfName}.\n\nSend *REPORT TODAY* to see today's bookings & refs.`,
    });
    return;
  }
  await hellotick.sendText({
    phone,
    message:
      `🗑️ *Booking Cancelled*\n\n🆔 ${ref}\n⏰ ${out.label}\n📅 ${out.monthSlot}\n\n` +
      `✅ Slot reopened on the website instantly.` +
      (out.wasPaid
        ? `\n\n⚠️ This booking was paid — please process the refund manually.`
        : ""),
  });
  await logChat(phone, "booking_cancelled", `Cancelled ${ref}`, {
    turfId: ctx.turfId,
    slot: out.label,
  });
}

/**
 * WhatsApp Chatbot - TurfBuddie
 *
 * Triggers:
 *   PLAYERS  → select city → select turf → view/book slots
 *   OWNERS   → owner OTP → manage slots / view report
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
    ownerName?: string;
    ownerTurfId?: string;
    ownerTurfName?: string;
    ownerVerified?: boolean;
    updatedAt?: number;
    [key: string]: unknown;
}

// ─── helpers ────────────────────────────────────────────────────────────────

async function logChat(phone: string, step: string, message: string, data?: unknown) {
    await adminDb.collection("whatsappChatLogs").add({
        phone, step, message, data: data || null,
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

async function getTurfsInCity(city: string): Promise<Array<{ id: string; name: string }>> {
    const snap = await adminDb.collection("Turfs").get();
    const cityLower = city.toLowerCase().trim();
    return snap.docs
        .filter((doc) => extractString(doc.data().city).toLowerCase() === cityLower)
        .map((doc) => ({ id: doc.id, name: (doc.data().name as string) || "Unnamed Turf" }));
}

function getToday(): { daySlot: string; monthSlot: string; formatted: string } {
    const now = new Date();
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return {
        daySlot: now.getDate().toString(),
        monthSlot: months[now.getMonth()],
        formatted: `${now.getDate()} ${months[now.getMonth()]}`,
    };
}

const ALL_SLOTS = [
    "6 AM - 7 AM","7 AM - 8 AM","8 AM - 9 AM","9 AM - 10 AM","10 AM - 11 AM",
    "11 AM - 12 PM","12 PM - 1 PM","1 PM - 2 PM","2 PM - 3 PM","3 PM - 4 PM",
    "4 PM - 5 PM","5 PM - 6 PM","6 PM - 7 PM","7 PM - 8 PM","8 PM - 9 PM",
];

async function getSlotsForToday(turfId: string): Promise<{ available: string[]; booked: string[] }> {
    const today = getToday();
    const snap = await adminDb.collection("Bookings")
        .where("turfId", "==", turfId)
        .where("daySlot", "==", today.daySlot)
        .where("monthSlot", "==", today.monthSlot)
        .get();

    const bookedSet = new Set<string>();
    snap.docs.forEach((doc) => {
        const slots = Array.isArray(doc.data().timeSlot) ? doc.data().timeSlot : [doc.data().timeSlot];
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
    if (p === "AM" && h === 11) { eh = 12; ep = "PM"; }
    else if (p === "PM" && h === 12) { eh = 1; ep = "PM"; }
    else if (eh > 12) { eh = eh - 12; }

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
        await hellotick.sendText({ phone, message: `No turfs found in *${city}*.\n\nSend *PLAYERS* to try another city.` });
        await logChat(phone, "no_turfs", `No turfs in ${city}`);
        return;
    }
    const turfList = turfs.map((t, i) => `${i + 1}. *${t.name}*`).join("\n");
    await hellotick.sendText({ phone, message: `🏟️ *Turfs in ${city}*\n\n${turfList}\n\n_Reply with turf number or name_` });
    await logChat(phone, "turf_selection", `Sent turfs in ${city}`, { city, count: turfs.length });
    await sessionRef.set({ lastCommand: "select_turf", waitingFor: "turf", selectedCity: city, turfs, cities, updatedAt: Date.now() });
}

async function showSlotsForTurf(
    phone: string,
    turf: { id: string; name: string },
    sessionRef: FirebaseFirestore.DocumentReference,
) {
    const today = getToday();
    const { available, booked } = await getSlotsForToday(turf.id);

    const slotDisplay = ALL_SLOTS.map((slot) =>
        booked.includes(slot) ? `~~${slot}~~ ❌` : `*${slot}* ✅`
    ).join("\n");

    if (available.length === 0) {
        await hellotick.sendText({ phone, message: `*${turf.name}*\n📅 Today, ${today.formatted}\n\n${slotDisplay}\n\n_All slots booked. Send *PLAYERS* to try another turf._` });
        return;
    }

    const quickActions = available.slice(0, 5).map((slot, i) => `${i + 1}. ${slot}`).join("\n");
    const msg =
        `*${turf.name}*\n📅 Today, ${today.formatted}\n\n` +
        `${slotDisplay}\n\n` +
        `*Quick book (reply with number):*\n${quickActions}\n\n` +
        `_Or send: *BOOK 5 PM - 6 PM*_`;

    await hellotick.sendText({ phone, message: msg });
    await logChat(phone, "show_slots", `Sent slots for ${turf.name}`, { turfId: turf.id, available: available.length });
    await sessionRef.set({ lastCommand: "view_slots", waitingFor: "booking", selectedTurf: turf, availableSlots: available, updatedAt: Date.now() });
}

// ─── main handler ────────────────────────────────────────────────────────────

export async function handleIncomingMessage(message: IncomingMessage): Promise<void> {
    const phone = normalizePhone(message.from);
    const text = (message.text || "").trim().toUpperCase();

    if (!phone) throw new Error(`Empty phone. Payload: ${JSON.stringify(message).slice(0, 200)}`);

    console.log("[chatbot] From:", phone, "→", text);

    await adminDb.collection("whatsappIncomingMessages").add({
        from: phone, text: message.text ?? null, type: message.type,
        timestamp: message.timestamp || Date.now(), processedAt: new Date().toISOString(),
    });

    const sessionRef = adminDb.collection("whatsappSessions").doc(phone);
    const sessionDoc = await sessionRef.get();
    const session: WhatsappSession = sessionDoc.exists ? (sessionDoc.data() as WhatsappSession) : {};

    try {
        // ── Welcome ──────────────────────────────────────────────────────────
        if (["HI", "HELLO", "START", "MENU", "HELP"].includes(text)) {
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

        // ── PLAYERS → ask city ────────────────────────────────────────────────
        else if (["PLAYERS", "SLOTS", "SLOTS TODAY", "BOOK"].includes(text)) {
            const cities = await getCities();
            if (cities.length === 0) {
                await hellotick.sendText({ phone, message: "No cities available. Try again later." });
                return;
            }
            const cityList = cities.map((c, i) => `${i + 1}. *${c}*`).join("\n");
            await hellotick.sendText({ phone, message: `📍 *Select Your City*\n\n${cityList}\n\n_Reply with number or city name_` });
            await logChat(phone, "city_selection", "Sent city list", { count: cities.length });
            await sessionRef.set({ lastCommand: "select_city", waitingFor: "city", cities, updatedAt: Date.now() });
        }

        // ── City selected by NUMBER ───────────────────────────────────────────
        else if (/^\d+$/.test(text) && session.waitingFor === "city") {
            const cities = session.cities || [];
            const idx = parseInt(text) - 1;
            if (!cities[idx]) {
                await hellotick.sendText({ phone, message: `Invalid number. Reply with 1–${cities.length}` });
                return;
            }
            await showTurfsForCity(phone, cities[idx], cities, sessionRef);
        }

        // ── City selected by NAME ─────────────────────────────────────────────
        else if (session.waitingFor === "city") {
            const cities = session.cities || [];
            const rawText = (message.text || "").trim();
            const match = cities.find((c) => c.toLowerCase().includes(rawText.toLowerCase()));
            if (match) {
                await showTurfsForCity(phone, match, cities, sessionRef);
            } else {
                const list = cities.map((c, i) => `${i + 1}. ${c}`).join("\n");
                await hellotick.sendText({ phone, message: `❓ City not found.\n\nAvailable cities:\n${list}\n\n_Reply with number or exact city name_` });
            }
        }

        // ── Turf selected by NUMBER ───────────────────────────────────────────
        else if (/^\d+$/.test(text) && session.waitingFor === "turf") {
            const turfs = session.turfs || [];
            const idx = parseInt(text) - 1;
            if (!turfs[idx]) {
                await hellotick.sendText({ phone, message: `Invalid number. Reply with 1–${turfs.length}` });
                return;
            }
            await showSlotsForTurf(phone, turfs[idx], sessionRef);
        }

        // ── Turf selected by NAME ─────────────────────────────────────────────
        else if (session.waitingFor === "turf") {
            const turfs = session.turfs || [];
            const rawText = (message.text || "").trim();
            const match = turfs.find((t) => t.name.toLowerCase().includes(rawText.toLowerCase()));
            if (match) {
                await showSlotsForTurf(phone, match, sessionRef);
            } else {
                const list = turfs.map((t, i) => `${i + 1}. ${t.name}`).join("\n");
                await hellotick.sendText({ phone, message: `❓ Turf not found.\n\nAvailable turfs:\n${list}\n\n_Reply with number or turf name_` });
            }
        }

        // ── Time slot query: "6 PM TODAY", "6 PM" ────────────────────────────
        else if (parseTimeSlotQuery(text) !== null) {
            const slotQuery = parseTimeSlotQuery(text)!;
            if (!session.selectedTurf) {
                await hellotick.sendText({ phone, message: `Please select a turf first.\n\nSend *PLAYERS* to start.` });
            } else {
                const { available, booked } = await getSlotsForToday(session.selectedTurf.id);
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
                await hellotick.sendText({ phone, message: `Invalid number. Reply with 1–${slots.length}` });
                return;
            }
            if (!session.selectedTurf) {
                await hellotick.sendText({ phone, message: "Please select a turf first. Send *PLAYERS* to start." });
                return;
            }
            await processBooking(phone, session.selectedTurf, slots[idx]);
        }

        // ── BOOK command ──────────────────────────────────────────────────────
        else if (text.startsWith("BOOK ")) {
            if (!session.selectedTurf) {
                await hellotick.sendText({ phone, message: "Please select a turf first. Send *PLAYERS* to start." });
                return;
            }
            const slot = text.replace("BOOK ", "").trim();
            await processBooking(phone, session.selectedTurf, slot);
        }

        // ── OWNERS panel ──────────────────────────────────────────────────────
        else if (["OWNERS", "OWNER", "OWNER UPDATE", "2"].includes(text)) {
            await startOwnerVerification(phone);
        }

        // ── Owner OTP ─────────────────────────────────────────────────────────
        else if (/^\d{4}$/.test(text) && session.waitingFor === "owner_otp") {
            await verifyOwnerOTP(phone, text, session.ownerPhone ?? "");
        }

        // ── Owner: block / unblock / report ──────────────────────────────────
        else if (text.startsWith("BLOCK ") && session.ownerVerified) {
            if (!session.ownerTurfId || !session.ownerTurfName) return;
            await blockSlot(phone, session.ownerTurfId, session.ownerTurfName, text.replace("BLOCK ", "").trim());
        }
        else if (text.startsWith("UNBLOCK ") && session.ownerVerified) {
            if (!session.ownerTurfId || !session.ownerTurfName) return;
            await unblockSlot(phone, session.ownerTurfId, session.ownerTurfName, text.replace("UNBLOCK ", "").trim());
        }
        else if (["REPORT", "REPORT TODAY"].includes(text)) {
            if (!session.ownerVerified) {
                await hellotick.sendText({ phone, message: "Please verify first. Send *OWNERS* to start." });
                return;
            }
            if (!session.ownerTurfId || !session.ownerTurfName) return;
            await sendOwnerReport(phone, session.ownerTurfId, session.ownerTurfName);
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
        await hellotick.sendText({ phone, message: "Sorry, something went wrong. Send *HI* to restart." });
        await logChat(phone, "error", (error as Error).message);
    }
}

// ─── booking ─────────────────────────────────────────────────────────────────

async function processBooking(phone: string, turf: { id: string; name: string }, timeSlot: string) {
    const today = getToday();

    const already = await adminDb.collection("Bookings")
        .where("turfId", "==", turf.id)
        .where("daySlot", "==", today.daySlot)
        .where("monthSlot", "==", today.monthSlot)
        .where("timeSlot", "==", timeSlot)
        .get();

    if (!already.empty) {
        await hellotick.sendText({ phone, message: `Sorry, *${timeSlot}* is already booked.\n\nSend *PLAYERS* to see other times.` });
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
        phone, turfId: turf.id, turfName: turf.name, timeSlot,
        daySlot: today.daySlot, monthSlot: today.monthSlot,
        refCode, paymentLink: bookingLink, status: "pending_payment",
        createdAt: new Date().toISOString(),
    });

    await logChat(phone, "booking_link_sent", "Booking link sent", { turf: turf.name, timeSlot, refCode });

    await adminDb.collection("whatsappSessions").doc(phone).set(
        { lastCommand: "booked", waitingFor: null, availableSlots: null, updatedAt: Date.now() },
        { merge: true },
    );
}

// ─── owner verification ───────────────────────────────────────────────────────

async function startOwnerVerification(phone: string) {
    const snap = await adminDb.collection("owners").where("mobile", "==", phone).limit(1).get();
    if (snap.empty) {
        await hellotick.sendText({ phone, message: "This number is not registered as a turf owner.\n\nContact support to register your turf." });
        return;
    }

    const ownerData = snap.docs[0].data();
    const ownerName = ownerData.name || "Owner";

    const turfsSnap = await adminDb.collection("Turfs").where("ownerId", "==", snap.docs[0].id).limit(1).get();
    if (turfsSnap.empty) {
        await hellotick.sendText({ phone, message: "No turfs found for your account. Contact support." });
        return;
    }

    const turfData = turfsSnap.docs[0].data();
    const turfName = turfData.name || "Your Turf";
    const turfId = turfsSnap.docs[0].id;

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    await adminDb.collection("whatsappOwnerOTPs").add({
        phone, otp, ownerName, turfId, turfName,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    });

    const masked = phone.substring(0, 6) + "*****";
    await hellotick.sendText({
        phone,
        message: `🏟️ *Venue Owners Panel*\n\nOTP sent to ${masked} ✅\n\n*Your OTP: ${otp}*\n\nEnter your 4-digit OTP:\n\n_Valid for 5 minutes_`,
    });
    await logChat(phone, "owner_otp_sent", "OTP sent", { turfName });

    await adminDb.collection("whatsappSessions").doc(phone).set({
        lastCommand: "owner_otp", waitingFor: "owner_otp",
        ownerPhone: phone, ownerName, ownerTurfId: turfId, ownerTurfName: turfName,
        updatedAt: Date.now(),
    });
}

async function verifyOwnerOTP(phone: string, enteredOTP: string, _ownerPhone: string) {
    const snap = await adminDb.collection("whatsappOwnerOTPs")
        .where("phone", "==", phone)
        .where("otp", "==", enteredOTP)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

    if (snap.empty) {
        await hellotick.sendText({ phone, message: "❌ Invalid OTP.\n\nSend *OWNERS* to get a new OTP." });
        return;
    }

    const otpData = snap.docs[0].data();
    if (new Date(otpData.expiresAt) < new Date()) {
        await hellotick.sendText({ phone, message: "❌ OTP expired.\n\nSend *OWNERS* to get a new OTP." });
        return;
    }

    const today = getToday();
    const { available, booked } = await getSlotsForToday(otpData.turfId);

    const slotDisplay = ALL_SLOTS.map((slot) => `*${slot}* ${booked.includes(slot) ? "❌" : "✅"}`).join("  ");

    const msg =
        `✅ *Verified! Welcome, ${otpData.ownerName}*\n` +
        `📍 ${otpData.turfName}\n\n` +
        `📅 Today, ${today.formatted}\n\n` +
        `${slotDisplay}\n\n` +
        `*Commands:*\n` +
        `• *BLOCK 5 PM - 6 PM* — block a slot\n` +
        `• *UNBLOCK 7 AM - 8 AM* — unblock\n` +
        `• *REPORT* — today's stats\n\n` +
        `_TurfBuddie Owners Panel_`;

    await hellotick.sendText({ phone, message: msg });
    await logChat(phone, "owner_verified", "Owner verified", { ownerName: otpData.ownerName });

    await adminDb.collection("whatsappSessions").doc(phone).set({
        lastCommand: "owner_verified", waitingFor: "owner_command",
        ownerVerified: true, ownerName: otpData.ownerName,
        ownerTurfId: otpData.turfId, ownerTurfName: otpData.turfName,
        updatedAt: Date.now(),
    });

    await snap.docs[0].ref.delete();
}

// ─── owner slot management ────────────────────────────────────────────────────

async function blockSlot(phone: string, turfId: string, turfName: string, timeSlot: string) {
    const today = getToday();
    await adminDb.collection("Bookings").add({
        turfId, timeSlot, daySlot: today.daySlot, monthSlot: today.monthSlot,
        userUid: `owner_blocked_${phone}`, status: "blocked",
        blockedBy: "owner", blockedVia: "whatsapp",
        createdAt: new Date().toISOString(),
    });
    await hellotick.sendText({ phone, message: `🚫 *${timeSlot} BLOCKED*\n\n✅ Site updated instantly\n📲 Slot now shows as unavailable\n\n_Send *REPORT* to see today's stats_` });
    await logChat(phone, "slot_blocked", `Blocked ${timeSlot}`, { turfName });
}

async function unblockSlot(phone: string, turfId: string, turfName: string, timeSlot: string) {
    const today = getToday();
    const snap = await adminDb.collection("Bookings")
        .where("turfId", "==", turfId).where("timeSlot", "==", timeSlot)
        .where("daySlot", "==", today.daySlot).where("monthSlot", "==", today.monthSlot)
        .where("status", "==", "blocked").limit(1).get();

    if (snap.empty) {
        await hellotick.sendText({ phone, message: `*${timeSlot}* is not blocked.\n\nSend *REPORT* to see current status.` });
        return;
    }
    await snap.docs[0].ref.delete();
    await hellotick.sendText({ phone, message: `✅ *${timeSlot} UNBLOCKED*\n\n✅ Site updated instantly\n📲 Slot now available to book\n\n_Send *REPORT* to see stats_` });
    await logChat(phone, "slot_unblocked", `Unblocked ${timeSlot}`, { turfName });
}

async function sendOwnerReport(phone: string, turfId: string, turfName: string) {
    const today = getToday();
    const snap = await adminDb.collection("Bookings")
        .where("turfId", "==", turfId)
        .where("daySlot", "==", today.daySlot)
        .where("monthSlot", "==", today.monthSlot)
        .get();

    let bookedCount = 0, blockedCount = 0, revenue = 0;
    snap.docs.forEach((doc) => {
        const b = doc.data();
        if (b.status === "blocked") blockedCount++;
        else { bookedCount++; revenue += b.amount || 800; }
    });

    const available = 15 - bookedCount - blockedCount;
    const occupancy = ((bookedCount / 15) * 100).toFixed(1);

    const msg =
        `📊 *Today's Report*\n📍 ${turfName}\n📅 ${today.formatted}\n\n` +
        `✅ Booked: ${bookedCount} slots\n` +
        `🚫 Blocked: ${blockedCount} slots\n` +
        `⚡ Available: ${available} slots\n\n` +
        `💰 Revenue: ₹${revenue}\n` +
        `📈 Occupancy: ${occupancy}%\n\n` +
        `_Send *BLOCK [time]* or *UNBLOCK [time]* to manage_\n\n` +
        `_TurfBuddie Owners Panel_`;

    await hellotick.sendText({ phone, message: msg });
    await logChat(phone, "owner_report", "Sent report", { turfName, bookedCount, blockedCount, revenue });
}

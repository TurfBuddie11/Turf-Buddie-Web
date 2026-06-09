/**
 * WhatsApp Chatbot - Final Version
 * 
 * Proper Flow:
 * 1. User: SLOTS
 * 2. Bot: Which city? (waits for reply)
 * 3. User: 1 (Mumbai)
 * 4. Bot: Shows turfs in Mumbai (waits for reply)
 * 5. User: 1 (Selects turf)
 * 6. Bot: Shows TODAY's slots (waits for reply)
 * 7. User: BOOK 5 PM - 6 PM
 * 8. Bot: Booking confirmation
 * 
 * Each step waits for user reply - NO automatic messages!
 */

import { hellotick, normalizePhone } from "./client";
import { adminDb } from "@/lib/firebase/admin";

interface IncomingMessage {
    from: string;
    text?: string;
    type: "text" | "image" | "video" | "document" | "audio" | "button" | "list";
    timestamp?: number;
}

/**
 * Log chat interaction to database
 */
async function logChat(
    phone: string,
    step: string,
    message: string,
    data?: any,
): Promise<void> {
    await adminDb.collection("whatsappChatLogs").add({
        phone,
        step,
        message,
        data: data || null,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Get list of cities
 */
async function getCities(): Promise<string[]> {
    const turfsSnapshot = await adminDb.collection("Turfs").get();
    const cities = new Set<string>();

    turfsSnapshot.docs.forEach((doc) => {
        const data = doc.data();
        const city = data.city || data.location;
        if (city) cities.add(city);
    });

    return Array.from(cities).sort();
}

/**
 * Get turfs in a city
 */
async function getTurfsInCity(
    city: string,
): Promise<Array<{ id: string; name: string }>> {
    let turfsSnapshot = await adminDb
        .collection("Turfs")
        .where("city", "==", city)
        .get();

    if (turfsSnapshot.empty) {
        turfsSnapshot = await adminDb
            .collection("Turfs")
            .where("location", "==", city)
            .get();
    }

    return turfsSnapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || "Unnamed Turf",
    }));
}

/**
 * Get today's date
 */
function getToday(): {
    daySlot: string;
    monthSlot: string;
    formatted: string;
} {
    const now = new Date();
    const day = now.getDate();
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
    const month = months[now.getMonth()];

    return {
        daySlot: day.toString(),
        monthSlot: month,
        formatted: `${day} ${month}`,
    };
}

/**
 * Get slots for turf today
 */
async function getSlotsForToday(
    turfId: string,
): Promise<{ available: string[]; booked: string[] }> {
    const today = getToday();

    const bookingsSnapshot = await adminDb
        .collection("Bookings")
        .where("turfId", "==", turfId)
        .where("daySlot", "==", today.daySlot)
        .where("monthSlot", "==", today.monthSlot)
        .get();

    const bookedSlots = new Set<string>();
    bookingsSnapshot.docs.forEach((doc) => {
        const booking = doc.data();
        const timeSlots = Array.isArray(booking.timeSlot)
            ? booking.timeSlot
            : [booking.timeSlot];
        timeSlots.forEach((slot: string) => bookedSlots.add(slot));
    });

    const allSlots = [
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

    const available = allSlots.filter((slot) => !bookedSlots.has(slot));
    const booked = allSlots.filter((slot) => bookedSlots.has(slot));

    return { available, booked };
}

/**
 * Main message handler - WAITS for user reply at each step
 */
export async function handleIncomingMessage(
    message: IncomingMessage,
): Promise<void> {
    const phone = normalizePhone(message.from);
    const text = (message.text || "").trim().toUpperCase();

    console.log("[chatbot] Message from:", phone, "->", text);

    // Log incoming message
    await adminDb.collection("whatsappIncomingMessages").add({
        from: phone,
        text: message.text ?? null,
        type: message.type,
        timestamp: message.timestamp || Date.now(),
        processedAt: new Date().toISOString(),
    });

    // Get user session
    const sessionRef = adminDb.collection("whatsappSessions").doc(phone);
    const sessionDoc = await sessionRef.get();
    const session = sessionDoc.exists ? (sessionDoc.data() as any) : {};

    try {
        // ============================================
        // STEP 1: Welcome
        // ============================================
        if (text === "HI" || text === "HELLO" || text === "START") {
            const msg = `👋 *Welcome to TurfBuddie!*\n\nI'm your smart turf assistant.\n\n⚽ Players → book available slots\n🏟️ Owners → manage slots\n\nSend *SLOTS* to see today's availability!\n\n_TurfBuddie_`;

            await hellotick.sendText({ phone, message: msg });
            await logChat(phone, "welcome", "Sent welcome message");
            await sessionRef.set({ lastCommand: "welcome", updatedAt: Date.now() });
        }
        // ============================================
        // STEP 2: User wants slots - Ask for city
        // ============================================
        else if (text === "SLOTS" || text === "SLOTS TODAY" || text === "1") {
            const cities = await getCities();

            if (cities.length === 0) {
                await hellotick.sendText({
                    phone,
                    message: "No cities available. Please try again later.",
                });
                return;
            }

            const cityList = cities
                .map((city, i) => `${i + 1}. *${city}*`)
                .join("\n");

            const msg = `📍 *Select Your City*\n\n${cityList}\n\n_Reply with city number (e.g., 1, 2, 3)_`;

            await hellotick.sendText({ phone, message: msg });
            await logChat(phone, "city_selection", "Sent city list", {
                citiesCount: cities.length,
            });
            await sessionRef.set({
                lastCommand: "select_city",
                waitingFor: "city",
                cities,
                updatedAt: Date.now(),
            });
        }
        // ============================================
        // STEP 3: User selected city - Show turfs
        // ============================================
        else if (/^\d+$/.test(text) && session.waitingFor === "city") {
            const cityIndex = parseInt(text) - 1;
            const cities = session.cities || [];

            if (!cities[cityIndex]) {
                await hellotick.sendText({
                    phone,
                    message: `Invalid number. Reply with 1-${cities.length}`,
                });
                return;
            }

            const selectedCity = cities[cityIndex];
            const turfs = await getTurfsInCity(selectedCity);

            if (turfs.length === 0) {
                await hellotick.sendText({
                    phone,
                    message: `No turfs in *${selectedCity}*.\n\nSend *SLOTS* to try another city.`,
                });
                await logChat(phone, "no_turfs", `No turfs in ${selectedCity}`);
                return;
            }

            const turfList = turfs
                .map((turf, i) => `${i + 1}. *${turf.name}*`)
                .join("\n");

            const msg = `🏟️ *Turfs in ${selectedCity}*\n\n${turfList}\n\n_Reply with turf number (e.g., 1, 2, 3)_`;

            await hellotick.sendText({ phone, message: msg });
            await logChat(phone, "turf_selection", `Sent turfs in ${selectedCity}`, {
                city: selectedCity,
                turfsCount: turfs.length,
            });
            await sessionRef.set({
                lastCommand: "select_turf",
                waitingFor: "turf",
                selectedCity,
                turfs,
                updatedAt: Date.now(),
            });
        }
        // ============================================
        // STEP 4: User selected turf - Show TODAY's slots
        // ============================================
        else if (/^\d+$/.test(text) && session.waitingFor === "turf") {
            const turfIndex = parseInt(text) - 1;
            const turfs = session.turfs || [];

            if (!turfs[turfIndex]) {
                await hellotick.sendText({
                    phone,
                    message: `Invalid number. Reply with 1-${turfs.length}`,
                });
                return;
            }

            const selectedTurf = turfs[turfIndex];
            const today = getToday();
            const { available, booked } = await getSlotsForToday(selectedTurf.id);

            // Create display
            const allSlots = [
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

            const slotDisplay = allSlots
                .map((slot) =>
                    booked.includes(slot)
                        ? `~~${slot}~~ ❌`
                        : `*${slot}* ✅`,
                )
                .join("\n");

            if (available.length === 0) {
                const msg = `*${selectedTurf.name}*\n📅 Today, ${today.formatted}\n\n${slotDisplay}\n\n_All slots booked today._\n\nSend *SLOTS* to try another turf.`;
                await hellotick.sendText({ phone, message: msg });
                await logChat(phone, "no_slots", "All slots booked", {
                    turf: selectedTurf.name,
                });
                return;
            }

            const quickActions = available
                .slice(0, 5)
                .map((slot, i) => `${i + 1}. *Book ${slot}*`)
                .join("\n");

            const msg = `*${selectedTurf.name}*\n📅 Today, ${today.formatted}\n\n${slotDisplay}\n\nTo book: *BOOK 5 PM - 6 PM*\n\n📋 *Quick Actions:*\n${quickActions}\n\n_Reply with number or command_`;

            await hellotick.sendText({ phone, message: msg });
            await logChat(phone, "show_slots", `Sent slots for ${selectedTurf.name}`, {
                turf: selectedTurf.name,
                turfId: selectedTurf.id,
                availableCount: available.length,
                bookedCount: booked.length,
            });
            await sessionRef.set({
                lastCommand: "view_slots",
                waitingFor: "booking",
                selectedTurf,
                availableSlots: available,
                updatedAt: Date.now(),
            });
        }
        // ============================================
        // STEP 5a: User books by command
        // ============================================
        else if (text.startsWith("BOOK ")) {
            if (!session.selectedTurf) {
                await hellotick.sendText({
                    phone,
                    message: "Please select a turf first. Send *SLOTS* to start.",
                });
                return;
            }

            const timeSlot = text.replace("BOOK ", "").trim();
            await processBooking(phone, session.selectedTurf, timeSlot);
        }
        // ============================================
        // STEP 5b: User books by number
        // ============================================
        else if (/^\d+$/.test(text) && session.waitingFor === "booking") {
            const slotIndex = parseInt(text) - 1;
            const availableSlots = session.availableSlots || [];

            if (!availableSlots[slotIndex]) {
                await hellotick.sendText({
                    phone,
                    message: `Invalid number. Reply with 1-${availableSlots.length}`,
                });
                return;
            }

            const timeSlot = availableSlots[slotIndex];
            await processBooking(phone, session.selectedTurf, timeSlot);
        }
        // ============================================
        // OWNER PANEL: Start verification
        // ============================================
        else if (text === "OWNER" || text === "OWNER UPDATE" || text === "2") {
            await startOwnerVerification(phone);
        }
        // ============================================
        // OWNER PANEL: OTP entered
        // ============================================
        else if (/^\d{4}$/.test(text) && session.waitingFor === "owner_otp") {
            await verifyOwnerOTP(phone, text, session.ownerPhone);
        }
        // ============================================
        // OWNER PANEL: Block slot
        // ============================================
        else if (text.startsWith("BLOCK ") && session.ownerVerified) {
            const timeSlot = text.replace("BLOCK ", "").trim();
            await blockSlot(phone, session.ownerTurfId, session.ownerTurfName, timeSlot);
        }
        // ============================================
        // OWNER PANEL: Unblock slot
        // ============================================
        else if (text.startsWith("UNBLOCK ") && session.ownerVerified) {
            const timeSlot = text.replace("UNBLOCK ", "").trim();
            await unblockSlot(phone, session.ownerTurfId, session.ownerTurfName, timeSlot);
        }
        // ============================================
        // OWNER PANEL: View report
        // ============================================
        else if (text === "REPORT" || text === "REPORT TODAY") {
            if (!session.ownerVerified) {
                await hellotick.sendText({
                    phone,
                    message: "Please verify first. Send *OWNER* to start.",
                });
                return;
            }
            await sendOwnerReport(phone, session.ownerTurfId, session.ownerTurfName);
        }
        // ============================================
        // Unknown command
        // ============================================
        else {
            await hellotick.sendText({
                phone,
                message: "I didn't understand that.\n\nSend *SLOTS* to book\nSend *OWNER* for owner panel\nSend *HI* for help",
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

/**
 * Process booking
 */
async function processBooking(
    phone: string,
    turf: { id: string; name: string },
    timeSlot: string,
): Promise<void> {
    const today = getToday();

    // Check if already booked
    const bookingsSnapshot = await adminDb
        .collection("Bookings")
        .where("turfId", "==", turf.id)
        .where("daySlot", "==", today.daySlot)
        .where("monthSlot", "==", today.monthSlot)
        .where("timeSlot", "==", timeSlot)
        .get();

    if (!bookingsSnapshot.empty) {
        await hellotick.sendText({
            phone,
            message: `Sorry, *${timeSlot}* is already booked.\n\nSend *SLOTS* to see other times.`,
        });
        await logChat(phone, "booking_failed", "Slot already booked", {
            turf: turf.name,
            timeSlot,
        });
        return;
    }

    // Generate booking reference
    const refCode = `TB-${Date.now().toString().slice(-4)}`;

    // Create proper payment link
    const paymentLink = `https://www.turfbuddie.com/explore?bookingRef=${refCode}`;

    const msg = `⚡ *Booking Confirmed!*\n\n📍 ${turf.name}\n📅 Today, ${today.formatted}\n⏰ ${timeSlot}\n⚽ 5v5 Football\n💰 ₹800\n🆔 Ref: ${refCode}\n\nPay here:\n${paymentLink}\n\nYou'll get a reminder 1hr before.\n*Book.Play.Enjoy!* 🏟️\n\n_Send *SLOTS* to book another_\n_TurfBuddie_`;

    await hellotick.sendText({ phone, message: msg });

    // Save pending booking
    await adminDb.collection("pendingWhatsAppBookings").add({
        phone,
        turfId: turf.id,
        turfName: turf.name,
        timeSlot,
        daySlot: today.daySlot,
        monthSlot: today.monthSlot,
        refCode,
        paymentLink,
        status: "pending_payment",
        createdAt: new Date().toISOString(),
    });

    await logChat(phone, "booking_confirmed", "Booking created", {
        turf: turf.name,
        timeSlot,
        refCode,
    });
}

/**
 * Start owner verification process
 */
async function startOwnerVerification(phone: string): Promise<void> {
    // Check if phone belongs to an owner
    const ownerSnapshot = await adminDb
        .collection("owners")
        .where("mobile", "==", phone)
        .limit(1)
        .get();

    if (ownerSnapshot.empty) {
        await hellotick.sendText({
            phone,
            message: "This number is not registered as a turf owner.\n\nContact support to register your turf.",
        });
        await logChat(phone, "owner_verification_failed", "Not an owner");
        return;
    }

    const ownerData = ownerSnapshot.docs[0].data();
    const ownerName = ownerData.name || "Owner";

    // Get owner's turfs
    const turfsSnapshot = await adminDb
        .collection("Turfs")
        .where("ownerId", "==", ownerSnapshot.docs[0].id)
        .limit(1)
        .get();

    if (turfsSnapshot.empty) {
        await hellotick.sendText({
            phone,
            message: "No turfs found for your account.\n\nContact support.",
        });
        return;
    }

    const turfData = turfsSnapshot.docs[0].data();
    const turfName = turfData.name || "Your Turf";
    const turfId = turfsSnapshot.docs[0].id;

    // Generate OTP
    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    // Save OTP temporarily
    await adminDb.collection("whatsappOwnerOTPs").add({
        phone,
        otp,
        ownerName,
        turfId,
        turfName,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 mins
    });

    const maskedPhone = phone.substring(0, 6) + "*****";
    const msg = `🏟️ *Venue Owner Panel*\n\nOTP sent to ${maskedPhone} ✅\n\n*Your OTP: ${otp}*\n\nPlease enter your 4-digit OTP to continue:\n\n_OTP valid for 5 minutes_`;

    await hellotick.sendText({ phone, message: msg });
    await logChat(phone, "owner_otp_sent", "OTP sent", { turfName });

    // Update session
    const sessionRef = adminDb.collection("whatsappSessions").doc(phone);
    await sessionRef.set({
        lastCommand: "owner_otp",
        waitingFor: "owner_otp",
        ownerPhone: phone,
        ownerName,
        ownerTurfId: turfId,
        ownerTurfName: turfName,
        updatedAt: Date.now(),
    });
}

/**
 * Verify owner OTP
 */
async function verifyOwnerOTP(
    phone: string,
    enteredOTP: string,
    ownerPhone: string,
): Promise<void> {
    // Find OTP
    const otpSnapshot = await adminDb
        .collection("whatsappOwnerOTPs")
        .where("phone", "==", phone)
        .where("otp", "==", enteredOTP)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();

    if (otpSnapshot.empty) {
        await hellotick.sendText({
            phone,
            message: "❌ Invalid OTP.\n\nSend *OWNER* to get a new OTP.",
        });
        await logChat(phone, "owner_otp_failed", "Invalid OTP");
        return;
    }

    const otpData = otpSnapshot.docs[0].data();

    // Check expiry
    const expiresAt = new Date(otpData.expiresAt);
    if (expiresAt < new Date()) {
        await hellotick.sendText({
            phone,
            message: "❌ OTP expired.\n\nSend *OWNER* to get a new OTP.",
        });
        await logChat(phone, "owner_otp_expired", "OTP expired");
        return;
    }

    // Get today's slots
    const today = getToday();
    const { available, booked } = await getSlotsForToday(otpData.turfId);

    const allSlots = [
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

    const slotDisplay = allSlots
        .map((slot) => {
            const status = booked.includes(slot) ? "❌" : "✅";
            return `*${slot}* ${status}`;
        })
        .join("  ");

    const msg = `✅ *Verified! Welcome, ${otpData.ownerName}*\n📍 ${otpData.turfName}\n\n📅 Today, ${today.formatted}\n\n${slotDisplay}\n\nTo manage:\n• *BLOCK 5 PM - 6 PM* (block slot)\n• *UNBLOCK 7 AM - 8 AM* (unblock)\n• *REPORT* (today's stats)\n\n_TurfBuddie Owner Panel_`;

    await hellotick.sendText({ phone, message: msg });
    await logChat(phone, "owner_verified", "Owner verified", {
        ownerName: otpData.ownerName,
        turfName: otpData.turfName,
    });

    // Update session
    const sessionRef = adminDb.collection("whatsappSessions").doc(phone);
    await sessionRef.set({
        lastCommand: "owner_verified",
        waitingFor: "owner_command",
        ownerVerified: true,
        ownerName: otpData.ownerName,
        ownerTurfId: otpData.turfId,
        ownerTurfName: otpData.turfName,
        updatedAt: Date.now(),
    });

    // Delete used OTP
    await otpSnapshot.docs[0].ref.delete();
}

/**
 * Block a slot
 */
async function blockSlot(
    phone: string,
    turfId: string,
    turfName: string,
    timeSlot: string,
): Promise<void> {
    const today = getToday();

    // Create a blocked booking
    await adminDb.collection("Bookings").add({
        turfId,
        timeSlot,
        daySlot: today.daySlot,
        monthSlot: today.monthSlot,
        userUid: `owner_blocked_${phone}`,
        status: "blocked",
        blockedBy: "owner",
        blockedVia: "whatsapp",
        createdAt: new Date().toISOString(),
    });

    const msg = `🚫 *${timeSlot} BLOCKED*\n\n✅ Website updated instantly\n📲 Users will see this slot as unavailable\n\n_Send *REPORT* to see today's stats_`;

    await hellotick.sendText({ phone, message: msg });
    await logChat(phone, "slot_blocked", `Blocked ${timeSlot}`, {
        turfName,
        timeSlot,
    });
}

/**
 * Unblock a slot
 */
async function unblockSlot(
    phone: string,
    turfId: string,
    turfName: string,
    timeSlot: string,
): Promise<void> {
    const today = getToday();

    // Find and delete blocked booking
    const blockedSnapshot = await adminDb
        .collection("Bookings")
        .where("turfId", "==", turfId)
        .where("timeSlot", "==", timeSlot)
        .where("daySlot", "==", today.daySlot)
        .where("monthSlot", "==", today.monthSlot)
        .where("status", "==", "blocked")
        .limit(1)
        .get();

    if (blockedSnapshot.empty) {
        await hellotick.sendText({
            phone,
            message: `*${timeSlot}* is not blocked.\n\nSend *REPORT* to see current status.`,
        });
        return;
    }

    await blockedSnapshot.docs[0].ref.delete();

    const msg = `✅ *${timeSlot} UNBLOCKED*\n\n✅ Website updated instantly\n📲 Users can now book this slot\n\n_Send *REPORT* to see today's stats_`;

    await hellotick.sendText({ phone, message: msg });
    await logChat(phone, "slot_unblocked", `Unblocked ${timeSlot}`, {
        turfName,
        timeSlot,
    });
}

/**
 * Send owner report
 */
async function sendOwnerReport(
    phone: string,
    turfId: string,
    turfName: string,
): Promise<void> {
    const today = getToday();

    // Get today's bookings
    const bookingsSnapshot = await adminDb
        .collection("Bookings")
        .where("turfId", "==", turfId)
        .where("daySlot", "==", today.daySlot)
        .where("monthSlot", "==", today.monthSlot)
        .get();

    let bookedCount = 0;
    let blockedCount = 0;
    let revenue = 0;

    bookingsSnapshot.docs.forEach((doc) => {
        const booking = doc.data();
        if (booking.status === "blocked") {
            blockedCount++;
        } else {
            bookedCount++;
            revenue += booking.amount || 800; // Default 800
        }
    });

    const totalSlots = 15; // Standard slots per day
    const availableSlots = totalSlots - bookedCount - blockedCount;
    const occupancyRate = ((bookedCount / totalSlots) * 100).toFixed(1);

    const msg = `📊 *Today's Report*\n📍 ${turfName}\n📅 ${today.formatted}\n\n*Bookings:*\n✅ Booked: ${bookedCount} slots\n🚫 Blocked: ${blockedCount} slots\n⚡ Available: ${availableSlots} slots\n\n*Revenue:*\n💰 Total: ₹${revenue}\n📈 Occupancy: ${occupancyRate}%\n\n_Send *BLOCK [time]* to block a slot_\n_Send *UNBLOCK [time]* to unblock_\n\n_TurfBuddie Owner Panel_`;

    await hellotick.sendText({ phone, message: msg });
    await logChat(phone, "owner_report", "Sent report", {
        turfName,
        bookedCount,
        blockedCount,
        revenue,
    });
}

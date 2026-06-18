/**
 * WhatsApp Chatbot V2 - With Proper Flow
 * 1. User types SLOTS
 * 2. Bot shows turf list
 * 3. User selects turf
 * 4. Bot shows TODAY'S slots for that turf
 * 5. User books a slot
 */

import { hellotick, normalizePhone } from "./client";
import { adminDb } from "@/lib/firebase/admin";

interface IncomingMessage {
    from: string;
    text?: string;
    type: "text" | "image" | "video" | "document" | "audio" | "button" | "list";
    timestamp?: number;
}

interface WhatsappSessionV2 {
    lastCommand?: string;
    waitingFor?: string;
    turfs?: Array<{ id: string; name: string; location?: string; city?: string }>;
    selectedTurfId?: string;
    selectedTurfName?: string;
    availableSlots?: string[];
    ownerPhone?: string;
    ownerName?: string;
    ownerTurfId?: string;
    ownerTurfName?: string;
    ownerVerified?: boolean;
    updatedAt?: number;
    [key: string]: unknown;
}

/**
 * Get list of all active turfs
 */
async function getTurfList(): Promise<
    Array<{ id: string; name: string; location?: string; city?: string }>
> {
    const turfsSnapshot = await adminDb.collection("Turfs").limit(15).get();
    return turfsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
            id: doc.id,
            name: data.name || "Unnamed Turf",
            location: data.location,
            city: data.city,
        };
    });
}

/**
 * Send list of turfs for user to select
 */
async function sendTurfList(phone: string): Promise<void> {
    const turfs = await getTurfList();

    if (turfs.length === 0) {
        await hellotick.sendText({
            phone,
            message: "No turfs available at the moment. Please try again later.",
        });
        return;
    }

    const turfListText = turfs
        .map((turf, index) => {
            const loc = turf.city || turf.location || "";
            const location = loc ? ` - ${loc}` : "";
            return `${index + 1}. *${turf.name}*${location}`;
        })
        .join("\n");

    const message = `🏟️ *Select a Turf*\n\n${turfListText}\n\n_Reply with turf number (e.g., 1, 2, 3)_`;

    await hellotick.sendText({ phone, message });
}

/**
 * Get today's date
 */
function getTodayDate(): {
    daySlot: string;
    monthSlot: string;
    formatted: string;
    fullDate: Date;
} {
    const today = new Date();
    const day = today.getDate();
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
    const month = months[today.getMonth()];

    return {
        daySlot: day.toString(),
        monthSlot: month,
        formatted: `${day} ${month}`,
        fullDate: today,
    };
}

/**
 * Get slots for a specific turf TODAY
 */
async function sendSlotsForTurf(
    phone: string,
    turfId: string,
    turfName: string,
): Promise<void> {
    const today = getTodayDate();

    console.log("[chatbot] Fetching slots:", {
        turfId,
        turfName,
        date: today.formatted,
    });

    // Get bookings for today
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

    // Standard time slots
    const allTimeSlots = [
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

    // Create display
    const slotDisplay = allTimeSlots
        .map((slot) => {
            const isBooked = bookedSlots.has(slot);
            return isBooked ? `~~${slot}~~ ❌` : `*${slot}* ✅`;
        })
        .join("\n");

    const availableSlots = allTimeSlots.filter((slot) => !bookedSlots.has(slot));

    if (availableSlots.length === 0) {
        const message = `*${turfName}*\n📅 Today, ${today.formatted}\n\n${slotDisplay}\n\n_All slots booked for today._\n\nSend *SLOTS* to see other turfs.`;
        await hellotick.sendText({ phone, message });
        return;
    }

    // Quick actions
    const quickActions = availableSlots
        .slice(0, 5)
        .map((slot, i) => `${i + 1}. *Book ${slot}*`)
        .join("\n");

    const message = `*${turfName}*\n📅 Today, ${today.formatted}\n\n${slotDisplay}\n\nTo book, reply: *BOOK 5 PM - 6 PM*\n\n📋 *Quick Actions:*\n${quickActions}\n\n_Reply with number or command_`;

    await hellotick.sendText({ phone, message });
}

/**
 * Process booking request
 */
async function processBooking(
    phone: string,
    turfId: string,
    turfName: string,
    timeSlot: string,
): Promise<void> {
    const today = getTodayDate();

    // Check availability
    const bookingsSnapshot = await adminDb
        .collection("Bookings")
        .where("turfId", "==", turfId)
        .where("daySlot", "==", today.daySlot)
        .where("monthSlot", "==", today.monthSlot)
        .where("timeSlot", "==", timeSlot)
        .get();

    if (!bookingsSnapshot.empty) {
        await hellotick.sendText({
            phone,
            message: `Sorry, *${timeSlot}* is already booked.\n\nSend *SLOTS* to see other times.`,
        });
        return;
    }

    // Generate booking reference
    const refCode = `TB-${Date.now().toString().slice(-8)}`;
    const paymentLink = `https://www.turfbuddie.com/payment/${refCode}`;

    const message = `⚡ *Booking Confirmed!*\n\n📍 ${turfName}\n📅 Today, ${today.formatted}\n⏰ ${timeSlot}\n⚽ 5v5 Football\n💰 ₹800\n🆔 Ref: ${refCode}\n\nPay via link → ${paymentLink}\n\nYou'll get a reminder 1hr before.\n*Book.Play.Enjoy!* 🏟️\n\n📋 *Quick Actions:*\n1. *Slots Today*\n2. *Book another slot*\n\n_TurfBuddie_`;

    await hellotick.sendText({ phone, message });

    // Save pending booking
    await adminDb.collection("pendingWhatsAppBookings").add({
        phone,
        turfId,
        turfName,
        timeSlot,
        daySlot: today.daySlot,
        monthSlot: today.monthSlot,
        refCode,
        status: "pending_payment",
        createdAt: new Date().toISOString(),
    });
}

/**
 * Main message handler
 */
export async function handleIncomingMessage(
    message: IncomingMessage,
): Promise<void> {
    const phone = normalizePhone(message.from);
    const text = (message.text || "").trim().toUpperCase();

    console.log("[chatbot] Message from:", phone, "Text:", text);

    // Log message
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
    const session = sessionDoc.exists ? (sessionDoc.data() as WhatsappSessionV2) : ({} as WhatsappSessionV2);

    try {
        // STEP 1: Welcome
        if (text === "HI" || text === "HELLO" || text === "START") {
            const welcomeMsg = `👋 *Welcome to TurfBuddie!*\n\nI'm your smart turf assistant. I help:\n⚽ Players → book available slots\n🏟️ Owners → manage slot availability\n\nSend *SLOTS* to see today's availability!\n\n📋 *Quick Actions:*\n1. *Slots Today*\n2. *Owner Panel*\n\n_Reply with number or command_`;

            await hellotick.sendText({ phone, message: welcomeMsg });
            await sessionRef.set({
                lastCommand: "welcome",
                updatedAt: Date.now(),
            });
        }
        // STEP 2: User wants to see slots - show turf list
        else if (text === "SLOTS" || text === "SLOTS TODAY" || text === "1") {
            await sendTurfList(phone);
            await sessionRef.set({
                lastCommand: "select_turf",
                waitingFor: "turf_selection",
                updatedAt: Date.now(),
            });
        }
        // STEP 3: User selected a turf by number
        else if (/^\d+$/.test(text) && session.waitingFor === "turf_selection") {
            const turfIndex = parseInt(text) - 1;
            const turfs = await getTurfList();

            if (turfs[turfIndex]) {
                const turf = turfs[turfIndex];
                await sendSlotsForTurf(phone, turf.id, turf.name);
                await sessionRef.set({
                    lastCommand: "view_slots",
                    selectedTurfId: turf.id,
                    selectedTurfName: turf.name,
                    waitingFor: "booking",
                    updatedAt: Date.now(),
                });
            } else {
                await hellotick.sendText({
                    phone,
                    message: `Invalid number. Please reply with 1-${turfs.length}`,
                });
            }
        }
        // STEP 4: User wants to book
        else if (text.startsWith("BOOK ")) {
            if (!session.selectedTurfId) {
                await hellotick.sendText({
                    phone,
                    message: "Please select a turf first. Send *SLOTS* to start.",
                });
                return;
            }

            const timeSlot = text.replace("BOOK ", "").trim();
            await processBooking(
                phone,
                session.selectedTurfId,
                session.selectedTurfName ?? "",
                timeSlot,
            );
        }
        // Quick action: Book by number
        else if (/^\d+$/.test(text) && session.waitingFor === "booking") {
            // Get available slots again
            const today = getTodayDate();
            const bookingsSnapshot = await adminDb
                .collection("Bookings")
                .where("turfId", "==", session.selectedTurfId)
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

            const allTimeSlots = [
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

            const availableSlots = allTimeSlots.filter(
                (slot) => !bookedSlots.has(slot),
            );
            const slotIndex = parseInt(text) - 1;

            if (availableSlots[slotIndex]) {
                if (!session.selectedTurfId) return;
                await processBooking(
                    phone,
                    session.selectedTurfId,
                    session.selectedTurfName ?? "",
                    availableSlots[slotIndex],
                );
            } else {
                await hellotick.sendText({
                    phone,
                    message: `Invalid option. Please reply with 1-${availableSlots.length}`,
                });
            }
        }
        // Unknown command
        else {
            await hellotick.sendText({
                phone,
                message:
                    "I didn't understand that.\n\nSend *SLOTS* to see available turfs\nSend *HI* for help",
            });
        }
    } catch (error) {
        console.error("[chatbot] Error processing message:", error);
        await hellotick.sendText({
            phone,
            message:
                "Sorry, something went wrong. Please try again or send *HI* for help.",
        });
    }
}

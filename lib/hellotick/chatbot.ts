/**
 * WhatsApp Chatbot Handler
 * Processes incoming messages and sends interactive responses
 */

import { hellotick, normalizePhone } from "./client";
import { adminDb } from "@/lib/firebase/admin";

interface IncomingMessage {
    from: string; // Phone number
    text?: string;
    type: "text" | "image" | "video" | "document" | "audio" | "button" | "list";
    timestamp?: number;
}

interface QuickReplyButton {
    type: "reply";
    reply: {
        id: string;
        title: string;
    };
}

interface InteractiveMessage {
    phone: string;
    type: "button" | "list";
    header?: {
        type: "text";
        text: string;
    };
    body: {
        text: string;
    };
    footer?: {
        text: string;
    };
    action: {
        buttons?: QuickReplyButton[];
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

/**
 * Send interactive message with quick reply buttons
 */
export async function sendQuickReplyButtons(
    phone: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string,
): Promise<unknown> {
    const normalized = normalizePhone(phone);

    const message: InteractiveMessage = {
        phone: normalized,
        type: "button",
        body: {
            text: bodyText,
        },
        action: {
            buttons: buttons.slice(0, 3).map((btn) => ({
                type: "reply",
                reply: {
                    id: btn.id,
                    title: btn.title.substring(0, 20), // WhatsApp limit
                },
            })),
        },
    };

    if (headerText) {
        message.header = {
            type: "text",
            text: headerText,
        };
    }

    if (footerText) {
        message.footer = {
            text: footerText,
        };
    }

    console.log("[chatbot] Sending interactive buttons:", {
        phone: normalized,
        buttonsCount: buttons.length,
    });

    try {
        return await hellotick.sendInteractive(message);
    } catch (err) {
        console.log("[chatbot] Interactive failed, using formatted text fallback");

        // Fallback: Send as rich formatted text
        const buttonText = buttons
            .map((btn, i) => `${i + 1}. *${btn.title}*`)
            .join("\n");

        const fullMessage = [
            headerText ? `*${headerText}*` : "",
            "",
            bodyText,
            "",
            "📋 *Quick Options:*",
            buttonText,
            "",
            "_Reply with option number or text_",
            footerText ? `\n_${footerText}_` : "",
        ]
            .filter(Boolean)
            .join("\n");

        return hellotick.sendText({
            phone: normalized,
            message: fullMessage,
        });
    }
}

/**
 * Send slot availability as interactive pills/buttons
 */
export async function sendSlotPills(
    phone: string,
    turfId: string,
    date: string,
    slots: Array<{
        time: string;
        available: boolean;
    }>,
): Promise<void> {
    const normalized = normalizePhone(phone);

    // Get turf details
    const turfDoc = await adminDb.collection("Turfs").doc(turfId).get();
    const turfName = turfDoc.exists ? turfDoc.data()?.name : "Turf";

    // Create visual slot representation
    const slotDisplay = slots
        .map((slot) => {
            const status = slot.available ? "✅" : "❌";
            const strikethrough = slot.available ? "" : "~~";
            return `${strikethrough}${slot.time}${strikethrough} ${status}`;
        })
        .join("\n");

    const bodyText = `🏟️ *${turfName}*\n📅 ${date}\n\n${slotDisplay}\n\nReply slot time to book. Eg: *BOOK 5PM*`;

    // Create buttons for available slots (max 3 buttons in WhatsApp)
    const availableSlots = slots.filter((s) => s.available).slice(0, 3);
    const buttons = availableSlots.map((slot) => ({
        id: `BOOK_${slot.time.replace(/\s+/g, "")}`,
        title: `Book ${slot.time}`,
    }));

    if (buttons.length === 0) {
        // No buttons, just send text
        await hellotick.sendText({
            phone: normalized,
            message: bodyText + "\n\n_All slots are booked for this date._",
        });
        return;
    }

    await sendQuickReplyButtons(normalized, bodyText, buttons, `Today, ${date}`);
}

/**
 * Send booking confirmation with action pills
 */
export async function sendBookingConfirmation(
    phone: string,
    booking: {
        turfName: string;
        date: string;
        time: string;
        sport: string;
        amount: number;
        bookingId: string;
        paymentLink: string;
    },
): Promise<void> {
    const normalized = normalizePhone(phone);

    const bodyText =
        `⚡ *Booking Confirmed!*\n\n` +
        `📍 ${booking.turfName}\n` +
        `📅 ${booking.date}\n` +
        `⏰ ${booking.time}\n` +
        `⚽ ${booking.sport}\n` +
        `💰 ₹${booking.amount}\n` +
        `🆔 Ref: ${booking.bookingId}\n\n` +
        `Pay via link → ${booking.paymentLink}\n\n` +
        `You'll get a reminder 1hr before.\n*Book.Play.Enjoy!* 🏟️`;

    const buttons = [
        { id: "SLOTS_TODAY", title: "Slots Today" },
        { id: "BOOK_6PM", title: "Book 6PM" },
        { id: "BLOCK_9AM", title: "Block 9AM" },
    ];

    await sendQuickReplyButtons(normalized, bodyText, buttons);

    // Also add bottom action buttons
    const actionButtons = [
        { id: "SLOTS_TODAY", title: "Slots Today" },
        { id: "UNBLOCK_7AM", title: "Unblock 7AM" },
        { id: "REPORT_TODAY", title: "Report Today" },
    ];

    // Send second message with more actions (simulating persistent menu)
    setTimeout(async () => {
        await sendQuickReplyButtons(
            normalized,
            "Quick actions:",
            actionButtons,
            undefined,
            "TurfBuddie",
        );
    }, 1000);
}

/**
 * Send welcome message with action pills
 */
export async function sendWelcomeMessage(
    phone: string,
    userName?: string,
): Promise<void> {
    const normalized = normalizePhone(phone);

    const bodyText =
        `👋 *Welcome to TurfBuddie!*\n\n` +
        `I'm your smart turf assistant. I help:\n` +
        `⚽ Players → book available slots\n` +
        `🏟️ Owners → manage slot availability\n\n` +
        `Send *SLOTS* to see today's availability or *BOOK* to reserve a slot!`;

    const buttons = [
        { id: "SLOTS_TODAY", title: "Slots Today" },
        { id: "OWNER_UPDATE", title: "Owner Update" },
    ];

    await sendQuickReplyButtons(normalized, bodyText, buttons);
}

/**
 * Send owner verification OTP
 */
export async function sendOwnerOTP(
    phone: string,
    otp: string,
    turfName: string,
): Promise<void> {
    const normalized = normalizePhone(phone);

    const bodyText =
        `🏟️ *Venue Owner Panel*\n\n` +
        `OTP sent to ${phone.substring(0, 6)}***** ✅\n\n` +
        `Please enter your 4-digit OTP to continue:`;

    const buttons = [
        { id: "SLOTS_TODAY", title: "Slots Today" },
        { id: "BOOK_6PM", title: "Book 6PM" },
        { id: "BLOCK_9AM", title: "Block 9AM" },
    ];

    await sendQuickReplyButtons(
        normalized,
        bodyText,
        buttons,
        "🔐 Venue Owner Panel",
    );
}

/**
 * Send owner verified message with slot management pills
 */
export async function sendOwnerVerified(
    phone: string,
    ownerName: string,
    turfName: string,
    slots: Array<{ time: string; available: boolean }>,
): Promise<void> {
    const normalized = normalizePhone(phone);

    // Create slot pills
    const slotDisplay = slots
        .map((slot) => {
            const status = slot.available ? "✅" : "❌";
            return `${slot.time} ${status}`;
        })
        .join("  ");

    const bodyText =
        `✅ *Verified! Welcome, ${ownerName}*\n` +
        `📍 ${turfName}\n\n` +
        `Reply with slot time to toggle:\n\n` +
        `${slotDisplay}`;

    const buttons = [
        { id: "SLOTS_TODAY", title: "Slots Today" },
        { id: "BOOK_6PM", title: "Book 6PM" },
        { id: "BLOCK_9AM", title: "Block 9AM" },
    ];

    await sendQuickReplyButtons(normalized, bodyText, buttons);
}

/**
 * Send slot blocked confirmation
 */
export async function sendSlotBlocked(
    phone: string,
    time: string,
    turfName: string,
    notifiedCount: number,
): Promise<void> {
    const normalized = normalizePhone(phone);

    const bodyText =
        `🚫 *${time} BLOCKED*\n\n` +
        `✅ Website updated instantly\n` +
        `📲 ${notifiedCount} users who had this in wishlist notified\n\n` +
        `Players will now see this slot as unavailable.`;

    const buttons = [
        { id: "SLOTS_TODAY", title: "Slots Today" },
        { id: "BOOK_6PM", title: "Book 6PM" },
        { id: "BLOCK_9AM", title: "Block 9AM" },
    ];

    await sendQuickReplyButtons(normalized, bodyText, buttons);

    // Send bottom menu
    setTimeout(async () => {
        const actionButtons = [
            { id: "SLOTS_TODAY", title: "Slots Today" },
            { id: "UNBLOCK_7AM", title: "Unblock 7AM" },
            { id: "REPORT_TODAY", title: "Report Today" },
        ];
        await sendQuickReplyButtons(
            normalized,
            "Quick actions:",
            actionButtons,
            undefined,
            "TurfBuddie",
        );
    }, 1000);
}

/**
 * Process incoming message and route to appropriate handler
 */
export async function handleIncomingMessage(
    message: IncomingMessage,
): Promise<void> {
    const phone = normalizePhone(message.from);
    const text = (message.text || "").trim().toUpperCase();

    console.log("[chatbot] Processing message:", {
        from: phone,
        text,
        type: message.type,
    });

    // Log to Firebase
    await adminDb.collection("whatsappIncomingMessages").add({
        from: phone,
        text: message.text,
        type: message.type,
        timestamp: message.timestamp || Date.now(),
        processedAt: new Date().toISOString(),
    });

    // Command routing
    if (text === "SLOTS" || text === "SLOTS TODAY") {
        // TODO: Fetch and send available slots
        await sendSlotPills(phone, "demo-turf-id", "Apr 28", [
            { time: "6 AM", available: false },
            { time: "7 AM", available: false },
            { time: "8 AM", available: true },
            { time: "9 AM", available: true },
            { time: "10 AM", available: false },
            { time: "11 AM", available: false },
            { time: "4 PM", available: true },
            { time: "5 PM", available: true },
            { time: "6 PM", available: true },
        ]);
    } else if (text.startsWith("BOOK ")) {
        // TODO: Process booking
        const time = text.replace("BOOK ", "").trim();
        await sendBookingConfirmation(phone, {
            turfName: "Greenfield Sports Arena",
            date: "Today, 5:00 PM – 6:00 PM",
            time: "5:00 PM – 6:00 PM",
            sport: "5v5 Football",
            amount: 800,
            bookingId: "TB-2804-0472",
            paymentLink: "pay.turfbuddie.com/TB-2804-0472",
        });
    } else if (text === "OWNER UPDATE") {
        // TODO: Send OTP
        await sendOwnerOTP(phone, "7842", "Greenfield Sports Arena");
    } else if (/^\d{4}$/.test(text)) {
        // OTP verification
        // TODO: Verify OTP
        await sendOwnerVerified(phone, "Tanishq", "Greenfield Sports Arena", [
            { time: "6 AM", available: false },
            { time: "7 AM", available: false },
            { time: "8 AM", available: true },
            { time: "9 AM", available: true },
            { time: "10 AM", available: true },
            { time: "11 AM", available: false },
            { time: "4 PM", available: true },
            { time: "5 PM", available: true },
            { time: "6 PM", available: true },
        ]);
    } else if (text.startsWith("BLOCK ")) {
        // TODO: Block slot
        const time = text.replace("BLOCK ", "").trim();
        await sendSlotBlocked(phone, "10:00 AM — 11:00 AM", "Greenfield Sports Arena", 3);
    } else if (text === "HI" || text === "HELLO" || text === "START") {
        await sendWelcomeMessage(phone);
    } else {
        // Unknown command
        await hellotick.sendText({
            phone,
            message:
                "I didn't understand that. Send *SLOTS* to see availability or *BOOK* to reserve a slot.",
        });
    }
}

#!/usr/bin/env node
/**
 * WhatsApp Chatbot Test Script
 * Send interactive messages with buttons/pills
 * 
 * Usage: node test-chatbot.js <phone_number> <command>
 * Commands: welcome, slots, booking, owner
 */

const fs = require('fs');
const path = require('path');

// Load .env
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key) {
                    const value = valueParts.join('=').trim().replace(/^['"]|['"]$/g, '');
                    process.env[key.trim()] = value;
                }
            }
        });
    } catch (error) {
        console.error('Error loading .env file:', error.message);
    }
}

loadEnv();

const HELLOTICK_BASE_URL = process.env.HELLOTICK_BASE_URL || 'https://panel.hellotick.in';
const HELLOTICK_API_KEY = process.env.HELLOTICK_API_KEY;

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
};

function log(color, ...args) {
    console.log(color, ...args, colors.reset);
}

function normalizePhone(phone) {
    if (!phone) return phone;
    const trimmed = phone.trim().replace(/\s+/g, '');
    if (trimmed.startsWith('+')) return trimmed;
    const digits = trimmed.replace(/\D/g, '');
    if (!digits) return trimmed;
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length === 12 && digits.startsWith('91')) return `+${digits}`;
    return `+${digits}`;
}

async function sendInteractiveMessage(phone, message) {
    const url = `${HELLOTICK_BASE_URL}/api/send/interactive`;

    log(colors.cyan, '\n📤 Sending Interactive Message...');
    log(colors.blue, `   To: ${phone}`);
    log(colors.blue, `   Type: ${message.type}`);
    log(colors.blue, `   Buttons: ${message.action.buttons?.length || 0}`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HELLOTICK_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(message),
    });

    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch {
        data = responseText;
    }

    if (!response.ok) {
        log(colors.red, `\n   ❌ Failed: ${response.status} ${response.statusText}`);
        log(colors.yellow, '   Response:', JSON.stringify(data, null, 2));

        if (response.status === 400) {
            log(colors.red, '\n   🚨 Interactive messages might not be supported by your Hellotick plan');
            log(colors.yellow, '   Try upgrading or contact Hellotick support');
        }
        return false;
    }

    log(colors.green, '\n   ✅ Message sent successfully!');
    log(colors.cyan, '   Response:', JSON.stringify(data, null, 2));
    log(colors.green, '\n   📱 Check WhatsApp - you should see interactive buttons!');
    return true;
}

async function testWelcomeMessage(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing: Welcome Message with Buttons\n');

    const message = {
        phone: normalized,
        type: 'button',
        body: {
            text: '👋 *Welcome to TurfBuddie!*\n\nI\'m your smart turf assistant. I help:\n⚽ Players → book available slots\n🏟️ Owners → manage slot availability\n\nSend *SLOTS* to see today\'s availability or *BOOK* to reserve a slot!',
        },
        action: {
            buttons: [
                {
                    type: 'reply',
                    reply: {
                        id: 'SLOTS_TODAY',
                        title: 'Slots Today',
                    },
                },
                {
                    type: 'reply',
                    reply: {
                        id: 'OWNER_UPDATE',
                        title: 'Owner Update',
                    },
                },
            ],
        },
    };

    return await sendInteractiveMessage(normalized, message);
}

async function testSlotsMessage(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing: Slot Availability with Buttons\n');

    const message = {
        phone: normalized,
        type: 'button',
        header: {
            type: 'text',
            text: 'Today, Apr 28 — 5v5 Football',
        },
        body: {
            text: '🏟️ *Greenfield Sports Arena*\n📅 Today, Apr 28\n\n~~6 AM~~ ❌\n~~7 AM~~ ❌\n8 AM ✅\n9 AM ✅\n~~10 AM~~ ❌\n~~11 AM~~ ❌\n4 PM ✅\n5 PM ✅\n6 PM ✅\n\nReply slot time to book. Eg: *BOOK 5PM*',
        },
        action: {
            buttons: [
                {
                    type: 'reply',
                    reply: {
                        id: 'BOOK_8AM',
                        title: '8 AM',
                    },
                },
                {
                    type: 'reply',
                    reply: {
                        id: 'BOOK_5PM',
                        title: '5 PM',
                    },
                },
                {
                    type: 'reply',
                    reply: {
                        id: 'BOOK_6PM',
                        title: '6 PM',
                    },
                },
            ],
        },
    };

    return await sendInteractiveMessage(normalized, message);
}

async function testBookingConfirmation(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing: Booking Confirmation with Action Buttons\n');

    const message = {
        phone: normalized,
        type: 'button',
        body: {
            text: '⚡ *Booking Confirmed!*\n\n📍 Greenfield Sports Arena\n📅 Today, 5:00 PM – 6:00 PM\n⚽ 5v5 Football\n💰 ₹800\n🆔 Ref: TB-2804-0472\n\nPay via link → pay.turfbuddie.com/TB-2804-0472\n\nYou\'ll get a reminder 1hr before.\n*Book.Play.Enjoy!* 🏟️',
        },
        footer: {
            text: 'TurfBuddie',
        },
        action: {
            buttons: [
                {
                    type: 'reply',
                    reply: {
                        id: 'SLOTS_TODAY',
                        title: 'Slots Today',
                    },
                },
                {
                    type: 'reply',
                    reply: {
                        id: 'BOOK_6PM',
                        title: 'Book 6PM',
                    },
                },
                {
                    type: 'reply',
                    reply: {
                        id: 'BLOCK_9AM',
                        title: 'Block 9AM',
                    },
                },
            ],
        },
    };

    return await sendInteractiveMessage(normalized, message);
}

async function testOwnerPanel(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing: Owner Verification with Buttons\n');

    const message = {
        phone: normalized,
        type: 'button',
        header: {
            type: 'text',
            text: '🏟️ Venue Owner Panel',
        },
        body: {
            text: 'OTP sent to +91 70249***** ✅\n\nPlease enter your 4-digit OTP to continue:',
        },
        action: {
            buttons: [
                {
                    type: 'reply',
                    reply: {
                        id: 'SLOTS_TODAY',
                        title: 'Slots Today',
                    },
                },
                {
                    type: 'reply',
                    reply: {
                        id: 'BOOK_6PM',
                        title: 'Book 6PM',
                    },
                },
                {
                    type: 'reply',
                    reply: {
                        id: 'BLOCK_9AM',
                        title: 'Block 9AM',
                    },
                },
            ],
        },
    };

    return await sendInteractiveMessage(normalized, message);
}

// Main
const phone = process.argv[2];
const command = process.argv[3] || 'welcome';

if (!phone) {
    log(colors.red, '\n❌ Error: Phone number required!');
    log(colors.yellow, '\nUsage: node test-chatbot.js <phone_number> <command>');
    log(colors.cyan, '\nCommands:');
    log(colors.cyan, '  welcome  - Welcome message with buttons');
    log(colors.cyan, '  slots    - Slot availability with booking buttons');
    log(colors.cyan, '  booking  - Booking confirmation with action buttons');
    log(colors.cyan, '  owner    - Owner panel with OTP');
    log(colors.cyan, '\nExample: node test-chatbot.js 9876543210 slots\n');
    process.exit(1);
}

if (!HELLOTICK_API_KEY) {
    log(colors.red, '\n❌ HELLOTICK_API_KEY not found in .env\n');
    process.exit(1);
}

(async () => {
    try {
        let success;

        switch (command) {
            case 'slots':
                success = await testSlotsMessage(phone);
                break;
            case 'booking':
                success = await testBookingConfirmation(phone);
                break;
            case 'owner':
                success = await testOwnerPanel(phone);
                break;
            case 'welcome':
            default:
                success = await testWelcomeMessage(phone);
                break;
        }

        if (success) {
            log(colors.green, '\n✅ Test completed successfully!');
            log(colors.yellow, '\n💡 Now try this:');
            log(colors.cyan, '   1. Open WhatsApp on', phone);
            log(colors.cyan, '   2. You should see message with GREEN PILL BUTTONS');
            log(colors.cyan, '   3. Click a button to reply');
            log(colors.cyan, '   4. Bot will auto-respond (if webhook is configured)\n');
        } else {
            log(colors.red, '\n❌ Test failed. Check errors above.\n');
        }
    } catch (error) {
        log(colors.red, '\n❌ Error:', error.message);
        if (error.stack) {
            log(colors.yellow, error.stack);
        }
    }
})();

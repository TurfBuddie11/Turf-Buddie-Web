#!/usr/bin/env node
/**
 * Simple WhatsApp Chatbot Test
 * Sends formatted text messages that work with ANY WhatsApp API
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

async function sendTextMessage(phone, message) {
    const url = `${HELLOTICK_BASE_URL}/api/send`;

    log(colors.cyan, '\n📤 Sending WhatsApp Message...');
    log(colors.blue, `   To: ${phone}`);
    log(colors.blue, `   Length: ${message.length} characters`);

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HELLOTICK_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({
            phone,
            message,
        }),
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
        return false;
    }

    log(colors.green, '\n   ✅ Message sent successfully!');
    log(colors.cyan, '   Response:', JSON.stringify(data, null, 2));
    log(colors.green, '\n   📱 Check WhatsApp on', phone);
    return true;
}

async function testWelcomeMessage(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing: Welcome Message (Text Format)\n');

    const message = `👋 *Welcome to TurfBuddie!*

I'm your smart turf assistant. I help:
⚽ Players → book available slots
🏟️ Owners → manage slot availability

Send *SLOTS* to see today's availability or *BOOK* to reserve a slot!

📋 *Quick Options:*
1. *Slots Today*
2. *Owner Update*

_Reply with option number or command_`;

    return await sendTextMessage(normalized, message);
}

async function testSlotsMessage(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing: Slot Availability\n');

    const message = `*Today, Apr 28 — 5v5 Football*

🏟️ *Greenfield Sports Arena*
📅 Today, Apr 28

~~6 AM~~ ❌
~~7 AM~~ ❌
*8 AM* ✅
*9 AM* ✅
~~10 AM~~ ❌
~~11 AM~~ ❌
*4 PM* ✅
*5 PM* ✅
*6 PM* ✅

Reply slot time to book. Eg: *BOOK 5PM*

📋 *Quick Actions:*
1. *Book 8AM*
2. *Book 5PM*
3. *Book 6PM*

_Reply with number or type command_`;

    return await sendTextMessage(normalized, message);
}

async function testBookingConfirmation(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing: Booking Confirmation\n');

    const message = `⚡ *Booking Confirmed!*

📍 Greenfield Sports Arena
📅 Today, 5:00 PM – 6:00 PM
⚽ 5v5 Football
💰 ₹800
🆔 Ref: TB-2804-0472

Pay via link → pay.turfbuddie.com/TB-2804-0472

You'll get a reminder 1hr before.
*Book.Play.Enjoy!* 🏟️

📋 *Quick Actions:*
1. *Slots Today*
2. *Book 6PM*
3. *Block 9AM*

_Reply with number or command_
_TurfBuddie_`;

    return await sendTextMessage(normalized, message);
}

async function testOwnerPanel(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing: Owner Verification\n');

    const message = `*🏟️ Venue Owner Panel*

OTP sent to +91 70249***** ✅

Please enter your 4-digit OTP to continue:

📋 *After verification:*
1. *Slots Today*
2. *Book 6PM*
3. *Block 9AM*

_Reply with your OTP_`;

    return await sendTextMessage(normalized, message);
}

async function testSlotManagement(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing: Slot Management (Owner)\n');

    const message = `✅ *Verified! Welcome, Tanishq*
📍 Greenfield Sports Arena

Reply with slot time to toggle:

*6 AM* ❌  *7 AM* ❌  *8 AM* ✅
*9 AM* ✅  *10 AM* ✅  *11 AM* ❌
*4 PM* ✅  *5 PM* ✅  *6 PM* ✅

📋 *Quick Actions:*
1. *Slots Today*
2. *Block 10AM*
3. *Unblock 7AM*
4. *Report Today*

_Reply with number or command_`;

    return await sendTextMessage(normalized, message);
}

// Main
const phone = process.argv[2];
const command = process.argv[3] || 'welcome';

if (!phone) {
    log(colors.red, '\n❌ Error: Phone number required!');
    log(colors.yellow, '\nUsage: node test-chatbot-simple.js <phone_number> <command>');
    log(colors.cyan, '\nCommands:');
    log(colors.cyan, '  welcome  - Welcome message');
    log(colors.cyan, '  slots    - Slot availability');
    log(colors.cyan, '  booking  - Booking confirmation');
    log(colors.cyan, '  owner    - Owner verification');
    log(colors.cyan, '  manage   - Slot management panel');
    log(colors.cyan, '\nExample: node test-chatbot-simple.js 9876543210 slots\n');
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
            case 'manage':
                success = await testSlotManagement(phone);
                break;
            case 'welcome':
            default:
                success = await testWelcomeMessage(phone);
                break;
        }

        if (success) {
            log(colors.green, '\n✅ Test completed successfully!');
            log(colors.yellow, '\n💡 What you\'ll see in WhatsApp:');
            log(colors.cyan, '   ✓ Formatted text with emojis');
            log(colors.cyan, '   ✓ Bold headings and options');
            log(colors.cyan, '   ✓ Numbered menu items');
            log(colors.cyan, '   ✓ Users can reply with numbers or commands\n');
            log(colors.yellow, '💡 To enable bot auto-reply:');
            log(colors.cyan, '   1. Configure webhook in Hellotick dashboard');
            log(colors.cyan, '   2. Bot will auto-respond when user types commands\n');
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

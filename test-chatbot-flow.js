#!/usr/bin/env node
/**
 * Test Chatbot Flow - Tests the complete flow
 * 1. User: SLOTS
 * 2. Bot: Shows turf list
 * 3. User: 1 (selects turf)
 * 4. Bot: Shows TODAY's slots for that turf
 * 5. User: BOOK 5 PM - 6 PM
 * 6. Bot: Booking confirmation
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

async function sendMessage(phone, message) {
    const url = `${HELLOTICK_BASE_URL}/api/send`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${HELLOTICK_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify({ phone, message }),
    });

    const responseText = await response.text();
    let data;
    try {
        data = JSON.parse(responseText);
    } catch {
        data = responseText;
    }

    if (!response.ok) {
        throw new Error(`API Error: ${response.status} - ${JSON.stringify(data)}`);
    }

    return data;
}

async function testCompleteFlow(phone) {
    const normalized = normalizePhone(phone);

    log(colors.cyan, '\n🎯 Testing Complete Chatbot Flow\n');
    log(colors.blue, '='.repeat(50));

    // Step 1: Welcome
    log(colors.cyan, '\n📱 Step 1: Sending Welcome Message');
    const welcomeMsg = `👋 *Welcome to TurfBuddie!*

I'm your smart turf assistant. I help:
⚽ Players → book available slots
🏟️ Owners → manage slot availability

Send *SLOTS* to see today's availability!

📋 *Quick Actions:*
1. *Slots Today*
2. *Owner Panel*

_Reply with number or command_`;

    await sendMessage(normalized, welcomeMsg);
    log(colors.green, '   ✅ Welcome message sent!');

    // Wait
    log(colors.yellow, '\n   ⏳ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 2: Turf List
    log(colors.cyan, '📱 Step 2: Showing Turf List');
    const turfListMsg = `🏟️ *Select a Turf*

1. *Greenfield Sports Arena* - Mumbai
2. *Champions Turf* - Pune
3. *Victory Ground* - Nagpur
4. *Sports Hub* - Thane

_Reply with turf number (e.g., 1, 2, 3)_`;

    await sendMessage(normalized, turfListMsg);
    log(colors.green, '   ✅ Turf list sent!');

    // Wait
    log(colors.yellow, '\n   ⏳ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Slots for selected turf
    log(colors.cyan, '📱 Step 3: Showing TODAY\'s Slots');

    const today = new Date();
    const day = today.getDate();
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[today.getMonth()];

    const slotsMsg = `*Greenfield Sports Arena*
📅 Today, ${day} ${month}

~~6 AM - 7 AM~~ ❌
~~7 AM - 8 AM~~ ❌
*8 AM - 9 AM* ✅
*9 AM - 10 AM* ✅
~~10 AM - 11 AM~~ ❌
~~11 AM - 12 PM~~ ❌
*4 PM - 5 PM* ✅
*5 PM - 6 PM* ✅
*6 PM - 7 PM* ✅

To book, reply: *BOOK 5 PM - 6 PM*

📋 *Quick Actions:*
1. *Book 8 AM - 9 AM*
2. *Book 5 PM - 6 PM*
3. *Book 6 PM - 7 PM*

_Reply with number or command_`;

    await sendMessage(normalized, slotsMsg);
    log(colors.green, '   ✅ Slots sent!');

    // Wait
    log(colors.yellow, '\n   ⏳ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 4: Booking confirmation
    log(colors.cyan, '📱 Step 4: Booking Confirmation');
    const refCode = `TB-${Date.now().toString().slice(-8)}`;
    const bookingMsg = `⚡ *Booking Confirmed!*

📍 Greenfield Sports Arena
📅 Today, ${day} ${month}
⏰ 5 PM - 6 PM
⚽ 5v5 Football
💰 ₹800
🆔 Ref: ${refCode}

Pay via link → https://www.turfbuddie.com/payment/${refCode}

You'll get a reminder 1hr before.
*Book.Play.Enjoy!* 🏟️

📋 *Quick Actions:*
1. *Slots Today*
2. *Book another slot*

_TurfBuddie_`;

    await sendMessage(normalized, bookingMsg);
    log(colors.green, '   ✅ Booking confirmation sent!');

    log(colors.blue, '\n' + '='.repeat(50));
    log(colors.green, '\n✅ Complete flow test done!');
    log(colors.cyan, '\n📱 Check WhatsApp on', normalized);
    log(colors.yellow, '\n💡 You should see:');
    log(colors.cyan, '   1. Welcome message');
    log(colors.cyan, '   2. Turf selection list');
    log(colors.cyan, '   3. TODAY\'s slot availability');
    log(colors.cyan, '   4. Booking confirmation\n');
}

// Main
const phone = process.argv[2];

if (!phone) {
    log(colors.red, '\n❌ Error: Phone number required!');
    log(colors.yellow, '\nUsage: node test-chatbot-flow.js <phone_number>');
    log(colors.cyan, '\nExample: node test-chatbot-flow.js 9876543210\n');
    process.exit(1);
}

if (!HELLOTICK_API_KEY) {
    log(colors.red, '\n❌ HELLOTICK_API_KEY not found in .env\n');
    process.exit(1);
}

testCompleteFlow(phone).catch(error => {
    log(colors.red, '\n❌ Error:', error.message);
    process.exit(1);
});

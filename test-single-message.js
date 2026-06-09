#!/usr/bin/env node
/**
 * Test Single Message - Send ONE message at a time
 * Use this to test the chatbot flow step-by-step
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

async function sendMessage(phone, message, type = 'test') {
    const url = `${HELLOTICK_BASE_URL}/api/send`;

    log(colors.cyan, `\n📤 Sending ${type} message...`);
    log(colors.blue, `   To: ${phone}`);
    log(colors.blue, `   Preview: ${message.substring(0, 50)}...`);

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
        log(colors.red, `\n   ❌ Failed: ${response.status}`);
        log(colors.yellow, `   Response: ${JSON.stringify(data).substring(0, 200)}`);
        return false;
    }

    log(colors.green, '\n   ✅ Message sent successfully!');
    return true;
}

async function sendCitySelection(phone) {
    const normalized = normalizePhone(phone);

    const message = `📍 *Select Your City*

1. *Mumbai*
2. *Pune*
3. *Nagpur*
4. *Thane*

_Reply with city number (e.g., 1, 2, 3)_`;

    return await sendMessage(normalized, message, 'City Selection');
}

// Main
const phone = process.argv[2];
const messageType = process.argv[3] || 'city';

if (!phone) {
    log(colors.red, '\n❌ Error: Phone number required!');
    log(colors.yellow, '\nUsage: node test-single-message.js <phone> <type>');
    log(colors.cyan, '\nTypes:');
    log(colors.cyan, '  city   - Ask for city selection (default)');
    log(colors.cyan, '\nExample: node test-single-message.js 9876543210 city\n');
    process.exit(1);
}

if (!HELLOTICK_API_KEY) {
    log(colors.red, '\n❌ HELLOTICK_API_KEY not found in .env\n');
    process.exit(1);
}

(async () => {
    try {
        let success;

        switch (messageType) {
            case 'city':
            default:
                success = await sendCitySelection(phone);
                break;
        }

        if (success) {
            log(colors.green, '\n✅ Test completed!');
            log(colors.yellow, '\n💡 Now:');
            log(colors.cyan, '   1. Check WhatsApp');
            log(colors.cyan, '   2. Reply with a number (e.g., 1)');
            log(colors.cyan, '   3. Bot will respond with turfs in that city');
            log(colors.cyan, '   4. Each message waits for YOUR reply!\n');
        } else {
            log(colors.red, '\n❌ Test failed.\n');
        }
    } catch (error) {
        log(colors.red, '\n❌ Error:', error.message);
        process.exit(1);
    }
})();

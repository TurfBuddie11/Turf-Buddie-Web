#!/usr/bin/env node
/**
 * WhatsApp Automation Test Script
 * Test Hellotick API directly without webhooks
 * 
 * Usage: node test-whatsapp.js <phone_number>
 * Example: node test-whatsapp.js 9876543210
 */

const fs = require('fs');
const path = require('path');

// Read .env file manually
function loadEnv() {
    try {
        const envPath = path.join(__dirname, '.env');
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');

        lines.forEach(line => {
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

// Color codes for terminal output
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

async function testHellotickAPI(phone) {
    log(colors.cyan, '\n🔍 Testing Hellotick WhatsApp API...\n');

    // Step 1: Check environment variables
    log(colors.blue, '1️⃣  Checking Environment Variables:');
    if (!HELLOTICK_API_KEY) {
        log(colors.red, '   ❌ HELLOTICK_API_KEY is not set!');
        log(colors.yellow, '   → Check your .env file');
        return;
    }
    log(colors.green, `   ✅ API Key found: ${HELLOTICK_API_KEY.substring(0, 10)}...`);
    log(colors.green, `   ✅ Base URL: ${HELLOTICK_BASE_URL}`);

    // Step 2: Normalize phone number
    const normalizedPhone = normalizePhone(phone);
    log(colors.blue, '\n2️⃣  Phone Number Normalization:');
    log(colors.cyan, `   Input: ${phone}`);
    log(colors.green, `   Normalized: ${normalizedPhone}`);

    // Step 3: Test API connection
    log(colors.blue, '\n3️⃣  Testing API Connection:');
    try {
        const url = `${HELLOTICK_BASE_URL}/api/templates`;
        log(colors.cyan, `   Calling: ${url}`);

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${HELLOTICK_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch {
            data = responseText;
        }

        if (!response.ok) {
            log(colors.red, `   ❌ API Error: ${response.status} ${response.statusText}`);
            log(colors.yellow, `   Response:`, JSON.stringify(data, null, 2));

            if (response.status === 401) {
                log(colors.red, '\n   🚨 ISSUE FOUND: Invalid or Expired API Key!');
                log(colors.yellow, '   → Login to Hellotick panel and generate a new API key');
                log(colors.yellow, '   → Update HELLOTICK_API_KEY in your .env file');
            } else if (response.status === 404) {
                log(colors.red, '\n   🚨 ISSUE FOUND: API Endpoint not found!');
                log(colors.yellow, '   → Check if HELLOTICK_BASE_URL is correct');
                log(colors.yellow, '   → Current: ' + HELLOTICK_BASE_URL);
            }
            return;
        }

        log(colors.green, '   ✅ API Connection successful!');
        if (Array.isArray(data) || (data && typeof data === 'object')) {
            log(colors.cyan, `   Templates available: ${Array.isArray(data) ? data.length : 'Yes'}`);
        }

    } catch (error) {
        log(colors.red, `   ❌ Connection Failed: ${error.message}`);
        log(colors.yellow, '   → Check your internet connection');
        log(colors.yellow, '   → Verify HELLOTICK_BASE_URL is accessible');
        return;
    }

    // Step 4: Send test message
    log(colors.blue, '\n4️⃣  Sending Test WhatsApp Message:');
    try {
        const testMessage = `🧪 Test message from Turf Buddie\n\nThis is a test to verify WhatsApp automation.\n\nTime: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;

        const url = `${HELLOTICK_BASE_URL}/api/send`;
        log(colors.cyan, `   Calling: ${url}`);
        log(colors.cyan, `   Phone: ${normalizedPhone}`);
        log(colors.cyan, `   Message: "${testMessage.substring(0, 50)}..."`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HELLOTICK_API_KEY}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({
                phone: normalizedPhone,
                message: testMessage,
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
            log(colors.red, `   ❌ Send Failed: ${response.status} ${response.statusText}`);
            log(colors.yellow, `   Response:`, JSON.stringify(data, null, 2));

            if (response.status === 400) {
                log(colors.red, '\n   🚨 ISSUE FOUND: Invalid Request!');
                log(colors.yellow, '   → Phone number format might be wrong');
                log(colors.yellow, '   → Or message content is invalid');
            } else if (response.status === 403) {
                log(colors.red, '\n   🚨 ISSUE FOUND: Permission Denied!');
                log(colors.yellow, '   → Your Hellotick account might not have WhatsApp connected');
                log(colors.yellow, '   → Check your Hellotick dashboard');
            } else if (response.status === 429) {
                log(colors.red, '\n   🚨 ISSUE FOUND: Rate Limit Exceeded!');
                log(colors.yellow, '   → Too many messages sent');
                log(colors.yellow, '   → Wait a few minutes and try again');
            }
            return;
        }

        log(colors.green, '\n   ✅ Message sent successfully!');
        log(colors.cyan, '   Response:', JSON.stringify(data, null, 2));
        log(colors.green, '\n   📱 Check WhatsApp on', normalizedPhone);

    } catch (error) {
        log(colors.red, `   ❌ Send Failed: ${error.message}`);
        log(colors.yellow, '   → Network error or API issue');
        return;
    }

    log(colors.green, '\n✅ All tests passed! WhatsApp automation is working correctly.\n');
}

// Main execution
const phoneArg = process.argv[2];

if (!phoneArg) {
    log(colors.red, '\n❌ Error: Phone number required!');
    log(colors.yellow, '\nUsage: node test-whatsapp.js <phone_number>');
    log(colors.cyan, 'Example: node test-whatsapp.js 9876543210');
    log(colors.cyan, 'Example: node test-whatsapp.js +919876543210\n');
    process.exit(1);
}

testHellotickAPI(phoneArg);

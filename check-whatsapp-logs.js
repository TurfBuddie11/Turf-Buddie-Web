#!/usr/bin/env node
/**
 * WhatsApp Logs Checker
 * Check Firebase logs to see WhatsApp automation status
 * 
 * Usage: node check-whatsapp-logs.js [limit]
 * Example: node check-whatsapp-logs.js 10
 */

const admin = require('firebase-admin');
const fs = require('fs');

// Parse service account from env
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
if (!serviceAccountJson) {
    console.error('❌ FIREBASE_SERVICE_ACCOUNT_KEY not found in environment');
    process.exit(1);
}

const serviceAccount = JSON.parse(serviceAccountJson);

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

function log(color, ...args) {
    console.log(color, ...args, colors.reset);
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
}

async function checkWhatsAppLogs() {
    const limit = parseInt(process.argv[2]) || 10;

    log(colors.cyan, '\n📊 Checking WhatsApp Automation Logs\n');

    try {
        // 1. Check whatsappEvents (individual message logs)
        log(colors.blue, '1️⃣  Recent WhatsApp Messages:');
        const eventsSnapshot = await db
            .collection('whatsappEvents')
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        if (eventsSnapshot.empty) {
            log(colors.yellow, '   ⚠️  No messages found in whatsappEvents collection');
            log(colors.gray, '   This could mean:');
            log(colors.gray, '   - No bookings have been made yet');
            log(colors.gray, '   - Messages are not being logged');
            log(colors.gray, '   - Collection name might be different\n');
        } else {
            eventsSnapshot.forEach((doc) => {
                const data = doc.data();
                const success = !data.error;
                const icon = success ? '✅' : '❌';
                const color = success ? colors.green : colors.red;

                log(color, `   ${icon} ${data.event} → ${data.recipient}`);
                log(colors.gray, `      Time: ${formatDate(data.createdAt)}`);
                if (data.error) {
                    log(colors.red, `      Error: ${data.error}`);
                }
                if (data.response) {
                    log(colors.gray, `      Response: ${JSON.stringify(data.response).substring(0, 100)}`);
                }
                console.log();
            });
        }

        // 2. Check whatsappWebhookLogs (webhook processing logs)
        log(colors.blue, '\n2️⃣  Recent Webhook Logs:');
        const webhookLogsSnapshot = await db
            .collection('whatsappWebhookLogs')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        if (webhookLogsSnapshot.empty) {
            log(colors.yellow, '   ⚠️  No webhook logs found');
            log(colors.gray, '   - No payments have been captured yet');
            log(colors.gray, '   - Or webhook is not reaching the endpoint\n');
        } else {
            webhookLogsSnapshot.forEach((doc) => {
                const data = doc.data();
                log(colors.cyan, `   📦 Order: ${data.orderId} | Payment: ${data.paymentId}`);
                log(colors.gray, `      Time: ${formatDate(data.timestamp)}`);

                if (data.result) {
                    const customerIcon = data.result.customer.ok ? '✅' : '❌';
                    const ownerIcon = data.result.owner.ok ? '✅' : '❌';

                    log(colors.gray, `      Customer: ${customerIcon} ${data.result.customer.skipped ? '(skipped)' : ''}`);
                    if (data.result.customer.error) {
                        log(colors.red, `         Error: ${data.result.customer.error}`);
                    }

                    log(colors.gray, `      Owner: ${ownerIcon} ${data.result.owner.skipped ? '(skipped)' : ''}`);
                    if (data.result.owner.error) {
                        log(colors.red, `         Error: ${data.result.owner.error}`);
                    }
                }
                console.log();
            });
        }

        // 3. Check whatsappWebhookErrors (webhook errors)
        log(colors.blue, '\n3️⃣  Recent Webhook Errors:');
        const webhookErrorsSnapshot = await db
            .collection('whatsappWebhookErrors')
            .orderBy('timestamp', 'desc')
            .limit(limit)
            .get();

        if (webhookErrorsSnapshot.empty) {
            log(colors.green, '   ✅ No webhook errors found! (Good news)\n');
        } else {
            webhookErrorsSnapshot.forEach((doc) => {
                const data = doc.data();
                log(colors.red, `   ❌ Order: ${data.orderId} | Payment: ${data.paymentId}`);
                log(colors.gray, `      Time: ${formatDate(data.timestamp)}`);
                log(colors.red, `      Error: ${data.error}`);
                if (data.stack) {
                    log(colors.gray, `      Stack: ${data.stack.substring(0, 200)}...`);
                }
                console.log();
            });
        }

        // 4. Summary statistics
        log(colors.blue, '\n4️⃣  Summary Statistics:');

        const totalEvents = (await db.collection('whatsappEvents').count().get()).data().count;
        const successfulEvents = (await db.collection('whatsappEvents').where('error', '==', null).count().get()).data().count;
        const failedEvents = totalEvents - successfulEvents;

        log(colors.cyan, `   Total Messages: ${totalEvents}`);
        log(colors.green, `   Successful: ${successfulEvents}`);
        log(colors.red, `   Failed: ${failedEvents}`);

        if (totalEvents > 0) {
            const successRate = ((successfulEvents / totalEvents) * 100).toFixed(1);
            const color = successRate > 80 ? colors.green : successRate > 50 ? colors.yellow : colors.red;
            log(color, `   Success Rate: ${successRate}%`);
        }

        log(colors.cyan, '\n✅ Log check complete!\n');

    } catch (error) {
        log(colors.red, '\n❌ Error checking logs:', error.message);
        if (error.stack) {
            log(colors.gray, error.stack);
        }
    } finally {
        process.exit(0);
    }
}

// Load env file
const envPath = require('path').join(__dirname, '.env');
if (fs.existsSync(envPath)) {
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
}

checkWhatsAppLogs();

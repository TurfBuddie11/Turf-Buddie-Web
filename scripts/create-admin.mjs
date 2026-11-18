#!/usr/bin/env node
/**
 * Create an admin login, or grant/revoke admin access on an existing account.
 *
 *   node --env-file=.env scripts/create-admin.mjs <email>            create or grant
 *   node --env-file=.env scripts/create-admin.mjs <email> --revoke   remove admin access
 *
 * New accounts get a random password, printed once. Existing accounts keep
 * their password. Admin access is the Firebase custom claim `admin: true`,
 * checked by /api/auth/admin-session and lib/auth/admin.ts.
 * The user must log in again for a change to take effect.
 */
import crypto from "node:crypto";
import admin from "firebase-admin";

const [email, flag] = process.argv.slice(2);
if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
  console.error("Usage: node --env-file=.env scripts/create-admin.mjs <email> [--revoke]");
  process.exit(1);
}
if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
  console.error("FIREBASE_SERVICE_ACCOUNT_KEY is not set (run with --env-file=.env)");
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)),
});
const auth = admin.auth();
const db = admin.firestore();

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%";
  return Array.from(crypto.randomBytes(16), (b) => chars[b % chars.length]).join("");
}

(async () => {
  const normalized = email.trim().toLowerCase();
  const revoke = flag === "--revoke";

  let user;
  let password = null;
  try {
    user = await auth.getUserByEmail(normalized);
  } catch (err) {
    if (err.code !== "auth/user-not-found") throw err;
    if (revoke) {
      console.log(`No account for ${normalized}; nothing to revoke.`);
      return;
    }
    password = generatePassword();
    user = await auth.createUser({ email: normalized, password, displayName: "Admin" });
    console.log(`Created account ${normalized}`);
  }

  const claims = { ...(user.customClaims || {}) };
  if (revoke) delete claims.admin;
  else claims.admin = true;
  await auth.setCustomUserClaims(user.uid, claims);

  const ref = db.collection("admins").doc(user.uid);
  if (revoke) {
    await ref.delete();
    console.log(`Revoked admin access for ${normalized} (${user.uid})`);
    return;
  }
  await ref.set(
    {
      uid: user.uid,
      email: normalized,
      grantedAt: admin.firestore.Timestamp.now(),
    },
    { merge: true },
  );

  console.log(`Granted admin access to ${normalized} (${user.uid})`);
  if (password) {
    console.log("\nLogin: /admin/login");
    console.log(`Email: ${normalized}`);
    console.log(`Password: ${password}`);
    console.log("This password is shown only once.");
  } else {
    console.log("Existing account: password unchanged.");
  }
})().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});

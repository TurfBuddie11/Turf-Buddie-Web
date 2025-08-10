// In lib/firebase/admin.ts

import admin from "firebase-admin";
import { getApps } from "firebase-admin/app";

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

// ✅ Check if the environment variable exists
if (!serviceAccountKey) {
  throw new Error(
    "FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set. Please check your .env.local file or Vercel settings."
  );
}

// ✅ Use a try-catch block to handle JSON parsing errors
try {
  const serviceAccount = JSON.parse(serviceAccountKey);

  if (!getApps().length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
} catch (error) {
  // This will give a much clearer error in your server logs
  console.error("Firebase Admin Initialization Error:", error);
  throw new Error(
    "Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string wrapped in quotes."
  );
}

const adminDb = admin.firestore();

export { adminDb };

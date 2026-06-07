import { adminDb } from "@/lib/firebase/admin";
import { FieldValue, DocumentData } from "firebase-admin/firestore";
import { hellotick, normalizePhone } from "./client";
import {
  customerConfirmationMessage,
  ownerNotificationMessage,
  formatBookingDate,
  formatBookingTime,
} from "./messages";

const SEND_TO_CUSTOMER = process.env.HELLOTICK_SEND_CUSTOMER_CONFIRMATION !== "false";
const SEND_TO_OWNER = process.env.HELLOTICK_SEND_OWNER_NOTIFICATION !== "false";

export interface BookingEventData {
  turfId: string;
  daySlot: string;
  monthSlot: string;
  timeSlot: string | string[];
  transactionId: string;
  amount: number | string;
  userUid: string;
  splitInfo?: string;
}

interface UserProfile {
  uid: string;
  name?: string;
  mobile?: string;
  phone?: string;
  email?: string;
}

interface TurfRecord {
  id: string;
  name?: string;
  ownerId?: string;
}

async function getCustomer(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    if (snap.exists) {
      const data = snap.data() as DocumentData;
      return {
        uid: snap.id,
        name: data?.name,
        mobile: data?.mobile,
        email: data?.email,
      };
    }
    const ownerSnap = await adminDb.collection("owners").doc(uid).get();
    if (ownerSnap.exists) {
      const data = ownerSnap.data() as DocumentData;
      return {
        uid: ownerSnap.id,
        name: data?.name,
        mobile: data?.mobile,
        email: data?.email,
      };
    }
  } catch (err) {
    console.error("[hellotick] Failed to fetch customer profile:", err);
  }
  return null;
}

async function getOwner(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;
  try {
    const snap = await adminDb.collection("owners").doc(uid).get();
    if (snap.exists) {
      const data = snap.data() as DocumentData;
      return {
        uid: snap.id,
        name: data?.name,
        mobile: data?.mobile,
        email: data?.email,
      };
    }
  } catch (err) {
    console.error("[hellotick] Failed to fetch owner profile:", err);
  }
  return null;
}

async function getTurf(turfId: string): Promise<TurfRecord | null> {
  if (!turfId) return null;
  try {
    const snap = await adminDb.collection("Turfs").doc(turfId).get();
    if (snap.exists) {
      return { id: snap.id, ...(snap.data() as DocumentData) } as TurfRecord;
    }
  } catch (err) {
    console.error("[hellotick] Failed to fetch turf:", err);
  }
  return null;
}

async function logWhatsAppEvent(
  event: string,
  recipient: string,
  payload: Record<string, unknown>,
  response?: unknown,
  error?: string,
): Promise<void> {
  try {
    await adminDb.collection("whatsappEvents").add({
      event,
      recipient,
      payload,
      response: response ?? null,
      error: error ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error("[hellotick] Failed to log WhatsApp event:", err);
  }
}

async function safeSend(
  phone: string,
  message: string,
  meta: { event: string; payload: Record<string, unknown> },
): Promise<{ ok: boolean; error?: string }> {
  const normalized = normalizePhone(phone);
  try {
    const result = await hellotick.sendText({ phone: normalized, message });
    await logWhatsAppEvent(meta.event, normalized, meta.payload, result);
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      `[hellotick] send failed to ${normalized} (${meta.event}):`,
      message,
    );
    await logWhatsAppEvent(
      meta.event,
      normalized,
      meta.payload,
      undefined,
      message,
    );
    return { ok: false, error: message };
  }
}

export interface BookingAutomationResult {
  customer: { ok: boolean; skipped: boolean; error?: string };
  owner: { ok: boolean; skipped: boolean; error?: string };
}

export async function sendBookingNotifications(
  data: BookingEventData,
): Promise<BookingAutomationResult> {
  const result: BookingAutomationResult = {
    customer: { ok: false, skipped: false },
    owner: { ok: false, skipped: false },
  };

  const [customer, turf] = await Promise.all([
    getCustomer(data.userUid),
    getTurf(data.turfId),
  ]);

  const owner = turf?.ownerId ? await getOwner(turf.ownerId) : null;

  const timeSlots = Array.isArray(data.timeSlot)
    ? data.timeSlot.join(", ")
    : formatBookingTime(data.timeSlot);
  const date = formatBookingDate(data);
  const amount = Number(data.amount || 0).toFixed(2);

  if (SEND_TO_CUSTOMER) {
    if (!customer?.mobile) {
      result.customer = {
        ok: false,
        skipped: true,
        error: "No phone number on file",
      };
    } else {
      const message = customerConfirmationMessage({
        customerName: customer.name || "Customer",
        turfName: turf?.name || "your turf",
        date,
        time: timeSlots,
        bookingId: data.transactionId,
        amount,
        splitInfo: data.splitInfo,
      });
      const send = await safeSend(customer.mobile, message, {
        event: "booking_confirmation_customer",
        payload: {
          bookingId: data.transactionId,
          turfId: data.turfId,
          userUid: data.userUid,
        },
      });
      result.customer = { ok: send.ok, skipped: false, error: send.error };
    }
  } else {
    result.customer = { ok: false, skipped: true };
  }

  if (SEND_TO_OWNER) {
    if (!owner?.mobile) {
      result.owner = {
        ok: false,
        skipped: true,
        error: "No phone number on file",
      };
    } else {
      const message = ownerNotificationMessage({
        ownerName: owner.name || "Owner",
        turfName: turf?.name || "your turf",
        date,
        time: timeSlots,
        customerName: customer?.name || "Customer",
        amount,
        bookingId: data.transactionId,
      });
      const send = await safeSend(owner.mobile, message, {
        event: "booking_notification_owner",
        payload: {
          bookingId: data.transactionId,
          turfId: data.turfId,
          ownerUid: owner.uid,
        },
      });
      result.owner = { ok: send.ok, skipped: false, error: send.error };
    }
  } else {
    result.owner = { ok: false, skipped: true };
  }

  return result;
}

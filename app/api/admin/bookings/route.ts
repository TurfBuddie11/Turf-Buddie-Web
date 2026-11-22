import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAdminUid, unauthorizedResponse } from "@/lib/auth/admin";
import { ALL_SLOT_LABELS, getDaySlots } from "@/lib/booking/slots";
import { isSlotHoldActive, normalizePhone } from "@/lib/split-payment/utils";

const BLOCKING_STATUSES = ["confirmed", "pending", "booked_offline", "blocked"];
const PAYMENT_STATUSES = ["paid", "unpaid"] as const;
const PAYMENT_METHODS = ["cash", "upi", "card", "online", "other"] as const;

type ExistingSlot = {
  timeSlot?: string;
  monthSlot?: string;
  status?: string;
  holdExpiresAt?: string;
};

/** Today's date (YYYY-MM-DD) in India, where the turfs are. */
function todayInIndia(): string {
  return new Date(Date.now() + 5.5 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/**
 * POST /api/admin/bookings — admin books slot(s) on behalf of a customer.
 *
 * Body: {
 *   turfId, date: "YYYY-MM-DD", timeSlots: ["9 AM - 10 AM", ...],
 *   customer: { uid?, name?, phone?, email? },   // uid = registered user
 *   amount?: number,                              // total; defaults to turf price × slots
 *   paymentStatus: "paid" | "unpaid",
 *   paymentMethod: "cash" | "upi" | "card" | "online" | "other",
 *   notes?: string
 * }
 */
export async function POST(request: NextRequest) {
  const adminUid = await getAdminUid();
  if (!adminUid) return unauthorizedResponse();

  try {
    const body = await request.json();
    const {
      turfId,
      date,
      timeSlots,
      customer = {},
      amount,
      paymentStatus = "paid",
      paymentMethod = "cash",
      notes = "",
    } = body ?? {};

    // ---- Validate input ----
    if (!turfId || typeof turfId !== "string") {
      return NextResponse.json(
        { error: "Please select a turf." },
        { status: 400 },
      );
    }

    const slotInfo = getDaySlots(date);
    if (!slotInfo) {
      return NextResponse.json(
        { error: "Please select a valid date." },
        { status: 400 },
      );
    }
    if (date < todayInIndia()) {
      return NextResponse.json(
        { error: "Cannot book a past date." },
        { status: 400 },
      );
    }

    const requested: string[] = Array.isArray(timeSlots)
      ? Array.from(new Set(timeSlots.map((s: unknown) => String(s).trim())))
      : [];
    if (requested.length === 0) {
      return NextResponse.json(
        { error: "Please select at least one slot." },
        { status: 400 },
      );
    }
    if (requested.some((s) => !ALL_SLOT_LABELS.includes(s))) {
      return NextResponse.json(
        { error: "Invalid time slot selected." },
        { status: 400 },
      );
    }

    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status." },
        { status: 400 },
      );
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method." },
        { status: 400 },
      );
    }

    // ---- Resolve the customer ----
    let customerUid: string;
    let customerName = String(customer.name || "").trim();
    let customerPhone = normalizePhone(customer.phone);
    let customerEmail = String(customer.email || "").trim();

    if (customer.uid) {
      const userSnap = await adminDb
        .collection("users")
        .doc(String(customer.uid))
        .get();
      if (!userSnap.exists) {
        return NextResponse.json(
          { error: "Selected user not found." },
          { status: 404 },
        );
      }
      const u = userSnap.data() || {};
      customerUid = userSnap.id;
      customerName = customerName || u.name || "";
      customerPhone = customerPhone || normalizePhone(u.mobile);
      customerEmail = customerEmail || u.email || "";
    } else {
      if (!customerName) {
        return NextResponse.json(
          { error: "Customer name is required." },
          { status: 400 },
        );
      }
      if (customerPhone.length !== 10) {
        return NextResponse.json(
          { error: "Enter a valid 10-digit phone number." },
          { status: 400 },
        );
      }
      customerUid = `guest_${customerPhone}`;
    }
    if (customerEmail && !/\S+@\S+\.\S+/.test(customerEmail)) {
      return NextResponse.json(
        { error: "Invalid email address." },
        { status: 400 },
      );
    }

    // ---- Book inside a transaction so two bookings can't take the same slot ----
    const turfRef = adminDb.collection("Turfs").doc(turfId);
    const bookingId = `admin_${adminDb.collection("_").doc().id}`;
    const now = new Date();

    const result = await adminDb.runTransaction(async (tx) => {
      const turfSnap = await tx.get(turfRef);
      if (!turfSnap.exists) throw new Error("TURF_NOT_FOUND");
      const turfData = turfSnap.data() || {};

      const rawSlots = turfData.timeSlots;
      const existing: ExistingSlot[] = Array.isArray(rawSlots)
        ? rawSlots
        : rawSlots && typeof rawSlots === "object"
          ? Object.values(rawSlots)
          : [];

      const taken = requested.filter((label) =>
        existing.some(
          (b) =>
            b.timeSlot === label &&
            (b.monthSlot || "").trim().toLowerCase() ===
              slotInfo.monthSlot.toLowerCase() &&
            BLOCKING_STATUSES.includes((b.status || "").toLowerCase()) &&
            isSlotHoldActive(b),
        ),
      );
      if (taken.length > 0) {
        const err = new Error("SLOT_ALREADY_BOOKED");
        (err as Error & { slots?: string[] }).slots = taken;
        throw err;
      }

      const defaultTotal = (Number(turfData.price) || 0) * requested.length;
      const total =
        amount === undefined || amount === null || amount === ""
          ? defaultTotal
          : Number(amount);
      if (!Number.isFinite(total) || total < 0)
        throw new Error("INVALID_AMOUNT");

      // Same split as online bookings: 5% commission, rest is owner payout.
      const pricePerSlot = total / requested.length;
      const commission = pricePerSlot * 0.05;
      const payout = pricePerSlot - commission;
      const round2 = (n: number) => Math.round(n * 100) / 100;

      const newSlots = requested.map((label) => ({
        turfId,
        timeSlot: label,
        daySlot: slotInfo.daySlot,
        monthSlot: slotInfo.monthSlot,
        userUid: customerUid,
        status: "confirmed",
        price: round2(pricePerSlot),
        transactionId: bookingId,
        commission: round2(commission),
        payout: round2(payout),
        paid: "Not Paid to Owner",
        bookingDate: now,
        source: "admin",
        bookedBy: adminUid,
        paymentStatus,
        paymentMethod,
        userDetails: {
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
        notes: String(notes).slice(0, 500),
      }));

      if (
        Array.isArray(rawSlots) ||
        rawSlots === undefined ||
        rawSlots === null
      ) {
        tx.update(turfRef, { timeSlots: FieldValue.arrayUnion(...newSlots) });
      } else {
        // Legacy map-shaped timeSlots: rewrite as an array.
        tx.update(turfRef, { timeSlots: [...existing, ...newSlots] });
      }

      return {
        turfName: (turfData.name as string) || "",
        total,
        slots: newSlots,
      };
    });

    return NextResponse.json(
      {
        success: true,
        bookingId,
        turfName: result.turfName,
        date,
        daySlot: slotInfo.daySlot,
        monthSlot: slotInfo.monthSlot,
        timeSlots: requested,
        total: result.total,
        customer: {
          uid: customerUid,
          name: customerName,
          phone: customerPhone,
          email: customerEmail,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "TURF_NOT_FOUND") {
        return NextResponse.json({ error: "Turf not found." }, { status: 404 });
      }
      if (error.message === "INVALID_AMOUNT") {
        return NextResponse.json({ error: "Invalid amount." }, { status: 400 });
      }
      if (error.message === "SLOT_ALREADY_BOOKED") {
        const slots = (error as Error & { slots?: string[] }).slots || [];
        return NextResponse.json(
          {
            error: `Already booked: ${slots.join(", ")}. Please pick other slots.`,
            slots,
          },
          { status: 409 },
        );
      }
    }
    console.error("Admin booking error:", error);
    return NextResponse.json(
      { error: "Failed to create booking." },
      { status: 500 },
    );
  }
}

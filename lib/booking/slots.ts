import type { TimeSlot } from "@/lib/types/booking";

export type SlotDef = Omit<TimeSlot, "price" | "isAvailable">;

/** Hourly slots offered for booking: 9 AM → 10 PM. */
export const ALL_POSSIBLE_SLOTS: SlotDef[] = Array.from(
  { length: 13 },
  (_, i) => {
    const hour = 9 + i;
    const startTime = `${String(hour).padStart(2, "0")}:00`;
    const endTime = `${String(hour + 1).padStart(2, "0")}:00`;
    return { id: `ts${String(hour).padStart(2, "0")}00`, startTime, endTime };
  },
);

/** Convert 24h → 12h with AM/PM ("13:00" → "1 PM"). */
export const formatTo12Hour = (time24: string) => {
  const [hours, minutes] = time24.split(":").map(Number);
  if (isNaN(hours)) return "Invalid";
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}${
    minutes ? `:${String(minutes).padStart(2, "0")}` : ""
  } ${period}`;
};

/** The label stored in Firestore as `timeSlot`, e.g. "9 AM - 10 AM". */
export const getSlotLabel = (startTime: string, endTime: string) =>
  `${formatTo12Hour(startTime)} - ${formatTo12Hour(endTime)}`;

export const ALL_SLOT_LABELS: string[] = ALL_POSSIBLE_SLOTS.map((s) =>
  getSlotLabel(s.startTime, s.endTime),
);

/**
 * "2026-11-22" → { daySlot: "Sunday", monthSlot: "22 Nov" }, the same format
 * the checkout stores. Parsed as a calendar date so the server's timezone
 * can't shift it by a day.
 */
export function getDaySlots(dateStr: string): {
  daySlot: string;
  monthSlot: string;
} | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr || "");
  if (!match) return null;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const daySlot = date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
  const month = date.toLocaleDateString("en-US", {
    month: "short",
    timeZone: "UTC",
  });
  return { daySlot, monthSlot: `${d} ${month}` };
}

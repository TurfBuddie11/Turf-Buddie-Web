/**
 * A split-payment slot hold ("blocked" status) is only valid for 30 minutes.
 * Expired holds are normally removed when someone opens the split page, but
 * if nobody does they would block the slot forever — so every availability
 * check must treat an expired hold as free.
 */
export function isSlotHoldActive(slot: {
  status?: string;
  holdExpiresAt?: string;
}): boolean {
  if ((slot.status || "").toLowerCase() !== "blocked") return true;
  if (!slot.holdExpiresAt) return true; // legacy/manual blocks never expire
  return new Date(slot.holdExpiresAt).getTime() > Date.now();
}

/** Last 10 digits of a phone number, for loose matching (+91, spaces, etc.). */
export function normalizePhone(phone?: string | null): string {
  return (phone || "").replace(/\D/g, "").slice(-10);
}

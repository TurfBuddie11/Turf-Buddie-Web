import { Booking } from "@/lib/types/booking";

export interface CustomerConfirmationParams {
  customerName: string;
  turfName: string;
  date: string;
  time: string;
  bookingId: string;
  amount: string;
  splitInfo?: string;
}

export interface OwnerNotificationParams {
  ownerName: string;
  turfName: string;
  date: string;
  time: string;
  customerName: string;
  amount: string;
  bookingId: string;
}

export interface BookingReminderParams {
  customerName: string;
  turfName: string;
  date: string;
  time: string;
  bookingId: string;
}

export interface CancellationParams {
  customerName: string;
  turfName: string;
  date: string;
  time: string;
  bookingId: string;
}

export interface TournamentParams {
  recipientName: string;
  tournamentName: string;
  date: string;
  venue: string;
  registrationLink?: string;
}

export const customerConfirmationMessage = (
  p: CustomerConfirmationParams,
): string =>
  `Hi ${p.customerName}, your booking at *${p.turfName}* is confirmed! 🎉\n\n` +
  `📅 Date: ${p.date}\n` +
  `⏰ Time: ${p.time}\n` +
  `💰 Amount: ₹${p.amount}\n` +
  `🆔 Booking ID: ${p.bookingId}\n` +
  (p.splitInfo ? `\n${p.splitInfo}\n` : "\n") +
  `See you on the field! - Turf Buddie`;

export const ownerNotificationMessage = (
  p: OwnerNotificationParams,
): string =>
  `New booking at *${p.turfName}*! 🏟️\n\n` +
  `👤 Customer: ${p.customerName}\n` +
  `📅 Date: ${p.date}\n` +
  `⏰ Time: ${p.time}\n` +
  `💰 Amount: ₹${p.amount}\n` +
  `🆔 Booking ID: ${p.bookingId}\n\n` +
  `Check your Turf Buddie dashboard for full details.`;

export const bookingReminderMessage = (p: BookingReminderParams): string =>
  `Hi ${p.customerName}, friendly reminder! ⏰\n\n` +
  `Your booking at *${p.turfName}* is tomorrow:\n` +
  `📅 ${p.date}\n` +
  `⏰ ${p.time}\n` +
  `🆔 ${p.bookingId}\n\n` +
  `See you there! - Turf Buddie`;

export const cancellationMessage = (p: CancellationParams): string =>
  `Hi ${p.customerName}, your booking at *${p.turfName}* on ${p.date} at ${p.time} has been cancelled. ❌\n\n` +
  `Booking ID: ${p.bookingId}\n` +
  `Refund (if any) will be processed within 5-7 business days. - Turf Buddie`;

export const tournamentInviteMessage = (p: TournamentParams): string =>
  `Hi ${p.recipientName}, new tournament alert! 🏆\n\n` +
  `🏆 *${p.tournamentName}*\n` +
  `📅 ${p.date}\n` +
  `📍 ${p.venue}\n` +
  (p.registrationLink ? `\nRegister: ${p.registrationLink}\n` : "\n") +
  `Don't miss out! - Turf Buddie`;

export function formatBookingDate(booking: Pick<Booking, "daySlot" | "monthSlot">): string {
  if (!booking.daySlot || !booking.monthSlot) return "";
  return `${booking.daySlot} ${booking.monthSlot}`;
}

export function formatBookingTime(timeSlot: string): string {
  return timeSlot || "";
}

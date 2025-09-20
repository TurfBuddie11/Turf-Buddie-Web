import { adminDb } from "./firebase/admin";
import { FieldValue, DocumentData } from "firebase-admin/firestore";
import { Booking } from "./types/booking";

export async function processBookingTransaction(
  orderId: string,
  paymentId: string,
  serverBookingData: DocumentData, // Use a more specific type if available
) {
  const turfDocRef = adminDb.collection("Turfs").doc(serverBookingData.turfId);
  const pendingOrderRef = adminDb.collection("pendingOrders").doc(orderId);

  try {
    const newBookings = await adminDb.runTransaction(async (transaction) => {
      const turfDoc = await transaction.get(turfDocRef);
      if (!turfDoc.exists) {
        throw new Error("Turf document not found.");
      }

      const existingBookings: Booking[] = turfDoc.data()?.timeSlots || [];
      const requestedSlots: string[] = serverBookingData.timeSlots;

      // Check if any of the requested slots for the given date are already booked
      const isConflict = requestedSlots.some((requestedSlotLabel) =>
        existingBookings.some(
          (existingBooking) =>
            existingBooking.timeSlot === requestedSlotLabel &&
            existingBooking.monthSlot === serverBookingData.monthSlot &&
            existingBooking.daySlot === serverBookingData.daySlot,
        ),
      );

      if (isConflict) {
        throw new Error("SLOT_ALREADY_BOOKED");
      }

      const totalAmount = serverBookingData.amount;
      const pricePerSlot = totalAmount / requestedSlots.length;
      const commissionPerSlot = pricePerSlot * 0.094; // 9.4% commission
      const payoutPerSlot = pricePerSlot - commissionPerSlot;

      const newBookingSlots: Booking[] = requestedSlots.map(
        (slotLabel: string) => ({
          turfId: serverBookingData.turfId,
          daySlot: serverBookingData.daySlot,
          monthSlot: serverBookingData.monthSlot,
          userUid: serverBookingData.userUid,
          paid: serverBookingData.paid,
          timeSlot: slotLabel,
          price: Math.round(pricePerSlot * 100) / 100,
          transactionId: paymentId,
          status: "confirmed" as const,
          bookingDate: FieldValue.serverTimestamp(), // Use server timestamp for consistency
          commission: Math.round(commissionPerSlot * 100) / 100,
          payout: Math.round(payoutPerSlot * 100) / 100,
        }),
      );

      transaction.update(turfDocRef, {
        timeSlots: FieldValue.arrayUnion(...newBookingSlots),
      });
      transaction.delete(pendingOrderRef);

      return newBookingSlots;
    });
    return { success: true, newBookings };
  } catch (error) {
    if (error instanceof Error && error.message === "SLOT_ALREADY_BOOKED") {
      await pendingOrderRef.delete(); // Delete pending order on conflict
      return { success: false, error: "SLOT_ALREADY_BOOKED" };
    }
    console.error("Booking transaction failed:", error);
    throw error;
  }
}

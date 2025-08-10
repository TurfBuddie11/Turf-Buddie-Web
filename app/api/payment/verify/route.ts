import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
// Use the Admin SDK for server-side operations
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(request: NextRequest) {
  console.log("Payment verification request received.");
  try {
    const { paymentId, orderId, signature, bookingData } = await request.json();
    console.log("Request body parsed successfully.", { paymentId, orderId });

    // Validate that all required data, including turfId, is present
    if (
      !paymentId ||
      !orderId ||
      !signature ||
      !bookingData ||
      !bookingData.turfId
    ) {
      console.error("Missing required payment data.");
      return NextResponse.json(
        { error: "Missing required payment data or turfId." },
        { status: 400 }
      );
    }

    let isAuthentic = false;

    // Special handling for development mode to allow dummy payments
    if (
      process.env.NODE_ENV === "development" &&
      signature === "development_signature"
    ) {
      console.log("Development mode: Accepting dummy payment signature.");
      isAuthentic = true;
    } else {
      console.log("Performing production signature verification.");
      // Production-level signature verification
      const body = orderId + "|" + paymentId;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body.toString())
        .digest("hex");

      isAuthentic = expectedSignature === signature;
      console.log(`Signature verification result: ${isAuthentic}`);
    }

    if (isAuthentic) {
      // Calculate commission and payout if not already provided
      const commission = bookingData.commission || bookingData.price * 0.094;
      const payout = bookingData.payout || bookingData.price - commission;

      // Convert bookingDate to Firestore Timestamp forma

      // This is the object that will be added to the timeSlots array
      const newBookingSlot = {
        daySlot: bookingData.daySlot,
        monthSlot: bookingData.monthSlot,
        timeSlot: bookingData.timeSlot,
        userUid: bookingData.userUid,
        price: bookingData.price,
        transactionId: paymentId,
        status: "confirmed",
        bookingDate: new Date(), // Use the current server date
        commission: Math.round(commission * 1000) / 1000, // Round to 3 decimal places
        commision: Math.round(commission * 1000) / 1000, // Keep typo for database consistency
        payout: Math.round(payout * 1000) / 1000, // Round to 3 decimal places
        paid: "Not Paid to Owner", // Default for new bookings
      };

      // Get a reference to the specific turf document using the Admin SDK
      const turfDocRef = adminDb.collection("Turfs").doc(bookingData.turfId);
      console.log(`Attempting to update Firestore document: ${bookingData.turfId}`);

      try {
        // Atomically update the document by adding the new booking to the array
        await turfDocRef.update({
          timeSlots: FieldValue.arrayUnion(newBookingSlot),
        });

        console.log(`Booking added to turf: ${bookingData.turfId}`);
        return NextResponse.json({
          verified: true,
          turfId: bookingData.turfId,
        });
      } catch (dbError) {
        console.error("Error updating Firestore document:", dbError);
        return NextResponse.json(
          { error: "Failed to save booking to the database." },
          { status: 500 }
        );
      }
    } else {
      // If the signature is invalid
      console.error("Invalid payment signature.");
      return NextResponse.json(
        { verified: false, error: "Invalid payment signature." },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Overall payment verification error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}

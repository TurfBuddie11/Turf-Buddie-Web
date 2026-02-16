import { FieldValue, Timestamp } from "firebase-admin/firestore";

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  price: number;
}

export interface Turf {
  id: string;
  name: string;
  imageurl: string;
  address: string;
  rating: number;
  price: number;
  timeSlots: TimeSlot[];
  amenities?: string[];
  description?: string;
  location: {
    lat: number;
    lng: number;
  };
  // ownerId: string;
  // createdAt: Date;
}

export interface Booking {
  id?: string;
  turfId?: string;
  timeSlot: string;
  daySlot: string;
  monthSlot: string;
  userUid: string;
  transactionId: string;
  status:
    | "pending"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "booked_offline"
    | "blocked";
  price: number;
  commission: number; // Optional for offline bookings
  payout?: number; // Optional for offline bookings
  paid?: "Not Paid to Owner" | "Paid to Owner"; // Optional for offline bookings
  createdAt?: Date; // Optional since some bookings might not have this
  bookingDate?: Date | Timestamp | FieldValue;
}

export interface WebhookBooking {
  id?: string;
  turfId?: string;
  timeSlot: string;
  daySlot: string;
  monthSlot: string;
  status: "blocked";
  createdAt?: Date; // Optional since some bookings might not have this
  bookingDate?: Date | Timestamp;
}

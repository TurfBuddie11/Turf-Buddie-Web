import { Timestamp } from "firebase/firestore";

export interface OwnerProfile {
  uid: string;
  name: string;
  role?: string;
  email: string;
  createdAt: Timestamp;
  emailVerified: boolean;

  // Optional profile fields
  gender?: string;
  dob?: string; // Stored as DD/MM/YYYY
  mobile?: string;
  area?: string;
  city?: string;
  pincode?: string;
  state?: string;
}

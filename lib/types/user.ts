import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  uid: string;
  name: string;
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

  // Optional referral fields
  referralCode?: string;
  referredBy?: string;
}

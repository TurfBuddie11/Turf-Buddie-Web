import { Timestamp } from "firebase/firestore";

export interface UserProfile {
  name: string;
  gender: string;
  dob: string; // store as DD/MM/YYYY
  mobile: string;
  city: string;
  pincode: string;
  state: string;
  email: string;
  createdAt: Timestamp;
  emailVerified: boolean;
}

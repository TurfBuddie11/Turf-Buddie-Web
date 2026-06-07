import { Timestamp } from "firebase/firestore";

export interface Referral {
  referrerId: string; // User who referred
  refereeId: string; // User who was referred
  refereeName: string;
  code: string;
  status: "pending" | "completed";
  timestamp: Timestamp;
}

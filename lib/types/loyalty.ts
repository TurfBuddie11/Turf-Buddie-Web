export interface LoyaltyPoint {
  userId: string;
  balance: number;
}

export interface LoyaltyTransaction {
  userId: string;
  amount: number;
  type: "credit" | "debit";
  reason: string;
  timestamp: {
    _seconds: number;
    _nanoseconds: number;
  };
  transactionId?: string;
}

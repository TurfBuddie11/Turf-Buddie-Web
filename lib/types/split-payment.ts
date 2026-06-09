export interface SplitMember {
    uid?: string;           // Firebase uid if registered user
    name: string;
    phone: string;
    amount: number;         // Their share amount
    status: "pending" | "paid" | "failed";
    orderId?: string;       // Razorpay order id for their payment
    paymentId?: string;     // Razorpay payment id after success
    paidAt?: string;        // ISO timestamp
}

export interface SplitGroup {
    id: string;
    turfId: string;
    turfName: string;
    timeSlots: string[];    // e.g. ["9 AM - 10 AM"]
    daySlot: string;
    monthSlot: string;
    totalAmount: number;
    perPersonAmount: number;
    splitCount: number;
    organizerUid: string;
    organizerName: string;
    organizerPhone: string;
    members: SplitMember[]; // includes organizer at index 0
    status: "pending" | "confirmed" | "expired" | "cancelled";
    collectedAmount: number;
    createdAt: string;
    expiresAt: string;      // 30 min TTL — slot released if not fully paid
}

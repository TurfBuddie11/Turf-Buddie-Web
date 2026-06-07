import { Booking } from "../types/booking";

// Interfaces for a SUCCESSFUL payment
export interface PaymentSuccessPayload {
  paymentId: string;
  orderId: string;
  signature: string;
}

// ... (other Razorpay-specific interfaces remain the same) ...
interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}
interface RazorpayErrorPayload {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: { order_id: string; payment_id: string };
}
interface RazorpayErrorResponse {
  error: RazorpayErrorPayload;
}
interface RazorpayInstance {
  open(): void;
  on(
    event: "payment.failed",
    callback: (response: RazorpayErrorResponse) => void,
  ): void;
}
interface RazorpayOptions {
  key: string;
  amount: string;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: { ondismiss?: () => void };
}
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export interface PaymentOptions {
  amount: string;
  currency: string;
  orderId: string;
  userDetails: {
    name: string;
    email: string;
    contact: string;
  };
}

export const initiatePayment = (
  options: PaymentOptions,
): Promise<PaymentSuccessPayload> => {
  return new Promise((resolve, reject) => {
    // ... (the inside of this function remains the same) ...
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      return reject(new Error("Razorpay key is missing"));
    }
    if (typeof window === "undefined" || !window.Razorpay) {
      return reject(new Error("Razorpay SDK not loaded"));
    }

    const razorpayOptions: RazorpayOptions = {
      key,
      amount: options.amount,
      currency: options.currency,
      order_id: options.orderId,
      name: "TurfBuddie",
      description: "Turf Booking Payment",
      prefill: {
        name: options.userDetails.name,
        email: options.userDetails.email,
        contact: options.userDetails.contact,
      },
      theme: { color: "#16A249" },
      handler(response) {
        resolve({
          paymentId: response.razorpay_payment_id,
          orderId: response.razorpay_order_id,
          signature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss() {
          reject(new Error("Payment cancelled by user"));
        },
      },
    };

    const rzp = new window.Razorpay(razorpayOptions);
    rzp.on("payment.failed", (response) => {
      console.error("Payment Failed:", response.error.description);
      reject(new Error(response.error.description));
    });
    rzp.open();
  });
};

// --- FIX: This function is simplified ---
// It no longer sends 'bookingData'. The server fetches it securely.
export const verifyPayment = async (
  paymentId: string,
  orderId: string,
  signature: string,
): Promise<{ verified: boolean; booking?: Booking }> => {
  const response = await fetch("/api/payment/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      paymentId,
      orderId,
      signature,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Payment verification failed");
  }

  return response.json();
};

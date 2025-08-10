import { Booking } from "../types/booking";

// Interfaces for a SUCCESSFUL payment
export interface PaymentSuccessPayload {
  paymentId: string;
  orderId: string;
  signature: string;
}

interface RazorpayHandlerResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

// NEW: Interfaces for a FAILED payment
interface RazorpayErrorPayload {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: {
    order_id: string;
    payment_id: string;
  };
}

interface RazorpayErrorResponse {
  error: RazorpayErrorPayload;
}

// The Razorpay instance, now fully typed
interface RazorpayInstance {
  open(): void;
  // NEW: Replaced `any` with the specific error response type
  on(
    event: "payment.failed",
    callback: (response: RazorpayErrorResponse) => void
  ): void;
}

interface RazorpayOptions {
  key: string;
  amount: string;
  currency: string;
  order_id: string;
  name?: string;
  description?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
  handler: (response: RazorpayHandlerResponse) => void;
  modal?: {
    ondismiss?: () => void;
  };
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
  bookingDetails: Omit<Booking, "id" | "transactionId" | "createdAt">;
}

// The rest of the file remains the same...
export const initiatePayment = (
  options: PaymentOptions
): Promise<PaymentSuccessPayload> => {
  return new Promise((resolve, reject) => {
    const key = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!key) {
      reject(new Error("Razorpay key is missing in environment variables"));
      return;
    }

    if (typeof window === "undefined" || !window.Razorpay) {
      reject(
        new Error(
          "Razorpay SDK not loaded. Please refresh the page and try again."
        )
      );
      return;
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
      theme: {
        color: "#16A249",
      },
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

    if (
      process.env.NODE_ENV === "development" &&
      process.env.NEXT_PUBLIC_TEST_RAZORPAY !== "true"
    ) {
      console.log("Development mode: Using dummy payment");
      setTimeout(() => {
        resolve({
          paymentId: "pay_dummy_" + Date.now(),
          orderId: options.orderId,
          signature: "development_signature",
        });
      }, 2000);
      return;
    }

    try {
      const razorpay = new window.Razorpay(razorpayOptions);
      // Example of how you might handle a failure event
      razorpay.on("payment.failed", (response) => {
        console.error("Payment Failed:", response.error.description);
        reject(new Error(response.error.description));
      });
      razorpay.open();
    } catch (error) {
      reject(
        new Error("Failed to open payment window: " + (error as Error).message)
      );
    }
  });
};

export const verifyPayment = async (
  paymentId: string,
  orderId: string,
  signature: string,
  bookingData: Omit<Booking, "id" | "createdAt">
): Promise<{ verified: boolean; booking?: Booking }> => {
  const response = await fetch("/api/payment/verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      paymentId,
      orderId,
      signature,
      bookingData,
    }),
  });

  if (!response.ok) {
    let error;
    try {
      const errorData = await response.json();
      error = new Error(errorData.error || "Payment verification failed");
    } catch (e) {
      error = new Error(
        `Payment verification failed with status: ${response.status} + ${e}`
      );
    }
    console.error("Payment verification failed:", error);
    throw error;
  }

  const result = (await response.json()) as {
    verified: boolean;
    booking?: Booking;
  };
  return result;
};

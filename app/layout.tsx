import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "TurfBuddie | A Premium Turf Booking Platform for Vidharbha and Nagpur",
  description:
    "Book footbal, cricket and badminton turfs with TurfBuddies. Join Tournamnets, track live scores & enjoy seamless booking with secure payments.",
  keywords: [
    "turf booking",
    "sports turf",
    "football turf",
    "cricket turf",
    "badminton turf",
    "online turf booking",
    "sports tournaments",
    "turf buddies",
    "turf booking nagpur",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className={`${inter.className} antialiased`}>
        <Toaster position="top-center" richColors />
        <AuthProvider>{children}</AuthProvider>
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}

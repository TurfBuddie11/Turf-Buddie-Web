import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import Head from "next/head";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "TurfBuddie | A Premium Turf Booking Platform for Vidharbha and Nagpur",
  description:
    "Book football, cricket and badminton turfs with TurfBuddies. Join Tournamnets, track live scores & enjoy seamless booking with secure payments.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  keywords: [
    "turf",
    "turf booking app",
    "turf booking",
    "turf booking websites",
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
      <Head>
        <meta name="apple-mobile-web-app-title" content="Turfbuddie" />
      </Head>
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

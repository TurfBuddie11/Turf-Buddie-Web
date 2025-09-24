import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import Script from "next/script";
import Head from "next/head";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "TurfBuddie | A Premium Turf Booking Platform for Vidharbha and Nagpur",
  description:
    "Book football, cricket and badminton turfs with TurfBuddies. Join Tournamnets, track live scores & enjoy seamless booking with secure payments.",
  icons: [
    {
      rel: "icon",
      url: "/favicon.svg",
      type: "image/svg+xml",
    },
    {
      rel: "apple-touch-icon",
      url: "/apple-touch-icon.png",
      type: "image/svg+xml",
    },
    {
      rel: "alternate icon",
      url: "/favicon.ico",
      type: "image/vnd.microsoft.icon",
    },
    {
      rel: "shortcut icon",
      url: "/favicon.ico",
      type: "image/x-icon",
    },
  ],
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

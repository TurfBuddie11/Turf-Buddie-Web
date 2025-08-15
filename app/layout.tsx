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
  title: "TurfBuddie",
  description: "A Premium Turf Booking Platform for Vidharbha and Nagpur",
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

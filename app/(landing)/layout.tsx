import { Metadata } from "next";
import React, { ReactNode } from "react";

export const metadata: Metadata = {
  title: "TurfBuddie",
  description:
    "Book football, cricket and badminton turfs with TurfBuddies. Join Tournamnets, track live scores & enjoy seamless booking with secure payments.",
  openGraph: {
    title:
      "TurfBuddie | A Premium Turf Booking Platform for Vidharbha and Nagpur",
    description:
      "Book football, cricket and badminton turfs with TurfBuddies. Join Tournamnets, track live scores & enjoy seamless booking with secure payments.",
    url: "https://turfbuddie.com",
    siteName: "TurfBuddie",
    images: [
      {
        url: "https://turfbuddie.com/logo.png",
        width: 1200,
        height: 630,
        alt: "TurfBuddie",
      },
    ],
    locale: "en-US",
    type: "website",
  },
  icons: [
    {
      rel: "icon",
      url: "/favicon.ico",
      type: "image/x-icon",
    },
    {
      rel: "apple-touch-icon",
      url: "/apple-touch-icon.png",
      type: "image/png",
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
    "turf near me",
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

export default function LandingLayout() {
  return (
    <div style={{ margin: 0, padding: 0 }}>
      <iframe
        src="https://script.google.com/macros/s/AKfycbxtnBjzwYGVucqesQv5TfYxm2o1hj8WDqS6Ye1gXzkknMLA-2zPZ8anqaC3oPc2hf7v/exec"
        style={{
          width: "100%",
          height: "100vh",
          border: "none",
          display: "block",
        }}
      />
    </div>
  );
}

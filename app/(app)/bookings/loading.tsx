import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white">
      {/* Spinner */}
      <div className="h-12 w-12 border-4 border-t-transparent border-white rounded-full animate-spin"></div>

      {/* Loading Text */}
      <span className="text-xl font-bold">Loading Your Bookings...</span>
    </div>
  );
}

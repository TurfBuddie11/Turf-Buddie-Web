import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center  ">
      {/* Spinner */}
      <div className="h-12 w-12 border-4 border-t-transparent text-green-600 border-white rounded-full animate-spin"></div>

      {/* Loading Text */}
      <span className="text-xl font-bold">Loading Turf Details...</span>
    </div>
  );
}

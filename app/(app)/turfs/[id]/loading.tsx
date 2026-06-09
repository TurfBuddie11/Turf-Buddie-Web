import { Spinner } from "@/components/ui/spinner";
import React from "react";

export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col gap-4 items-center justify-center  ">
      {/* Spinner */}
      <Spinner className="text-green-600 size-8" />
      {/* Loading Text */}
    </div>
  );
}

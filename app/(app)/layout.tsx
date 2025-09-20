import AppHeader from "@/components/app-header";
import React, { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className=" container min-h-screen  bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <AppHeader />
      {children}
    </div>
  );
}

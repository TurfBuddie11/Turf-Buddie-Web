import AppHeader from "@/components/app-header";
import React, { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className=" container min-h-screen">
      <AppHeader />
      {children}
    </div>
  );
}

import AppHeader from "@/components/app-header";
import React, { ReactNode } from "react";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div>
      <div>
        <AppHeader />
      </div>
      {children}
    </div>
  );
}

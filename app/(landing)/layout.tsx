import React, { ReactNode } from "react";

export default function LandingLayout({ children }: { children: ReactNode }) {
  return (
    <div>
      {/* <LandingPageHeader /> */}
      {children}
    </div>
  );
}

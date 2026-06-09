"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/sidebar/admin-sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Spinner } from "@/components/ui/spinner";

interface SessionCheckResponse {
  isAuthenticated: boolean;
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/admin-session/check", {
          credentials: "include",
          cache: "no-store",
        });

        if (response.ok) {
          const data: SessionCheckResponse = await response.json();
          setIsAuthenticated(data.isAuthenticated);
        } else {
          setIsAuthenticated(false);
        }
      } catch {
        setIsAuthenticated(false);
      }
    };

    checkSession();
  }, [pathname]);

  if (isAuthenticated === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center gap-4">
          <Spinner className="h-10 w-10" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  const isLoginPage = pathname === "/admin/login";

  if (!isAuthenticated && !isLoginPage) {
    router.replace("/admin/login");
    return null;
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider>
      <div className="flex h-dvh overflow-hidden">
        <AdminSidebar />
        <main className="flex-1 overflow-y-auto bg-background">
          <div className="min-h-full">
            {children}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}

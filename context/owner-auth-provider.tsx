"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";

interface SessionCheckResponse {
  isAuthenticated: boolean;
}

export function OwnerAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);
  const checkInProgress = useRef(false);

  // Wrapped in useCallback to prevent re-creation on every render
  const checkSession = useCallback(async () => {
    if (checkInProgress.current) return;
    checkInProgress.current = true;

    try {
      const response = await fetch("/api/auth/owner-session/check", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Session check failed: ${response.status}`);
      }

      const data: SessionCheckResponse = await response.json();

      // Redirect logic
      const isOwnerRoute = pathname.startsWith("/owner");
      const isPublicOwnerPage =
        pathname === "/owner/login" || pathname === "/owner/signup";

      if (isOwnerRoute && !isPublicOwnerPage && !data.isAuthenticated) {
        console.warn("Unauthenticated access attempt → redirecting to login");
        router.replace("/owner/login?from=" + encodeURIComponent(pathname));
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      if (
        pathname.startsWith("/owner") &&
        !pathname.includes("/login") &&
        !pathname.includes("/signup")
      ) {
        router.replace("/owner/login?error=session_check_failed");
      }
    } finally {
      setIsLoading(false);
      checkInProgress.current = false;
    }
  }, [pathname, router]);

  useEffect(() => {
    checkSession();

    const handleFocus = () => checkSession();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [checkSession]); // Now depends on the memoized checkSession

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Verifying access...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

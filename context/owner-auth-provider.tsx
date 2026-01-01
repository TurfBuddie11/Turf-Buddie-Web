"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export function OwnerAuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const response = await fetch("/api/auth/owner-session/check");
      const { isAuthenticated } = await response.json();

      if (!isAuthenticated) {
        if (
          pathname.startsWith("/owner") &&
          pathname !== "/owner/login" &&
          pathname !== "/owner/signup"
        ) {
          router.push("/owner/login");
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [pathname, router]);

  if (isLoading) {
    return <div>Loading...</div>; // Or a proper loading spinner
  }

  return <>{children}</>;
}

"use client";

import { getUserProfile } from "@/lib/firebase/auth";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "@/lib/types/user";
import { usePathname, useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let didFire = false;

    // Failsafe: if Firebase doesn't respond in 3s, unblock the UI
    timeoutId = setTimeout(() => {
      if (!didFire) {
        didFire = true;
        setLoading(false);
      }
    }, 3000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (didFire) return;
        didFire = true;
        if (timeoutId) clearTimeout(timeoutId);

        if (user) {
          if (!user.emailVerified) {
            setUser(user);
            setProfile(null);
            const publicPaths = ["/", "/login", "/signup", "/explore", "/tournaments", "/about", "/contact", "/privacy", "/terms"];
            const isPublic = publicPaths.some(p => pathname === p || pathname.startsWith("/turfs/"));
            if (!isPublic && !pathname.includes("owner") && !pathname.includes("admin")) {
              router.push("/login");
            }
          } else {
            try {
              const userProfileSnap = await getUserProfile(user.uid);
              const userProfile = userProfileSnap?.data() as
                | UserProfile
                | null;

              if (userProfileSnap?.exists() && userProfile?.mobile) {
                setUser(user);
                setProfile(userProfile);

                if (["/login", "/signup"].includes(pathname)) {
                  if (user.email === "turfbuddie@gmail.com") {
                    router.push("/admin");
                  } else {
                    router.push("/");
                  }
                }
              } else {
                setUser(user);
                setProfile(null);
              }
            } catch {
              setUser(user);
              setProfile(null);
            }
          }
        } else {
          setUser(null);
          setProfile(null);
        }

        setLoading(false);
      },
      (err) => {
        // Auth error — still unblock the UI
        console.warn("[auth] state change error:", err);
        if (!didFire) {
          didFire = true;
          if (timeoutId) clearTimeout(timeoutId);
          setLoading(false);
        }
      },
    );

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [pathname, router]);

  // Always render children — pages can check `loading` for user-specific UI
  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

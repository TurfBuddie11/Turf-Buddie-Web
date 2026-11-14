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

  // Subscribe ONCE and handle every auth change (login/logout) so the UI
  // updates immediately — e.g. logging in from the booking checkout without
  // a page reload. Previously only the first event was processed.
  useEffect(() => {
    let resolvedOnce = false;
    let eventSeq = 0;

    // Failsafe: if Firebase doesn't respond in 3s, unblock the UI
    const timeoutId = setTimeout(() => {
      if (!resolvedOnce) setLoading(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(
      auth,
      async (firebaseUser) => {
        resolvedOnce = true;
        clearTimeout(timeoutId);
        const seq = ++eventSeq;

        if (!firebaseUser) {
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        if (!firebaseUser.emailVerified) {
          setUser(firebaseUser);
          setProfile(null);
          setLoading(false);
          return;
        }

        let nextProfile: UserProfile | null = null;
        try {
          const snap = await getUserProfile(firebaseUser.uid);
          const data = snap?.data() as UserProfile | undefined;
          // Profile exists → user is fully signed in. (Mobile is optional
          // now that signup no longer asks for it; requiring it left the
          // header with neither a Login button nor an account menu.)
          if (snap?.exists() && data) nextProfile = data;
        } catch {
          nextProfile = null;
        }

        // A newer auth event arrived while we were loading — drop this one.
        if (seq !== eventSeq) return;
        setUser(firebaseUser);
        setProfile(nextProfile);
        setLoading(false);
      },
      (err) => {
        // Auth error — still unblock the UI
        console.warn("[auth] state change error:", err);
        resolvedOnce = true;
        clearTimeout(timeoutId);
        setLoading(false);
      },
    );

    return () => {
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, []);

  // Route guards, re-evaluated on navigation and on auth changes.
  useEffect(() => {
    if (loading || !user) return;

    if (!user.emailVerified) {
      const publicPaths = ["/", "/login", "/signup", "/explore", "/tournaments", "/about", "/contact", "/privacy", "/terms"];
      const isPublic =
        publicPaths.some((p) => pathname === p) ||
        pathname.startsWith("/turfs/") ||
        pathname.startsWith("/split-pay/");
      if (!isPublic && !pathname.includes("owner") && !pathname.includes("admin")) {
        router.push("/login");
      }
      return;
    }

    if (profile && ["/login", "/signup"].includes(pathname)) {
      const params = new URLSearchParams(window.location.search);
      if (params.get("flow") === "completeProfile") return;
      const redirect = params.get("redirect");
      const safeRedirect =
        redirect && redirect.startsWith("/") && !redirect.startsWith("//")
          ? redirect
          : "/";
      router.push(
        user.email === "turfbuddie@gmail.com" ? "/admin" : safeRedirect,
      );
    }
  }, [loading, user, profile, pathname, router]);

  // Always render children — pages can check `loading` for user-specific UI
  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

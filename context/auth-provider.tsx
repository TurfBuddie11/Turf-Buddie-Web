"use client";

import { getUserProfile } from "@/lib/firebase/auth";
import { auth } from "@/lib/firebase/config";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { createContext, useContext, useEffect, useState } from "react";
import { UserProfile } from "@/lib/types/user";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        if (!user.emailVerified) {
          setUser(user);
          setProfile(null);
          if (pathname !== "/login") {
            router.push("/login");
          }
        } else {
          const userProfileSnap = await getUserProfile(user.uid);
          const userProfile = userProfileSnap?.data() as UserProfile | null;

          if (userProfileSnap?.exists() && userProfile?.mobile) {
            setUser(user);
            setProfile(userProfile);

            if (["/login", "/signup"].includes(pathname)) {
              router.push("/explore");
            }
          } else {
            setUser(user);
            setProfile(null);
            // if (pathname !== "/signup") {
            //   router.push("/signup?flow=completeProfile");
            // }
          }
        }
      } else {
        setUser(null);
        setProfile(null);
      }

      setLoading(false);
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

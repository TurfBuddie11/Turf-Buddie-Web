"use client";

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  MenuDock,
  type MenuDockItem,
} from "@/components/ui/shadcn-io/menu-dock";
import { OwnerAuthProvider } from "@/context/owner-auth-provider";
import { TurfProvider } from "@/context/turf-context";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import { Calendar, HomeIcon, IndianRupeeIcon, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { ReactNode, useEffect, useState } from "react";

export interface UserProfile {
  uid: string;
  name: string;
  role?: string;
  email: string;
  createdAt: Timestamp;
  emailVerified: boolean;
}

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await fetch("/api/auth/owner-session/check");
        const { isAuthenticated, uid } = await response.json();

        if (!isAuthenticated || !uid) {
          router.push("/owner/login");
          return;
        }

        const docRef = doc(db, "owners", uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [router]);

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  // Custom Icon Component for the Dock
  const UserAvatarIcon = () => (
    <Avatar className="h-6 w-6">
      <AvatarImage src="" alt={profile?.name} />
      <AvatarFallback className="text-[10px] text-muted-foreground">
        {getInitials(profile?.name)}
      </AvatarFallback>
    </Avatar>
  );

  const menuItems = [
    {
      label: "Dashboard",
      icon: HomeIcon,
      onClick: () => router.push("/owner/dashboard"),
    },
    {
      label: "Bookings",
      icon: Calendar,
      onClick: () => router.push("/owner/bookings"),
    },
    {
      label: "Turfs",
      icon: MapPin,
      onClick: () => router.push("/owner/turfs"),
    },
    {
      label: "Payout",
      icon: IndianRupeeIcon,
      onClick: () => router.push("/owner/payout"),
    },
    {
      label: "Logout",
      icon: UserAvatarIcon,
      onClick: async () => {
        await fetch("/api/auth/owner-session/logout", { method: "POST" });
        router.push("/owner/login");
      },
    },
  ] as MenuDockItem[];

  // Optional: Prevent layout shift by showing a loader or null while checking auth
  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="animate-pulse font-medium text-muted-foreground text-sm">
          Loading Workspace...
        </div>
      </div>
    );
  }

  return (
    <OwnerAuthProvider>
      <TurfProvider>
        <div className="container w-full flex flex-col items-center justify-center mx-auto min-h-screen">
          <main className="w-full pb-24">{children}</main>

          <MenuDock
            className="fixed bottom-6 z-50"
            items={menuItems}
            showLabels={false}
            animated={true}
          />
        </div>
      </TurfProvider>
    </OwnerAuthProvider>
  );
}

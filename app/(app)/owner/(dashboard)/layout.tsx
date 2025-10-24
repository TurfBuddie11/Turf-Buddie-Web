"use client";
import {
  MenuDock,
  type MenuDockItem,
} from "@/components/ui/shadcn-io/menu-dock";
import { Calendar, HomeIcon, IndianRupeeIcon, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { ReactNode } from "react";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const router = useRouter();

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
  ] as MenuDockItem[];
  return (
    <div className="container w-full flex flex-col items-center justify-center mx-auto">
      {children}
      <MenuDock
        className="fixed bottom-2 z-50"
        items={menuItems}
        showLabels={false}
        animated={true}
      />
    </div>
  );
}

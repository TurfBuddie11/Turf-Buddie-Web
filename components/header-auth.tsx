"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/**
 * Login / Sign Up buttons for guests, account menu for signed-in users.
 * Shared by every site header so they all behave the same.
 */
export function HeaderAuth() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  // Avoid flashing "Log In" while Firebase restores the session.
  if (loading) return <div className="w-9 h-9" aria-hidden />;

  if (!user) {
    return (
      <div className="flex items-center gap-1.5">
        <Button variant="ghost" asChild className="px-2.5 sm:px-4">
          <Link href="/login">Log In</Link>
        </Button>
        <Button variant="outline" asChild className="hidden sm:inline-flex">
          <Link href="/signup">Sign Up</Link>
        </Button>
      </div>
    );
  }

  const accountName =
    profile?.name || user.displayName || user.email?.split("@")[0] || "Account";

  const handleLogout = async () => {
    const { logout } = await import("@/lib/firebase/auth");
    await logout();
    // Clear the server session cookie too (ignore failures).
    fetch("/api/auth/session", { method: "DELETE" }).catch(() => undefined);
    router.push("/login");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Account menu"
        >
          <Avatar className="size-9">
            <AvatarFallback className="bg-green-100 text-green-700 font-bold">
              {accountName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="truncate">{accountName}</DropdownMenuLabel>
        {!user.emailVerified && (
          <p className="px-2 pb-1 text-xs text-amber-600">Email not verified</p>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile">Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/bookings">My Bookings</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="text-red-500 hover:text-red-600 cursor-pointer"
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function AppHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "auto";
    return () => { document.body.style.overflow = "auto"; };
  }, [isMobileMenuOpen]);

  const navLinks = [
    { name: "Explore", href: "/explore" },
    { name: "Tournaments", href: "/tournaments" },
    { name: "My Bookings", href: "/bookings" },
    { name: "Join as Owner", href: "/owner" },
  ];

  const handleLogout = async () => {
    const { logout } = await import("@/lib/firebase/auth");
    await logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">

        {/* Left: Logo + Nav */}
        <div className="flex items-center gap-4 shrink-0">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Image
              src="/logo.png"
              alt="TurfBuddie"
              width={36}
              height={36}
              className="rounded-lg shrink-0"
              priority
            />
            <span className="text-lg font-bold text-green-600 hidden sm:block">TurfBuddie</span>
          </Link>
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>

        {/* Right: Theme + Auth + Book Now (desktop) */}
        <div className="hidden md:flex items-center gap-2 shrink-0">
          <ThemeToggle />
          {!user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/signup">Sign Up</Link>
              </Button>
            </>
          ) : (
            profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="size-9">
                      <AvatarFallback className="bg-green-100 text-green-700 font-bold">
                        {(profile.name ?? "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
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
            )
          )}
          <Button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold"
            onClick={() => router.push("/explore")}
          >
            Book Now
          </Button>
        </div>

        {/* Mobile: Theme + Hamburger */}
        <div className="flex md:hidden items-center gap-2 shrink-0">
          <ThemeToggle />
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
            className="p-1.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
          <nav className="max-w-7xl mx-auto px-4 py-5 flex flex-col gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400 py-2.5 border-b border-gray-100 dark:border-gray-800 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {link.name}
              </Link>
            ))}

            <div className="pt-3 flex flex-col gap-2">
              {!user ? (
                <>
                  <Button variant="outline" asChild className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                    <Link href="/login">Log In</Link>
                  </Button>
                  <Button asChild className="w-full bg-green-600 hover:bg-green-700" onClick={() => setIsMobileMenuOpen(false)}>
                    <Link href="/signup">Sign Up</Link>
                  </Button>
                </>
              ) : (
                profile && (
                  <>
                    <Link
                      href="/profile"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 py-2"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {profile.name}
                    </Link>
                    <Button variant="outline" size="sm" onClick={handleLogout} className="w-full">
                      Logout
                    </Button>
                  </>
                )
              )}
              <Button
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold mt-1"
                onClick={() => { router.push("/explore"); setIsMobileMenuOpen(false); }}
              >
                Book Now
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

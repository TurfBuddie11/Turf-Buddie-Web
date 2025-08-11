"use client";

import Link from "next/link";
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Header2() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const primaryLinks = [
    { name: "Explore", href: "/explore" },
    { name: "Tournaments", href: "/tournaments" },
  ];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
        isScrolled
          ? "bg-slate-900/95 backdrop-blur-sm border-b border-slate-800"
          : isMobileMenuOpen
          ? "bg-gradient-to-r from-gray-900 via-black to-gray-900"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center shadow-sm">
            <span className="text-primary-foreground font-bold text-lg">T</span>
          </div>
          <span className="text-xl font-bold text-foreground">TurfBuddie</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {primaryLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-slate-300 hover:text-white transition-colors"
            >
              {link.name}
            </Link>
          ))}

          <span className="mx-1 h-6 w-px bg-slate-800" />

          {/* Auth Section */}
          {!user ? (
            <>
              <Button
                asChild
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-slate-800/50"
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className="glow-button text-primary-foreground font-semibold shadow-md"
              >
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          ) : (
            profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 pl-4 border-l border-slate-800 focus:outline-none">
                    <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-black font-bold text-sm">
                      {profile.fullname?.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm text-white font-medium">
                      {profile.fullname}
                    </span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="bg-slate-900 border-slate-800">
                  <DropdownMenuLabel className="text-slate-300">
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" className="text-slate-300">
                      View Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-red-400 hover:text-red-300 cursor-pointer"
                    onClick={async () => {
                      const { logout } = await import("@/lib/firebase/auth");
                      await logout();
                      router.push("/login");
                    }}
                  >
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          )}

          <Button
            className="bg-green-500 hover:bg-green-600"
            onClick={() => router.push("/explore")}
          >
            Book Now
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden text-slate-300 hover:text-white transition-colors"
          onClick={() => setIsMobileMenuOpen((s) => !s)}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-nav"
          aria-label="Toggle navigation menu"
        >
          {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
        </button>
      </div>

      {/* Mobile Nav */}
      {isMobileMenuOpen && (
        <nav
          id="mobile-nav"
          className="md:hidden bg-gradient-to-r from-gray-900 via-black to-gray-900 px-4 py-4 flex flex-col gap-4"
        >
          {primaryLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className="text-slate-300 hover:text-white transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}

          <span className="h-px bg-slate-800" />

          {!user ? (
            <>
              <Button
                asChild
                variant="ghost"
                className="text-slate-300 hover:text-white hover:bg-slate-800/50"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className="glow-button text-primary-foreground font-semibold shadow-md"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          ) : (
            profile && (
              <>
                <Link
                  href="/profile"
                  className="text-slate-300 hover:text-white"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {profile.fullname}
                </Link>
                <button
                  className="text-red-400 hover:text-red-300 text-left"
                  onClick={async () => {
                    const { logout } = await import("@/lib/firebase/auth");
                    await logout();
                    router.push("/login");
                    setIsMobileMenuOpen(false);
                  }}
                >
                  Logout
                </button>
              </>
            )
          )}

          <Button
            className="bg-green-500 hover:bg-green-600"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Book Now
          </Button>
        </nav>
      )}
    </header>
  );
}

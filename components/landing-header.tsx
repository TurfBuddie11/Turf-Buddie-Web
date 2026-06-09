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
import Image from "next/image";
import { Avatar } from "@/components/ui/avatar";
import { AvatarFallback } from "@radix-ui/react-avatar";

export default function LandingPageHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, profile } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  //Prevent body scroll when mobile menu is open for better UX
  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "auto";

    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isMobileMenuOpen]);

  const primaryLinks = [
    { name: "Download", href: "#download" },
    { name: "Tournaments", href: "/tournaments" },
    { name: "About", href: "/about" },
    { name: "Privacy", href: "#privacy" },
  ];

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-colors duration-300 ${
        isScrolled
          ? " backdrop-blur-sm border-b border-slate-800"
          : isMobileMenuOpen && "bg-transparent"
      }`}
    >
      <div className="container max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-white  rounded-full flex items-center justify-center shadow-sm">
            {/* <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center shadow-sm"> */}
            {/* <span className="text-primary-foreground font-bold text-lg">T</span> */}
            <Image
              src="/logo.svg"
              alt="TurfBuddie"
              title="TurfBiddie"
              width={56}
              height={56}
              className="rounded-full"
            />
          </div>
          <span className="text-xl font-bold text-foreground">TurfBuddie</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6">
          {primaryLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className=" transition-colors"
            >
              {link.name}
            </Link>
          ))}

          <span className="mx-1 h-6 w-px" />

          {/* Auth Section */}
          {!user ? (
            <>
              <Button asChild variant="ghost">
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className=" text-primary-foreground font-semibold shadow-md"
              >
                <Link href="/signup">Sign up</Link>
              </Button>
            </>
          ) : (
            profile && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 pl-4 border-l border-slate-800 focus:outline-none">
                    <Avatar>
                      <AvatarFallback className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center font-bold text-sm">
                        {(profile.name ?? "").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm  font-medium">{profile.name}</span>
                  </button>
                </DropdownMenuTrigger>

                <DropdownMenuContent className="fixed">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile">View Profile</Link>
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
            onClick={() => {
              if (user) {
                router.push("/explore");
              } else {
                router.push("/login");
              }
            }}
          >
            Book Now
          </Button>
        </nav>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden  hover: transition-colors"
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
              className=" hover: transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {link.name}
            </Link>
          ))}

          <span className="h-px " />

          {!user ? (
            <>
              <Button
                asChild
                variant="ghost"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <Link href="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className=" text-primary-foreground font-semibold shadow-md"
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
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {profile.name}
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
            onClick={() => {
              if (user) {
                router.push("/explore");
              } else {
                router.push("/login");
              }
            }}
          >
            Book Now
          </Button>
        </nav>
      )}
    </header>
  );
}

"use client";

import { Instagram, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const Footer = () => {
  const router = useRouter();
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <footer className="glass-card mt-20" data-aos="fade-up">
      <div className="container max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-hero rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">
                  T
                </span>
              </div>
              <span className="text-xl font-bold text-foreground">
                TurfBuddie
              </span>
            </div>
            <p className="text-muted-foreground">
              Your trusted partner for seamless turf booking experiences in
              Nagpur and Vidarbha.
            </p>
            <div className="flex space-x-3">
              {/* <Button
                size="sm"
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Facebook className="w-4 h-4" />
              </Button> */}
              <Button
                size="sm"
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Link
                  href="https://www.instagram.com/turfbuddie?igsh=MWRqajY5cGp1Zzc2MQ=="
                  target="_blank"
                >
                  <Instagram className="w-4 h-4" />
                </Link>
              </Button>
              {/* <Button
                size="sm"
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Twitter className="w-4 h-4" />
              </Button> */}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Quick Links
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => scrollToSection("download")}
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Download App
              </button>
              <button
                onClick={() => router.push("tournaments")}
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Tournaments
              </button>
              <button
                onClick={() => router.push("/about")}
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                About Us
              </button>
              <button
                onClick={() => scrollToSection("privacy")}
                className="block text-muted-foreground hover:text-primary transition-colors"
              >
                Privacy Policy
              </button>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">Services</h3>
            <div className="space-y-2">
              <div className="text-muted-foreground">Turf Booking</div>
              <div className="text-muted-foreground">
                Tournament Organization
              </div>
              <div className="text-muted-foreground">Equipment Rental</div>
              <div className="text-muted-foreground">Coaching Services</div>
              <div className="text-muted-foreground">Corporate Events</div>
            </div>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-foreground">
              Contact Us
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-muted-foreground">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="text-sm">Nagpur, Maharashtra</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Phone className="w-4 h-4 text-primary" />
                <span className="text-sm">+91 98906 92974</span>
              </div>
              <div className="flex items-center gap-3 text-muted-foreground">
                <Mail className="w-4 h-4 text-primary" />
                <span className="text-sm">turfbuddy11@gmail.com </span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8 mt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              © 2025 TurfBuddie. All rights reserved.
            </div>
            <div className="flex gap-6 text-sm">
              <span className="text-muted-foreground hover:text-primary cursor-pointer">
                Terms of Service
              </span>
              <span className="text-muted-foreground hover:text-primary cursor-pointer">
                Support
              </span>
              <span className="text-muted-foreground hover:text-primary cursor-pointer">
                FAQ
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

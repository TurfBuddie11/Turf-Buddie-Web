"use client";

import type React from "react";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { loginOwner } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function OwnerLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const userCredential = await loginOwner(
        formData.email,
        formData.password,
      );
      const idToken = await userCredential.user.getIdToken();

      await fetch("/api/auth/owner-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      router.push("/owner/dashboard");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown Error";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen  flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2">
          <div className="flex items-center gap-2 mb-4">
            <Image
              src="/logo.svg"
              alt="TurfBuddie Logo"
              width={56}
              height={56}
              className="rounded-full"
              priority
            />
            <span className="font-bold text-lg">TurfBuddie Owner</span>
          </div>
          <CardTitle>Owner Login</CardTitle>
          <CardDescription>
            Sign in to manage your turfs and bookings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                type="email"
                name="email"
                placeholder="owner@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="rounded" />
                Remember me
              </label>
              <Link href="#" className="text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-background text-muted-foreground">
                  New to TurfHub?
                </span>
              </div>
            </div>

            <Link href="/owner/signup">
              <Button variant="outline" className="w-full bg-transparent">
                Create Owner Account
              </Button>
            </Link>
          </div>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Looking for user login?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Click here
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

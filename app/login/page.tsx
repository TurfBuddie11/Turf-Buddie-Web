"use client";

import { useState } from "react";
import { useReducedMotion, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2, LogIn } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel,
} from "@/components/ui/form";
import { login } from "@/lib/firebase/auth";
import { User, sendEmailVerification } from "firebase/auth"; // Import User type
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// Validation Schema
const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const shouldReduceMotion = useReducedMotion();
  const router = useRouter();

  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState("");
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null); // New state for the unverified user

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
    reValidateMode: "onChange",
  });

  const onSubmit = async (values: LoginFormData) => {
    try {
      const { email, password } = values;
      const userCredential = await login(email, password);
      const loggedInUser = userCredential.user;

      if (!loggedInUser.emailVerified) {
        setUnverifiedUser(loggedInUser);
        setCurrentUserEmail(loggedInUser.email || "");
        setShowVerifyPopup(true);
        toast.error("Please verify your email to continue.");
        return;
      }

      toast.success("Logged in successfully!");
      router.push("/explore");
    } catch (e) {
      if (
        e instanceof Error &&
        (e.message.includes("auth/invalid-credential") ||
          e.message.includes("auth/wrong-password"))
      ) {
        toast.error("Invalid email or password. Please try again.");
      } else if (e instanceof Error) {
        toast.error(e.message || "Unable to sign in. Please try again.");
      } else {
        toast.error("An unknown error occurred. Please try again.");
      }
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) {
      toast.error("Could not find user. Please try logging in again.");
      return;
    }

    try {
      await sendEmailVerification(unverifiedUser);
      toast.success("Verification email sent. Please check your inbox.");
    } catch (error) {
      toast.error(
        "Failed to send verification email. Please try again later." + error
      );
    }
  };

  const isSubmitting = form.formState.isSubmitting;

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
          animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-4xl grid md:grid-cols-2 gap-8"
        >
          {/* Left - Marketing Content */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: -40 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col justify-center space-y-6 text-center md:text-left"
          >
            <h1 className="text-4xl font-bold leading-tight">
              Welcome to{" "}
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                TurfBuddies
              </span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Book your turf, join tournaments, and track live scores — all in
              one app. Sign in to access your dashboard and exclusive perks.
            </p>
            <ul className="space-y-3 text-muted-foreground">
              <li>🏆 Join local tournaments & win exciting prizes</li>
              <li>⚡ Quick turf booking with instant confirmation</li>
              <li>📊 Track live match stats and schedules</li>
            </ul>
          </motion.div>

          {/* Right - Login Form */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: 40 }}
            animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <Card className="glass-card shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-primary" />
                  Sign In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-5"
                    noValidate
                  >
                    {/* Email */}
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="you@example.com"
                              autoComplete="email"
                              inputMode="email"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Password */}
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your password"
                              autoComplete="current-password"
                              disabled={isSubmitting}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full glow-button"
                      disabled={isSubmitting}
                      aria-busy={isSubmitting}
                    >
                      {isSubmitting && (
                        <Loader2
                          className="w-4 h-4 mr-2 animate-spin"
                          aria-hidden="true"
                        />
                      )}
                      {isSubmitting ? "Signing in…" : "Sign In"}
                    </Button>
                  </form>
                </Form>

                <Separator className="my-6" />

                <p className="text-sm text-center text-muted-foreground">
                  Don’t have an account?{" "}
                  <Link href="/signup" className="text-primary hover:underline">
                    Sign Up
                  </Link>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>

      {/* Email Verification Dialog */}
      <Dialog open={showVerifyPopup} onOpenChange={setShowVerifyPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Email Verification Needed</DialogTitle>
            <DialogDescription>
              We’ve sent a verification link to{" "}
              <strong>{currentUserEmail}</strong>. Please check your inbox and
              verify your account to proceed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between">
            <Button
              variant="secondary"
              onClick={() => setShowVerifyPopup(false)}
            >
              Close
            </Button>
            <Button variant="default" onClick={handleResendVerification}>
              Resend Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import { useState } from "react";
import { useReducedMotion, motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
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
import {
  login,
  signInWithGoogle,
  getUserProfile,
  sendResetPasswordEmail, // Import the new function
} from "@/lib/firebase/auth";
import { User, sendEmailVerification } from "firebase/auth";
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

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showVerifyPopup, setShowVerifyPopup] = useState<boolean>(false);
  const [showResetPopup, setShowResetPopup] = useState<boolean>(false); // State for reset dialog
  const [isResetting, setIsResetting] = useState<boolean>(false); // Loading state for reset
  const [currentUserEmail, setCurrentUserEmail] = useState<string>("");
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState<boolean>(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onSubmit",
  });

  const { isSubmitting } = form.formState;

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogle();
      const googleUser = result.user;
      const profileSnap = await getUserProfile(googleUser.uid);

      if (profileSnap.exists() && profileSnap.data().mobile) {
        toast.success(`Welcome back, ${googleUser.displayName}!`);
        router.push("/explore");
      } else {
        toast.info("Welcome! Let's complete your profile.");
        router.push("/signup?flow=completeProfile");
      }
    } catch (error) {
      toast.error("Google Sign-In failed. Please try again.");
      console.error(error);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const onEmailSubmit = async (values: LoginFormData) => {
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
      if (e instanceof Error && e.message.includes("auth/invalid-credential")) {
        toast.error("Invalid email or password. Please try again.");
      } else if (e instanceof Error) {
        toast.error(e.message || "Unable to sign in.");
      } else {
        toast.error("An unknown error occurred.");
      }
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    try {
      await sendEmailVerification(unverifiedUser);
      toast.success("Verification email sent. Please check your inbox.");
    } catch (error) {
      toast.error("Failed to send verification email.");
      console.error(error);
    }
  };

  const handlePasswordReset = async (
    event: React.FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const email = formData.get("email") as string;

    if (!email) {
      toast.error("Please enter your email address.");
      return;
    }

    setIsResetting(true);
    try {
      await sendResetPasswordEmail(email);
      toast.success("Password reset link sent. Please check your inbox.");
      setShowResetPopup(false);
    } catch (error) {
      toast.error(
        "Failed to send reset email. Please check the address and try again."
      );
      console.error(error);
    } finally {
      setIsResetting(false);
    }
  };

  const isLoading = isSubmitting || isGoogleLoading;

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4">
        <motion.div
          initial={shouldReduceMotion ? false : { opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-4xl grid md:grid-cols-2 gap-8"
        >
          {/* Left - Marketing Content */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="flex flex-col justify-center space-y-6 text-center md:text-left"
          >
            <h1 className="text-4xl font-bold leading-tight">
              Welcome back to{" "}
              <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                TurfBuddie
              </span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Sign in to access your dashboard, book your next game, and view
              your match history.
            </p>
          </motion.div>

          {/* Right - Login Form */}
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
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
                <Button
                  variant="outline"
                  className="w-full h-11 text-base"
                  onClick={handleGoogleSignIn}
                  disabled={isLoading}
                >
                  {isGoogleLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <FcGoogle className="w-6 h-6 mr-3" />
                  )}
                  Continue with Google
                </Button>

                <div className="my-4 flex items-center">
                  <Separator className="flex-grow shrink-0 basis-0" />
                  <span className="mx-4 text-xs uppercase text-muted-foreground">
                    Or
                  </span>
                  <Separator className="flex-grow shrink-0 basis-0" />
                </div>

                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onEmailSubmit)}
                    className="space-y-5"
                    noValidate
                  >
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
                              disabled={isLoading}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          {/* --- NEW: Label with Forgot Password Link --- */}
                          <div className="flex justify-between items-center">
                            <FormLabel>Password</FormLabel>
                            <Button
                              type="button"
                              variant="link"
                              className="p-0 h-auto text-xs text-primary/80 hover:text-primary"
                              onClick={() => setShowResetPopup(true)}
                              disabled={isLoading}
                            >
                              Forgot Password?
                            </Button>
                          </div>
                          <div className="relative">
                            <FormControl>
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                autoComplete="current-password"
                                disabled={isLoading}
                                {...field}
                              />
                            </FormControl>
                            {/* --- NEW: Password Visibility Toggle --- */}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-0 right-0 h-full px-3 text-muted-foreground hover:text-primary"
                              onClick={() => setShowPassword(!showPassword)}
                              disabled={isLoading}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      className="w-full glow-button"
                      disabled={isLoading}
                    >
                      {isSubmitting && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {isSubmitting ? "Signing in…" : "Sign In with Email"}
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

      {/* --- NEW: Password Reset Dialog --- */}
      <Dialog open={showResetPopup} onOpenChange={setShowResetPopup}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Your Password</DialogTitle>
            <DialogDescription>
              Enter your email address below. If an account exists, we&apos;ll
              send you a link to reset your password.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handlePasswordReset}>
            <div className="grid gap-4 py-4">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                autoComplete="email"
                disabled={isResetting}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowResetPopup(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isResetting}>
                {isResetting && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Send Reset Link
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Email Verification Dialog (unchanged) */}
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
          <DialogFooter className="flex justify-between w-full">
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

"use client";

import { useState } from "react";
import Link from "next/link";
import { FirebaseError } from "firebase/app";
import { sendEmailVerification, signOut, User } from "firebase/auth";
import { Eye, EyeOff, Loader2, LogIn, MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { auth } from "@/lib/firebase/config";
import { login, sendResetPasswordEmail } from "@/lib/firebase/auth";

interface InlineLoginFormProps {
  /** Called after a successful, verified login (session cookie is set). */
  onSuccess?: (user: User) => void;
  title?: string;
  description?: string;
}

const loginErrorMessage = (error: unknown): string => {
  if (error instanceof FirebaseError) {
    switch (error.code) {
      case "auth/invalid-credential":
      case "auth/wrong-password":
      case "auth/user-not-found":
        return "Invalid email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Please wait a few minutes and try again.";
      case "auth/network-request-failed":
        return "Network error. Check your internet connection.";
      default:
        return error.message;
    }
  }
  return error instanceof Error ? error.message : "Unable to sign in.";
};

/**
 * Email/password login that works in place (inside a dialog or page section)
 * without navigating away or reloading — the AuthProvider picks up the new
 * user automatically, so the surrounding UI (e.g. booking checkout) keeps
 * its state.
 */
export function InlineLoginForm({
  onSuccess,
  title = "Login to continue",
  description = "Your selected slots will stay as they are.",
}: InlineLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setError("");

    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await login(email.trim(), password);

      if (!user.emailVerified) {
        setUnverifiedUser(user);
        return;
      }

      const idToken = await user.getIdToken();
      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        // Not fatal: API calls also accept the ID token directly.
        console.warn("[inline-login] session cookie not set:", res.status);
      }

      toast.success("Logged in successfully!");
      setPassword("");
      onSuccess?.(user);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (!unverifiedUser) return;
    setResending(true);
    try {
      await sendEmailVerification(unverifiedUser);
      toast.success("Verification email sent. Check your inbox.");
    } catch {
      toast.error("Could not send verification email. Try again later.");
    } finally {
      setResending(false);
    }
  };

  const handleBackToLogin = async () => {
    // Sign out the unverified session so a fresh login (after verifying)
    // triggers an auth-state change.
    await signOut(auth).catch(() => undefined);
    setUnverifiedUser(null);
    setPassword("");
  };

  const handleForgotPassword = async () => {
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError("Enter your email above first, then click Forgot password.");
      return;
    }
    try {
      await sendResetPasswordEmail(email.trim());
      toast.success("Password reset link sent to your email.");
    } catch {
      toast.error("Could not send reset email. Check the email address.");
    }
  };

  if (unverifiedUser) {
    return (
      <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/20">
        <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-300">
          <MailCheck className="h-4 w-4" /> Verify your email first
        </div>
        <p className="text-amber-700 dark:text-amber-400">
          We sent a verification link to{" "}
          <span className="font-medium">{unverifiedUser.email}</span>. Click it,
          then log in again here.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={resending}
          >
            {resending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
            Resend email
          </Button>
          <Button type="button" size="sm" onClick={handleBackToLogin}>
            I&apos;ve verified — log in again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3" noValidate>
      <div>
        <p className="flex items-center gap-2 font-semibold">
          <LogIn className="h-4 w-4 text-green-600" /> {title}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="inline-login-email">Email</Label>
        <Input
          id="inline-login-email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="inline-login-password">Password</Label>
        <div className="relative">
          <Input
            id="inline-login-password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Login
      </Button>

      <div className="flex items-center justify-between text-xs">
        <button
          type="button"
          onClick={handleForgotPassword}
          className="text-muted-foreground hover:underline"
        >
          Forgot password?
        </button>
        <Link
          href="/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-green-600 hover:underline"
        >
          New here? Create account ↗
        </Link>
      </div>
    </form>
  );
}

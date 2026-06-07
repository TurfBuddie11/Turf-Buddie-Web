"use client";

import z from "zod";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";

import { loginAdmin } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Field,
  FieldError,
  FieldLabel,
  FieldGroup,
} from "@/components/ui/field";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

type LoginSchema = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const form = useForm<LoginSchema>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  const onSubmit = async (values: LoginSchema) => {
    try {
      const userCredential = await loginAdmin(values.email, values.password);
      const idToken = await userCredential.user.getIdToken();

      const response = await fetch("/api/auth/admin-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!response.ok) throw new Error("Failed to create session");

      toast.success("Welcome back, Admin");
      router.push("/admin/tournaments/manage");
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Invalid Credentials";
      toast.error(msg);
    }
  };

  return (
    // min-h-dvh (dynamic viewport height) ensures better behavior on mobile browsers
    <div className="min-h-dvh flex items-center justify-center p-4 sm:p-6 ">
      {/* Mobile: w-full (maximized space)
          Desktop: max-w-md (centered narrow card)
      */}
      <Card className="w-full max-w-md border-none sm:border sm:shadow-xl overflow-hidden transition-all">
        <CardHeader className="space-y-4 pt-8 pb-6 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative h-14 w-14 sm:h-12 sm:w-12">
              <Image
                src="/logo.svg"
                alt="TurfHub Logo"
                fill
                className="rounded-full object-contain"
                priority
              />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl sm:text-lg tracking-tight">
                TurfBuddie Admin
              </span>
              <p className="text-xs font-medium text-primary flex items-center justify-center sm:justify-start gap-1">
                <ShieldCheck size={14} /> Secure Access
              </p>
            </div>
          </div>
          <CardTitle className="text-2xl font-extrabold sm:text-xl">
            Admin Login
          </CardTitle>
        </CardHeader>

        <CardContent className="pb-8">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FieldGroup className="space-y-4">
              {/* Email Field */}
              <Controller
                name="email"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="font-semibold">
                      Email Address
                    </FieldLabel>
                    <Input
                      {...field}
                      type="email"
                      placeholder="admin@turfbuddie.com"
                      autoComplete="email"
                      className="h-12 sm:h-10 text-base sm:text-sm" // Larger tap target on mobile
                    />
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />

              {/* Password Field */}
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel className="font-semibold">Password</FieldLabel>
                    <div className="relative">
                      <Input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        className="h-12 sm:h-10 text-base sm:text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                    <FieldError>{fieldState.error?.message}</FieldError>
                  </Field>
                )}
              />
            </FieldGroup>

            <div className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                id="rememberMe"
                {...form.register("rememberMe")}
                className="rounded border-slate-300 text-primary focus:ring-primary h-5 w-5 sm:h-4 sm:w-4 cursor-pointer"
              />
              <label
                htmlFor="rememberMe"
                className=" cursor-pointer select-none font-medium"
              >
                Keep me logged in
              </label>
            </div>

            <Button
              type="submit"
              size="lg"
              className="w-full h-12 text-base font-bold shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Spinner className="h-4 w-4" /> Authenticating...
                </div>
              ) : (
                "Sign In to Dashboard"
              )}
            </Button>
          </form>

          {process.env.NODE_ENV === "development" && (
            <div className="mt-4 pt-4 border-t border-dashed">
              <Button
                variant="outline"
                className="w-full h-10 text-sm font-medium"
                onClick={async () => {
                  try {
                    const res = await fetch("/api/auth/debug-login", { method: "POST" });
                    if (res.ok) {
                      toast.success("Debug login successful");
                      router.push("/admin/tournaments/manage");
                    } else {
                      toast.error("Debug login failed");
                    }
                  } catch {
                    toast.error("Debug login failed");
                  }
                }}
              >
                Debug Login (Dev Only)
              </Button>
            </div>
          )}

          <p className="mt-8 text-center text-xs">
            &copy; {new Date().getFullYear()} TurfBuddie Management System.
            <br />
            Authorized Personnel Only.
          </p>

          {/* DEV ONLY — debug bypass */}
          {process.env.NODE_ENV === "development" && (
            <div className="mt-6 border-t pt-4">
              <p className="text-xs text-center text-muted-foreground mb-2">🛠 Dev Debug Access</p>
              <button
                type="button"
                onClick={async () => {
                  const pwd = prompt("Debug password:");
                  if (!pwd) return;
                  const res = await fetch("/api/auth/admin-session/debug", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password: pwd }),
                  });
                  if (res.ok) {
                    router.push("/admin/tournaments/manage");
                  } else {
                    alert("Wrong debug password");
                  }
                }}
                className="w-full text-xs border border-dashed border-amber-400 text-amber-600 rounded-lg py-2 hover:bg-amber-50 transition-colors"
              >
                🔓 Debug Login (Dev Only)
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

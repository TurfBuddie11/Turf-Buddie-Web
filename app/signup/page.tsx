"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion } from "framer-motion";
import Link from "next/link";
import { Calendar as CalendarIcon, Loader2, UserPlus } from "lucide-react";
import { format } from "date-fns";

import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { register } from "@/lib/firebase/auth";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { CustomCalendar } from "@/components/custom-calendar";

const genderOptions = ["Male", "Female", "Other"] as const;

const signupSchema = z
  .object({
    fullName: z.string().min(3, "Full name must be at least 3 characters"),
    gender: z.enum(genderOptions),
    dob: z.string().refine((val) => !isNaN(new Date(val).getTime()), {
      message: "Please select a valid date",
    }),
    mobile: z
      .string()
      .regex(
        /^[6-9]\d{9}$/,
        "Enter a valid 10-digit mobile number starting with 6-9"
      ),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
    email: z.string().email("Enter a valid email"),
    password: z.string().min(8, "Password must be 8+ characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SignUpFormData = z.infer<typeof signupSchema>;

export default function SignUpPage() {
  const [loading, setLoading] = useState(false);

  const router = useRouter();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      gender: "Male",
      dob: "",
      mobile: "",
      city: "",
      state: "",
      pincode: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });

  const onSubmit = async (data: SignUpFormData) => {
    try {
      setLoading(true);

      const formattedDOB = format(new Date(data.dob), "dd/MM/yyyy");

      await register(data.email, data.password, {
        fullname: data.fullName,
        gender: data.gender,
        dob: formattedDOB,
        mobile: data.mobile,
        city: data.city,
        pincode: data.pincode,
        state: data.state,
      });

      toast.success(
        "Account created! Please check your email for verification."
      );

      router.push("/login");
      form.reset();
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unknown error occurred during signup.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-5xl grid md:grid-cols-2 gap-8"
      >
        {/* Left - Brand content */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-col justify-center space-y-6 text-center md:text-left"
        >
          <h1 className="text-4xl font-bold leading-tight">
            Join{" "}
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              TurfBuddies
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Create your account to book turfs, join tournaments, and connect
            with players across your city.
          </p>
          <ul className="space-y-3 text-muted-foreground">
            <li>⚽ Build your player profile and team up</li>
            <li>📅 Get match reminders and turf updates</li>
            <li>🎯 Access exclusive tournaments and leaderboards</li>
          </ul>
        </motion.div>

        {/* Right - Sign up form */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          <Card className="glass-card shadow-lg border border-border max-w-2xl sm:max-w-3xl md:max-w-4xl w-full mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" />
                Sign Up
              </CardTitle>
            </CardHeader>

            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-5"
                >
                  {/* Full Name */}
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="John Doe"
                            autoComplete="name"
                            {...field}
                            disabled={loading}
                            className="bg-input text-foreground border-border focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Gender + DOB */}
                  <div className="flex flex-col md:flex-row gap-5">
                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Gender</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                            disabled={loading}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-input text-foreground border-border focus:ring-2 focus:ring-ring">
                                <SelectValue placeholder="Select Gender" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="glass-card border-border">
                              {genderOptions.map((g) => (
                                <SelectItem key={g} value={g}>
                                  {g}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dob"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Date of Birth</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                type="button"
                                disabled={loading}
                                className={`w-full justify-start text-left bg-input border-border ${
                                  field.value
                                    ? "text-foreground"
                                    : "text-muted-foreground"
                                }`}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value
                                  ? format(new Date(field.value), "dd MMM yyyy")
                                  : "Select date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="glass-card border-border w-auto p-0"
                              align="start"
                            >
                              <CustomCalendar
                                selected={
                                  field.value
                                    ? new Date(field.value)
                                    : undefined
                                }
                                onSelect={(date) => {
                                  if (date) field.onChange(date.toISOString());
                                }}
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Mobile */}
                  <FormField
                    control={form.control}
                    name="mobile"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="9876543210"
                            inputMode="numeric"
                            autoComplete="tel"
                            {...field}
                            disabled={loading}
                            className="bg-input text-foreground border-border focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* City + State + Pincode */}
                  <div className="flex flex-col md:flex-row gap-5">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Nagpur"
                              autoComplete="address-level2"
                              {...field}
                              disabled={loading}
                              className="bg-input text-foreground border-border focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>State</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Maharashtra"
                              autoComplete="address-level1"
                              {...field}
                              disabled={loading}
                              className="bg-input text-foreground border-border focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pincode"
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Pincode</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="440001"
                              inputMode="numeric"
                              autoComplete="postal-code"
                              {...field}
                              disabled={loading}
                              className="bg-input text-foreground border-border focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

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
                            {...field}
                            disabled={loading}
                            className="bg-input text-foreground border-border focus-visible:ring-2 focus-visible:ring-ring"
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
                            placeholder="Enter password"
                            autoComplete="new-password"
                            {...field}
                            disabled={loading}
                            className="bg-input text-foreground border-border focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Confirm Password */}
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            placeholder="Re-enter password"
                            autoComplete="new-password"
                            {...field}
                            disabled={loading}
                            className="bg-input text-foreground border-border focus-visible:ring-2 focus-visible:ring-ring"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full glow-button"
                    disabled={loading}
                  >
                    {loading && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Create Account
                  </Button>
                </form>
              </Form>

              <Separator className="my-6" />

              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:underline">
                  Log In
                </Link>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
}

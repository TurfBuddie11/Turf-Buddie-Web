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
import { ChevronDownIcon, Eye, EyeOff } from "lucide-react";
import { Label } from "@radix-ui/react-dropdown-menu";
import { Popover } from "@radix-ui/react-popover";
import { PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import Image from "next/image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FieldGroup,
  FieldLegend,
  FieldSet,
  FieldLabel,
  Field,
} from "@/components/ui/field";
import { registerWithEmail } from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function OwnerSignupPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phoneNumber: string;
    dob: string;
    gender?: "Male" | "Female" | "Other";
    password: string;
    confirmPassword: string;
    termsAccepted: boolean;
  }>({
    name: "",
    email: "",
    phoneNumber: "",
    dob: "",
    gender: undefined,
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const router = useRouter();

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData((prev) => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked,
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setDate(date);
      setFormData((prev) => ({ ...prev, dob: date?.toLocaleDateString() }));
      setOpen(false);
    }
  };

  const handleGenderSelect = (value: "Male" | "Female" | "Other") => {
    setFormData((prev) => ({ ...prev, gender: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    const { phoneNumber, ...rest } = formData;
    const data = {
      ...rest,
      role: "owner" as const,
      mobile: phoneNumber,
    };
    try {
      const { user } = await registerWithEmail(
        formData.email,
        formData.password,
        data,
      );
      const idToken = await user.getIdToken();

      await fetch("/api/auth/owner-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ idToken }),
      });

      toast.success("Account Created Successfully");
      router.push("/owner/login");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown Error";
      toast.error(message);
    }
  };

  return (
    <div className="min-h-screen  p-4">
      <div className="max-w-2xl mx-auto">
        <Card>
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
              <span className="font-bold text-lg">TurfHub Owner</span>
            </div>
            <CardTitle>Create Owner Account</CardTitle>
            <CardDescription>
              Join TurfHub and start managing your turfs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <FieldSet>
                <FieldLegend>Personal Information</FieldLegend>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="name" className="text-sm font-medium">
                      Full Name
                    </FieldLabel>
                    <Input
                      type="text"
                      name="name"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={handleChange}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="email" className="text-sm font-medium">
                      Email Address
                    </FieldLabel>
                    <Input
                      type="email"
                      name="email"
                      placeholder="owner@example.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </Field>
                  <Field>
                    <FieldLabel
                      htmlFor="phoneNumber"
                      className="text-sm font-medium"
                    >
                      Phone Number
                    </FieldLabel>
                    <Input
                      type="tel"
                      name="phoneNumber"
                      placeholder="+91 98765 43210"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      required
                    />
                  </Field>
                  <Field>
                    <Label className="px-1">Date of birth</Label>
                    <Popover open={open} onOpenChange={setOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          id="date"
                          className="w-48 max-md:w-full justify-between font-normal"
                        >
                          {date ? date.toLocaleDateString() : "Select date"}
                          <ChevronDownIcon />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-auto overflow-hidden p-0"
                        align="start"
                      >
                        <Calendar
                          mode="single"
                          selected={date}
                          captionLayout="dropdown"
                          onSelect={(date) => handleDateSelect(date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </Field>
                  <Field>
                    <Label className="text-sm font-medium">Gender</Label>
                    <Select
                      name="gender"
                      defaultValue={formData.gender}
                      onValueChange={handleGenderSelect}
                      required
                    >
                      <SelectTrigger className="max-md:w-full w-48 px-3 py-2 border border-input rounded-md bg-background text-foreground">
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                  <div className="flex flex-col w-full">
                    <h3 className="font-semibold mb-4 text-sm">Security</h3>
                    <div>
                      <Field className="space-y-2">
                        <FieldLabel className="text-sm font-medium">
                          Password
                        </FieldLabel>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            name="password"
                            placeholder="Create a strong password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                          />
                          <Button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent text-muted-foreground  hover:text-foreground"
                          >
                            {showPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </Button>
                        </div>

                        <div>
                          <FieldLabel className="text-sm font-medium">
                            Confirm Password
                          </FieldLabel>
                          <div className="relative">
                            <Input
                              type={showConfirmPassword ? "text" : "password"}
                              name="confirmPassword"
                              placeholder="Confirm your password"
                              value={formData.confirmPassword}
                              onChange={handleChange}
                              required
                            />
                            <Button
                              type="button"
                              onClick={() =>
                                setShowConfirmPassword(!showConfirmPassword)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 bg-transparent  text-muted-foreground  hover:text-foreground"
                            >
                              {showConfirmPassword ? (
                                <EyeOff size={18} />
                              ) : (
                                <Eye size={18} />
                              )}
                            </Button>
                          </div>
                        </div>
                      </Field>
                    </div>
                  </div>
                  {/* Terms */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="termsAccepted"
                      checked={formData.termsAccepted}
                      onCheckedChange={(checked: boolean) =>
                        setFormData((prev) => ({
                          ...prev,
                          termsAccepted: !!checked,
                        }))
                      }
                      required
                      className="mt-1"
                    />
                    <label
                      htmlFor="termsAccepted"
                      className="text-sm text-muted-foreground leading-snug"
                    >
                      I agree to the{" "}
                      <Link href="#" className="text-primary hover:underline">
                        Terms and Conditions
                      </Link>{" "}
                      and{" "}
                      <Link href="#" className="text-primary hover:underline">
                        Privacy Policy
                      </Link>
                    </label>
                  </div>

                  <Button type="submit" className="w-full">
                    Create Account
                  </Button>
                </FieldGroup>
              </FieldSet>
            </form>
            <div className="mt-6 text-center space-y-4">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/owner/login"
                  className="text-primary hover:underline font-medium"
                >
                  Sign In
                </Link>
              </p>
              <p className="text-xs text-muted-foreground">
                Looking for user account?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Click here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

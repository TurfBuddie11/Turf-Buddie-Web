"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { z } from "zod";
import { useForm, FieldName } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  Loader2,
  UserPlus,
  Eye,
  EyeOff,
  ArrowLeft,
} from "lucide-react";
import { format, subYears } from "date-fns";
import { FcGoogle } from "react-icons/fc";
import { toast } from "sonner";

// UI Component Imports
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
import { Progress } from "@/components/ui/progress";
import { CustomCalendar } from "@/components/custom-calendar";

// Firebase Auth Function Imports
import {
  registerWithEmail,
  signInWithGoogle,
  getUserProfile,
  updateUserProfile,
} from "@/lib/firebase/auth";

// --- Zod Schema (TypeScript-native) ---
const genderOptions = ["Male", "Female", "Other"] as const;
const signupSchema = z
  .object({
    email: z.string().email("Enter a valid email"),
    password: z.string().optional(),
    confirmPassword: z.string().optional(),
    fullname: z.string().min(3, "Full name is required"),
    gender: z.enum(genderOptions, { error: "Please select a gender" }),
    dob: z
      .date({ error: "Please select your date of birth" })
      .refine(
        (date) => date <= subYears(new Date(), 13),
        "You must be at least 13 years old"
      ),
    mobile: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    pincode: z.string().regex(/^\d{6}$/, "Enter a valid 6-digit pincode"),
    area: z.string().min(1, "Please select your area"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
  })
  .superRefine((data, ctx) => {
    if (data.password || data.confirmPassword) {
      if ((data.password?.length ?? 0) < 0) {
        ctx.addIssue({
          code: "too_small",
          minimum: 6,
          origin: "string",
          inclusive: true,
          path: ["password"],
          message: "Password must be at least 6 characters",
        });
        if (data.password !== data.confirmPassword) {
          ctx.addIssue({
            code: "custom",
            message: "Passwords do not match",
            path: ["confirmPassword"],
          });
        }
      }
    }
  });

// --- Type Definitions ---
type SignUpFormData = z.infer<typeof signupSchema>;
type Locality = { name: string };
type PincodeResponse = [
  {
    Status: string;
    PostOffice: { Name: string; District: string; State: string }[];
  }
];

const steps = [
  {
    id: "Step 1",
    title: "Account Credentials",
    fields: ["email", "password", "confirmPassword"],
  },
  {
    id: "Step 2",
    title: "Personal Details",
    fields: ["fullname", "gender", "dob"],
  },
  {
    id: "Step 3",
    title: "Location & Contact",
    fields: ["pincode", "area", "mobile", "city", "state"],
  },
];

export default function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [localities, setLocalities] = useState<Locality[]>([]);
  const [showForm, setShowForm] = useState<boolean>(false);

  const flow = searchParams.get("flow");
  const isCompletionFlow = flow === "completeProfile";

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullname: "",
      gender: undefined,
      dob: undefined,
      mobile: "",
      area: "",
      city: "",
      state: "",
      pincode: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    mode: "onTouched",
  });
  const { trigger, handleSubmit, setValue, watch } = form;

  useEffect(() => {
    // Wait for the auth state to be resolved.
    if (authLoading) {
      return; // Do nothing while loading
    }

    if (isCompletionFlow) {
      if (user) {
        // This logic now runs ONLY after auth is resolved and a user is present.
        setShowForm(true);
        setCurrentStep(1);
        setValue("fullname", user.displayName || "");
        setValue("email", user.email || "");
      } else {
        // This is now a correct redirect for genuinely unauthenticated users.
        toast.error("You must be logged in to complete your profile.");
        router.push("/login");
      }
    }
  }, [isCompletionFlow, user, authLoading, setValue, router]);

  const pincodeValue = watch("pincode");
  useEffect(() => {
    setLocalities([]);
    if (pincodeValue && /^\d{6}$/.test(pincodeValue)) {
      setLoading(true);
      fetch(`https://api.postalpincode.in/pincode/${pincodeValue}`)
        .then((res) => res.json() as Promise<PincodeResponse>)
        .then((data) => {
          if (data && data[0]?.Status === "Success") {
            const postOffices = data[0].PostOffice;
            setValue("city", postOffices[0].District, { shouldValidate: true });
            setValue("state", postOffices[0].State, { shouldValidate: true });
            setLocalities(postOffices.map((po) => ({ name: po.Name })));
          } else {
            toast.error("Invalid Pincode.");
          }
        })
        .catch(() => toast.error("Could not fetch location data."))
        .finally(() => setLoading(false));
    }
  }, [pincodeValue, setValue]);

  const handleGoogleSignIn = async (): Promise<void> => {
    setLoading(true);
    try {
      const result = await signInWithGoogle();
      const googleUser = result?.user;

      if (!googleUser) {
        throw new Error("Could not retrieve user information from Google.");
      }

      const profileSnap = await getUserProfile(googleUser.uid);
      if (profileSnap?.exists() && profileSnap?.data().mobile) {
        toast.success(`Welcome back, ${googleUser.displayName}!`);
        router.push("/explore");
      } else {
        toast.info("Welcome! Just a few more steps to complete your profile.");
        router.push("/signup?flow=completeProfile");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Google Sign-In failed."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = async (): Promise<void> => {
    const fields = steps[currentStep].fields;
    const output = await trigger(fields as FieldName<SignUpFormData>[], {
      shouldFocus: true,
    });
    if (output) setCurrentStep((step) => step + 1);
  };

  const handlePrevStep = (): void => {
    setCurrentStep((step) => step - 1);
  };

  const processForm = async (data: SignUpFormData): Promise<void> => {
    setLoading(true);
    try {
      const userData = {
        fullname: data.fullname,
        gender: data.gender,
        dob: format(data.dob, "dd/MM/yyyy"),
        mobile: data.mobile,
        pincode: data.pincode,
        area: data.area,
        city: data.city,
        state: data.state,
        email: data.email,
      };
      console.log(userData);

      if (isCompletionFlow && user) {
        const res = await updateUserProfile(user.uid, userData);
        console.log(res);
        toast.success(
          "Profile updated! You’re all set to explore TurfBuddies."
        );
        router.push("/explore");
      } else {
        if (!data.password) {
          throw new Error("Password is required for signup");
        }
        await registerWithEmail(data.email, data.password, userData);
        toast.success("Welcome aboard! Verify your email to start booking.");
        router.push("/login");
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "An error occurred."
      );
    } finally {
      setLoading(false);
    }
  };

  const animationVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  if (authLoading && isCompletionFlow) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="ml-4 text-muted-foreground">Verifying your session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900 px-4 py-24">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-12">
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="flex flex-col justify-center space-y-6 text-center md:text-left"
        >
          <h1 className="text-4xl font-bold leading-tight">
            Join{" "}
            <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              TurfBuddie
            </span>
          </h1>
          <p className="text-muted-foreground text-lg">
            Your ultimate destination for booking turfs and connecting with
            fellow players in Nagpur.
          </p>
          <ul className="space-y-3 text-muted-foreground list-disc list-inside">
            <li>⚽ Instantly book premium turfs</li>
            <li>📊 Build your player profile and stats</li>
            <li>🏆 Join exclusive local tournaments</li>
          </ul>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
        >
          <Card className="glass-card shadow-lg border border-border w-full mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <UserPlus className="w-6 h-6 text-primary" />
                {isCompletionFlow
                  ? "Complete Your Profile"
                  : "Create an Account"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {!showForm && !isCompletionFlow ? (
                  <motion.div
                    key="initial"
                    variants={animationVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    className="space-y-5"
                  >
                    <Button
                      onClick={handleGoogleSignIn}
                      variant="outline"
                      className="w-full h-12 text-base"
                      disabled={loading}
                    >
                      <FcGoogle className="w-6 h-6 mr-3" /> Continue with Google
                    </Button>
                    <Button
                      onClick={() => setShowForm(true)}
                      className="w-full h-12 text-base glow-button"
                    >
                      Sign up with Email
                    </Button>
                    <p className="text-sm text-center text-muted-foreground pt-4">
                      Already have an account?{" "}
                      <Link
                        href="/login"
                        className="text-primary hover:underline font-semibold"
                      >
                        Log In
                      </Link>
                    </p>
                  </motion.div>
                ) : (
                  <motion.div
                    key="form"
                    variants={animationVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                  >
                    <div className="mb-6 space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Step {currentStep + (isCompletionFlow ? 0 : 1)} of{" "}
                        {steps.length}:{" "}
                        <span className="font-semibold text-foreground">
                          {steps[currentStep].title}
                        </span>
                      </p>
                      <Progress
                        value={((currentStep + 1) / steps.length) * 100}
                      />
                    </div>
                    <Form {...form}>
                      <form
                        onSubmit={handleSubmit(processForm)}
                        className="space-y-5"
                      >
                        <AnimatePresence mode="wait">
                          {currentStep === 0 && !isCompletionFlow && (
                            <motion.div
                              key={0}
                              variants={animationVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              className="space-y-5"
                            >
                              <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email Address</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="email"
                                        placeholder="you@example.com"
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
                                    <FormLabel>Password</FormLabel>
                                    <div className="relative">
                                      <FormControl>
                                        <Input
                                          type={
                                            showPassword ? "text" : "password"
                                          }
                                          placeholder="••••••••"
                                          {...field}
                                        />
                                      </FormControl>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="absolute top-0 right-0 h-full px-3"
                                        onClick={() =>
                                          setShowPassword(!showPassword)
                                        }
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
                              <FormField
                                control={form.control}
                                name="confirmPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Confirm Password</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="password"
                                        placeholder="••••••••"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </motion.div>
                          )}
                          {currentStep === 1 && (
                            <motion.div
                              key={1}
                              variants={animationVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              className="space-y-5"
                            >
                              <FormField
                                control={form.control}
                                name="fullname"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="John Doe"
                                        {...field}
                                        disabled={isCompletionFlow}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
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
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select Gender" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
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
                                          <FormControl>
                                            <Button
                                              variant="outline"
                                              className={`w-full justify-start text-left font-normal ${
                                                !field.value &&
                                                "text-muted-foreground"
                                              }`}
                                            >
                                              <CalendarIcon className="mr-2 h-4 w-4" />
                                              {field.value ? (
                                                format(field.value, "PPP")
                                              ) : (
                                                <span>Pick a date</span>
                                              )}
                                            </Button>
                                          </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0">
                                          <CustomCalendar
                                            selected={field.value}
                                            onSelect={field.onChange}
                                          />
                                        </PopoverContent>
                                      </Popover>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </motion.div>
                          )}
                          {currentStep === 2 && (
                            <motion.div
                              key={2}
                              variants={animationVariants}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              className="space-y-5"
                            >
                              <FormField
                                control={form.control}
                                name="mobile"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Mobile Number</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="9876543210"
                                        type="tel"
                                        {...field}
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
                                  <FormItem>
                                    <FormLabel>Pincode</FormLabel>
                                    <FormControl>
                                      <Input
                                        placeholder="e.g., 440010"
                                        type="tel"
                                        {...field}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              {localities.length > 0 && (
                                <FormField
                                  control={form.control}
                                  name="area"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Area / Locality</FormLabel>
                                      <Select
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                      >
                                        <FormControl>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select your specific area" />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          {localities.map((loc) => (
                                            <SelectItem
                                              key={loc.name}
                                              value={loc.name}
                                            >
                                              {loc.name}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              )}
                              <div className="flex gap-5">
                                <FormField
                                  control={form.control}
                                  name="city"
                                  render={({ field }) => (
                                    <FormItem className="flex-1">
                                      <FormLabel>City</FormLabel>
                                      <FormControl>
                                        <Input
                                          {...field}
                                          readOnly
                                          className="bg-muted/50"
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
                                          {...field}
                                          readOnly
                                          className="bg-muted/50"
                                        />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div className="mt-8 pt-5 flex justify-between">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrevStep}
                            disabled={
                              currentStep === (isCompletionFlow ? 1 : 0) ||
                              loading
                            }
                          >
                            <ArrowLeft className="w-4 h-4 mr-2" /> Back
                          </Button>
                          {currentStep < steps.length - 1 ? (
                            <Button
                              type="button"
                              onClick={handleNextStep}
                              disabled={authLoading}
                            >
                              Next Step
                            </Button>
                          ) : (
                            <Button
                              type="submit"
                              className="glow-button"
                              disabled={loading}
                            >
                              {loading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              {isCompletionFlow
                                ? "Finish Profile"
                                : "Create Account"}
                            </Button>
                          )}
                        </div>
                      </form>
                    </Form>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

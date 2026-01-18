"use client";

import { useState } from "react";
import { z } from "zod";
import { useForm, Controller, Path, useFieldArray } from "react-hook-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Field,
  FieldLabel,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { isValidPhoneNumber } from "react-phone-number-input";
import {
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Info,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import {
  Stepper,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperSeparator,
  StepperTrigger,
} from "@/components/ui/stepper";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { Tournament } from "@/lib/types/tournament";
import { VisuallyHidden } from "radix-ui";

import { initiatePayment, PaymentSuccessPayload } from "@/lib/razorpay/payment";
import { UserProfile } from "@/lib/types/user";
import TournamentDescription from "./tournament-description";

interface TeamRegistrationProps {
  tournament: Tournament;
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile;
}

const teamRegistrationSchema = z.object({
  teamName: z
    .string()
    .min(3, "Team name must be at least 3 characters")
    .max(50, "Team name cannot exceed 50 characters"),
  captainName: z
    .string()
    .min(3, "Captain name must be at least 3 characters")
    .max(50, "Captain name cannot exceed 50 characters"),
  captainPhone: z.string().refine(isValidPhoneNumber, "Invalid phone number"),
  players: z
    .array(
      z.object({
        name: z
          .string()
          .min(3, "Player name is required")
          .max(50, "Player name cannot exceed 50 characters"),
        phone: z.string().refine(isValidPhoneNumber, "Invalid phone number"),
      }),
    )
    .min(1, "At least one player is required beyond the captain"),
});

type TeamRegistrationFormSchema = z.infer<typeof teamRegistrationSchema>;

async function verifyTeamPayment(
  payload: PaymentSuccessPayload,
  tournamentId: string,
): Promise<{ success: boolean; teamId: string; message: string }> {
  const response = await fetch("/api/tournaments/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, tournamentId }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Payment verification failed");
  }

  return response.json();
}

export default function TeamRegistrationMultiStepForm({
  tournament,
  isOpen,
  onClose,
  user,
}: TeamRegistrationProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [dialogMessage, setDialogMessage] = useState("");
  const [open, setOpen] = useState(false);

  const steps: {
    title: string;
    description: string;
    fields: Path<TeamRegistrationFormSchema>[];
  }[] = [
    {
      title: "Tournament Rules",
      description: "Please review the rules before proceeding.",
      fields: [],
    },
    {
      title: "Team Details",
      description: "Enter your team and captain's information.",
      fields: ["teamName", "captainName", "captainPhone"],
    },
    {
      title: "Player Roster",
      description: `Add your ${tournament.teamSize - 1} teammates.`,
      fields: ["players"],
    },
    {
      title: "Verify Details",
      description: "Review your roster before finalizing.",
      fields: [],
    },
  ];
  const WHATSAPP_GROUP_LINK =
    "https://chat.whatsapp.com/E5SHvW4iK5F23iGlP3Kr0I";
  const isLastStep = currentStep === steps.length - 1;

  const form = useForm<TeamRegistrationFormSchema>({
    resolver: zodResolver(teamRegistrationSchema),
    defaultValues: {
      teamName: "",
      captainName: "",
      captainPhone: "",
      players: Array(tournament.teamSize - 1).fill({ name: "", phone: "" }),
    },
    mode: "onTouched",
  });

  const { fields, append, remove } = useFieldArray({
    name: "players",
    control: form.control,
  });

  const handleNextButton = async () => {
    const fieldsToValidate = steps[currentStep].fields;
    const isValid = await form.trigger(fieldsToValidate);

    if (isValid && !isLastStep) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBackButton = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const onSubmit = async (values: TeamRegistrationFormSchema) => {
    try {
      const response = await fetch(
        `/api/tournaments/${tournament.id}/register-team`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...values,
            players: values.players,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create order");
      }

      const order = await response.json();

      const paymentOptions = {
        amount: order.amount.toString(),
        currency: order.currency,
        orderId: order.orderId,
        userDetails: {
          name: user.name || "Unknown User",
          email: user.email || "no-email@example.com",
          contact: values.captainPhone,
        },
      };

      const paymentSuccess = await initiatePayment(paymentOptions);
      const verificationResult = await verifyTeamPayment(
        paymentSuccess,
        tournament.id,
      );

      setDialogMessage(verificationResult.message);
      setOpen(true);
      onClose();
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : "An unexpected error occurred.";
      toast.error(message);
    }
  };
  const renderCurrentStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-3 max-h-75 overflow-y-auto pr-2">
              <h4 className="font-bold flex items-center gap-2">
                <Info size={18} className="text-primary" /> Guidelines
              </h4>
              <TournamentDescription content={tournament.rules} />
            </div>
            <p className="text-xs text-muted-foreground italic text-center">
              By clicking Continue, you agree to abide by the rules listed
              above.
            </p>
          </div>
        );
      case 1:
        return (
          <FieldGroup>
            <Controller
              name="teamName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Team Name</FieldLabel>
                  <Input {...field} placeholder="e.g. Warriors XI" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
            <Controller
              name="captainName"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Captain&apos;s Name</FieldLabel>
                  <Input {...field} placeholder="Full Name" />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
            <Controller
              name="captainPhone"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel>Captain&apos;s Phone</FieldLabel>
                  <PhoneInput {...field} />
                  <FieldError>{fieldState.error?.message}</FieldError>
                </Field>
              )}
            />
          </FieldGroup>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold">Teammates</label>
              {fields.length < tournament.teamSize - 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ name: "", phone: "" })}
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Player
                </Button>
              )}
            </div>
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
              {fields.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 border rounded-md bg-secondary/5 relative space-y-2"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                      Teammate {index + 1}
                    </span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Controller
                    name={`players.${index}.name`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <Input {...field} placeholder="Enter player name" />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />
                  <Controller
                    name={`players.${index}.phone`}
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <PhoneInput {...field} />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        );
      case 3:
        const summary = form.getValues();
        return (
          <div className="space-y-4">
            <div className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">Team</span>
                <span className="text-sm font-bold">{summary.teamName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">Captain</span>
                <span className="text-sm font-bold">{summary.captainName}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-sm text-muted-foreground">Contact</span>
                <span className="text-sm font-bold">
                  {summary.captainPhone}
                </span>
              </div>
              <div className="pt-2">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase">
                  Squad Members
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {summary.players.map((p, i) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <CheckCircle2 size={12} className="text-primary" />{" "}
                      {p.name} ({p.phone})
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="p-3 bg-primary/5 rounded-md border border-primary/20">
              <p className="text-xs text-center text-muted-foreground">
                By clicking complete, you agree to the tournament rules and
                entry fee of ₹{tournament.registrationFee}.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <VisuallyHidden.Root>
          <DialogTitle>Team Registration Form</DialogTitle>
          <DialogDescription>
            Step-by-step registration for the tournament
          </DialogDescription>
        </VisuallyHidden.Root>
        <DialogContent className="sm:max-w-[550px] p-0 overflow-hidden">
          <Card className="border-0 shadow-none">
            <CardHeader className="bg-secondary/5 pb-8">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>{steps[currentStep].title}</CardTitle>
                  <CardDescription>
                    {steps[currentStep].description}
                  </CardDescription>
                </div>
                <div className="bg-primary/10 text-primary px-2 py-1 rounded-[4px] text-[10px] font-bold">
                  STEP {currentStep + 1} OF {steps.length}
                </div>
              </div>

              <Stepper value={currentStep + 1} className="mt-6">
                <StepperNav>
                  {steps.map((_, index) => (
                    <StepperItem key={index} step={index + 1}>
                      <StepperTrigger disabled>
                        <StepperIndicator>{index + 1}</StepperIndicator>
                      </StepperTrigger>
                      {index < steps.length - 1 && <StepperSeparator />}
                    </StepperItem>
                  ))}
                </StepperNav>
              </Stepper>
            </CardHeader>

            <CardContent className="py-6 min-h-[350px]">
              <form
                id="team-registration-form"
                onSubmit={form.handleSubmit(onSubmit)}
              >
                {renderCurrentStepContent()}
              </form>
            </CardContent>

            <CardFooter className="flex justify-between border-t bg-secondary/5 p-4">
              <Button
                type="button"
                variant="ghost"
                onClick={handleBackButton}
                className={currentStep === 0 ? "invisible" : ""}
              >
                <ChevronLeft className="mr-2 h-4 w-4" /> Back
              </Button>

              {!isLastStep ? (
                <Button
                  type="button"
                  onClick={handleNextButton}
                  className="min-w-[120px]"
                >
                  Continue <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="submit"
                  form="team-registration-form"
                  disabled={form.formState.isSubmitting}
                  className="min-w-[120px] shadow-lg shadow-primary/20"
                >
                  {form.formState.isSubmitting ? (
                    <Spinner className="mr-2" />
                  ) : (
                    "Proceed to Pay"
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Team Registration</DialogTitle>
            <DialogDescription>{dialogMessage}</DialogDescription>
          </DialogHeader>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-muted-foreground">
              🎉 Your team is successfully registered! Stay connected with other
              participants and get updates in our WhatsApp community.
            </p>
            <a
              href={WHATSAPP_GROUP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline font-medium"
            >
              👉 Join WhatsApp Group
            </a>
          </div>

          <DialogFooter>
            <Button onClick={() => setOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

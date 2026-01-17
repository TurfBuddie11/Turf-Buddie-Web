"use client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Calendar, ImagePlus, Info, Trophy, Users } from "lucide-react";
import z from "zod/v3";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { uploadFile } from "@/lib/firebase/storage";
import { toast } from "sonner";
import { Button } from "../ui/button";
import { Spinner } from "../ui/spinner";
import { Field, FieldError, FieldLabel } from "../ui/field";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
const tournamentSchema = z
  .object({
    name: z.string().min(5, "Name must be at least 5 characters"),
    sport: z.enum(["cricket", "football", "badminton", "tennis", "pickleball"]),
    venue: z.string().min(1, "Venue is required"),
    description: z.string().min(20, "Please provide a detailed description"),
    registrationFee: z.coerce.number(),
    prizePool: z.coerce.number(),
    maxTeams: z.coerce.number(),
    teamSize: z.coerce.number(),
    startDate: z.string().min(1, "Start date is required"),
    endDate: z.string().min(1, "End date is required"),
    image: z
      .custom<File[]>()
      .refine((files) => files && files.length > 0, "Banner image is required"),
    rules: z.string().min(10, "Please outline the main rules"),
  })
  .refine((data) => new Date(data.endDate) >= new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  });

type TournamentForm = z.infer<typeof tournamentSchema>;

export default function CreateTournamentPage() {
  const router = useRouter();

  const form = useForm<TournamentForm>({
    resolver: zodResolver(tournamentSchema),
    defaultValues: {
      name: "",
      description: "",
      sport: "cricket",
      venue: "",
      registrationFee: 0,
      prizePool: 0,
      maxTeams: 8,
      teamSize: 5,
      startDate: "",
      endDate: "",
      rules: "",
      image: undefined,
    },
  });

  const onSubmit = async (values: TournamentForm) => {
    try {
      let imageURL = "/placeholder-tournament.jpg";
      const file = values.image?.[0];
      if (file) {
        const path = `tournaments/${Date.now()}-${file.name}`;
        imageURL = await uploadFile(file, path);
      }
      const { rules, startDate, endDate, ...restOfData } = values;

      const payload = {
        ...restOfData,
        image: imageURL,
        rules: rules,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdAt: new Date(),
        registeredTeams: 0,
      };
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error("Failed to create tournament");
      const data = await response.json();
      toast.success("Tournament created successfully!");
      router.push(`/tournaments/${data.tournamentId}`);
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : "Internal Server Error",
      );
    }
  };

  return (
    <div className="min-h-dvh p-4 sm:p-8">
      <div className="mx-auto max-w-4xl">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-black text-foreground">
                Create Tournament
              </h1>
              <p className="text-muted-foreground">
                Launch a new sporting event for the community
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="font-bold"
              >
                {form.formState.isSubmitting ? (
                  <Spinner className="mr-2" />
                ) : (
                  "Publish Tournament"
                )}
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info size={20} className="text-primary" /> General
                    Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    name="name"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Tournament Title</FieldLabel>
                        <Input {...field} placeholder="e.g. Summer Smash T10" />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />
                  <Controller
                    name="description"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Description</FieldLabel>
                        <Textarea
                          {...field}
                          placeholder="Details about the event..."
                          className="min-h-[120px]"
                        />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller
                      name="sport"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Sport Category</FieldLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select sport" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cricket">Cricket</SelectItem>
                              <SelectItem value="football">Football</SelectItem>
                              <SelectItem value="badminton">
                                Badminton
                              </SelectItem>
                              <SelectItem value="tennis">Tennis</SelectItem>
                              <SelectItem value="pickleball">
                                Pickleball
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </Field>
                      )}
                    />
                    <Controller
                      name="venue"
                      control={form.control}
                      render={({ field, fieldState }) => (
                        <Field data-invalid={fieldState.invalid}>
                          <FieldLabel>Venue Location</FieldLabel>
                          <Input {...field} placeholder="Full address" />
                          <FieldError>{fieldState.error?.message}</FieldError>
                        </Field>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar size={20} className="text-primary" /> Schedule &
                    Rules
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Controller
                      name="startDate"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>Start Date</FieldLabel>
                          <Input type="date" {...field} />
                        </Field>
                      )}
                    />
                    <Controller
                      name="endDate"
                      control={form.control}
                      render={({ field }) => (
                        <Field>
                          <FieldLabel>End Date</FieldLabel>
                          <Input type="date" {...field} />
                        </Field>
                      )}
                    />
                  </div>
                  <Controller
                    name="rules"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel>Tournament Rules</FieldLabel>
                        <Textarea
                          {...field}
                          placeholder="Standard ICC rules apply..."
                        />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Trophy size={20} className="text-primary" /> Stakes
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    name="registrationFee"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Entry Fee (₹)</FieldLabel>
                        <Input type="number" {...field} />
                      </Field>
                    )}
                  />
                  <Controller
                    name="prizePool"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Prize Pool (₹)</FieldLabel>
                        <Input type="number" {...field} />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users size={20} className="text-primary" /> Capacity
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Controller
                    name="maxTeams"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Max Teams</FieldLabel>
                        <Input type="number" {...field} />
                      </Field>
                    )}
                  />
                  <Controller
                    name="teamSize"
                    control={form.control}
                    render={({ field }) => (
                      <Field>
                        <FieldLabel>Team Size (Players)</FieldLabel>
                        <Input type="number" {...field} />
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <ImagePlus size={20} className="text-primary" /> Media
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Controller
                    name="image"
                    control={form.control}
                    render={({ field: { onChange, name }, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <input
                          name={name}
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            onChange(
                              e.target.files
                                ? Array.from(e.target.files)
                                : undefined,
                            )
                          }
                        />
                        <FieldError>{fieldState.error?.message}</FieldError>
                      </Field>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

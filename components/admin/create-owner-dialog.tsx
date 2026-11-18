"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Copy, Eye, EyeOff, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface CreatedOwner {
  uid: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  createdBy: string;
  createdAt: string | null;
  turfIds: string[];
}

interface AssignableTurf {
  id: string;
  name: string;
  ownerId?: string;
  ownerName?: string;
}

interface CreateOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (owner: CreatedOwner) => void;
  /** When provided, the admin can assign these existing turfs to the new owner. */
  turfs?: AssignableTurf[];
}

const emptyForm = {
  name: "",
  email: "",
  password: "",
  mobile: "",
  area: "",
  city: "",
  state: "",
  pincode: "",
};

function generatePassword(length = 10) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$";
  const values = crypto.getRandomValues(new Uint32Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join("");
}

export function CreateOwnerDialog({
  open,
  onOpenChange,
  onCreated,
  turfs,
}: CreateOwnerDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [selectedTurfIds, setSelectedTurfIds] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const reset = () => {
    setForm(emptyForm);
    setSelectedTurfIds([]);
    setShowPassword(false);
    setError(null);
    setCreated(null);
    setCopied(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (submitting) return;
    if (!next) reset();
    onOpenChange(next);
  };

  const update = (key: keyof typeof emptyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [key]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // This dialog may be rendered next to another form (e.g. the turf form);
    // stop the submit from bubbling through the React tree into it.
    e.stopPropagation();
    setError(null);

    if (form.name.trim().length < 2) return setError("Name must be at least 2 characters");
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("Enter a valid email");
    if (form.password.length < 6) return setError("Password must be at least 6 characters");

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/owners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, turfIds: selectedTurfIds }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to create owner");

      onCreated?.(data.owner as CreatedOwner);
      setCreated({ email: data.owner.email, password: form.password });
      toast.success(`Owner "${data.owner.name}" created`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create owner");
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!created) return;
    const text = `TurfBuddie owner login\nURL: ${window.location.origin}/owner/login\nEmail: ${created.email}\nPassword: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  const toggleTurf = (id: string) =>
    setSelectedTurfIds((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id],
    );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[calc(100vh-3rem)] overflow-hidden">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Owner created</DialogTitle>
              <DialogDescription>
                Share these login details with the owner. The password is not shown again.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg border bg-muted/40 p-4 space-y-2 text-sm font-mono break-all">
              <p>
                <span className="text-muted-foreground">Login: </span>/owner/login
              </p>
              <p>
                <span className="text-muted-foreground">Email: </span>
                {created.email}
              </p>
              <p>
                <span className="text-muted-foreground">Password: </span>
                {created.password}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" type="button" onClick={copyCredentials}>
                {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                {copied ? "Copied" : "Copy details"}
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Done
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Add Turf Owner</DialogTitle>
              <DialogDescription>
                Creates a login account the owner can use at /owner/login.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="overflow-y-auto max-h-[calc(100vh-20rem)] pr-2 space-y-4">
                <Field>
                  <FieldLabel htmlFor="owner-name">Full name *</FieldLabel>
                  <Input
                    id="owner-name"
                    value={form.name}
                    onChange={update("name")}
                    placeholder="e.g. Rahul Sharma"
                    autoComplete="off"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="owner-email">Email *</FieldLabel>
                  <Input
                    id="owner-email"
                    type="email"
                    value={form.email}
                    onChange={update("email")}
                    placeholder="owner@example.com"
                    autoComplete="off"
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="owner-password" className="flex items-center justify-between">
                    Password *
                    <button
                      type="button"
                      onClick={() => {
                        setForm((p) => ({ ...p, password: generatePassword() }));
                        setShowPassword(true);
                      }}
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Generate
                    </button>
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="owner-password"
                      type={showPassword ? "text" : "password"}
                      value={form.password}
                      onChange={update("password")}
                      placeholder="Min. 6 characters"
                      autoComplete="new-password"
                      className="pr-9"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </Field>

                <Field>
                  <FieldLabel htmlFor="owner-mobile">Mobile</FieldLabel>
                  <Input
                    id="owner-mobile"
                    type="tel"
                    value={form.mobile}
                    onChange={update("mobile")}
                    placeholder="+91 98765 43210"
                  />
                </Field>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="owner-area">Area</FieldLabel>
                    <Input id="owner-area" value={form.area} onChange={update("area")} />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="owner-city">City</FieldLabel>
                    <Input id="owner-city" value={form.city} onChange={update("city")} placeholder="Nagpur" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="owner-state">State</FieldLabel>
                    <Input id="owner-state" value={form.state} onChange={update("state")} placeholder="Maharashtra" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="owner-pincode">Pincode</FieldLabel>
                    <Input
                      id="owner-pincode"
                      inputMode="numeric"
                      value={form.pincode}
                      onChange={update("pincode")}
                    />
                  </Field>
                </div>

                {turfs && turfs.length > 0 && (
                  <Field>
                    <FieldLabel>Assign turfs (optional)</FieldLabel>
                    <div className="max-h-44 overflow-y-auto rounded-md border divide-y">
                      {turfs.map((turf) => (
                        <label
                          key={turf.id}
                          className="flex items-center gap-3 px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedTurfIds.includes(turf.id)}
                            onChange={() => toggleTurf(turf.id)}
                            className="h-4 w-4 accent-green-600"
                          />
                          <span className="flex-1 truncate">{turf.name}</span>
                          {turf.ownerId && (
                            <span className="text-xs text-amber-600 shrink-0">
                              Reassign from {turf.ownerName || "current owner"}
                            </span>
                          )}
                        </label>
                      ))}
                    </div>
                  </Field>
                )}

                {error && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                    {error}
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => handleOpenChange(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Owner"
                  )}
                </Button>
              </DialogFooter>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

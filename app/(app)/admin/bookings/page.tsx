"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarPlus,
  CheckCircle2,
  MapPin,
  Search,
  User,
  UserPlus,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ALL_POSSIBLE_SLOTS, getSlotLabel } from "@/lib/booking/slots";

interface TurfOption {
  id: string;
  name: string;
  address?: string;
  city?: string;
  price: number;
  active?: boolean;
}

interface UserOption {
  uid: string;
  name: string;
  email: string;
  mobile: string;
  type: "owner" | "user";
}

type CustomerMode = "registered" | "guest";
type PaymentStatus = "paid" | "unpaid";

interface BookingResult {
  bookingId: string;
  turfName: string;
  daySlot: string;
  monthSlot: string;
  timeSlots: string[];
  total: number;
  customer: { name: string; phone: string; email: string };
}

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "online", label: "Online transfer" },
  { value: "other", label: "Other" },
];

/** Local YYYY-MM-DD (not UTC, so late-night IST doesn't jump a day). */
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

/** Radio options rendered as pill buttons on one line. */
function InlineRadio<T extends string>({
  name,
  value,
  onChange,
  options,
}: {
  name: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(v) => onChange(v as T)}
      className="grid grid-cols-2 gap-2"
    >
      {options.map((opt) => (
        <Label
          key={opt.value}
          htmlFor={`${name}-${opt.value}`}
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors",
            value === opt.value
              ? "border-primary bg-primary/5"
              : "hover:border-primary/50",
          )}
        >
          <RadioGroupItem id={`${name}-${opt.value}`} value={opt.value} />
          {opt.label}
        </Label>
      ))}
    </RadioGroup>
  );
}

export default function AdminBookSlotPage() {
  // Data
  const [turfs, setTurfs] = useState<TurfOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  // Turf + date + slots
  const [turfSearch, setTurfSearch] = useState("");
  const [turfId, setTurfId] = useState("");
  const [date, setDate] = useState(localToday());
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);

  // Customer
  const [customerMode, setCustomerMode] = useState<CustomerMode>("registered");
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [guest, setGuest] = useState({ name: "", phone: "", email: "" });

  // Payment
  const [amount, setAmount] = useState("");
  const [amountEdited, setAmountEdited] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("paid");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [notes, setNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BookingResult | null>(null);

  // ---- Load turfs + users once ----
  useEffect(() => {
    const load = async () => {
      try {
        const [turfsRes, usersRes] = await Promise.all([
          fetch("/api/turfs"),
          fetch("/api/admin/users"),
        ]);
        if (turfsRes.ok) {
          const data = await turfsRes.json();
          setTurfs(
            (data.turfs || [])
              .map((t: TurfOption) => ({
                id: t.id,
                name: t.name || "Unnamed turf",
                address: t.address,
                city: t.city,
                price: Number(t.price) || 0,
                active: t.active,
              }))
              .sort((a: TurfOption, b: TurfOption) =>
                a.name.localeCompare(b.name),
              ),
          );
        } else {
          toast.error("Could not load turfs");
        }
        if (usersRes.ok) {
          const data = await usersRes.json();
          setUsers(
            (data.users || []).filter((u: UserOption) => u.type === "user"),
          );
        } else {
          toast.error("Could not load users");
        }
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoadingData(false);
      }
    };
    load();
  }, []);

  const selectedTurf = useMemo(
    () => turfs.find((t) => t.id === turfId) || null,
    [turfs, turfId],
  );

  const filteredTurfs = useMemo(() => {
    const q = turfSearch.trim().toLowerCase();
    if (!q) return turfs;
    return turfs.filter((t) =>
      [t.name, t.address, t.city].some((v) =>
        (v || "").toLowerCase().includes(q),
      ),
    );
  }, [turfs, turfSearch]);

  const matchingUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return [];
    return users
      .filter((u) =>
        [u.name, u.email, u.mobile].some((v) =>
          (v || "").toLowerCase().includes(q),
        ),
      )
      .slice(0, 8);
  }, [users, userSearch]);

  // ---- Load availability whenever turf/date changes ----
  const loadAvailability = useCallback(async (id: string, d: string) => {
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/turfs/${id}/bookings?date=${d}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setBookedSlots(
        new Set<string>((data.bookedSlots || []).map((s: string) => s.trim())),
      );
    } catch {
      toast.error("Could not load slot availability");
      setBookedSlots(new Set());
    } finally {
      setLoadingSlots(false);
    }
  }, []);

  useEffect(() => {
    setSelectedSlots([]);
    if (!turfId || !date) {
      setBookedSlots(new Set());
      return;
    }
    loadAvailability(turfId, date);
  }, [turfId, date, loadAvailability]);

  // Default amount = turf price × slots, until the admin edits it.
  const defaultAmount = (selectedTurf?.price || 0) * selectedSlots.length;
  useEffect(() => {
    if (!amountEdited) setAmount(defaultAmount ? String(defaultAmount) : "");
  }, [defaultAmount, amountEdited]);

  const toggleSlot = (label: string) => {
    setSelectedSlots((prev) =>
      prev.includes(label) ? prev.filter((s) => s !== label) : [...prev, label],
    );
  };

  // Keep slots in time order for display / submission.
  const orderedSelected = ALL_POSSIBLE_SLOTS.map((s) =>
    getSlotLabel(s.startTime, s.endTime),
  ).filter((l) => selectedSlots.includes(l));

  const bookedCount = ALL_POSSIBLE_SLOTS.filter((s) =>
    bookedSlots.has(getSlotLabel(s.startTime, s.endTime)),
  ).length;

  const customerReady =
    customerMode === "registered"
      ? !!selectedUser
      : guest.name.trim().length > 0 && guest.phone.length === 10;

  const amountNum = Number(amount);
  const amountValid =
    amount !== "" && Number.isFinite(amountNum) && amountNum >= 0;

  const canSubmit =
    !!turfId &&
    !!date &&
    orderedSelected.length > 0 &&
    customerReady &&
    amountValid;

  const resetForm = () => {
    setSelectedSlots([]);
    setSelectedUser(null);
    setUserSearch("");
    setGuest({ name: "", phone: "", email: "" });
    setAmountEdited(false);
    setPaymentStatus("paid");
    setPaymentMethod("cash");
    setNotes("");
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turfId,
          date,
          timeSlots: orderedSelected,
          customer:
            customerMode === "registered"
              ? { uid: selectedUser!.uid }
              : {
                  name: guest.name.trim(),
                  phone: guest.phone,
                  email: guest.email.trim(),
                },
          amount: amountNum,
          paymentStatus,
          paymentMethod,
          notes: notes.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 409) loadAvailability(turfId, date);
        throw new Error(data.error || "Booking failed");
      }
      setResult(data as BookingResult);
      toast.success("Booking confirmed", {
        description: `${data.timeSlots.length} slot(s) booked for ${data.customer.name || "customer"}.`,
      });
      resetForm();
      loadAvailability(turfId, date);
    } catch (err) {
      toast.error("Booking failed", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-[60vh]">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarPlus className="h-6 w-6 text-primary" />
          Book Slot for User
        </h1>
        <p className="text-muted-foreground text-sm">
          Book a turf slot on behalf of a registered user or a walk-in customer.
        </p>
      </div>

      {result && (
        <Card className="border-green-300 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
          <CardContent className="pt-5 flex flex-col sm:flex-row sm:items-start gap-3">
            <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
            <div className="flex-1 space-y-1 text-sm">
              <p className="font-semibold text-green-800 dark:text-green-300">
                Booking confirmed — {result.turfName}
              </p>
              <p>
                {result.daySlot}, {result.monthSlot} ·{" "}
                {result.timeSlots.join(", ")}
              </p>
              <p>
                {result.customer.name}
                {result.customer.phone && ` · ${result.customer.phone}`}
                {result.customer.email && ` · ${result.customer.email}`}
              </p>
              <p className="font-semibold">Total: {formatINR(result.total)}</p>
              <p className="text-xs text-muted-foreground">
                Ref: {result.bookingId}
              </p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setResult(null)}>
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: turf, date, slots */}
        <div className="lg:col-span-3 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" /> 1. Turf &amp; Date
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Turf</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={turfSearch}
                    onChange={(e) => setTurfSearch(e.target.value)}
                    placeholder="Search turf by name, address or city"
                    className="pl-9"
                  />
                </div>
                <Select value={turfId} onValueChange={setTurfId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a turf" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredTurfs.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No turfs found
                      </div>
                    ) : (
                      filteredTurfs.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.city ? ` · ${t.city}` : ""} · ₹{t.price}/hr
                          {t.active === false ? " (inactive)" : ""}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {selectedTurf?.address && (
                  <p className="text-xs text-muted-foreground">
                    {selectedTurf.address}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="booking-date">Date</Label>
                <Input
                  id="booking-date"
                  type="date"
                  value={date}
                  min={localToday()}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full sm:w-60"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">2. Select Slot(s)</CardTitle>
            </CardHeader>
            <CardContent>
              {!turfId ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  Select a turf to see available slots.
                </p>
              ) : loadingSlots ? (
                <div className="flex justify-center py-10">
                  <Spinner className="h-6 w-6" />
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {ALL_POSSIBLE_SLOTS.map((slot) => {
                      const label = getSlotLabel(slot.startTime, slot.endTime);
                      const isBooked = bookedSlots.has(label);
                      const isSelected = selectedSlots.includes(label);
                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isBooked}
                          onClick={() => toggleSlot(label)}
                          className={cn(
                            "rounded-lg border p-2.5 text-center text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed",
                            !isBooked && "hover:border-green-400",
                            isSelected &&
                              "bg-green-500/15 border-green-600 ring-2 ring-green-600",
                          )}
                        >
                          <p className="font-semibold">{label}</p>
                          <p
                            className={cn(
                              "text-xs",
                              isBooked ? "text-red-500" : "text-green-600",
                            )}
                          >
                            {isBooked
                              ? "BOOKED"
                              : `₹${selectedTurf?.price ?? 0}`}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {ALL_POSSIBLE_SLOTS.length - bookedCount} available ·{" "}
                    {bookedCount} booked · {selectedSlots.length} selected
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: customer, payment, summary */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" /> 3. Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InlineRadio<CustomerMode>
                name="customer-mode"
                value={customerMode}
                onChange={setCustomerMode}
                options={[
                  { value: "registered", label: "Registered User" },
                  { value: "guest", label: "Walk-in / Guest" },
                ]}
              />

              {customerMode === "registered" ? (
                selectedUser ? (
                  <div className="flex items-start gap-3 rounded-lg border p-3 bg-muted/40">
                    <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                      {(selectedUser.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 text-sm">
                      <p className="font-semibold truncate">
                        {selectedUser.name}
                      </p>
                      <p className="text-muted-foreground truncate">
                        {selectedUser.email || "No email"}
                      </p>
                      <p className="text-muted-foreground">
                        {selectedUser.mobile || "No phone"}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedUser(null)}
                    >
                      Change
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        placeholder="Search by name, email or phone"
                        className="pl-9"
                      />
                    </div>
                    {userSearch.trim() && (
                      <div className="rounded-lg border divide-y max-h-64 overflow-y-auto">
                        {matchingUsers.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground space-y-2">
                            <p>No user found.</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="gap-1"
                              onClick={() => {
                                setCustomerMode("guest");
                                setGuest((g) => ({
                                  ...g,
                                  ...(/^\d{10}$/.test(userSearch.trim())
                                    ? { phone: userSearch.trim() }
                                    : { name: userSearch.trim() }),
                                }));
                              }}
                            >
                              <UserPlus className="h-3.5 w-3.5" /> Book as guest
                            </Button>
                          </div>
                        ) : (
                          matchingUsers.map((u) => (
                            <button
                              key={u.uid}
                              type="button"
                              onClick={() => {
                                setSelectedUser(u);
                                setUserSearch("");
                              }}
                              className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                            >
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {[u.email, u.mobile]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </p>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="guest-name">Name *</Label>
                    <Input
                      id="guest-name"
                      value={guest.name}
                      onChange={(e) =>
                        setGuest((g) => ({ ...g, name: e.target.value }))
                      }
                      placeholder="Customer name"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="guest-phone">Phone *</Label>
                    <Input
                      id="guest-phone"
                      type="tel"
                      inputMode="numeric"
                      value={guest.phone}
                      onChange={(e) =>
                        setGuest((g) => ({
                          ...g,
                          phone: e.target.value.replace(/\D/g, "").slice(-10),
                        }))
                      }
                      placeholder="10-digit mobile number"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="guest-email">Email (optional)</Label>
                    <Input
                      id="guest-email"
                      type="email"
                      value={guest.email}
                      onChange={(e) =>
                        setGuest((g) => ({ ...g, email: e.target.value }))
                      }
                      placeholder="name@example.com"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">4. Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <InlineRadio<PaymentStatus>
                name="payment-status"
                value={paymentStatus}
                onChange={setPaymentStatus}
                options={[
                  { value: "paid", label: "Paid" },
                  { value: "unpaid", label: "Pay at Venue" },
                ]}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="amount">Total amount (₹)</Label>
                  <Input
                    id="amount"
                    type="number"
                    min={0}
                    step="any"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value);
                      setAmountEdited(true);
                    }}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Method</Label>
                  <Select
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {amountEdited && amountNum !== defaultAmount && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => setAmountEdited(false)}
                >
                  Reset to standard price ({formatINR(defaultAmount)})
                </button>
              )}

              <div className="space-y-1">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Booked over phone call"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Turf</span>
                <span className="font-medium text-right">
                  {selectedTurf?.name || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">
                  {date
                    ? new Date(`${date}T00:00:00`).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3 items-start">
                <span className="text-muted-foreground">Slots</span>
                <div className="text-right">
                  {orderedSelected.length === 0
                    ? "—"
                    : orderedSelected.map((s) => (
                        <Badge
                          key={s}
                          variant="secondary"
                          className="ml-1 mb-1"
                        >
                          {s}
                        </Badge>
                      ))}
                </div>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">Customer</span>
                <span className="font-medium text-right">
                  {customerMode === "registered"
                    ? selectedUser?.name || "—"
                    : guest.name || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3 border-t pt-3 text-base font-bold">
                <span>Total</span>
                <span className="text-green-600">
                  {amountValid ? formatINR(amountNum) : "—"}
                </span>
              </div>

              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                disabled={!canSubmit || submitting}
                onClick={handleSubmit}
              >
                {submitting ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" /> Booking...
                  </>
                ) : (
                  "Confirm Booking"
                )}
              </Button>
              {!canSubmit && (
                <p className="text-xs text-muted-foreground text-center">
                  Select turf, date, slot(s) and customer to continue.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

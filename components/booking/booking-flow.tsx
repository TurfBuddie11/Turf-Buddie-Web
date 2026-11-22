"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar,
  MapPin,
  Star,
  CheckCircle,
  XCircle,
  Zap,
  Clock,
  User,
} from "lucide-react";
import { Turf, TimeSlot, Booking } from "@/lib/types/booking";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-provider";
import { initiatePayment, verifyPayment } from "@/lib/razorpay/payment";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import { InlineLoginForm } from "@/components/auth/inline-login-form";
import { getUserProfile } from "@/lib/firebase/auth";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ALL_POSSIBLE_SLOTS, getSlotLabel } from "@/lib/booking/slots";
import Link from "next/link";

type PaymentMode = "full" | "split";

interface BookingFlowProps {
  turf: Turf;
  selectedDate: string;
  onBookingComplete: (booking: Booking) => void;
}

export function BookingFlow({
  turf,
  selectedDate,
  onBookingComplete,
}: BookingFlowProps) {
  const [selectedSlots, setSelectedSlots] = useState<
    Omit<TimeSlot, "price" | "isAvailable">[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [isFetchingSlots, setIsFetchingSlots] = useState(true);
  const { user, profile } = useAuth();
  // Unverified accounts are signed in to Firebase but must not book yet.
  const isLoggedIn = !!user && user.emailVerified;
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("full");
  const [splitCount, setSplitCount] = useState(2);
  const [splitInputValue, setSplitInputValue] = useState("2");
  const [teamMembers, setTeamMembers] = useState<
    { phone: string; name: string; email: string }[]
  >([{ phone: "", name: "", email: "" }]);
  const [splitGroupId, setSplitGroupId] = useState<string | null>(null);
  const [splitShares, setSplitShares] = useState<
    { name: string; phone: string; amount: number }[]
  >([]);
  const [isCreatingSplitGroup, setIsCreatingSplitGroup] = useState(false);

  // Coupon state
  const [couponInput, setCouponInput] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // User details form state
  const [userDetails, setUserDetails] = useState({
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (profile) {
      setUserDetails({
        name: profile.name || "",
        email: profile.email || "",
        phone: profile.mobile || "",
      });
    }
  }, [profile]);

  // Prefill details for users without a complete profile (e.g. right after
  // logging in from the checkout). Only fills empty fields.
  useEffect(() => {
    if (!isLoggedIn || !user || profile) return;
    let cancelled = false;
    const fill = (name?: string, email?: string, phone?: string) =>
      setUserDetails((prev) => ({
        name: prev.name || name || "",
        email: prev.email || email || "",
        phone: prev.phone || phone || "",
      }));
    fill(user.displayName || "", user.email || "");
    getUserProfile(user.uid)
      .then((snap) => {
        if (cancelled || !snap.exists()) return;
        const data = snap.data() as {
          name?: string;
          email?: string;
          mobile?: string;
        };
        fill(data.name, data.email, data.mobile);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user, profile]);

  useEffect(() => {
    if (user) {
      const fetchLoyaltyPoints = async () => {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch("/api/loyalty/points", {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (!response.ok) throw new Error("Failed to fetch loyalty points.");
          const data = await response.json();
          setLoyaltyPoints(data.balance);
        } catch (error) {
          console.error("Error fetching loyalty points:", error);
          setLoyaltyPoints(0);
        }
      };
      fetchLoyaltyPoints();
    }
  }, [user]);

  const dateObj = useMemo(() => new Date(selectedDate), [selectedDate]);
  const displayDate = useMemo(
    () =>
      dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [dateObj],
  );

  const basePrice = useMemo(
    () => turf.price * selectedSlots.length,
    [selectedSlots, turf.price],
  );

  const discount = useMemo(() => {
    if (redeemPoints) {
      return Math.floor(loyaltyPoints / 2);
    }
    return 0;
  }, [redeemPoints, loyaltyPoints]);

  const totalPrice = useMemo(
    () =>
      Math.max(
        0,
        Math.round(basePrice) - discount - couponDiscount + turf.price * 0.015,
      ),
    [basePrice, discount, couponDiscount, turf.price],
  );

  // Same rule as the server: whole rupees, remainder paid by the organizer,
  // so the shares always add up exactly to the total.
  const splitTotal = Math.round(totalPrice);
  const perPersonPrice = Math.floor(splitTotal / splitCount);
  const organizerShare =
    perPersonPrice + (splitTotal - perPersonPrice * splitCount);

  // Any change to the booking invalidates a previously created split group.
  useEffect(() => {
    setSplitGroupId(null);
    setSplitShares([]);
  }, [selectedSlots, selectedDate]);

  // Fetch Booked Slots
  useEffect(() => {
    setSelectedSlots([]); // Reset selection when date changes
    const fetchBookedSlots = async () => {
      setIsFetchingSlots(true);
      try {
        const response = await fetch(
          `/api/turfs/${turf.id}/bookings?date=${selectedDate}`,
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch booking data.");
        }
        const data = await response.json();

        const normalized = new Set<string>(
          (data.bookedSlots || []).map((slot: string) => slot.trim()),
        );
        setBookedSlots(normalized);
      } catch (error) {
        toast.error("Data Fetch Error", {
          description:
            error instanceof Error ? error.message : "Could not fetch slots.",
        });
        setBookedSlots(new Set());
      } finally {
        setIsFetchingSlots(false);
      }
    };
    fetchBookedSlots();
  }, [selectedDate, turf.id]);

  const availableSlotsCount = useMemo(() => {
    return ALL_POSSIBLE_SLOTS.filter(
      (slot) => !bookedSlots.has(getSlotLabel(slot.startTime, slot.endTime)),
    ).length;
  }, [bookedSlots]);

  const handleSlotToggle = useCallback(
    (slot: Omit<TimeSlot, "price" | "isAvailable">) => {
      setSelectedSlots((prevSelected) => {
        const isAlreadySelected = prevSelected.some((s) => s.id === slot.id);
        if (isAlreadySelected) {
          return prevSelected.filter((s) => s.id !== slot.id);
        } else {
          return [...prevSelected, slot].sort((a, b) =>
            a.startTime.localeCompare(b.startTime),
          );
        }
      });
    },
    [],
  );

  const handleBooking = useCallback(async () => {
    if (selectedSlots.length === 0) {
      toast.info("Please select at least one slot.");
      return;
    }
    if (!user || !user.emailVerified) {
      toast.info("Please login to complete your booking.");
      return;
    }

    setIsLoading(true);
    try {
      const timeSlotLabels = selectedSlots.map((slot) =>
        getSlotLabel(slot.startTime, slot.endTime),
      );
      const day = dateObj.toLocaleDateString("en-US", { day: "numeric" });
      const month = dateObj.toLocaleDateString("en-US", { month: "short" });

      const formattedDate = `${day} ${month}`;

      const initialBookingData = {
        turfId: turf.id,
        timeSlots: timeSlotLabels,
        daySlot: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
        monthSlot: formattedDate,
        userUid: user.uid,
        status: "pending" as const,
        paid: "Not Paid to Owner" as const,
        userDetails: userDetails,
        // This handler is only used for "Pay Full Amount".
        splitCount: 1,
      };

      const orderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          amount: totalPrice,
          bookingDetails: initialBookingData,
        }),
      });
      if (!orderResponse.ok) {
        const err = await orderResponse.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create payment order.");
      }
      const { orderId, amount } = await orderResponse.json();

      const { paymentId, signature } = await initiatePayment({
        amount: amount.toString(),
        currency: "INR",
        orderId,
        userDetails: {
          name: userDetails.name,
          email: userDetails.email,
          contact: userDetails.phone,
        },
      });

      const { booking } = await verifyPayment(paymentId, orderId, signature);

      // Add loyalty points
      const idToken = await user.getIdToken();
      await fetch("/api/loyalty/add", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ slots: selectedSlots.length }),
      });

      // Redeem loyalty points if selected
      if (redeemPoints) {
        await fetch("/api/loyalty/redeem", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ pointsToRedeem: loyaltyPoints }),
        });
      }

      toast.success("Booking Confirmed!", {
        description: `Your booking for ${timeSlotLabels.length} slots is successful.`,
      });

      setBookedSlots((prev) => {
        const newBooked = new Set(prev);
        timeSlotLabels.forEach((label) => newBooked.add(label));
        return newBooked;
      });
      setSelectedSlots([]);
      setIsCheckoutOpen(false);

      if (booking) {
        onBookingComplete(booking);
      }
    } catch (error) {
      toast.error("Booking Failed", {
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  }, [
    selectedSlots,
    user,
    turf.id,
    dateObj,
    onBookingComplete,
    totalPrice,
    redeemPoints,
    loyaltyPoints,
    userDetails,
  ]);

  const handleCreateSplitGroup = useCallback(async () => {
    if (selectedSlots.length === 0) {
      toast.info("Please select at least one slot.");
      return;
    }
    if (!user || !user.emailVerified) {
      toast.info("Please login to create a split group.");
      return;
    }
    if (teamMembers.length + 1 !== splitCount) {
      toast.error("Please enter a valid number of people (2–30).");
      return;
    }
    const missingContact = teamMembers.findIndex(
      (m) => !m.name.trim() || (m.phone.length !== 10 && !m.email.trim()),
    );
    if (missingContact !== -1) {
      toast.error(
        `Add a name and phone/email for Player ${missingContact + 2}.`,
      );
      return;
    }

    setIsCreatingSplitGroup(true);
    try {
      const timeSlotLabels = selectedSlots.map((slot) =>
        getSlotLabel(slot.startTime, slot.endTime),
      );
      const day = dateObj.toLocaleDateString("en-US", { day: "numeric" });
      const month = dateObj.toLocaleDateString("en-US", { month: "short" });

      // Organizer first, then teammates. Amounts are computed on the server.
      const allMembers = [
        {
          name: userDetails.name || profile?.name || "Organizer",
          phone: userDetails.phone || profile?.mobile || "",
          email: userDetails.email || profile?.email || user.email || "",
        },
        ...teamMembers.map((m, i) => ({
          name: m.name.trim() || `Player ${i + 2}`,
          phone: m.phone,
          email: m.email.trim(),
        })),
      ];

      const res = await fetch("/api/split-payment/create-group", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await user.getIdToken()}`,
        },
        body: JSON.stringify({
          turfId: turf.id,
          turfName: turf.name,
          timeSlots: timeSlotLabels,
          daySlot: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
          monthSlot: `${day} ${month}`,
          totalAmount: splitTotal,
          members: allMembers,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create split group");
      }

      const data = await res.json();
      setSplitGroupId(data.groupId);
      setSplitShares(
        (data.group?.members || []).map(
          (m: { name: string; phone: string; amount: number }) => ({
            name: m.name,
            phone: m.phone,
            amount: m.amount,
          }),
        ),
      );

      // Show the slots as held right away.
      setBookedSlots((prev) => {
        const next = new Set(prev);
        timeSlotLabels.forEach((label) => next.add(label));
        return next;
      });

      const emailsSentCount: number = Array.isArray(data.emailsSentTo)
        ? data.emailsSentTo.length
        : 0;

      toast.success("Split group created! Slot held for 30 minutes.", {
        description:
          emailsSentCount > 0
            ? `Payment link emailed to ${emailsSentCount} member${emailsSentCount > 1 ? "s" : ""}. Send WhatsApp links below.`
            : "Send the payment link to your teammates below.",
      });
    } catch (error) {
      toast.error("Failed to create split group", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsCreatingSplitGroup(false);
    }
  }, [
    user,
    selectedSlots,
    dateObj,
    turf,
    splitTotal,
    splitCount,
    teamMembers,
    userDetails,
    profile,
  ]);

  const splitPayLink =
    splitGroupId && typeof window !== "undefined"
      ? `${window.location.origin}/split-pay/${splitGroupId}`
      : "";

  const openWhatsAppForMember = (member: {
    name: string;
    phone: string;
    amount: number;
  }) => {
    const msg = `🏟 Hey ${member.name}! ${userDetails.name || "Your friend"} has booked ${turf.name} on ${displayDate}.\n💰 Your share: ₹${member.amount}\n🔗 Pay here: ${splitPayLink}\n⏰ Please pay within 30 minutes to confirm the slot.`;
    const phone = member.phone.replace(/\D/g, "");
    const target = phone.length === 10 ? `91${phone}` : phone;
    window.open(
      `https://wa.me/${target}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };

  const handleApplyCoupon = useCallback(async () => {
    if (!couponInput.trim()) return;
    if (!user) {
      setCouponError("Please login to apply a coupon.");
      return;
    }

    setCouponLoading(true);
    setCouponError("");
    setCouponMessage("");

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          code: couponInput.trim().toUpperCase(),
          orderAmount: basePrice,
        }),
      });
      const data = await res.json();

      if (data.valid) {
        setCouponDiscount(data.discountAmount);
        setCouponApplied(true);
        setCouponMessage(data.message);
      } else {
        setCouponDiscount(0);
        setCouponApplied(false);
        setCouponError(data.message || "Invalid coupon.");
      }
    } catch {
      setCouponError("Could not validate coupon. Try again.");
    } finally {
      setCouponLoading(false);
    }
  }, [couponInput, user, basePrice]);

  const handleRemoveCoupon = () => {
    setCouponInput("");
    setCouponApplied(false);
    setCouponDiscount(0);
    setCouponMessage("");
    setCouponError("");
  };

  const handleUserDetailChange = (
    field: keyof typeof userDetails,
    value: string,
  ) => {
    setUserDetails((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Turf Info Card */}
      <Card className="shadow-xl">
        <CardHeader className="py-4 px-5 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-xl font-extrabold">
                {turf.name}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <span className="flex items-center text-yellow-400 font-semibold">
                  <Star className="w-4 h-4 mr-1 fill-yellow-400" />
                  {turf.rating?.toFixed(1) ?? "N/A"} Rating
                </span>
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {turf.address}
                </span>
              </div>
            </div>
            <Badge className="bg-green-600 font-extrabold text-md px-4 py-2 shrink-0 self-start sm:self-auto">
              ₹{turf.price}/hr
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Time Slot Selector */}
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center text-md sm:text-lg">
            <Calendar className="w-5 h-5 mr-2 text-green-600" /> Select Time
            Slot(s)
          </CardTitle>
          <p className="text-sm pt-1">{displayDate}</p>
        </CardHeader>
        <CardContent>
          {isFetchingSlots ? (
            <div className="flex items-center justify-center h-48">
              <Spinner className="animate-spin rounded-full h-8 w-8 text-green-600" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ALL_POSSIBLE_SLOTS.map((slot) => {
                  const label = getSlotLabel(slot.startTime, slot.endTime);
                  const isBooked = bookedSlots.has(label);
                  const isSelected = selectedSlots.some(
                    (s) => s.id === slot.id,
                  );
                  return (
                    <button
                      key={slot.id}
                      disabled={isBooked}
                      onClick={() => handleSlotToggle(slot)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                        "hover:border-green-400",
                        isSelected &&
                          !isBooked &&
                          "bg-green-500/20 border-green-600 ring-2 ring-green-600 hover:bg-green-500/30",
                      )}
                    >
                      <p className="font-semibold text-sm sm:text-base">
                        {label}
                      </p>
                      <p className="text-xs text-green-600">
                        {isBooked ? "BOOKED" : `₹${turf.price}`}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm border-t border-slate-700 pt-4">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="font-bold">{availableSlotsCount}</span>{" "}
                  Available
                </span>
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  <span className="font-bold">
                    {ALL_POSSIBLE_SLOTS.length - availableSlotsCount}
                  </span>{" "}
                  Booked
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Checkout Dialog */}
      {selectedSlots.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t md:static md:bg-transparent md:border-t-0 md:p-0">
          <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-green-600 hover:bg-green-600 font-semibold text-lg py-6 md:py-3">
                Proceed to Checkout - ₹{turf.price * selectedSlots.length}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto  hide-scrollbar">
              <DialogHeader>
                <DialogTitle className="flex items-center text-xl">
                  <Zap className="w-5 h-5 mr-2 text-green-600" />
                  Checkout
                </DialogTitle>
                <DialogDescription>
                  Review your booking details and complete payment
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Booking Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center">
                      <Clock className="w-4 h-4 mr-2" />
                      Booking Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="font-medium">Turf</span>
                        <span>{turf.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-medium">Date</span>
                        <span>{displayDate}</span>
                      </div>
                      <div className="flex justify-between items-start">
                        <span className="font-medium">Selected Slots</span>
                        <div className="text-right space-y-1">
                          {selectedSlots.map((slot) => (
                            <Badge
                              key={slot.id}
                              variant="secondary"
                              className="ml-1 mb-1"
                            >
                              {getSlotLabel(slot.startTime, slot.endTime)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Separator />

                    {/* Price Breakdown */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Base Price ({selectedSlots.length} slots)</span>
                        <span>₹{basePrice}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="redeem-loyalty"
                          checked={redeemPoints}
                          onCheckedChange={() => setRedeemPoints(!redeemPoints)}
                          className="border-green-400 data-[state=checked]:bg-green-500 data-[state=checked]:text-black"
                        />
                        <Label
                          htmlFor="redeem-loyalty"
                          className="text-sm cursor-pointer"
                        >
                          Redeem {loyaltyPoints} loyalty points (-₹{discount})
                        </Label>
                      </div>

                      {/* Coupon Code */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Coupon Code</p>
                        {!couponApplied ? (
                          <div className="flex gap-2">
                            <Input
                              value={couponInput}
                              onChange={(e) => {
                                setCouponInput(e.target.value.toUpperCase());
                                setCouponError("");
                              }}
                              placeholder="Enter coupon code"
                              className="uppercase text-sm h-9"
                            />
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleApplyCoupon}
                              disabled={couponLoading || !couponInput.trim()}
                              className="bg-green-600 hover:bg-green-700 shrink-0 h-9 px-4"
                            >
                              {couponLoading ? (
                                <Spinner className="h-4 w-4" />
                              ) : (
                                "Apply"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 px-3 py-2">
                            <span className="text-sm font-semibold text-green-700">
                              🎟 {couponInput} applied
                            </span>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="text-xs text-red-500 hover:text-red-600 font-medium"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                        {couponError && (
                          <p className="text-xs text-red-500">{couponError}</p>
                        )}
                        {couponMessage && !couponError && (
                          <p className="text-xs text-green-600 font-medium">
                            ✓ {couponMessage}
                          </p>
                        )}
                      </div>

                      <Separator />
                      {redeemPoints && (
                        <div className="flex justify-between text-sm font-bold">
                          <span>Loyalty Points Discount</span>
                          <span>-₹{discount}</span>
                        </div>
                      )}
                      {couponApplied && couponDiscount > 0 && (
                        <div className="flex justify-between text-sm font-bold text-green-600">
                          <span>Coupon Discount ({couponInput})</span>
                          <span>-₹{couponDiscount}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold">
                        <span>GST (0%)</span>
                        <span>₹ 0</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold">
                        <span>Platform Fee</span>
                        <span>₹{turf.price * 0.015}</span>
                      </div>

                      <div className="flex justify-between text-lg font-bold">
                        <span>Total Amount</span>
                        <span className="text-green-600">₹{totalPrice}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {!isLoggedIn ? (
                  <Card className="border-green-200 dark:border-green-800">
                    <CardContent className="pt-6">
                      <InlineLoginForm
                        title="Login to complete your booking"
                        description="No page reload — your selected slots stay as they are."
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    {/* User Details Form */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center">
                          <User className="w-4 h-4 mr-2" />
                          Your Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="name">Full Name</Label>
                            <Input
                              id="name"
                              value={userDetails.name}
                              onChange={(e) =>
                                handleUserDetailChange("name", e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              type="email"
                              value={userDetails.email}
                              onChange={(e) =>
                                handleUserDetailChange("email", e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              type="tel"
                              value={userDetails.phone}
                              onChange={(e) =>
                                handleUserDetailChange("phone", e.target.value)
                              }
                              className="mt-1"
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Payment option: pay full alone, or split with friends */}
                    <div className="space-y-2">
                      <p className="text-sm font-semibold">Payment Option</p>
                      <RadioGroup
                        value={paymentMode}
                        onValueChange={(v) => setPaymentMode(v as PaymentMode)}
                        disabled={!!splitGroupId}
                        className="grid grid-cols-2 gap-2"
                      >
                        {(
                          [
                            { value: "full", label: "Pay Full Amount" },
                            { value: "split", label: "Split 'n Pay" },
                          ] as const
                        ).map((opt) => (
                          <Label
                            key={opt.value}
                            htmlFor={`pay-mode-${opt.value}`}
                            className={cn(
                              "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap",
                              paymentMode === opt.value
                                ? "border-green-600 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300"
                                : "hover:border-green-400",
                              splitGroupId && "cursor-not-allowed opacity-70",
                            )}
                          >
                            <RadioGroupItem
                              id={`pay-mode-${opt.value}`}
                              value={opt.value}
                              className="border-green-600 text-green-600 [&_svg]:fill-green-600"
                            />
                            {opt.label}
                          </Label>
                        ))}
                      </RadioGroup>
                      {splitGroupId && (
                        <p className="text-xs text-muted-foreground">
                          Split group already created for these slots.
                        </p>
                      )}
                    </div>

                    {/* Split 'n Pay */}
                    {paymentMode === "split" && (
                      <Card className="border-green-200 dark:border-green-800">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span>Split &apos;n Pay</span>
                            <Badge variant="secondary" className="text-xs">
                              Invite Friends
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          {/* Split count */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium">
                                Split between:
                              </span>
                              <input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={splitInputValue}
                                onChange={(e) => {
                                  const raw = e.target.value.replace(
                                    /[^0-9]/g,
                                    "",
                                  );
                                  setSplitInputValue(raw);
                                  const val = parseInt(raw);
                                  if (!isNaN(val) && val >= 2 && val <= 30) {
                                    setSplitCount(val);
                                    // Keep already-entered teammates; add/trim rows.
                                    setTeamMembers((prev) =>
                                      Array.from(
                                        { length: val - 1 },
                                        (_, i) =>
                                          prev[i] ?? {
                                            phone: "",
                                            name: "",
                                            email: "",
                                          },
                                      ),
                                    );
                                    setSplitGroupId(null);
                                    setSplitShares([]);
                                  }
                                }}
                                className="w-16 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm font-bold text-center focus:outline-none focus:border-green-400 bg-white dark:bg-gray-800"
                              />
                              <span className="text-sm text-muted-foreground">
                                people
                              </span>
                            </div>
                            {(() => {
                              const val = parseInt(splitInputValue);
                              if (
                                splitInputValue === "" ||
                                isNaN(val) ||
                                val < 2
                              ) {
                                return (
                                  <p className="text-xs text-red-500">
                                    A minimum of 2 people are required to split
                                    the amount.
                                  </p>
                                );
                              }
                              if (val > 30) {
                                return (
                                  <p className="text-xs text-red-500">
                                    Maximum 30 people can split the amount.
                                  </p>
                                );
                              }
                              return null;
                            })()}
                          </div>

                          {/* Per person amount */}
                          <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 flex justify-between items-center">
                            <span className="text-sm text-gray-600">
                              ₹{splitTotal} ÷ {splitCount} =
                            </span>
                            <span className="font-bold text-green-700 text-lg">
                              ₹{perPersonPrice} each
                            </span>
                          </div>

                          {/* Member inputs */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                              Add teammates
                            </p>

                            {/* Organizer row (you) */}
                            <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                              <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                                {(profile?.name || userDetails.name || "Y")
                                  .charAt(0)
                                  .toUpperCase()}
                              </div>
                              <span className="text-sm font-medium flex-1 text-gray-800">
                                {profile?.name || userDetails.name || "You"}{" "}
                                <span className="text-xs text-green-600">
                                  (Organizer)
                                </span>
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                ₹{organizerShare}
                              </span>
                            </div>

                            {teamMembers.map((member, i) => (
                              <div key={i} className="space-y-1.5">
                                <div className="flex gap-2 items-center">
                                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                                    {member.name
                                      ? member.name.charAt(0).toUpperCase()
                                      : i + 2}
                                  </div>
                                  <Input
                                    value={member.name}
                                    onChange={(e) => {
                                      const name = e.target.value;
                                      setTeamMembers((prev) =>
                                        prev.map((m, j) =>
                                          j === i ? { ...m, name } : m,
                                        ),
                                      );
                                    }}
                                    className="h-8 text-xs flex-1"
                                    placeholder={`Player ${i + 2} name`}
                                  />
                                  <Input
                                    value={member.phone}
                                    onChange={(e) => {
                                      const phone = e.target.value
                                        .replace(/\D/g, "")
                                        .slice(-10);
                                      setTeamMembers((prev) =>
                                        prev.map((m, j) =>
                                          j === i ? { ...m, phone } : m,
                                        ),
                                      );
                                    }}
                                    className="h-8 text-xs w-24"
                                    placeholder="Phone"
                                    type="tel"
                                  />
                                  <span className="text-xs font-bold text-gray-700 w-14 text-right shrink-0">
                                    ₹{perPersonPrice}
                                  </span>
                                </div>
                                <div className="flex gap-2 items-center pl-9">
                                  <svg
                                    viewBox="0 0 24 24"
                                    className="w-3.5 h-3.5 text-gray-400 shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect
                                      x="3"
                                      y="5"
                                      width="18"
                                      height="14"
                                      rx="2"
                                    />
                                    <path d="m3 7 9 6 9-6" />
                                  </svg>
                                  <Input
                                    value={member.email}
                                    onChange={(e) => {
                                      const email = e.target.value;
                                      setTeamMembers((prev) =>
                                        prev.map((m, j) =>
                                          j === i ? { ...m, email } : m,
                                        ),
                                      );
                                    }}
                                    className="h-7 text-xs flex-1"
                                    placeholder="Email (optional, for one-click pay link)"
                                    type="email"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Create Group button */}
                          {splitGroupId ? (
                            <div className="space-y-3">
                              <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
                                <p className="text-xs font-semibold text-green-700 mb-1">
                                  ✅ Split group created! Slot held for 30
                                  minutes.
                                </p>
                                <p className="text-xs text-gray-500 break-all">
                                  {splitPayLink}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard
                                      .writeText(splitPayLink)
                                      .then(() => toast.success("Link copied!"))
                                      .catch(() =>
                                        toast.error("Could not copy link"),
                                      );
                                  }}
                                  className="mt-1 text-xs font-semibold text-green-700 hover:underline"
                                >
                                  Copy link
                                </button>
                              </div>

                              {/* One WhatsApp button per teammate (browsers block
                            multiple pop-ups opened automatically). */}
                              <div className="space-y-1.5">
                                {splitShares.slice(1).map((m, i) => (
                                  <div
                                    key={i}
                                    className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2"
                                  >
                                    <span className="text-xs font-medium truncate">
                                      {m.name} · ₹{m.amount}
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="h-7 border-green-600 text-green-700 hover:bg-green-50 text-xs shrink-0"
                                      onClick={() => openWhatsAppForMember(m)}
                                    >
                                      WhatsApp link
                                    </Button>
                                  </div>
                                ))}
                              </div>

                              <Button
                                asChild
                                className="w-full bg-green-600 hover:bg-green-700"
                              >
                                <Link href={`/split-pay/${splitGroupId}`}>
                                  Pay my share (₹
                                  {splitShares[0]?.amount ?? organizerShare}) →
                                </Link>
                              </Button>
                            </div>
                          ) : (
                            <Button
                              onClick={handleCreateSplitGroup}
                              disabled={
                                isCreatingSplitGroup ||
                                selectedSlots.length === 0
                              }
                              className="w-full bg-green-600 hover:bg-green-700 gap-2"
                            >
                              {isCreatingSplitGroup ? (
                                <>
                                  <Spinner className="w-4 h-4" /> Creating
                                  group...
                                </>
                              ) : (
                                "💸 Create Split Group & Block Slot"
                              )}
                            </Button>
                          )}

                          <p className="text-xs text-gray-400 text-center">
                            Slot is held for 30 minutes. Booking confirms when
                            all members pay.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    {/* Payment Button */}
                    {paymentMode === "full" && (
                      <Button
                        onClick={handleBooking}
                        disabled={
                          isLoading ||
                          !userDetails.name ||
                          !userDetails.email ||
                          !userDetails.phone
                        }
                        className="w-full bg-green-500 hover:bg-green-600 font-semibold py-6"
                        size="lg"
                      >
                        {isLoading ? (
                          <>
                            <Spinner className="animate-spin h-4 w-4 mr-2" />
                            Processing Payment...
                          </>
                        ) : (
                          `Pay ₹${totalPrice} & Confirm Booking`
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

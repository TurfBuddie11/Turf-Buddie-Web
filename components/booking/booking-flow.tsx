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

const ALL_POSSIBLE_SLOTS: Omit<TimeSlot, "price" | "isAvailable">[] =
  Array.from({ length: 13 }, (_, i) => {
    const hour = 9 + i;
    const startTime = `${String(hour).padStart(2, "0")}:00`;
    const endTime = `${String(hour + 1).padStart(2, "0")}:00`;
    return { id: `ts${String(hour).padStart(2, "0")}00`, startTime, endTime };
  });

// Convert 24h → 12h with AM/PM
const formatTo12Hour = (time24: string) => {
  const [hours, minutes] = time24.split(":").map(Number);
  if (isNaN(hours)) return "Invalid";
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""
    } ${period}`;
};

const getSlotLabel = (startTime: string, endTime: string) =>
  `${formatTo12Hour(startTime)} - ${formatTo12Hour(endTime)}`;

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
  const [loyaltyPoints, setLoyaltyPoints] = useState(0);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [splitInputValue, setSplitInputValue] = useState("2");
  const [teamMembers, setTeamMembers] = useState<{ phone: string; name: string; amount: number }[]>([]);
  const [customAmounts, setCustomAmounts] = useState<number[]>([]);
  const [splitGroupId, setSplitGroupId] = useState<string | null>(null);
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
    () => Math.max(0, Math.round(basePrice) - discount - couponDiscount + turf.price * 0.015),
    [basePrice, discount, couponDiscount, turf.price],
  );

  const perPersonPrice = useMemo(
    () => Math.ceil(totalPrice / splitCount),
    [totalPrice, splitCount],
  );

  const customTotal = useMemo(
    () => customAmounts.reduce((sum, a) => sum + a, 0),
    [customAmounts],
  );

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
    if (selectedSlots.length === 0 || !user) {
      toast.info(
        "Please select at least one slot and ensure you are logged in.",
      );
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
        splitCount,
      };

      const orderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPrice,
          bookingDetails: initialBookingData,
        }),
      });
      if (!orderResponse.ok) throw new Error("Failed to create payment order.");
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
    splitCount,
  ]);

  const handleCreateSplitGroup = useCallback(async () => {
    if (!user || selectedSlots.length === 0) {
      toast.info("Please select at least one slot and ensure you are logged in.");
      return;
    }

    setIsCreatingSplitGroup(true);
    try {
      const timeSlotLabels = selectedSlots.map((slot) =>
        getSlotLabel(slot.startTime, slot.endTime),
      );
      const day = dateObj.toLocaleDateString("en-US", { day: "numeric" });
      const month = dateObj.toLocaleDateString("en-US", { month: "short" });

      // Build members array: organizer first, then teammates
      const allMembers = [
        {
          name: userDetails.name || profile?.name || "Organizer",
          phone: userDetails.phone || profile?.mobile || "",
          amount: customAmounts[0] || perPersonPrice,
        },
        ...teamMembers.map((m, i) => ({
          name: m.name || `Player ${i + 2}`,
          phone: m.phone,
          amount: customAmounts[i + 1] || perPersonPrice,
        })),
      ];

      const res = await fetch("/api/split-payment/create-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turfId: turf.id,
          turfName: turf.name,
          timeSlots: timeSlotLabels,
          daySlot: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
          monthSlot: `${day} ${month}`,
          totalAmount: totalPrice,
          members: allMembers,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create split group");
      }

      const data = await res.json();
      setSplitGroupId(data.groupId);

      toast.success("Split group created! Slot blocked for 30 minutes.", {
        description: "Share the payment link with your teammates.",
      });

      // Send individual WhatsApp messages to each teammate
      allMembers.slice(1).forEach((member) => {
        if (member.phone) {
          const link = `${window.location.origin}/split-pay/${data.groupId}`;
          const msg = `🏟 Hey ${member.name}! ${userDetails.name || "Your friend"} has booked ${turf.name} on ${day} ${month}.\n💰 Your share: ₹${member.amount}\n🔗 Pay here: ${link}\n⏰ Please pay within 30 minutes to confirm the slot.`;
          window.open(
            `https://wa.me/${member.phone.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
            "_blank",
          );
        }
      });
    } catch (error) {
      toast.error("Failed to create split group", {
        description: error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsCreatingSplitGroup(false);
    }
  }, [user, selectedSlots, dateObj, turf, totalPrice, perPersonPrice, teamMembers, customAmounts, userDetails, profile]);

  const handleApplyCoupon = useCallback(async () => {
    if (!couponInput.trim()) return;
    if (!user) { setCouponError("Please login to apply a coupon."); return; }

    setCouponLoading(true);
    setCouponError("");
    setCouponMessage("");

    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ code: couponInput.trim().toUpperCase(), orderAmount: basePrice }),
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
                              {couponLoading ? <Spinner className="h-4 w-4" /> : "Apply"}
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
                          <p className="text-xs text-green-600 font-medium">✓ {couponMessage}</p>
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

                {/* Split 'n Pay */}
                <Card className="border-green-200 dark:border-green-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <span>Split &apos;n Pay</span>
                      <Badge variant="secondary" className="text-xs">Invite Friends</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Split count */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">Split between:</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={splitInputValue}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, "");
                            setSplitInputValue(raw);
                            const val = parseInt(raw);
                            if (!isNaN(val) && val >= 2 && val <= 30) {
                              setSplitCount(val);
                              setTeamMembers(Array.from({ length: val - 1 }, () => ({ phone: "", name: "", amount: 0 })));
                              setCustomAmounts(Array.from({ length: val }, () => perPersonPrice));
                            }
                          }}
                          className="w-16 rounded-lg border border-gray-300 dark:border-gray-600 px-2 py-1.5 text-sm font-bold text-center focus:outline-none focus:border-green-400 bg-white dark:bg-gray-800"
                        />
                        <span className="text-sm text-muted-foreground">people</span>
                      </div>
                      {(() => {
                        const val = parseInt(splitInputValue);
                        if (splitInputValue !== "" && (isNaN(val) || val < 2)) {
                          return <p className="text-xs text-red-500">Minimum 2 logon ke beech split karna zaroori hai</p>;
                        }
                        if (!isNaN(val) && val > 30) {
                          return <p className="text-xs text-red-500">Maximum 30 logon tak hi split kar sakte hain</p>;
                        }
                        return null;
                      })()}
                    </div>

                    {/* Per person amount */}
                    <div className="bg-green-50 dark:bg-green-950/20 rounded-xl p-3 flex justify-between items-center">
                      <span className="text-sm text-gray-600">₹{totalPrice} ÷ {splitCount} =</span>
                      <span className="font-bold text-green-700 text-lg">₹{perPersonPrice} each</span>
                    </div>

                    {/* Member inputs */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Add teammates</p>

                      {/* Organizer row (you) */}
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-green-50 border border-green-200">
                        <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                          {(profile?.name || userDetails.name || "Y").charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium flex-1 text-gray-800">
                          {profile?.name || userDetails.name || "You"} <span className="text-xs text-green-600">(Organizer)</span>
                        </span>
                        <span className="text-sm font-bold text-gray-900">₹{perPersonPrice}</span>
                      </div>

                      {teamMembers.map((member, i) => (
                        <div key={i} className="flex gap-2 items-center">
                          <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {member.name ? member.name.charAt(0).toUpperCase() : (i + 2)}
                          </div>
                          <Input
                            value={member.name}
                            onChange={(e) => {
                              const updated = [...teamMembers];
                              updated[i].name = e.target.value;
                              setTeamMembers(updated);
                            }}
                            className="h-8 text-xs flex-1"
                            placeholder={`Player ${i + 2} name`}
                          />
                          <Input
                            value={member.phone}
                            onChange={(e) => {
                              const updated = [...teamMembers];
                              updated[i].phone = e.target.value.replace(/\D/g, "").slice(0, 10);
                              setTeamMembers(updated);
                            }}
                            className="h-8 text-xs w-28"
                            placeholder="Phone"
                            type="tel"
                          />
                          <span className="text-xs font-bold text-gray-700 w-14 text-right shrink-0">
                            ₹{perPersonPrice}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Create Group button */}
                    {splitGroupId ? (
                      <div className="space-y-2">
                        <div className="rounded-xl bg-green-50 border border-green-200 p-3 text-center">
                          <p className="text-xs font-semibold text-green-700 mb-1">✅ Split group created! Share link with teammates:</p>
                          <p className="text-xs text-gray-500 break-all">
                            {typeof window !== "undefined" ? `${window.location.origin}/split-pay/${splitGroupId}` : ""}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full gap-2 border-green-600 text-green-700 hover:bg-green-50"
                          onClick={() => {
                            const link = `${window.location.origin}/split-pay/${splitGroupId}`;
                            const msg = `🏟 Hey! Pay your share for ${turf.name} on ${displayDate}.\n💰 Each person: ₹${perPersonPrice}\n🔗 Pay here: ${link}`;
                            window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                          }}
                        >
                          <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                          Send WhatsApp Payment Links
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleCreateSplitGroup}
                        disabled={isCreatingSplitGroup || selectedSlots.length === 0}
                        className="w-full bg-green-600 hover:bg-green-700 gap-2"
                      >
                        {isCreatingSplitGroup ? (
                          <><Spinner className="w-4 h-4" /> Creating group...</>
                        ) : (
                          "💸 Create Split Group & Block Slot"
                        )}
                      </Button>
                    )}

                    <p className="text-xs text-gray-400 text-center">
                      Slot is held for 30 minutes. Booking confirms when all members pay.
                    </p>
                  </CardContent>
                </Card>

                {/* Payment Button */}
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

                {!user && (
                  <p className="text-center text-sm text-muted-foreground">
                    Please login to complete your booking
                  </p>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}

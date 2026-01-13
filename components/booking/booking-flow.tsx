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
  return `${hours12}${
    minutes ? `:${String(minutes).padStart(2, "0")}` : ""
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
    () => Math.max(0, Math.round(basePrice) - discount + turf.price * 0.015),
    [basePrice, discount, turf.price],
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
  ]);

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

                      <Separator />
                      {redeemPoints && (
                        <div className="flex justify-between text-sm font-bold">
                          <span>Loyalty Points Discount</span>
                          <span>-₹{discount}</span>
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

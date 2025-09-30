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
  IndianRupee,
  Zap,
} from "lucide-react";
import { Turf, TimeSlot, Booking } from "@/lib/types/booking";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-provider";
import { initiatePayment, verifyPayment } from "@/lib/razorpay/payment";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

// --- MASTER LIST OF ALL POSSIBLE TIME SLOTS ---
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
    () => Math.max(0, basePrice - discount),
    [basePrice, discount],
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
          // If already selected, remove it
          return prevSelected.filter((s) => s.id !== slot.id);
        } else {
          // If not selected, add it and sort for a clean display
          return [...prevSelected, slot].sort((a, b) =>
            a.startTime.localeCompare(b.startTime),
          );
        }
      });
    },
    [],
  );

  const handleBooking = useCallback(async () => {
    if (selectedSlots.length === 0 || !user || !profile) {
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

      const initialBookingData = {
        turfId: turf.id,
        timeSlots: timeSlotLabels, // Array of time slots
        daySlot: dateObj.toLocaleDateString("en-US", { weekday: "long" }),
        monthSlot: dateObj.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
        }),
        userUid: user.uid,
        status: "pending" as const,
        paid: "Not Paid to Owner" as const,
      };

      const orderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: totalPrice, // Use calculated total price
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
          name: profile.name,
          email: profile.email,
          contact: profile.mobile || "",
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
      setSelectedSlots([]); // Reset selection array

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
    profile,
    turf.id,
    dateObj,
    onBookingComplete,
    totalPrice,
    redeemPoints,
    loyaltyPoints,
  ]);

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {" "}
      {/* Increased bottom padding for mobile to clear fixed footer */}
      {/* 1. Turf Info Card: Enhanced for readability */}
      <Card className="bg-slate-900 border-slate-700 shadow-xl">
        <CardHeader className="py-4 px-5 sm:px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-white text-xl font-extrabold">
                {turf.name}
              </CardTitle>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-300">
                <span className="flex items-center text-yellow-400 font-semibold">
                  <Star className="w-4 h-4 mr-1 fill-yellow-400" />
                  {turf.rating?.toFixed(1) ?? "N/A"} Rating
                </span>
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1 text-slate-400" />
                  {turf.address}
                </span>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-green-400 to-lime-500 text-black font-extrabold text-md px-4 py-2 shrink-0 self-start sm:self-auto">
              ₹{turf.price}/hr
            </Badge>
          </div>
        </CardHeader>
      </Card>
      {/* 2. Time Slot Selector: Responsive Grid */}
      <Card className="bg-slate-900 border-slate-700 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white flex items-center text-lg sm:text-xl">
            <Calendar className="w-5 h-5 mr-2 text-green-400" /> Select Time
            Slot(s)
          </CardTitle>
          <p className="text-sm text-slate-400 pt-1">{displayDate}</p>
        </CardHeader>
        <CardContent>
          {isFetchingSlots ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-4 border-green-400" />
            </div>
          ) : (
            <>
              {/* CHANGE: Responsive grid for slots */}
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
                        // Base Style
                        "bg-slate-800 border-slate-700 hover:border-green-400",
                        // Booked Style
                        isBooked
                          ? "bg-slate-900/50 border-slate-800 text-slate-500"
                          : "text-white",
                        // Selected Style
                        isSelected &&
                          !isBooked &&
                          "bg-green-500/20 border-green-400 ring-2 ring-green-400 hover:bg-green-500/30",
                      )}
                    >
                      <p className="font-semibold text-sm sm:text-base">
                        {label}
                      </p>
                      <p className="text-xs text-green-400">
                        {isBooked ? "BOOKED" : `₹${turf.price}`}
                      </p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm border-t border-slate-700 pt-4">
                <span className="flex items-center gap-2 text-slate-300">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="font-bold">{availableSlotsCount}</span>{" "}
                  Available
                </span>
                <span className="flex items-center gap-2 text-slate-300">
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
      {/* 3. Booking Summary: Cleaned up for single-column desktop display */}
      {selectedSlots.length > 0 && (
        <Card className="bg-slate-900 border-slate-700 shadow-xl">
          <CardHeader className="pb-3">
            <CardTitle className="text-white flex items-center text-lg sm:text-xl">
              <IndianRupee className="w-5 h-5 mr-2 text-yellow-400" /> Price
              Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-b border-slate-800 pb-3 space-y-3">
              {/* Base Price Row */}
              <div className="flex justify-between items-center text-slate-300 text-base">
                <span className="text-slate-400">
                  {selectedSlots.length} Slot(s) @ ₹{turf.price}/hr
                </span>
                <span className="font-medium">₹{basePrice}</span>
              </div>
              {/* Loyalty Checkbox Row */}
              <div className="flex items-center space-x-2 p-3 bg-slate-800 rounded-lg">
                <Checkbox
                  id="redeem"
                  checked={redeemPoints}
                  onCheckedChange={() => setRedeemPoints(!redeemPoints)}
                  className="border-green-400 data-[state=checked]:bg-green-500 data-[state=checked]:text-black"
                />
                <label
                  htmlFor="redeem"
                  className="text-sm font-medium leading-none text-slate-300 cursor-pointer"
                >
                  Redeem **{loyaltyPoints} points** for -₹{discount} Discount
                </label>
              </div>
            </div>

            {/* Total Row */}
            <div className="flex justify-between items-center">
              <span className="text-white text-lg font-bold flex items-center">
                <Zap className="w-5 h-5 mr-2 text-green-400" /> Final Total
              </span>
              <span className="font-extrabold text-green-400 text-xl">
                ₹{totalPrice}
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      {/* 4. Fixed Booking Button Footer: Essential for Mobile UX */}
      {selectedSlots.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/90 backdrop-blur-md border-t border-slate-700 p-4 md:static md:bg-transparent md:backdrop-blur-none md:border-none md:p-0 md:mt-6">
          <Button
            onClick={handleBooking}
            className="w-full h-12 bg-green-500 hover:bg-green-600 text-black text-md font-extrabold shadow-xl"
            disabled={isLoading || !user}
          >
            {isLoading ? "Processing..." : `Pay ₹${totalPrice} & Book Now`}
          </Button>
          {!user && (
            <p className="text-center text-red-400 text-xs mt-2 md:hidden">
              Please login to continue booking.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

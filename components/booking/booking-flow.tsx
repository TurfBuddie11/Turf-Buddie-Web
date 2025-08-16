"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Star, CheckCircle, XCircle } from "lucide-react";
import { Turf, TimeSlot, Booking } from "@/lib/types/booking";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-provider";
import { initiatePayment, verifyPayment } from "@/lib/razorpay/payment";
import { cn } from "@/lib/utils";

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
  const [selectedSlot, setSelectedSlot] = useState<Omit<
    TimeSlot,
    "price" | "isAvailable"
  > | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [isFetchingSlots, setIsFetchingSlots] = useState(true);
  const { user, profile } = useAuth();

  const dateObj = useMemo(() => new Date(selectedDate), [selectedDate]);
  const displayDate = useMemo(
    () =>
      dateObj.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    [dateObj]
  );

  // Fetch Booked Slots
  useEffect(() => {
    setSelectedSlot(null);
    const fetchBookedSlots = async () => {
      setIsFetchingSlots(true);
      try {
        const response = await fetch(
          `/api/turfs/${turf.id}/bookings?date=${selectedDate}`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch booking data.");
        }
        const data = await response.json();

        // --- FIX 1: Simplified and robust data processing ---
        // Directly create a Set from the trimmed API response
        const normalized = new Set<string>(
          (data.bookedSlots || []).map((slot: string) => slot.trim())
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

  // --- FIX 2: Correctly calculate available slots using the 12-hour format ---
  const availableSlotsCount = useMemo(() => {
    return ALL_POSSIBLE_SLOTS.filter(
      (slot) => !bookedSlots.has(getSlotLabel(slot.startTime, slot.endTime))
    ).length;
  }, [bookedSlots]);

  const handleBooking = useCallback(async () => {
    if (!selectedSlot || !user || !profile) {
      toast.info("Please select a slot and ensure you are logged in.");
      return;
    }

    setIsLoading(true);
    try {
      const orderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: turf.price }),
      });
      if (!orderResponse.ok) throw new Error("Failed to create payment order.");
      const { orderId, amount } = await orderResponse.json();

      const commission = Number((turf.price * 0.094).toFixed(3));
      const daySlot = dateObj.toLocaleDateString("en-US", { weekday: "long" });
      const monthSlot = dateObj.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
      });

      const bookingData = {
        turfId: turf.id,
        timeSlot: getSlotLabel(selectedSlot.startTime, selectedSlot.endTime),
        daySlot,
        monthSlot,
        price: turf.price,
        commission,
        payout: Number((turf.price - commission).toFixed(3)),
        userUid: user.uid,
        status: "pending" as const,
        paid: "Not Paid to Owner" as const,
      };

      const { paymentId, signature } = await initiatePayment({
        amount: amount.toString(),
        currency: "INR",
        orderId,
        userDetails: {
          name: profile.fullname,
          email: profile.email,
          contact: profile.mobile,
        },
        bookingDetails: bookingData,
      });

      const { booking } = await verifyPayment(paymentId, orderId, signature, {
        ...bookingData,
        transactionId: paymentId,
      });

      toast.success("Booking Confirmed!", {
        description: "Your turf has been booked successfully.",
      });

      // --- FIX 3: Update local state with the correct 12-hour format ---
      setBookedSlots((prev) =>
        new Set(prev).add(
          getSlotLabel(selectedSlot.startTime, selectedSlot.endTime)
        )
      );
      setSelectedSlot(null);

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
    selectedSlot,
    user,
    profile,
    turf.id,
    turf.price,
    dateObj,
    onBookingComplete,
  ]);

  return (
    <div className="space-y-6">
      {/* Turf Info */}
      <Card className="bg-slate-900/70 border-slate-800 backdrop-blur">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-white">{turf.name}</CardTitle>
              <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-300">
                <span className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-400 mr-1" />
                  {turf.rating?.toFixed(1) ?? "N/A"}
                </span>
                <span className="flex items-center">
                  <MapPin className="w-4 h-4 mr-1" />
                  {turf.address}
                </span>
              </div>
            </div>
            <Badge className="bg-gradient-to-r from-green-400 to-lime-500 text-black font-semibold shadow-md px-3 py-1.5 shrink-0">
              ₹{turf.price}/hr
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Time Slot Selector */}
      <Card className="bg-slate-900/70 border-slate-800 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Calendar className="w-5 h-5 mr-2" /> Select a Time Slot
          </CardTitle>
          <p className="text-sm text-slate-300 pt-1">{displayDate}</p>
        </CardHeader>
        <CardContent>
          {isFetchingSlots ? (
            <div className="flex items-center justify-center h-48">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-400" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {ALL_POSSIBLE_SLOTS.map((slot) => {
                  const isBooked = bookedSlots.has(
                    getSlotLabel(slot.startTime, slot.endTime)
                  );
                  const isSelected = selectedSlot?.id === slot.id;
                  return (
                    <button
                      key={slot.id}
                      disabled={isBooked}
                      onClick={() => setSelectedSlot(slot)}
                      className={cn(
                        "p-3 rounded-lg border text-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed",
                        isBooked
                          ? "bg-slate-800/50 border-slate-700 text-slate-500"
                          : "bg-slate-800/80 border-slate-700 hover:border-green-400 hover:bg-green-500/10",
                        isSelected &&
                          !isBooked &&
                          "bg-green-500/20 border-green-400 ring-2 ring-green-400"
                      )}
                    >
                      <p className="font-semibold text-white">
                        {getSlotLabel(slot.startTime, slot.endTime)}
                      </p>
                      <p className="text-xs text-green-300">₹{turf.price}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-sm border-t border-slate-700 pt-4">
                <span className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  {availableSlotsCount} Available
                </span>
                <span className="flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-red-400" />
                  {ALL_POSSIBLE_SLOTS.length - availableSlotsCount} Booked
                </span>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Booking Summary */}
      {selectedSlot && (
        <Card className="bg-slate-900/70 border-slate-800 backdrop-blur sticky bottom-6">
          <CardHeader>
            <CardTitle className="text-white">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 text-slate-300 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-slate-400">Time Slot</span>
                <span className="font-medium">
                  {getSlotLabel(selectedSlot.startTime, selectedSlot.endTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Amount</span>
                <span className="font-semibold text-white">₹{turf.price}</span>
              </div>
            </div>
            <Button
              onClick={handleBooking}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-semibold"
              disabled={isLoading || !user}
            >
              {isLoading ? "Processing..." : `Pay ₹${turf.price} & Book Now`}
            </Button>
            {!user && (
              <p className="text-center text-slate-400 text-xs mt-2">
                Please login to continue
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

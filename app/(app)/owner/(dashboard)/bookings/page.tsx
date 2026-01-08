"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTurf, TimeSlot } from "@/context/turf-context";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BadgeCheckIcon,
  UserCircle,
  CalendarDays,
  Clock,
  CircleDollarSign,
  AlertCircle,
  PlusCircle,
  Trash2,
  ChevronRight,
} from "lucide-react";

// Master list of time slots to match your BookingFlow
const TIME_SLOTS = [
  "9 AM - 10 AM",
  "10 AM - 11 AM",
  "11 AM - 12 PM",
  "12 PM - 1 PM",
  "1 PM - 2 PM",
  "3 PM - 4 PM",
  "4 PM - 5 PM",
  "5 PM - 6 PM",
  "6 PM - 7 PM",
  "7 PM - 8 PM",
  "8 PM - 9 PM",
  "9 PM - 0 PM",
];

export default function BookingsPage() {
  const {
    bookings,
    getBookings,
    selectedTurf,
    addOfflineBooking,
    deleteOfflineBooking,
  } = useTurf();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [filter, setFilter] = useState("all");
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [manualSlot, setManualSlot] = useState("");
  const [manualPrice, setManualPrice] = useState(0);

  useEffect(() => {
    if (selectedTurf?.price) setManualPrice(selectedTurf.price);
  }, [selectedTurf, isDialogOpen]);

  useEffect(() => {
    if (selectedTurf?.id) getBookings();
  }, [selectedTurf?.id, getBookings]);

  useEffect(() => {
    const fetchNames = async () => {
      const uniqueUids = Array.from(
        new Set(bookings.map((b) => b.userUid).filter(Boolean)),
      ) as string[];
      const newNames: Record<string, string> = { ...userNames };
      let changed = false;

      for (const uid of uniqueUids) {
        if (uid && !newNames[uid]) {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            newNames[uid] = userDoc.exists()
              ? userDoc.data()?.name || "Guest User"
              : "Guest User";
            changed = true;
          } catch {
            newNames[uid] = "User";
            changed = true;
          }
        }
      }
      if (changed) setUserNames(newNames);
    };
    if (bookings.length > 0) fetchNames();
  }, [bookings]);

  const toDate = useCallback(
    (
      ts: Timestamp | { seconds: number; nanoseconds: number } | Date | null,
    ): Date => {
      if (!ts) return new Date();
      if (ts instanceof Date) return ts;
      if ("toDate" in ts && typeof ts.toDate === "function") return ts.toDate();
      return new Date(ts.seconds * 1000);
    },
    [],
  );

  const handleManualSubmit = async () => {
    if (!date || !manualSlot) return;
    const day = date.getDate();
    const month = date.toLocaleString("default", { month: "short" });

    await addOfflineBooking({
      timeSlot: manualSlot,
      price: Number(manualPrice),
      bookingDate: date,
      daySlot: date.toLocaleDateString("en-US", { weekday: "long" }),
      monthSlot: `${day} ${month}`,
      userUid: "offline_admin",
    });

    setIsDialogOpen(false);
    setManualSlot("");
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((slot: TimeSlot) => {
      const status = slot.status?.toLowerCase();
      if (filter === "online" && status === "booked_offline") return false;
      if (filter === "offline" && status !== "booked_offline") return false;
      return status === "confirmed" || status === "booked_offline";
    });
  }, [bookings, filter]);

  const { selectedDateBookings, upcomingBookings } = useMemo(() => {
    if (!date) return { selectedDateBookings: [], upcomingBookings: [] };

    const calendarDateStr = date.toDateString();
    const calendarSlotStr = `${date.getDate()} ${date.toLocaleString("default", { month: "short" })}`;

    const onDate: TimeSlot[] = [];
    const upcoming: TimeSlot[] = [];

    filteredBookings.forEach((b) => {
      const bDate = toDate(b.bookingDate);
      const isSameDay =
        bDate.toDateString() === calendarDateStr ||
        b.monthSlot === calendarSlotStr;

      if (isSameDay) {
        onDate.push(b);
      } else if (bDate > date) {
        upcoming.push(b);
      }
    });

    return {
      selectedDateBookings: onDate.sort((a, b) =>
        a.timeSlot.localeCompare(b.timeSlot),
      ),
      upcomingBookings: upcoming.sort(
        (a, b) =>
          toDate(a.bookingDate).getTime() - toDate(b.bookingDate).getTime(),
      ),
    };
  }, [filteredBookings, date, toDate]);

  // Logic to find available slots for the select dropdown
  const availableOptions = useMemo(() => {
    const bookedTimesOnThisDay = selectedDateBookings.map((b) => b.timeSlot);
    return TIME_SLOTS.filter((slot) => !bookedTimesOnThisDay.includes(slot));
  }, [selectedDateBookings]);

  const renderBookingItem = (slot: TimeSlot, isUpcoming = false) => {
    const isOffline = slot.status?.toLowerCase() === "booked_offline";
    const displayName = isOffline
      ? "Offline Booking"
      : userNames[slot.userUid || ""] ||
        `User: ${slot.userUid?.slice(0, 5)}...`;

    return (
      <Card
        key={`${slot.timeSlot}-${slot.monthSlot}-${Math.random()}`}
        className={`overflow-hidden border-l-4 ${isUpcoming ? "border-l-slate-300" : "border-l-primary"} shadow-sm hover:shadow-md transition-shadow`}
      >
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="flex items-start gap-3 flex-1">
              <UserCircle
                className={`${isUpcoming ? "text-slate-400" : "text-primary"} size-10 mt-1 opacity-40 hidden sm:block`}
              />
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-base text-slate-800">
                    {displayName}
                  </h4>
                  {isOffline ? (
                    <Badge
                      variant="outline"
                      className="text-[10px] uppercase font-bold text-slate-500"
                    >
                      Manual
                    </Badge>
                  ) : (
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-green-100 text-green-700 border-none"
                    >
                      <BadgeCheckIcon className="mr-1 h-3 w-3" /> Verified
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-1 mt-2 text-sm text-muted-foreground font-medium">
                  <div className="flex items-center gap-2">
                    <Clock className="size-3" /> {slot.timeSlot}
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-3" /> {slot.monthSlot} •{" "}
                    {slot.daySlot}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-0">
              <div className="text-right mr-4">
                <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                  Amount
                </p>
                <p
                  className={`text-lg font-bold ${isUpcoming ? "text-slate-600" : "text-primary"}`}
                >
                  ₹{(slot.payout ?? slot.price).toLocaleString()}
                </p>
              </div>
              {isOffline && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => deleteOfflineBooking(slot)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen  pb-10">
      <div className="container max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight ">
              Turf Bookings
            </h1>
            <p className="text-sm text-muted-foreground font-medium">
              Manage your schedule and activity.
            </p>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="font-bold gap-2 bg-primary hover:bg-primary/90">
                <PlusCircle className="size-4" /> Book Manually
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-106.5">
              <DialogHeader>
                <DialogTitle>Add Offline Booking</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Selected Date</Label>
                  <Input
                    value={date?.toDateString()}
                    disabled
                    className="bg-slate-50 font-semibold"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Time Slot</Label>
                  <Select onValueChange={setManualSlot} value={manualSlot}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableOptions.length > 0 ? (
                        availableOptions.map((slot) => (
                          <SelectItem key={slot} value={slot}>
                            {slot}
                          </SelectItem>
                        ))
                      ) : (
                        <p className="text-xs p-2 text-center text-muted-foreground">
                          No slots available for this date
                        </p>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Price (₹)</Label>
                  <Input
                    type="number"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(Number(e.target.value))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleManualSubmit}
                  disabled={!manualSlot || availableOptions.length === 0}
                >
                  Confirm Booking
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mb-6">
          <Tabs defaultValue="all" className="w-full" onValueChange={setFilter}>
            <TabsList className="grid grid-cols-3 border h-12 shadow-sm max-w-sm">
              <TabsTrigger
                value="all"
                className="font-bold dark:text-white text-black"
              >
                All
              </TabsTrigger>
              <TabsTrigger
                value="online"
                className="font-bold dark:text-white text-black"
              >
                Online
              </TabsTrigger>
              <TabsTrigger
                value="offline"
                className="font-bold dark:text-white text-black"
              >
                Offline
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-4 space-y-4">
            <Card className="shadow-md border-none ">
              <CardContent className="p-4 flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  className="rounded-md"
                />
              </CardContent>
            </Card>
            <Card className=" border-none shadow-lg">
              <CardContent className="px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 font-semibold">
                  <CircleDollarSign className="size-6 " />
                  <span className="text-sm">Revenue for Selected Day</span>
                </div>
                <span className="text-2xl font-black">
                  ₹
                  {selectedDateBookings
                    .reduce((sum, b) => sum + (b.payout || b.price), 0)
                    .toLocaleString()}
                </span>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-8 space-y-10">
            <section>
              <div className="flex items-center gap-3 mb-5 px-1">
                <div className="h-3 w-3 rounded-full  animate-pulse shadow-[0_0_8px_rgba(var(--primary),0.6)]" />
                <h2 className="text-xl font-black  uppercase tracking-tight">
                  {date?.toDateString() === new Date().toDateString()
                    ? "Today's Schedule"
                    : `${date?.toLocaleDateString("en-GB", { day: "numeric", month: "long" })}`}
                </h2>
              </div>
              <div className="space-y-4">
                {selectedDateBookings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 rounded-2xl border-2 border-dashed border-slate-200">
                    <AlertCircle className="size-10  mb-2" />
                    <p className=" font-bold">No slots booked for this day</p>
                  </div>
                ) : (
                  selectedDateBookings.map((slot) =>
                    renderBookingItem(slot, false),
                  )
                )}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-5 px-1">
                <h2 className="text-lg font-bold  flex items-center gap-2 uppercase tracking-widest">
                  Upcoming Bookings <ChevronRight className="size-4" />
                </h2>
                <Badge variant="outline">{upcomingBookings.length} Slots</Badge>
              </div>
              <div className="space-y-4">
                {upcomingBookings.length === 0 ? (
                  <p className="text-sm  italic text-center py-4">
                    No future bookings found.
                  </p>
                ) : (
                  upcomingBookings
                    .slice(0, 8)
                    .map((slot) => renderBookingItem(slot, true))
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, ChevronDownIcon } from "lucide-react";
import { BookingFlow } from "@/components/booking/booking-flow";
import { Turf } from "@/lib/types/booking";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { addMonths, format, startOfDay } from "date-fns";
import { useRouter } from "next/navigation";

interface TurfDetailsClientProps {
  turf: Turf;
  localDate: string;
}

const HERO_ANIMATION = {
  initial: { opacity: 0, y: -20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

const BOOKING_CARD_ANIMATION = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6, delay: 0.2 },
};

export default function TurfDetailsClient({
  turf,
  localDate,
}: TurfDetailsClientProps) {
  const [date, setDate] = useState<Date | undefined>(
    localDate ? new Date(localDate) : undefined,
  );
  const [open, setOpen] = useState(false);
  const today = startOfDay(new Date());
  const oneMonthLater = addMonths(today, 1);

  const router = useRouter();

  return (
    <div className=" min-h-screen overflow-hidden">
      <div className="max-w-7xl mx-auto mt-8">
        {/* 1. Hero Image Section */}
        <motion.div
          {...HERO_ANIMATION}
          className="relative w-full h-[45vh] sm:h-[60vh] overflow-hidden shadow-xl rounded-2xl" // Removed rounded-2xl to allow full width
        >
          <Image
            src={turf.imageurl}
            alt={turf.name}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="pointer-events-none absolute dark:bg-black/20 inset-0" />

          {/* Back Button */}
          <Button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="absolute top-6 left-6 z-10 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md  font-medium hover:bg-white/30 transition"
          >
            <ArrowLeft size={20} aria-hidden="true" />
          </Button>

          {/* Turf Name Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-8">
            <h1 className="text-2xl text-white font-extrabold  drop-shadow-lg">
              {turf.name}
            </h1>
            <p className="text-lg text-white  font-medium">{turf.address}</p>
          </div>
        </motion.div>

        {/* 2. Booking Card & Details Section (Overlap) */}
        <motion.div
          {...BOOKING_CARD_ANIMATION}
          // Negative margin to pull the card up and over the image boundary
          className=" mt-4 max-w-7xl  bg-card-background rounded-2xl shadow-2xl  p-6 max-sm:p-1 sm:p-8 space-y-8"
        >
          <div className="grid grid-cols-1 gap-8">
            {/* Booking Column (Lg: 1/3 width) */}
            <div className="lg:col-span-1 space-y-6  lg:pr-8 border-gray-100 dark:border-gray-700">
              <h2 className="text-2xl font-bold ">Reserve Your Slot</h2>

              {/* Date Picker (Full width for better mobile experience) */}
              <div className="flex flex-col gap-2">
                <Label htmlFor="date" className="font-semibold">
                  Select Date
                </Label>
                <Popover open={open} onOpenChange={setOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      id="date"
                      className="w-full justify-between font-normal border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark: hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {date ? date.toLocaleDateString() : "Select date"}
                      <ChevronDownIcon size={18} className="text-indigo-600" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 z-50" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      captionLayout="dropdown"
                      defaultMonth={today}
                      disabled={{ before: today, after: oneMonthLater }}
                      onSelect={(newDate) => {
                        setDate(newDate || undefined);
                        setOpen(false);
                      }}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <BookingFlow
                turf={turf}
                selectedDate={date ? format(date, "yyyy-MM-dd") : localDate}
                onBookingComplete={(booking) => {}}
              />

              {/* Booking Flow (Time Slot/Duration/Payment) */}
            </div>
          </div>
        </motion.div>

        {/* Space at the bottom */}
        <div className="h-20" />
      </div>
    </div>
  );
}

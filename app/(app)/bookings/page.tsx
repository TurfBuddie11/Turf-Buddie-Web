"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-provider";
import { db } from "@/lib/firebase/config";
import { Booking, Turf } from "@/lib/types/booking";
import { collection, getDocs } from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";

type BookingWithTurf = Booking &
  Pick<Turf, "name" | "imageurl" | "address" | "price" | "rating">;

export default function BookingPage() {
  const [bookings, setBookings] = useState<BookingWithTurf[]>([]);
  const { user } = useAuth();

  const shouldReduceMotion = useReducedMotion();

  useEffect(() => {
    const getBookings = async () => {
      try {
        const turfDocs = await getDocs(collection(db, "Turfs"));
        const userBookings: BookingWithTurf[] = [];

        turfDocs.forEach((turfDoc) => {
          const turfData = turfDoc.data();
          const turf = turfDoc.data();
          const timeSlots: Booking[] = turfData?.timeSlots || [];

          console.log(turf.image);

          timeSlots.forEach((slot) => {
            if (slot.userUid === user?.uid) {
              userBookings.push({
                ...slot,
                name: turf.name,
                imageurl: turf.imageurl,
                address: turf.address,
                rating: turf.rating,
              });
            }
          });
        });

        setBookings(userBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
      }
    };

    if (user?.uid) {
      getBookings();
    }
  }, [user?.uid]);

  const formatINR = (v: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(v);

  return (
    <div className="min-h-screen px-4">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
        >
          <h1 className="text-4xl tracking-tight font-bold mt-10">
            My Bookings
          </h1>
        </motion.div>
      </div>
      {bookings.length === 0 && (
        <div className=" container flex min-h-screen flex-col items-center justify-center text-center px-4">
          <div className="text-5xl mb-4">📭</div>
          <h2 className="text-2xl font-bold ">No Bookings Yet</h2>
          <p className=" mt-2 max-w-md">
            Looks like you haven’t booked a turf yet. Explore available slots
            and make your first booking to get started!
          </p>
        </div>
      )}

      <motion.div className="max-w-7xl mx-auto">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-6">
          {bookings.length !== 0 &&
            bookings.map((t, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.05,
                  duration: shouldReduceMotion ? 0 : 0.4,
                }}
              >
                <Card key={t.id} className="glass-card overflow-hidden ">
                  <div key={t.id} className="relative h-44 w-full">
                    {t.imageurl && (
                      <Image
                        src={t.imageurl}
                        alt={`Image of ${t.imageurl}`}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <CardContent key={t.id} className="p-4 space-y-2">
                    <div key={t.id} className="flex justify-between">
                      <div key={t.id}>
                        <h3 className="text-lg font-semibold">{t.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t.address.length > 50
                            ? `${t.address.slice(0, 50)}...`
                            : t.address}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {t.rating.toFixed(1)}
                      </span>
                    </div>
                    <div
                      key={t.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <div key={t.id}>
                        <span className="font-medium">
                          {formatINR(t.price)}
                        </span>{" "}
                        <span className="text-muted-foreground">/ hour</span>
                      </div>
                    </div>
                    <div
                      key={t.id}
                      className="flex justify-between items-center text-sm"
                    >
                      <div>
                        <span className="font-medium">{t.timeSlot}</span>{" "}
                        <span className="text-muted-foreground">
                          {t.daySlot}
                        </span>{" "}
                        <span className="text-muted-foreground">
                          {t.monthSlot}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
        </div>
      </motion.div>
    </div>
  );
}

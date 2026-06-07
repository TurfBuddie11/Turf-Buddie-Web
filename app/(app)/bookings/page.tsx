"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/context/auth-provider";
import { db } from "@/lib/firebase/config";
import { Booking, Turf } from "@/lib/types/booking";
import { collection, getDocs } from "firebase/firestore";
import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";
import React, { useEffect, useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";

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
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
        >
          <h1 className="text-3xl font-bold">
            My Bookings
          </h1>
        </motion.div>

        {bookings.length === 0 ? (
          <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="text-2xl font-bold">No Bookings Yet</h2>
            <p className="mt-2 max-w-md text-muted-foreground">
              You haven&apos;t booked a turf yet. Explore available slots and make your first booking!
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.length !== 0 &&
            bookings.map((t, i) => (
              <motion.div
                key={t.transactionId || i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: i * 0.05,
                  duration: shouldReduceMotion ? 0 : 0.4,
                }}
              >
                <Card className="glass-card overflow-hidden">
                  <div className="relative h-44 w-full">
                    {t.imageurl && (
                      <SafeImage
                        src={t.imageurl}
                        alt={`Image of ${t.name}`}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{t.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t.address && t.address.length > 50
                            ? `${t.address.slice(0, 50)}...`
                            : t.address}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                        {t.rating?.toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <div>
                        <span className="font-medium">
                          {formatINR(t.price)}
                        </span>{" "}
                        <span className="text-muted-foreground">/ hour</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-sm">
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
        )}
      </div>
    </div>
  );
}

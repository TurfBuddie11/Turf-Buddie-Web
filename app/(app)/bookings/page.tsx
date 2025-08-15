"use client";

import { useAuth } from "@/context/auth-provider";
import { db } from "@/lib/firebase/config";
import { Booking, Turf } from "@/lib/types/booking";
import { collection, getDocs } from "firebase/firestore";
import React, { useEffect, useState } from "react";

export default function BookingPage() {
  const [bookings, setBookings] = useState<
    Array<Booking & { turfName: string }>
  >([]);
  const { user } = useAuth();

  useEffect(() => {
    const getBookings = async () => {
      try {
        const turfDocs = await getDocs(collection(db, "Turfs"));
        const userBookings: Array<Booking & { turfName: string }> = [];

        turfDocs.forEach((turfDoc) => {
          const turfData = turfDoc.data();
          const turf = turfDoc.data() as Turf;
          const timeSlots: Booking[] = turfData?.timeSlots || [];

          timeSlots.forEach((slot) => {
            if (slot.userUid === user?.uid) {
              userBookings.push({
                ...slot,
                turfName: turf.name,
                turfId: turfDoc.id,
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

  return (
    <div className="flex min-h-screen  justify-center">
      <div className="mt-12">
        <h1>My Bookings</h1>
      </div>
      <div>
        {bookings.length === 0 ? (
          <p>No bookings found.</p>
        ) : (
          bookings.map((booking, index) => (
            <div key={index}>
              <h3>{booking.turfName}</h3>
              <p>Date: {booking.createdAt?.toString()}</p>
              <p>Time: {booking.timeSlot}</p>
              <p>Status: {booking.status}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

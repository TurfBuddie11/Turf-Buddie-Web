"use client";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Item,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import { BadgeCheckIcon, UserCircle } from "lucide-react";
import React, { useState } from "react";

export default function BookingsPage() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  return (
    <div className="container max-w-7xl mx-auto">
      <section className="p-6">
        <h3 className="text-3xl font-bold">Bookings</h3>
        <p>Manage your turf processBookingTransaction</p>

        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          className="rounded-lg border shadow-sm mt-10 w-[350px]  mx-auto"
        />
      </section>
      <section className="p-6">
        <div className="text-lg font-semibold">
          Selected Date: {date?.toLocaleDateString()}
        </div>
        <div className="mt-4">
          <div className="text-2xl font-bold">Upcoming Bookings</div>
        </div>
        <div className="pt-6">
          <Item className="bg-card flex  p-4 shadow-sm">
            <ItemHeader className="flex justify-between">
              <div className="flex items-center gap-4">
                <UserCircle className="text-primary rounded-full size-8" />
                <div>
                  <div className="flex items-center gap-4">
                    <ItemTitle className="text-xl font-semibold">
                      User Name
                    </ItemTitle>
                  </div>
                  <ItemDescription>10:00 AM- 11:00</ItemDescription>
                </div>
              </div>
              <div>
                <Badge variant="secondary">
                  <BadgeCheckIcon />
                  Verified
                </Badge>
              </div>
            </ItemHeader>
          </Item>
        </div>
      </section>
    </div>
  );
}

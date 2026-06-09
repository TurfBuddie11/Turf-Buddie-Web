"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

import {
  Calendar,
  IndianRupee,
  MapPin,
  PlusCircle,
  TrendingUp,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import Link from "next/link";
import { useTurf } from "@/context/turf-context";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function DashboardPage() {
  const { turfs, selectedTurf, setSelectedTurf, bookings, getBookings } =
    useTurf();
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Morning");
    else if (hour < 17) setGreeting("Afternoon");
    else setGreeting("Evening");
  }, []);

  useEffect(() => {
    if (selectedTurf?.id) {
      getBookings();
    }
  }, [selectedTurf?.id, getBookings]);

  // --- STATS LOGIC ---
  const { todaysBookingsCount, earnings } = useMemo(() => {
    const today = new Date().toDateString();

    const filtered = bookings.filter((b) => {
      const bDate = new Date(b.bookingDate?.seconds * 1000).toDateString();
      const status = b.status?.toLowerCase();
      return (
        bDate === today &&
        (status === "confirmed" || status === "booked_offline")
      );
    });

    const totalEarnings = filtered.reduce(
      (sum, b) => sum + (b.payout ?? b.price ?? 0),
      0,
    );

    return {
      todaysBookingsCount: filtered.length,
      earnings: totalEarnings,
    };
  }, [bookings]);

  // --- CHART LOGIC ---
  const chartData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = Object.fromEntries(days.map((d) => [d, 0]));

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    bookings.forEach((b) => {
      const bTimestamp = b.bookingDate?.seconds * 1000;
      const bDate = new Date(bTimestamp);
      const status = b.status?.toLowerCase();

      if (
        bTimestamp >= startOfWeek.getTime() &&
        bTimestamp <= endOfWeek.getTime() &&
        (status === "confirmed" || status === "booked_offline")
      ) {
        const dayName = days[bDate.getDay()];
        map[dayName] += 1;
      }
    });

    return days.map((d) => ({ day: d, bookings: map[d] }));
  }, [bookings]);

  const chartConfig = {
    bookings: {
      label: "Bookings",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  return (
    <main className="flex flex-col items-center w-full max-w-7xl px-4 py-6 space-y-6 mx-auto">
      {/* Greeting */}
      <section className="w-full max-w-7xl flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Good {greeting} 🌞
          </h2>
          <p className="text-muted-foreground text-sm">
            Here&apos;s what&apos;s happening with your turf this week.
          </p>
        </div>

        <div className="w-64">
          <p className="text-xs font-medium text-muted-foreground mb-1.5 ml-1">
            Active Turf
          </p>
          <Select
            value={selectedTurf?.id ?? ""}
            onValueChange={(id) => {
              const turf = turfs.find((t) => t.id === id);
              if (turf) setSelectedTurf(turf);
            }}
          >
            <SelectTrigger className="w-full bg-background shadow-sm">
              <SelectValue placeholder="Select a turf" />
            </SelectTrigger>
            <SelectContent>
              {turfs.map((turf) => (
                <SelectItem key={turf.id} value={turf.id}>
                  {turf.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-7xl ">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Earnings
            </CardTitle>
            <IndianRupee className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ₹{earnings.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Net payout after commissions
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today&apos;s Bookings
            </CardTitle>
            <Calendar className="size-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todaysBookingsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Confirmed & Offline slots
            </p>
          </CardContent>
        </Card>

        <Card className="border-dashed hover:border-primary/50 transition-colors cursor-pointer bg-muted/50">
          <Link href="/owner/turfs/register" className="h-full w-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">New Turf</CardTitle>
              <MapPin className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="flex flex-col items-center py-2">
              <PlusCircle className="size-8 text-primary/70" />
            </CardContent>
          </Link>
        </Card>
      </section>

      {/* Chart */}
      <section className="w-full max-w-7xl">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-2 sm:space-y-0">
            <div>
              <CardTitle className="text-lg font-semibold">
                Weekly Performance
              </CardTitle>
              <CardDescription>
                Number of bookings per day for the current week
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
              <TrendingUp className="size-3" />
              Live Updates
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <ChartContainer config={chartConfig} className="min-h-75 w-full">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  vertical={false}
                  strokeDasharray="3 3"
                  opacity={0.4}
                />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <ChartTooltip
                  cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }}
                  content={<ChartTooltipContent />}
                />
                <Bar
                  dataKey="bookings"
                  fill="var(--chart-1)"
                  radius={[4, 4, 0, 0]}
                  barSize={40}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

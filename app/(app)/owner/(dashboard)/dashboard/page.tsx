"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Calendar, IndianRupee } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";

export default function DashboardPage() {
  const [greeting, setGreeting] = useState("");
  const bookings = 0;
  const earnings = 0;

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Morning");
    else if (hour < 17) setGreeting("Afternoon");
    else setGreeting("Evening");
  }, []);

  const chartData = [
    { day: "Sun", bookings: 186 },
    { day: "Mon", bookings: 305 },
    { day: "Tue", bookings: 237 },
    { day: "Wed", bookings: 73 },
    { day: "Thu", bookings: 209 },
    { day: "Fri", bookings: 214 },
    { day: "Sat", bookings: 214 },
  ];

  const chartConfig = {
    bookings: {
      label: "Bookings",
      color: "var(--chart-1)",
    },
  } satisfies ChartConfig;

  return (
    <main className="flex flex-col items-center justify-center w-full max-w-7xl px-4 py-6 space-y-6">
      {/* Greeting */}
      <section className="w-full max-w-4xl text-left">
        <h2 className="text-3xl font-bold text-foreground">
          Good {greeting} 🌞
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s how your turf is performing today
        </p>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {/* Earnings */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-md font-semibold text-muted-foreground">
              Today&apos;s Earnings
            </CardTitle>
            <IndianRupee className="size-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">
              ₹{earnings}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {earnings === 0 ? "No earnings today" : "Great job!"}
            </p>
          </CardContent>
        </Card>

        {/* Bookings */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-md font-semibold text-muted-foreground">
              Today&apos;s Bookings
            </CardTitle>
            <Calendar className="size-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{bookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {bookings === 0 ? "No bookings today" : "Keep the turf buzzing!"}
            </p>
          </CardContent>
        </Card>

        {/* Upcoming Bookings */}
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-md font-semibold text-muted-foreground">
              Upcoming Bookings
            </CardTitle>
            <Calendar className="size-6 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">{bookings}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {bookings === 0
                ? "No upcoming bookings tomorrow"
                : "Get ready for action!"}
            </p>
          </CardContent>
        </Card>
      </section>
      <section className="w-full max-w-4xl">
        <Card className="border-border bg-card shadow-sm">
          <CardHeader>
            <CardTitle className="text-md font-semibold text-muted-foreground">
              Welcome to your Owner Dashboard!
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-foreground">
              Here you can monitor your turf&apos;s performance, manage
              bookings, and track earnings. Stay updated with real-time stats
              and ensure your turf is always ready for action!
            </p>
            <ChartContainer config={chartConfig}>
              <BarChart accessibilityLayer data={chartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => value.slice(0, 3)}
                />
                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar
                  dataKey="bookings"
                  stackId="a"
                  fill="var(--color-bookings)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

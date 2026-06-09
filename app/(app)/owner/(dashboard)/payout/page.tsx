"use client";

import React, { useMemo, useState } from "react";
import { useTurf } from "@/context/turf-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  IndianRupee,
  Wallet,
  ArrowDownLeft,
} from "lucide-react";

export default function PayoutPage() {
  const { bookings } = useTurf();
  const [filter, setFilter] = useState("all");

  // --- CALCULATE REAL-TIME BALANCES ---
  const stats = useMemo(() => {
    // Only consider bookings that are "confirmed" or "Confirmed"
    const validBookings = bookings.filter(
      (b) => b.status?.toLowerCase() === "confirmed",
    );

    const pending = validBookings
      .filter((b) => b.paid === "Not Paid to Owner")
      .reduce((sum, b) => sum + (b.payout ?? 0), 0);

    const settled = validBookings
      .filter((b) => b.paid === "Paid to Owner")
      .reduce((sum, b) => sum + (b.payout ?? 0), 0);

    const thisMonth = validBookings
      .filter((b) => {
        const date = b.bookingDate?.seconds
          ? new Date(b.bookingDate.seconds * 1000)
          : new Date();
        return date.getMonth() === new Date().getMonth();
      })
      .reduce((sum, b) => sum + (b.payout ?? 0), 0);

    return { pending, settled, thisMonth, total: pending + settled };
  }, [bookings]);

  // --- FILTERED TRANSACTIONS ---
  const filteredTransactions = useMemo(() => {
    const list = bookings.filter(
      (b) => b.status?.toLowerCase() === "confirmed",
    );
    if (filter === "pending")
      return list.filter((b) => b.paid === "Not Paid to Owner");
    if (filter === "settled")
      return list.filter((b) => b.paid === "Paid to Owner");
    return list;
  }, [bookings, filter]);

  return (
    <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payouts</h1>
          <p className="text-muted-foreground">
            Track your earnings and settlement history.
          </p>
        </div>
        <Button className="w-full md:w-auto gap-2">
          <ArrowUpRight className="size-4" /> Withdraw Funds
        </Button>
      </section>

      {/* Main Stats Card */}
      <section>
        <Card className="bg-primary text-white overflow-hidden relative border-none">
          <div className="absolute right-[-20px] top-[-20px] opacity-10">
            <IndianRupee size={200} />
          </div>
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
              <div className="space-y-2">
                <p className="text-emerald-100 font-medium flex items-center gap-2">
                  <Wallet className="size-4" /> Pending Payout
                </p>
                <h2 className="text-5xl font-extrabold tracking-tight">
                  ₹{stats.pending.toLocaleString()}
                </h2>
                <p className="text-emerald-100/80 text-sm">
                  Scheduled for next settlement cycle
                </p>
              </div>
              <div className="flex flex-col justify-end gap-3">
                <div className="bg-white/10 backdrop-blur-md rounded-lg p-4 border border-white/20">
                  <p className="text-xs uppercase font-bold text-emerald-100 mb-1">
                    Lifetime Earnings
                  </p>
                  <p className="text-2xl font-bold">
                    ₹{stats.total.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Secondary Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-blue-50 p-3 rounded-full">
              <ArrowUpRight className="text-blue-600 size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Earned This Month
              </p>
              <p className="text-2xl font-bold">
                ₹{stats.thisMonth.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="bg-emerald-50 p-3 rounded-full">
              <CheckCircle2 className="text-emerald-600 size-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Total Settled
              </p>
              <p className="text-2xl font-bold">
                ₹{stats.settled.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Transactions Table Section */}
      <section className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h3 className="text-xl font-bold">Transaction History</h3>
          <Tabs
            defaultValue="all"
            className="w-full md:w-auto"
            onValueChange={setFilter}
          >
            <TabsList className="bg-muted/50 border">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="settled">Settled</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="space-y-3">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-20 rounded-xl border-2 border-dashed">
              <p className="text-muted-foreground">
                No transactions found for this filter.
              </p>
            </div>
          ) : (
            filteredTransactions.map((tx, i) => (
              <Card
                key={i}
                className="hover:shadow-md transition-shadow cursor-default group border-slate-100"
              >
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${tx.paid === "Paid to Owner" ? "bg-emerald-50" : "bg-amber-50"}`}
                    >
                      {tx.paid === "Paid to Owner" ? (
                        <ArrowDownLeft className="size-5 text-emerald-600" />
                      ) : (
                        <Clock className="size-5 text-amber-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">
                        {tx.paid === "Paid to Owner"
                          ? "Settlement Transfer"
                          : "Unsettled Booking"}
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        ID: {tx.transactionId || "OFFLINE_PAY"} • {tx.timeSlot}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right hidden sm:block">
                      <p className="text-xs ">{tx.monthSlot || "Recent"}</p>
                      <Badge
                        variant={
                          tx.paid === "Paid to Owner" ? "secondary" : "outline"
                        }
                        className={
                          tx.paid === "Paid to Owner"
                            ? "bg-emerald-100 text-emerald-700 border-none"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }
                      >
                        {tx.paid === "Paid to Owner" ? "Settled" : "Pending"}
                      </Badge>
                    </div>
                    <div className="text-right min-w-[100px]">
                      <p
                        className={`font-bold text-lg ${tx.paid === "Paid to Owner" ? "text-emerald-600" : "text-slate-600"}`}
                      >
                        +₹{tx.payout}
                      </p>
                      <p className="text-[10px]  italic">
                        Ref: {tx.userUid?.slice(0, 8)}
                      </p>
                    </div>
                    <ArrowRight className="size-4 text-slate-300 group-hover:text-primary transition-colors" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Trophy, MapPin, TrendingUp } from "lucide-react";
import { Tournament } from "@/lib/types/tournament";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Spinner } from "@/components/ui/spinner";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTurfs: 0,
    activeTournaments: 0,
    revenue: 0,
  });
  const [dailyBookings, setDailyBookings] = useState<{ date: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [tournamentsRes, turfsRes, usersRes] = await Promise.all([
          fetch("/api/tournaments"),
          fetch("/api/turfs"),
          fetch("/api/admin/users"),
        ]);

        if (tournamentsRes.ok && turfsRes.ok && usersRes.ok) {
          const tournamentsData = await tournamentsRes.json();
          const turfsData = await turfsRes.json();
          const usersData = await usersRes.json();

          const last30Days: Record<string, number> = {};
          const today = new Date();
          for (let i = 29; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            last30Days[d.toISOString().split("T")[0]] = 0;
          }

          let revenue = 0;
          turfsData.turfs?.forEach((turf: Record<string, unknown>) => {
            const timeSlots = turf.timeSlots as Record<string, Record<string, unknown>> || {};
            Object.values(timeSlots).forEach((slot) => {
              const bd = slot.bookingDate as { _seconds?: number } | undefined;
              if (bd?._seconds) {
                const dateStr = new Date(bd._seconds * 1000).toISOString().split("T")[0];
                if (last30Days[dateStr] !== undefined) {
                  last30Days[dateStr]++;
                }
                revenue += (slot.price as number) || 0;
              }
            });
          });

          setStats({
            totalUsers: usersData.users?.length || 0,
            totalTurfs: turfsData.turfs?.length || 0,
            activeTournaments: tournamentsData.tournaments?.filter(
              (t: Tournament) => t.status === "ongoing" || t.status === "registration_open"
            ).length || 0,
            revenue,
          });

          const chartData = Object.entries(last30Days).map(([date, count]) => ({
            date: new Date(date + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
            count,
          }));
          setDailyBookings(chartData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const statCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      label: "Active users",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Total Turfs",
      value: stats.totalTurfs,
      label: "Registered turfs",
      icon: MapPin,
      color: "text-green-500",
    },
    {
      title: "Active Tournaments",
      value: stats.activeTournaments,
      label: "In progress",
      icon: Trophy,
      color: "text-amber-500",
    },
    {
      title: "Revenue",
      value: formatCurrency(stats.revenue),
      label: "This month",
      icon: TrendingUp,
      color: "text-primary",
      isCurrency: true,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome to Turf Buddie Admin</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="p-0 overflow-hidden">
              <CardContent className="pt-4 px-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </span>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold">
                  {stat.isCurrency ? stat.value : stat.value.toLocaleString("en-IN")}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="mt-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Bookings (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dailyBookings} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10 }}
                  tickLine={false}
                  interval={6}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} tickLine={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  labelStyle={{ fontWeight: "bold" }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

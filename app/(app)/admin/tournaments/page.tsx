"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { SafeImage } from "@/components/ui/safe-image";
import { Trophy, Calendar, Users, MapPin, Plus, Download, Search } from "lucide-react";
import { Tournament } from "@/lib/types/tournament";
import { Pagination, SearchInput } from "@/components/admin/pagination";

const ITEMS_PER_PAGE = 6;

const statusColors: Record<Tournament["status"], string> = {
  upcoming: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  registration_open: "bg-green-500/10 text-green-600 border-green-500/20",
  ongoing: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  completed: "bg-slate-700/20 text-slate-700 dark:bg-slate-300/20 dark:text-slate-300 border-slate-500/30",
};

const statusLabels: Record<Tournament["status"], string> = {
  upcoming: "Upcoming",
  registration_open: "Registration Open",
  ongoing: "Ongoing",
  completed: "Completed",
};

const sportIcons: Record<Tournament["sport"], string> = {
  cricket: "🏏",
  football: "⚽",
  badminton: "🏸",
  tennis: "🎾",
  pickleball: "🏓",
};

export default function AdminTournamentsPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredTournaments = useMemo(() => {
    if (!searchQuery) return tournaments;
    const query = searchQuery.toLowerCase();
    return tournaments.filter(
      (t) =>
        (t.name || "").toLowerCase().includes(query) ||
        (t.sport || "").toLowerCase().includes(query) ||
        (t.status || "").toLowerCase().includes(query) ||
        (t.venue || "").toLowerCase().includes(query)
    );
  }, [tournaments, searchQuery]);

  const totalPages = Math.ceil(filteredTournaments.length / ITEMS_PER_PAGE);
  const paginatedTournaments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTournaments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTournaments, currentPage]);

  const exportTournaments = () => {
    const headers = ["Name", "Sport", "Status", "Start Date", "End Date", "Venue", "Entry Fee", "Prize Pool", "Teams", "Max Teams"];
    const rows = filteredTournaments.map(t => [
      t.name,
      t.sport,
      t.status,
      new Date(t.startDate).toLocaleDateString(),
      new Date(t.endDate).toLocaleDateString(),
      t.venue,
      t.registrationFee,
      t.prizePool || "N/A",
      t.registeredTeams,
      t.maxTeams,
    ]);

    const csvContent = [headers, ...rows].map(row => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `tournaments_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchTournaments = async () => {
      try {
        const response = await fetch("/api/tournaments");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setTournaments(data.tournaments || []);
      } catch (err) {
        setError("Failed to load tournaments");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTournaments();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Tournaments Management
          </h1>
          <p className="text-muted-foreground">
            Manage all tournaments in the system
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportTournaments}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Link href="/admin/tournaments/create">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Tournament
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="mb-4 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, sport, venue..."
            className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {tournaments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Tournaments Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Create your first tournament to get started
            </p>
            <Link href="/admin/tournaments/create">
              <Button>Create Tournament</Button>
            </Link>
          </CardContent>
        </Card>
      ) : paginatedTournaments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground text-sm">
              Try a different search term
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
            {paginatedTournaments.map((tournament) => (
              <Card
                key={tournament.id}
                className="overflow-hidden hover:shadow-md transition-shadow flex flex-col p-0"
              >
                <div className="relative h-44 w-full bg-muted rounded-t-lg flex-shrink-0">
                  {tournament.image ? (
                    <SafeImage
                      src={tournament.image}
                      alt={tournament.name}
                      fill
                      className="object-cover rounded-t-lg"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg">
                      <Trophy className="h-12 w-12 text-primary/50" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant="outline"
                      className={`${statusColors[tournament.status]} backdrop-blur-sm`}
                    >
                      {statusLabels[tournament.status]}
                    </Badge>
                  </div>
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="backdrop-blur-sm">
                      {sportIcons[tournament.sport]} {tournament.sport}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pt-2 pb-0 px-3">
                  <CardTitle className="text-lg line-clamp-1">
                    {tournament.name}
                  </CardTitle>
                </CardHeader>

                <CardContent className="pt-2 space-y-2 px-3">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {tournament.description}
                  </p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(tournament.startDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        {tournament.registeredTeams}/{tournament.maxTeams}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span className="line-clamp-1">{tournament.venue}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t mt-auto">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Entry Fee:</span>{" "}
                      <span className="font-semibold">
                        {formatCurrency(tournament.registrationFee || 0)}
                      </span>
                    </div>
                    {tournament.prizePool && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Prize:</span>{" "}
                        <span className="font-semibold text-primary">
                          {formatCurrency(tournament.prizePool || 0)}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-auto">
                    <Link
                      href={`/admin/tournaments/manage?id=${tournament.id}`}
                      className="flex-1"
                    >
                      <Button variant="outline" size="sm" className="w-full">
                        Manage
                      </Button>
                    </Link>
                    <Link
                      href={`/tournaments/${tournament.id}`}
                      className="flex-1"
                    >
                      <Button variant="ghost" size="sm" className="w-full">
                        View
                      </Button>
                    </Link>
                    <Button variant="outline" size="sm" className="gap-1" onClick={exportTournaments}>
                      <Download className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
    </div>
  );
}

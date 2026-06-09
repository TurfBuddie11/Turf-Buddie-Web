"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet, Calendar } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Team, Tournament } from "@/lib/types/tournament";

interface ManageTournamentsClientProps {
  tournaments: Tournament[];
}

export default function ManageTournamentsClient({
  tournaments,
}: ManageTournamentsClientProps) {
  const handleExportTeams = async (
    tournamentId: string,
    tournamentName: string,
  ) => {
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/teams`);
      if (!response.ok) throw new Error("Failed to fetch teams data.");
      const teams: Team[] = await response.json();

      if (teams.length === 0) {
        toast.info("No teams registered yet.");
        return;
      }

      const workbook = XLSX.utils.book_new();

      const teamsData = teams.map((team, index) => ({
        "Sr. No": index + 1,
        "Team Name": team.teamName,
        Captain: team.captainName,
        Phone: team.captainPhone,
        Squad: team.players
          .map(
            (p: { name: string; phone: string }) => `${p.name} - (${p.phone})`,
          )
          .join("\n  "),
        Date: team.registeredAt
          ? new Date(team.registeredAt.seconds * 1000).toLocaleDateString()
          : "N/A",
      }));

      const teamsSheet = XLSX.utils.json_to_sheet(teamsData);
      XLSX.utils.book_append_sheet(workbook, teamsSheet, "Registered Teams");
      XLSX.writeFile(
        workbook,
        `${tournamentName.replace(/\s/g, "_")}_Teams.xlsx`,
      );

      toast.success("Excel exported!");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight">
            Tournament Manager
          </h1>
          <p className="text-muted-foreground">
            Manage registrations and event details
          </p>
        </div>
        <Button asChild className="font-bold">
          <Link href="/admin/tournaments/create">Create New Tournament</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament) => (
          <Card
            key={tournament.id}
            className="overflow-hidden border-2 hover:border-primary/50 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl font-bold line-clamp-1">
                  {tournament.name}
                </CardTitle>
                <div className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-1 rounded uppercase">
                  {tournament.sport}
                </div>
              </div>
              <div className="flex items-center text-xs text-muted-foreground gap-1 mt-1">
                <Calendar size={14} />
                <span>
                  {new Date(tournament.startDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}{" "}
                  -
                  {new Date(tournament.endDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border">
                <div className="text-center flex-1 border-r">
                  <p className="text-[10px] uppercase font-bold  leading-none mb-1">
                    Teams
                  </p>
                  <p className="font-bold text-sm">
                    {tournament.registeredTeams} / {tournament.maxTeams}
                  </p>
                </div>
                <div className="text-center flex-1">
                  <p className="text-[10px] uppercase font-bold  leading-none mb-1">
                    Fee
                  </p>
                  <p className="font-bold text-sm text-primary">
                    ₹{tournament.registrationFee}
                  </p>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="grid grid-cols-3 gap-2">
                {/* <Button
                  variant="outline"
                  size="sm"
                  className="flex flex-col h-auto py-2 gap-1"
                  asChild
                >
                  <Link href={`/admin/tournaments/edit/${tournament.id}`}>
                    <Edit3 size={16} />
                    <span className="text-[10px]">Edit</span>
                  </Link>
                </Button> */}

                <Button
                  variant="secondary"
                  size="sm"
                  className="flex flex-col h-auto py-2 gap-1"
                  onClick={() =>
                    handleExportTeams(tournament.id, tournament.name)
                  }
                >
                  <FileSpreadsheet size={16} />
                  <span className="text-[10px]">Export</span>
                </Button>

                {/* <Button
                  variant="destructive"
                  size="sm"
                  className="flex flex-col h-auto py-2 gap-1"
                  onClick={() => handleDelete(tournament.id, tournament.name)}
                >
                  <Trash2 size={16} />
                  <span className="text-[10px]">Delete</span>
                </Button> */}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

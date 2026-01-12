"use client";

import { Tournament, Team } from "@/lib/types/booking";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx"; // Import SheetJS

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
        toast.info("No teams registered yet for this tournament.");
        return;
      }

      // 1. Prepare Data for "Registered Teams" Sheet
      const teamsData = teams.map((team, index) => ({
        "Sr. No": index + 1,
        "Team Name": team.teamName,
        "Captain Name": team.captainName,
        "Contact Number": team.captainPhone,
        "Squad Members": team.players.join(", "),
        "Registration Date": team.registeredAt
          ? new Date(team.registeredAt.seconds * 1000).toLocaleDateString()
          : "N/A",
      }));

      // 2. Prepare Data for "Tournament Summary" Sheet
      const tournament = tournaments.find((t) => t.id === tournamentId);
      const summaryData = [
        { Field: "Tournament Name", Value: tournamentName },
        { Field: "Export Date", Value: new Date().toLocaleString() },
        { Field: "Total Teams Registered", Value: teams.length },
        { Field: "Max Capacity", Value: tournament?.maxTeams || "N/A" },
        { Field: "Registration Fee", Value: `₹${tournament?.registrationFee}` },
      ];

      // 3. Create Workbook and Worksheets
      const workbook = XLSX.utils.book_new();

      const teamsSheet = XLSX.utils.json_to_sheet(teamsData);
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);

      // 4. Set Column Widths (Optional but makes it look much better)
      const wscols = [
        { wch: 8 }, // Sr. No
        { wch: 25 }, // Team Name
        { wch: 20 }, // Captain Name
        { wch: 15 }, // Contact
        { wch: 50 }, // Squad Members
        { wch: 20 }, // Date
      ];
      teamsSheet["!cols"] = wscols;

      // 5. Append Sheets to Workbook
      XLSX.utils.book_append_sheet(workbook, teamsSheet, "Registered Teams");
      XLSX.utils.book_append_sheet(
        workbook,
        summarySheet,
        "Tournament Summary",
      );

      // 6. Finalize and Download
      const fileName = `${tournamentName.replace(/\s/g, "_")}_Export.xlsx`;
      XLSX.writeFile(workbook, fileName);

      toast.success("Excel file generated successfully!");
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Failed to export Excel.";
      toast.error(message);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Manage Your Tournaments</h1>
        <Button asChild>
          <Link href="/tournaments/create">Create New Tournament</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament: Tournament) => (
          <Card key={tournament.id} className="relative">
            <CardHeader>
              <CardTitle className="text-xl font-semibold">
                {tournament.name}
              </CardTitle>
              <p className="text-sm text-gray-500">
                {new Date(tournament.startDate).toLocaleDateString()} -{" "}
                {new Date(tournament.endDate).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700 line-clamp-2">
                {tournament.description}
              </p>
              <div className="flex items-center justify-between text-sm text-gray-600">
                <span>
                  Teams: {tournament.registeredTeams}/{tournament.maxTeams}
                </span>
                <span>Fee: ₹{tournament.registrationFee}</span>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    handleExportTeams(tournament.id, tournament.name)
                  }
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Export
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

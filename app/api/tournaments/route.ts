import { createTournament } from "@/lib/db/tournaments";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const tournamentData = await req.json();
    const tournamentId = await createTournament(tournamentData);
    console.log("Tournament created with ID:", tournamentId);
    return NextResponse.json({ tournamentId }, { status: 201 });
  } catch (error) {
    console.error("Error creating tournament:", error);
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 },
    );
  }
}

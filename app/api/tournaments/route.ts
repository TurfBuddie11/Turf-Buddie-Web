import { createTournament } from "@/lib/db/tournaments";
import { getAllTournaments } from "@/lib/db/tournaments";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const tournamentData = await req.json();
    const tournamentId = await createTournament(tournamentData);
    return NextResponse.json({ tournamentId }, { status: 201 });
  } catch (error) {
    console.error("Error creating tournament:", error);
    return NextResponse.json(
      { error: "Failed to create tournament" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const tournaments = await getAllTournaments();
    return NextResponse.json({ tournaments }, { status: 200 });
  } catch (error) {
    console.error("Error fetching tournaments:", error);
    return NextResponse.json(
      { error: "Failed to fetch tournaments" },
      { status: 500 },
    );
  }
}

import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";
import { Team } from "@/lib/types/tournament";

export const revalidate = 300;

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tournamentId = (await params).id;

    const teamsSnapshot = await adminDb
      .collection("Tournaments")
      .doc(tournamentId)
      .collection("teams")
      .orderBy("registeredAt", "desc")
      .get();

    const teams: Team[] = [];
    teamsSnapshot.forEach((doc) => {
      const data = doc.data();
      teams.push({
        id: doc.id,
        teamName: data.teamName,
        captainName: data.captainName,
        captainPhone: data.captainPhone,
        players: data.players,
        registeredAt: data.registeredAt.toDate(),
      });
    });

    return NextResponse.json(teams, { status: 200 });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error fetching teams";
    console.error("Error fetching teams:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

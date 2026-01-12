import { adminDb } from "@/lib/firebase/admin";
import { NextResponse } from "next/server";
import { firestore } from "firebase-admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tournamentId = (await params).id;
    const body = await request.json();

    const { teamName, captainName, captainPhone, players } = body;

    if (!teamName || !captainName || !captainPhone || !players) {
      return NextResponse.json(
        { error: "Missing required team registration fields" },
        { status: 400 },
      );
    }

    const tournamentRef = adminDb.collection("Tournaments").doc(tournamentId);
    const tournamentDoc = await tournamentRef.get();

    if (!tournamentDoc.exists) {
      return NextResponse.json(
        { error: "Tournament not found" },
        { status: 404 },
      );
    }

    const tournamentData = tournamentDoc.data();
    if (!tournamentData) {
      return NextResponse.json(
        { error: "Tournament data not found" },
        { status: 404 },
      );
    }

    if (tournamentData.registeredTeams >= tournamentData.maxTeams) {
      return NextResponse.json(
        { error: "Tournament is full" },
        { status: 400 },
      );
    }

    // Add the team to a subcollection "teams" under the tournament document
    const newTeamRef = await tournamentRef.collection("teams").add({
      teamName,
      captainName,
      captainPhone,
      players,
      registeredAt: firestore.FieldValue.serverTimestamp(),
    });

    // Increment registeredTeams count in the main tournament document
    await tournamentRef.update({
      registeredTeams: firestore.FieldValue.increment(1),
    });

    return NextResponse.json(
      {
        success: true,
        teamId: newTeamRef.id,
        message: "Team registered successfully!",
      },
      { status: 201 },
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Team registration error";
    console.error("Team Registration Error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

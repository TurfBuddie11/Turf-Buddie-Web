import { adminDb } from "@/lib/firebase/admin";
import { Tournament } from "@/lib/types/tournament";
import { Timestamp } from "firebase-admin/firestore";
import { cache } from "react";

export async function createTournament(
  tournament: Omit<Tournament, "id" | "createdAt" | "registeredTeams">,
): Promise<string> {
  const start = new Date(tournament.startDate);
  const end = new Date(tournament.endDate);
  const tournamentRef = await adminDb.collection("Tournaments").add({
    ...tournament,
    startDate: Timestamp.fromDate(start),
    endDate: Timestamp.fromDate(end),
    createdAt: Timestamp.now(),
    registeredTeams: 0,
    status: "upcoming",
  });
  return tournamentRef.id;
}

// Wrap your function in cache()
export const getAllTournaments = cache(async (): Promise<Tournament[]> => {
  const snapshot = await adminDb
    .collection("Tournaments")
    .orderBy("createdAt", "desc") // Use "desc" for newest first
    .limit(20)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      startDate: data.startDate.toDate(),
      endDate: data.endDate.toDate(),
      createdAt: data.createdAt.toDate(),
    } as Tournament;
  });
});

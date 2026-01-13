import { adminDb } from "@/lib/firebase/admin";
import { Tournament } from "@/lib/types/tournament";
import { Timestamp } from "firebase-admin/firestore";

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

export async function getAllTournaments(): Promise<Tournament[]> {
  const snapshot = await adminDb.collection("Tournaments").get();
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
}

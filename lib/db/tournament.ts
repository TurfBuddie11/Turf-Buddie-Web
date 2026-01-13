import { adminDb } from "@/lib/firebase/admin";
import { Tournament } from "@/lib/types/tournament";

export async function getTournamentById(
  id: string,
): Promise<Tournament | null> {
  const doc = await adminDb.collection("Tournaments").doc(id).get();

  if (!doc.exists) return null;

  const data = doc.data();
  if (!data) return null;

  return {
    ...data,
    id: doc.id,
    startDate: data.startDate.toDate
      ? data.startDate.toDate()
      : new Date(data.startDate),
    endDate: data.endDate.toDate
      ? data.endDate.toDate()
      : new Date(data.endDate),
    createdAt: data.createdAt.toDate
      ? data.createdAt.toDate()
      : new Date(data.createdAt),
  } as Tournament;
}

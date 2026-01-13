import ManageTournamentsClient from "@/components/tournament/tournament-manage";
import { getAllTournaments } from "@/lib/db/tournaments";

export default async function ManageTournamentsPage() {
  const tournaments = await getAllTournaments();

  return (
    <div className="max-w-7xl w-full mx-auto flex justify-center p-4">
      <ManageTournamentsClient tournaments={tournaments} />
    </div>
  );
}

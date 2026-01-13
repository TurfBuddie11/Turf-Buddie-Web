import { getAllTournaments } from "@/lib/db/tournaments";
import TournamentCard from "@/components/tournament/tournment-card";

export default async function TournamentPage() {
  const tournaments = await getAllTournaments();

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center md:text-left">
        Upcoming Tournaments
      </h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tournaments.map((tournament) => (
          <TournamentCard key={tournament.id} tournament={tournament} />
        ))}
      </div>
    </div>
  );
}

import { getTournamentById } from "@/lib/db/tournament";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import TournamentDetailsPage from "@/components/tournament/tournament-details";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tournament = await getTournamentById(id);

  if (!tournament) return { title: "Tournament Not Found" };

  return {
    title: `${tournament.name} | TurfBuddie`,
    metadataBase: new URL("https://turfbuddie.com"),
    description: tournament.description,
    openGraph: {
      images: [tournament.image],
    },
  };
}

export const dynamic = "force-dynamic";

export default async function Page({ params }: PageProps) {
  const { id } = await params;
  const tournament = await getTournamentById(id);

  if (!tournament) {
    notFound();
  }

  return <TournamentDetailsPage tournament={tournament} />;
}

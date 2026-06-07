import Link from "next/link";
import { MapPin, Users, Trophy, ChevronRight, Clock } from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Tournament } from "@/lib/types/tournament";

interface TournamentCardProps {
  tournament: Omit<Tournament, "prizePool" | "registrationFee">;
}

export default function TournamentCard({ tournament }: TournamentCardProps) {
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date(date));
  };

  const statusStyles = {
    upcoming: "bg-blue-100 text-blue-700 hover:bg-blue-100",
    registration_open:
      "bg-green-100 text-green-700 hover:bg-green-100 sm:animate-pulse",
    ongoing: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    completed: "bg-slate-100 text-slate-700 hover:bg-slate-100",
  };

  const isFull = tournament.registeredTeams >= tournament.maxTeams;

  return (
    <Link href={`/tournaments/${tournament.id}`} className="w-full">
      <Card className="group flex flex-col md:max-w-lg  overflow-hidden border-none shadow-sm transition-all hover:shadow-lg sm:hover:shadow-xl  active:scale-[0.99] sm:active:scale-100">
        <div className="relative h-44 sm:h-52 w-full overflow-hidden">
          <Image
            src={tournament.image || "/placeholder-tournament.jpg"}
            alt={tournament.name}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover transition-transform duration-500 sm:group-hover:scale-110"
            unoptimized
          />
          {/* Gradient Overlay: Adjusted for better contrast on mobile */}
          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent" />

          {/* Badges: Slightly larger touch area/spacing for mobile */}
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 max-w-[80%]">
            <Badge
              className={`${statusStyles[tournament.status as keyof typeof statusStyles]} border-none font-bold uppercase text-[9px] sm:text-[10px] px-2 py-0.5`}
            >
              {tournament.status.replace("_", " ")}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-white/95 backdrop-blur-sm text-slate-900  font-semibold uppercase text-[9px] sm:text-[10px] px-2 py-0.5 shadow-sm"
            >
              {tournament.sport}
            </Badge>
          </div>
        </div>

        {/* Content Section: Adjusting padding for smaller screens */}
        <CardContent className="flex-1 p-4 sm:p-5">
          <div className="mb-2 flex items-center justify-between text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Clock size={14} className="text-primary" />
              Started {formatDate(tournament.startDate)}
            </span>
          </div>

          <h3 className="mb-1.5 line-clamp-1 text-lg sm:text-xl font-bold tracking-tight ">
            {tournament.name}
          </h3>

          {/*<article className="prose prose-neutral max-w-none">
            <TournamentDescription
              content={
                tournament.description.length > 60
                  ? tournament.description.substring(0, 40) + "..."
                  : tournament.description
              }
            />
          </article>*/}

          {/* Metadata Grid: Grid gap optimized for mobile thumb spacing */}
          <div className="grid grid-cols-2 gap-y-3 sm:gap-y-4 border-t pt-4">
            <div className="flex items-center gap-2 text-xs sm:text-sm ">
              <MapPin size={16} className=" shrink-0" />
              <span className="truncate">{tournament.venue}</span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm justify-end">
              <Users size={16} className="shrink-0" />
              <span>
                {tournament.teamSize}v{tournament.teamSize}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm font-boldcol-span-2 sm:col-span-1">
              <Trophy size={16} className="text-amber-500 shrink-0" />
              <span>
                {tournament.registeredTeams} / {tournament.maxTeams} Teams
              </span>
            </div>
          </div>
        </CardContent>

        {/* Action Section: Full width button with consistent height */}
        <CardFooter className="p-4 sm:p-5 pt-0">
          <Button
            className="w-full h-11 sm:h-10 font-bold shadow-md sm:shadow-lg sm:shadow-primary/20 text-sm sm:text-base transition-all"
            variant={isFull ? "outline" : "default"}
            disabled={
              tournament.status === "completed" ||
              (isFull && tournament.status === "registration_open")
            }
          >
            <span className="flex-1 text-center">
              {tournament.status === "registration_open"
                ? isFull
                  ? "Tournament Full"
                  : "Register Now"
                : "View Details"}
            </span>
            <ChevronRight
              size={18}
              className="ml-1 sm:ml-2 group-hover:translate-x-1 transition-transform"
            />
          </Button>
        </CardFooter>
      </Card>
    </Link>
  );
}

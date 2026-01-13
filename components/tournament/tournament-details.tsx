"use client";
import {
  Calendar,
  MapPin,
  Users,
  Trophy,
  ChevronLeft,
  Share2,
  ShieldAlert,
  Info,
  Phone,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TeamRegistrationForm from "@/components/tournament/team-registration";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Spinner } from "../ui/spinner";
import { Player, Team, Tournament } from "@/lib/types/tournament";
import { useAuth } from "@/context/auth-provider";
import { useRouter } from "next/navigation";

interface TournamentDetailsProps {
  tournament: Tournament;
}

export default function TournamentDetailsPage({
  tournament,
}: TournamentDetailsProps) {
  const { profile } = useAuth();
  const router = useRouter();
  const isFull = tournament.registeredTeams >= tournament.maxTeams;
  const [isRegistrationFormOpen, setIsRegistrationFormOpen] = useState(false);
  const [teams, setTeams] = useState<Team[]>();
  const [isLoadingTeams, setIsLoadingTeams] = useState(false);

  const handleRegistrationClick = () => {
    if (!profile) {
      toast.error("Please log in to register for the tournament.");
      router.push("/login");
    } else {
      setIsRegistrationFormOpen(true);
    }
  };
  const fetchTeams = async () => {
    const length = teams?.length ?? 0;
    if (length > 0) return;
    setIsLoadingTeams(true);
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/teams`);
      const data = await res.json();
      setTeams(data);
    } finally {
      setIsLoadingTeams(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  });

  const handleShare = async () => {
    const shareData = {
      title: "Check out this tournament!",
      text: `Join ${tournament.name} on our platform!`,
      url: window.location.href,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        toast.success("Shared successfully");
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied to clipboard!");
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        toast.error("Could not share link");
      }
    }
  };

  return (
    <div className="min-h-screen pb-24 lg:pb-12 max-w-7xl mx-auto">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 w-full border-b backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link
            href="/tournaments"
            className="flex items-center gap-1 text-sm font-semibold  hover:text-primary transition-colors"
          >
            <ChevronLeft size={20} />{" "}
            <span className="hidden sm:inline">All Tournaments</span>
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden sm:flex gap-2"
              onClick={handleShare}
            >
              <Share2 size={16} /> Share
            </Button>
            <Badge variant="secondary" className="capitalize">
              {tournament.sport}
            </Badge>
          </div>
        </div>
      </nav>

      <main className="container mx-auto mt-6 px-4 lg:mt-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* LEFT: Main Content */}
          <div className="lg:col-span-2 space-y-6 sm:space-y-8">
            {/* Hero Image & Title */}
            <div className="space-y-6">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-lg border ">
                <Image
                  src={tournament.image}
                  alt={tournament.name}
                  fill
                  className="object-cover"
                  priority
                  unoptimized
                />
                <div className="absolute top-4 left-4">
                  <Badge className="bg-green-600  border-none px-3 py-1 text-sm font-bold shadow-lg">
                    {tournament.status.replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl lg:text-5xl">
                  {tournament.name}
                </h1>

                {/* Essential Quick Stats */}
                <div className="flex flex-wrap gap-y-3 gap-x-6 text-sm sm:text-base font-medium ">
                  <div className="flex items-center gap-2 text-primary">
                    <Calendar size={18} />
                    {new Date(tournament.startDate).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "long" },
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={18} /> {tournament.venue}
                  </div>
                  <div className="flex items-center gap-2">
                    <Users size={18} /> {tournament.teamSize}v
                    {tournament.teamSize} Format
                  </div>
                </div>
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="w-full justify-start border-b bg-transparent p-0 h-auto gap-8">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 text-base data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
                >
                  Overview
                </TabsTrigger>
                <TabsTrigger
                  value="rules"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 text-base data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
                >
                  Rules
                </TabsTrigger>
                <TabsTrigger
                  value="organizer"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 text-base data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
                >
                  Organizer
                </TabsTrigger>
                <TabsTrigger
                  value="teams"
                  className="rounded-none border-b-2 border-transparent px-0 py-3 text-base data-[state=active]:border-primary data-[state=active]:bg-transparent shadow-none"
                >
                  Teams ({tournament.registeredTeams})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-8 space-y-8">
                <div className="prose prose-slate max-w-none">
                  <p className="text-lg leading-relaxed italic border-l-4 border-primary/20 pl-4">
                    {tournament.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {Number(tournament?.prizePool) > 0 && (
                    <Card className="bg-primary/5 border-primary/10 shadow-none">
                      <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                          <Trophy size={28} />
                        </div>
                        <div>
                          <p className="text-[10px] text-primary/70 uppercase font-black tracking-widest">
                            Prize Pool
                          </p>
                          <p className="text-2xl ">
                            ₹{tournament.prizePool?.toLocaleString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                  <Card className=" shadow-none">
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className="p-3  rounded-xl  shadow-sm">
                        <ShieldAlert size={28} />
                      </div>
                      <div>
                        <p className="text-[10px]  uppercase font-black tracking-widest">
                          Entry Fee
                        </p>
                        <p className="text-2xl font-black ">
                          ₹{tournament.registrationFee?.toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="rules" className="mt-8">
                <div className=" rounded-2xl border p-6 space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Info className="text-primary" /> Official Rules
                  </h3>
                  <div className="grid gap-4">
                    {tournament.rules.map((rule: string, i: number) => (
                      <div key={i} className="flex gap-3 p-3 rounded-lg border">
                        <CheckCircle2
                          className="text-primary shrink-0 mt-0.5"
                          size={18}
                        />
                        <span className="text-sm sm:text-base font-medium">
                          {rule}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="organizer" className="mt-8">
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center space-y-4">
                    <div className="mx-auto h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-black text-primary">
                      {tournament.organizer?.charAt(0)}
                    </div>
                    <div>
                      <h4 className="text-xl font-bold ">
                        {tournament.organizer}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Verified TurfBuddie Partner
                      </p>
                    </div>
                    <Button variant="outline" className="gap-2">
                      <Phone size={16} /> Contact for Inquiries
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="teams" className="mt-8">
                {isLoadingTeams ? (
                  <div className="flex justify-center p-12">
                    <Spinner />
                  </div>
                ) : teams?.length === 0 ? (
                  <div className="text-center p-12 border-2 border-dashed rounded-2xl">
                    <Users
                      className="mx-auto text-muted-foreground mb-2"
                      size={32}
                    />
                    <p className="text-muted-foreground">
                      No teams registered yet. Be the first!
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {teams?.map((team) => (
                      <Card
                        key={team.id}
                        className="overflow-hidden shadow-none border"
                      >
                        <CardContent className="p-0">
                          <div className="bg-primary/5 p-4 border-b flex justify-between items-center">
                            <h4 className="font-bold text-lg">
                              {team.teamName}
                            </h4>
                            <Badge variant="secondary" className="text-[10px]">
                              {team.registeredAt?.seconds
                                ? new Date(
                                    team.registeredAt.seconds * 1000,
                                  ).toLocaleDateString()
                                : "Recently"}
                            </Badge>
                          </div>
                          <div className="p-4 space-y-3">
                            <div className="flex items-center gap-2 text-sm">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
                                C
                              </div>
                              <span className="font-medium">
                                {team.captainName} (Captain)
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                              {team.players.map(
                                (player: Player, idx: number) => (
                                  <div
                                    key={idx}
                                    className="flex items-center gap-2 text-xs text-muted-foreground"
                                  >
                                    <CheckCircle2
                                      size={12}
                                      className="text-green-500"
                                    />
                                    {player.name}
                                  </div>
                                ),
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <div className="hidden lg:block">
            <Card className="sticky top-24 border-none shadow-2xl ring-1 ">
              <CardContent className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold  uppercase tracking-tight">
                      Availability
                    </span>
                    <Badge
                      variant={isFull ? "destructive" : "outline"}
                      className="font-bold"
                    >
                      {isFull
                        ? "Full"
                        : `${
                            tournament.maxTeams - tournament.registeredTeams
                          } Slots Left`}
                    </Badge>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-bold">
                      <span>{tournament.registeredTeams} Registered</span>
                      <span>{tournament.maxTeams} Max</span>
                    </div>
                    <div className="h-3 w-full  rounded-full overflow-hidden border">
                      <div
                        className="h-full bg-primary transition-all duration-1000 ease-out"
                        style={{
                          width: `${
                            (tournament.registeredTeams / tournament.maxTeams) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button
                    className="w-full h-14 text-xl font-black shadow-xl shadow-primary/25 active:scale-[0.98] transition-transform"
                    disabled={isFull}
                    onClick={handleRegistrationClick}
                  >
                    {isFull ? "Joined Waiting List" : "REGISTER TEAM"}
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-xs font-medium">
                    <Clock size={14} /> Registration ends in 48 hours
                  </div>
                </div>

                <div className="pt-6 border-t flex items-center gap-4 text-xs ">
                  <ShieldAlert className="text-amber-500 shrink-0" size={20} />
                  <p>
                    Secure checkout with SSL encryption. Non-refundable after
                    bracket generation.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <div className="fixed bottom-0 left-0 z-60 w-full border-t  backdrop-blur-md p-4 lg:hidden shadow-[0_-8px_30px_rgb(0,0,0,0.12)]">
        <div className="container mx-auto flex items-center justify-between gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] font-black  uppercase tracking-widest">
              Entry Fee
            </span>
            <span className="text-2xl font-black text-primary">
              ₹{tournament.registrationFee}
            </span>
          </div>
          <Button
            className="flex-1  font-black text-lg shadow-lg active:scale-95 transition-transform"
            disabled={isFull}
            onClick={handleRegistrationClick}
          >
            {isFull ? "Registration Closed" : "Register"}
            <ArrowRight className="ml-2" size={20} />
          </Button>
        </div>
      </div>

      {profile && (
        <TeamRegistrationForm
          tournament={tournament}
          isOpen={isRegistrationFormOpen}
          onClose={() => setIsRegistrationFormOpen(false)}
          user={profile}
        />
      )}
    </div>
  );
}

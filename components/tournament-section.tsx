"use client";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, MapPin, Trophy, Users, Clock } from "lucide-react";
import { useRouter } from "next/navigation";

const tournaments = [
  {
    id: 1,
    title: "Nagpur Premier Cricket League",
    image: "/tournament-cricket.jpg",
    date: "Dec 15-22, 2025",
    location: "VCA Stadium Turf",
    participants: "32 Teams",
    prize: "₹50,000",
    status: "Registration Open",
    statusColor: "bg-primary text-primary-foreground",
    time: "9:00 AM - 6:00 PM",
  },
  {
    id: 2,
    title: "Vidarbha Football Championship",
    image: "/tournament-football.jpg",
    date: "Jan 10-20, 2025",
    location: "Sports Complex Nagpur",
    participants: "24 Teams",
    prize: "₹75,000",
    status: "Coming Soon",
    statusColor: "bg-accent text-accent-foreground",
    time: "4:00 PM - 9:00 PM",
  },
  {
    id: 3,
    title: "Corporate Cricket Cup",
    image: "/tournament-cricket.jpg",
    date: "Feb 5-12, 2025",
    location: "Multiple Venues",
    participants: "16 Teams",
    prize: "₹30,000",
    status: "Early Bird",
    statusColor: "bg-secondary text-secondary-foreground",
    time: "10:00 AM - 5:00 PM",
  },
];

const TournamentsSection = () => {
  const router = useRouter();
  return (
    <section id="tournaments" className="section-padding ">
      <div className="container max-w-7xl mx-auto px-4o">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Exciting
            <span className=" bg-clip-text"> Tournaments</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Join competitive tournaments in Nagpur and Vidarbha. Showcase your
            skills and win amazing prizes!
          </p>
        </div>

        {/* Tournament Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {tournaments.map((tournament) => (
            <Card
              key={tournament.id}
              className="glass-card glow-card overflow-hidden tournament-card group"
            >
              <div className="relative overflow-hidden">
                <Image
                  src={tournament.image}
                  alt={tournament.title}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                  width={400} // Fixed width for consistency
                  height={192} // Fixed height for consistency
                  priority
                />
                <div className="absolute top-4 left-4">
                  <Badge className={tournament.statusColor}>
                    {tournament.status}
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <div className="bg-background/80 backdrop-blur-sm rounded-lg px-3 py-1">
                    <span className="text-sm font-semibold text-foreground">
                      {tournament.prize}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold mb-4 text-card-foreground group-hover:text-primary transition-colors">
                  {tournament.title}
                </h3>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-sm">{tournament.date}</span>
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-sm">{tournament.time}</span>
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="text-sm">{tournament.location}</span>
                  </div>

                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Users className="w-4 h-4 text-primary" />
                    <span className="text-sm">{tournament.participants}</span>
                  </div>
                </div>

                <Button
                  className="w-full glow-button"
                  onClick={() => router.push("/tournaments")}
                >
                  Register Now
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {/* Tournament Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 glass-card p-8 rounded-2xl">
          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">50+</div>
            <div className="text-muted-foreground">Tournaments Hosted</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">500+</div>
            <div className="text-muted-foreground">Players Participated</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <Calendar className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">24/7</div>
            <div className="text-muted-foreground">Registration Support</div>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center mb-3">
              <Trophy className="w-8 h-8 text-primary" />
            </div>
            <div className="text-3xl font-bold text-foreground mb-2">₹5K+</div>
            <div className="text-muted-foreground">Prizes Distributed</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TournamentsSection;

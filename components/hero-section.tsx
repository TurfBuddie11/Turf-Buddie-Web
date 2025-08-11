"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Users, MapIcon, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";

const HeroSection = () => {
  const [parallaxOffset, setParallaxOffset] = useState(0);

  const { user } = useAuth();

  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.pageYOffset;
      setParallaxOffset(scrolled * 0.5);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden hero-section pt-36">
      {/* Parallax Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(/hero-turf.jpg)`,
          transform: `translateY(${parallaxOffset}px)`,
        }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-background/70" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-foreground">
            Book Your Perfect
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              {" "}
              Turf
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl md:text-2xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            Experience seamless turf booking in Nagpur and Vidarbha. Join
            thousands of sports enthusiasts who trust TurfBuddie.
          </p>

          {/* Location Badge */}
          <div className="inline-flex items-center gap-2 rounded-full px-6 py-3 mb-8 glass-card">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-card-foreground font-medium">
              Available in Nagpur & Vidarbha
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button
              size="lg"
              className="glow-button text-lg px-8 py-6"
              onClick={() => {
                if (user) {
                  router.push("/explore");
                } else {
                  router.push("/login");
                }
              }}
            >
              Book Now
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              onClick={() => router.push("/explore")}
            >
              Explore Turfs
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2 w-12 h-12 bg-primary/20 rounded-full mx-auto">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary">50+</div>
              <div className="text-muted-foreground">Happy Players</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2 w-12 h-12 bg-primary/20 rounded-full mx-auto">
                <MapIcon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary">10+</div>
              <div className="text-muted-foreground">Premium Turfs</div>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-2 w-12 h-12 bg-primary/20 rounded-full mx-auto">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl font-bold text-primary">40+</div>
              <div className="text-muted-foreground">Games Booked</div>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Glow Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-primary/20 rounded-full blur-xl animate-float" />
      <div
        className="absolute bottom-20 right-10 w-32 h-32 bg-primary-glow/20 rounded-full blur-xl animate-float"
        style={{ animationDelay: "2s" }}
      />
    </section>
  );
};

export default HeroSection;

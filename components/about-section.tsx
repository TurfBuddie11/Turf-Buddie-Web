"use client";
import { Card } from "@/components/ui/card";
import { Target, Heart, Zap, Shield, Users, Award } from "lucide-react";

const AboutSection = () => {
  return (
    <div>
      <section id="about" className="section-padding bg-muted/20">
        <div className="container max-w-7xl mx-auto px-4">
          {/* Heading */}
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
              About
              <span className="bg-gradient-hero bg-clip-text text-transparent">
                {" "}
                TurfBuddie
              </span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              We&apos;re passionate about bringing the sports community together
              through seamless turf booking experiences in Nagpur and Vidarbha
              region.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
            {/* Mission & Vision */}
            <div className="space-y-8">
              <div className="glass-card p-8 rounded-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    Our Mission
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To democratize sports by making quality turf booking
                  accessible, affordable, and effortless for every sports
                  enthusiast in our region. We believe everyone deserves a place
                  to play.
                </p>
              </div>

              <div className="glass-card p-8 rounded-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
                    <Heart className="w-6 h-6 text-primary-foreground" />
                  </div>
                  <h3 className="text-2xl font-bold text-foreground">
                    Our Vision
                  </h3>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  To become the leading sports platform that connects players,
                  organizes communities, and fosters the spirit of healthy
                  competition across Nagpur and Vidarbha.
                </p>
              </div>
            </div>

            {/* Values */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Card className="glass-card p-6 text-center hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="text-lg font-semibold mb-2 text-card-foreground">
                  Innovation
                </h4>
                <p className="text-muted-foreground text-sm">
                  Cutting-edge technology for seamless user experience
                </p>
              </Card>

              <Card className="glass-card p-6 text-center hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="text-lg font-semibold mb-2 text-card-foreground">
                  Trust
                </h4>
                <p className="text-muted-foreground text-sm">
                  Secure platform with transparent pricing and policies
                </p>
              </Card>

              <Card className="glass-card p-6 text-center hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="text-lg font-semibold mb-2 text-card-foreground">
                  Community
                </h4>
                <p className="text-muted-foreground text-sm">
                  Building connections through shared love for sports
                </p>
              </Card>

              <Card className="glass-card p-6 text-center hover:scale-105 transition-transform">
                <div className="w-16 h-16 bg-gradient-hero rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8 text-primary-foreground" />
                </div>
                <h4 className="text-lg font-semibold mb-2 text-card-foreground">
                  Excellence
                </h4>
                <p className="text-muted-foreground text-sm">
                  Commitment to quality in every aspect of our service
                </p>
              </Card>
            </div>
          </div>

          {/* Story Section */}
          <div className="glass-card p-8 md:p-12 rounded-2xl text-center">
            <h3 className="text-2xl md:text-3xl font-bold mb-6 text-foreground">
              Our Story
            </h3>
            <div className="max-w-4xl mx-auto">
              <p className="text-muted-foreground text-lg leading-relaxed mb-6">
                Founded in 2023 by a group of sports enthusiasts from Nagpur,
                TurfBuddie was born from a simple observation: finding and
                booking quality turfs was unnecessarily complicated. We
                experienced firsthand the frustration of calling multiple
                venues, unclear pricing, and last-minute cancellations.
              </p>
              <p className="text-muted-foreground text-lg leading-relaxed">
                Today, we&apos;re proud to serve over 10,000 players across
                Nagpur and Vidarbha, partnering with 50+ premium turfs to
                deliver an unmatched booking experience. Our platform has
                facilitated thousands of games and continues to grow the local
                sports community.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AboutSection;

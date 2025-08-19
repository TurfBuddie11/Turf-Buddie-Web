import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Smartphone, Download, Star, Shield, Zap } from "lucide-react";
import Image from "next/image";

const DownloadSection = () => {
  return (
    <section id="download" className="section-padding bg-muted/20">
      <div className="container max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Get the TurfBuddie{" "}
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              App
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Download our mobile app for the ultimate turf booking experience.
            Available on all platforms with exclusive features.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Features */}
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  icon: <Zap className="w-6 h-6 text-primary-foreground" />,
                  title: "Instant Booking",
                  desc: "Book your favorite turf in seconds with real-time availability",
                },
                {
                  icon: <Shield className="w-6 h-6 text-primary-foreground" />,
                  title: "Secure Payments",
                  desc: "Safe and encrypted payment options for worry-free transactions",
                },
                {
                  icon: <Star className="w-6 h-6 text-primary-foreground" />,
                  title: "Rate & Review",
                  desc: "Share your experience and help the community choose better",
                },
                {
                  icon: (
                    <Smartphone className="w-6 h-6 text-primary-foreground" />
                  ),
                  title: "Live Updates",
                  desc: "Get real-time notifications about your bookings and tournaments",
                },
              ].map(({ icon, title, desc }, i) => (
                <Card
                  key={i}
                  className="glass-card p-6 hover:scale-105 transition-transform"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-gradient-hero rounded-lg flex items-center justify-center">
                      {icon}
                    </div>
                    <h3 className="text-lg font-semibold text-card-foreground">
                      {title}
                    </h3>
                  </div>
                  <p className="text-muted-foreground">{desc}</p>
                </Card>
              ))}
            </div>

            {/* Download Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                size="lg"
                className="glow-button flex items-center gap-3"
                asChild
              >
                <a href="/turfbuddie.apk" download="turfbuddie.apk">
                  <Download className="w-5 h-5" />
                  Download for Android
                </a>
              </Button>
              {/* Uncomment for iOS */}
              {/* <Button size="lg" variant="outline" className="flex items-center gap-3 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                <Download className="w-5 h-5" />
                Download for iOS
              </Button> */}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-8 pt-4">
              {[
                { value: "4.8★", label: "App Rating" },
                { value: "500+", label: "Downloads" },
                { value: "99%", label: "Satisfaction" },
              ].map(({ value, label }, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold text-foreground">
                    {value}
                  </div>
                  <div className="text-sm text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* App Mockup */}
          <div className="relative flex justify-center">
            <div className="relative">
              <Image
                src="/app-mockup.jpg"
                alt="TurfBuddie App Mockup"
                width={500} // original image width or desired display size
                height={800} // original image height or desired display size
                className="w-full h-auto rounded-3xl shadow-glow"
                priority
              />

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-16 h-16 bg-primary/30 rounded-full blur-xl animate-float" />
              <div
                className="absolute -bottom-4 -left-4 w-20 h-20 bg-primary-glow/30 rounded-full blur-xl animate-float"
                style={{ animationDelay: "1s" }}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DownloadSection;

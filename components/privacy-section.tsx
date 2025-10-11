import { Card } from "@/components/ui/card";
import { Shield, Lock, Eye, Database, UserCheck, Bell } from "lucide-react";

const PrivacySection = () => {
  return (
    <section id="privacy" className="section-padding">
      <div className="container max-w-7xl mx-auto px-4 mt-6">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Privacy <span className=" bg-clip-text">Policy</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Your privacy is our priority. We&apos;re committed to protecting
            your personal information and being transparent about how we use it.
          </p>
        </div>

        {/* Privacy Principles */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <Card className="glass-card p-6 hover:scale-105 transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12  rounded-lg flex items-center justify-center">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">
                Data Protection
              </h3>
            </div>
            <p className="text-muted-foreground">
              We use industry-standard encryption and security measures to
              protect your personal information.
            </p>
          </Card>

          <Card className="glass-card p-6 hover:scale-105 transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12  rounded-lg flex items-center justify-center">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">
                Secure Storage
              </h3>
            </div>
            <p className="text-muted-foreground">
              Your data is stored securely in encrypted databases with
              restricted access controls.
            </p>
          </Card>

          <Card className="glass-card p-6 hover:scale-105 transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12  rounded-lg flex items-center justify-center">
                <Eye className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">
                Transparency
              </h3>
            </div>
            <p className="text-muted-foreground">
              We clearly explain what data we collect and how it&apos;s used to
              improve your experience.
            </p>
          </Card>

          <Card className="glass-card p-6 hover:scale-105 transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12  rounded-lg flex items-center justify-center">
                <Database className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">
                Minimal Collection
              </h3>
            </div>
            <p className="text-muted-foreground">
              We only collect data that&apos;s necessary to provide and improve
              our services.
            </p>
          </Card>

          <Card className="glass-card p-6 hover:scale-105 transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12  rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 " />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">
                User Control
              </h3>
            </div>
            <p className="text-muted-foreground">
              You have complete control over your data with options to view,
              edit, or delete it.
            </p>
          </Card>

          <Card className="glass-card p-6 hover:scale-105 transition-transform">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12  rounded-lg flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-card-foreground">
                Communication
              </h3>
            </div>
            <p className="text-muted-foreground">
              We&apos;ll notify you of any changes to our privacy policy and
              respect your communication preferences.
            </p>
          </Card>
        </div>

        {/* Privacy Policy Details */}
        <div className="glass-card p-8 md:p-12 rounded-2xl">
          <h3 className="text-2xl font-bold mb-8 text-foreground">
            What We Collect & Why
          </h3>

          <div className="space-y-8">
            <div>
              <h4 className="text-xl font-semibold mb-4 text-foreground">
                Account Information
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                We collect your name, email address, and phone number to create
                your account, process bookings, and communicate important
                updates about your reservations.
              </p>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-4 text-foreground">
                Booking Data
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                We store your booking history, preferences, and payment
                information to provide personalized recommendations and
                streamline future bookings.
              </p>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-4 text-foreground">
                Usage Analytics
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                We analyze app usage patterns to improve our platform, fix bugs,
                and develop new features that enhance your experience.
              </p>
            </div>

            <div>
              <h4 className="text-xl font-semibold mb-4 text-foreground">
                Location Data
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                With your permission, we use location data to show nearby turfs
                and provide accurate directions. You can disable this feature
                anytime in your settings.
              </p>
            </div>

            <div className="pt-6 border-t border-border">
              <p className="text-muted-foreground text-sm leading-relaxed">
                <strong className="text-foreground">Last updated:</strong>{" "}
                December 2025. We review and update our privacy policy regularly
                to ensure it reflects our current practices and complies with
                applicable laws. For questions about this policy, contact us at
                privacy@turfbuddie.com
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacySection;

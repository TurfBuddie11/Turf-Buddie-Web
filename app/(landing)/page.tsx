import HeroSection from "@/components/hero-section";
// import TournamentSection from "@/components/tournament-section";
import DownloadSection from "@/components/download-section";
import PrivacySection from "@/components/privacy-section";
import Footer from "@/components/footer";
import TurfListSection from "@/components/turf-section";
import AppHeader from "@/components/app-header";

export default function TurfBuddieLanding() {
  return (
    <div className="min-h-screen mx-auto">
      {/* Header */}
      {/* <Header />      */}
      <AppHeader />
      {/* Hero Section */}
      <HeroSection />
      {/*Tournament*/}
      {/* <TournamentSection /> */}
      <TurfListSection />
      {/* App Download Section */}
      <DownloadSection />
      {/* Privacy Section */}
      <PrivacySection />
      {/* Footer */}
      <Footer />
    </div>
  );
}

import HeroSection from "@/components/hero-section";
import Header from "@/components/landing-header";
// import TournamentSection from "@/components/tournament-section";
import DownloadSection from "@/components/download-section";
import PrivacySection from "@/components/privacy-section";
import Footer from "@/components/footer";
import TurfListSection from "@/components/turf-section";

export default function TurfBuddieLanding() {
  return (
    <div className=" min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900  text-white mx-auto">
      {/* Header */}
      <Header />
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

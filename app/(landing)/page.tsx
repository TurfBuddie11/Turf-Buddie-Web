"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/safe-image";
import { TurfField } from "@/components/ui/turf-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  MapPin,
  Star,
  ArrowRight,
  Heart,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useAuth } from "@/context/auth-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const stats = [
  { value: "30+", label: "Active Turfs" },
  { value: "2,400+", label: "Bookings Made" },
  { value: "5,800+", label: "Players Connected" },
  { value: "48", label: "Active Tournaments" },
];

const features = [
  { icon: "⚽", title: "Turf Booking", desc: "Real-time slot availability. Book in 3 taps.", tag: "Core" },
  { icon: "💸", title: "Split Payment", desc: "Divide costs with teammates via UPI/WhatsApp.", tag: "New" },
  { icon: "🔍", title: "Find Player", desc: "Join or build squads. Filter by sport & skill.", tag: "New" },
  { icon: "🏆", title: "Tournaments", desc: "Register teams, buy tickets, track brackets.", tag: "Hot" },
  { icon: "☕", title: "Venue Café", desc: "Order snacks & drinks from turf café in-app.", tag: "Soon" },
];

const sportsFilters = [
  { icon: "⚽", label: "Football" },
  { icon: "🏏", label: "Cricket" },
  { icon: "🏸", label: "Badminton" },
  { icon: "🎾", label: "Tennis" },
  { icon: "🏀", label: "Basketball" },
];

const amenityFilters = [
  { icon: "💡", label: "Floodlights" },
  { icon: "🚿", label: "Washroom" },
  { icon: "🅿", label: "Parking" },
  { icon: "☕", label: "Café" },
  { icon: "💧", label: "Drinking Water" },
];



const timeSlots = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM",
  "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM",
  "6:00 PM", "7:00 PM", "8:00 PM",
];

const players = [
  { name: "Aryan Kumar", sport: "Football", position: "Centre Forward", skill: "Intermediate", games: 42, gender: "Male" },
  { name: "Rohit Sharma", sport: "Football", position: "Goalkeeper", skill: "Beginner", games: 18, gender: "Male" },
  { name: "Sneha P.", sport: "Football", position: "Midfielder", skill: "Advanced", games: 87, gender: "Female" },
  { name: "Vikram N.", sport: "Football", position: "Defender", skill: "Intermediate", games: 56, gender: "Male" },
];

const teamMembers = [
  { name: "Tanishq G.", phone: "", amount: 200, status: "Paid", role: "Organiser" },
  { name: "Aryan K.", phone: "+91 98765 43210", amount: 200, status: "Paid" },
  { name: "Rohit S.", phone: "+91 87654 32109", amount: 200, status: "Pending" },
  { name: "Vikram P.", phone: "+91 76543 21098", amount: 200, status: "Pending" },
];

interface PopularTurf {
  id: string;
  name: string;
  address: string;
  city?: string;
  imageurl: string;
  rating: number;
  price: number;
  sport: string[];
  formats?: string[];
  amenities?: string[];
  availability?: string;
  coordinates?: string;
  active?: boolean;
  totalBookings: number;
  totalBookingAmount: number;
  totalCommission: number;
  totalPayout: number;
  avgBookingPrice: number;
  slots: string[];
  bookedSlots: Record<string, number>;
  availableSlotsToday?: number;
  totalSlots?: number;
}

const dayNames = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

function getDynamicDates() {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    return {
      day: i === 0 ? "TODAY" : dayNames[date.getDay()],
      date: date.getDate(),
      valid: true,
    };
  });
}

function parseCoordinates(coordinates: string) {
  const parts = coordinates.split(",").map((part) => part.trim());
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (Number.isNaN(lat) || Number.isNaN(lng)) return null;
  return { lat, lng };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TurfBuddieLanding() {
  const { user } = useAuth();
  const [selectedSport, setSelectedSport] = useState("All");
  const [priceRange, setPriceRange] = useState([1200]);
  const [selectedDistance, setSelectedDistance] = useState(10);
  const [selectedFormat, setSelectedFormat] = useState("All");
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedAvailability, setSelectedAvailability] = useState("Open Now");
  const [sortOption, setSortOption] = useState("Nearest First");
  const [selectedDate, setSelectedDate] = useState(getDynamicDates()[0].date);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [splitFormat, setSplitFormat] = useState("5v5");
  const [splitPrice, setSplitPrice] = useState(800);
  const [selectedPlayerSkill, setSelectedPlayerSkill] = useState("All");
  const [selectedGender, setSelectedGender] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("All");
  const [headerCity, setHeaderCity] = useState("Your City");
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [popularTurfs, setPopularTurfs] = useState<PopularTurf[]>([]);
  const [selectedTurf, setSelectedTurf] = useState<PopularTurf | null>(null);
  const [loadingTurfs, setLoadingTurfs] = useState(true);
  const [browseTurfs, setBrowseTurfs] = useState<PopularTurf[]>([]);
  const [loadingBrowse, setLoadingBrowse] = useState(true);

  // Tournament state
  interface LandingTournament {
    id: string;
    name: string;
    sport: string;
    description: string;
    image: string;
    prizePool?: number;
    registrationFee: number;
    startDate: string;
    endDate: string;
    venue: string;
    teamSize: number;
    maxTeams: number;
    registeredTeams: number;
    status: string;
  }
  const [liveTournaments, setLiveTournaments] = useState<LandingTournament[]>([]);
  const [loadingTournaments, setLoadingTournaments] = useState(true);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponDiscount, setCouponDiscount] = useState(0);

  // Split payment state
  const [splitCount, setSplitCount] = useState(4);

  useEffect(() => {
    async function fetchData() {
      try {
        // popular turfs for slot booking section
        const popularRes = await fetch("/api/turfs/popular");
        const popularData = await popularRes.json();
        if (popularData.turfs && popularData.turfs.length > 0) {
          setPopularTurfs(popularData.turfs);
          setSelectedTurf(popularData.turfs[0]);
          setSplitPrice(popularData.turfs[0].price || 800);
        }
      } catch (err) {
        console.error("Failed to fetch popular turfs:", err);
      } finally {
        setLoadingTurfs(false);
      }

      try {
        // all turfs for browse & discover section
        const browseRes = await fetch("/api/turfs/browse");
        const browseData = await browseRes.json();
        if (browseData.turfs) {
          setBrowseTurfs(browseData.turfs);
        }
      } catch (err) {
        console.error("Failed to fetch browse turfs:", err);
      } finally {
        setLoadingBrowse(false);
      }

      try {
        // tournaments for homepage section
        const tourRes = await fetch("/api/tournaments");
        const tourData = await tourRes.json();
        if (tourData.tournaments) {
          setLiveTournaments(tourData.tournaments);
        }
      } catch (err) {
        console.error("Failed to fetch tournaments:", err);
      } finally {
        setLoadingTournaments(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
          setLocationLoading(false);
        },
        () => {
          setUserLocation(null);
          setLocationLoading(false);
        },
        { enableHighAccuracy: false },
      );
    }
  }, []);

  const dates = useMemo(() => getDynamicDates(), []);

  const scrollToBrowse = (e?: React.MouseEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const el = document.getElementById("browse");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.hash = "#browse";
    }
  };

  // Extract city ONLY from `data.city` column (no address fallback)
  const extractCity = (address: string): string => {
    return "";
  };

  const locations = useMemo(() => {
    const uniqueLocs = new Set<string>();
    browseTurfs.forEach((t) => {
      const city = (t as { city?: string }).city;
      if (city && typeof city === "string" && city.trim()) {
        uniqueLocs.add(city.trim());
      }
    });
    return Array.from(uniqueLocs).sort();
  }, [browseTurfs]);

  const filteredBrowseTurfs = useMemo(() => {
    let result = browseTurfs.filter((t) => {
      // Location filter — match only by `city` column
      if (selectedLocation !== "All") {
        const city = (t.city || "").toLowerCase().trim();
        const sel = selectedLocation.toLowerCase().trim();
        if (city !== sel) return false;
      }

      // Sport filter — case-insensitive partial match
      if (selectedSport !== "All") {
        const turfSports = (t.sport || []).map((s: string) => s.toLowerCase());
        if (!turfSports.some((s: string) => s.includes(selectedSport.toLowerCase()))) {
          return false;
        }
      }

      // Format filter — case-insensitive
      if (selectedFormat !== "All") {
        const turfFormats = (t.formats || []).map((f: string) => f.toLowerCase());
        if (!turfFormats.some((f: string) => f.includes(selectedFormat.toLowerCase()))) {
          return false;
        }
      }

      // Amenities filter — case-insensitive partial match
      if (selectedAmenities.length > 0) {
        const turfAmenities = (t.amenities || []).map((a: string) => a.toLowerCase());
        const allMatch = selectedAmenities.every((selected) =>
          turfAmenities.some((a: string) => a.includes(selected.toLowerCase())),
        );
        if (!allMatch) return false;
      }

      // Availability filter
      if (selectedAvailability === "Open Now" && t.active === false) {
        return false;
      }

      // Price filter
      if (priceRange[0] && t.price > priceRange[0]) {
        return false;
      }

      // Distance filter — only when GPS location is available
      if (userLocation && t.coordinates) {
        const coordinatePair = parseCoordinates(t.coordinates);
        if (coordinatePair) {
          const dist = haversineDistance(
            userLocation.latitude,
            userLocation.longitude,
            coordinatePair.lat,
            coordinatePair.lng,
          );
          if (dist > selectedDistance) return false;
        }
      }

      return true;
    });

    // Sorting
    if (sortOption === "Price Low to High") {
      result = [...result].sort((a, b) => a.price - b.price);
    } else if (sortOption === "Price High to Low") {
      result = [...result].sort((a, b) => b.price - a.price);
    } else if (sortOption === "Top Rated") {
      result = [...result].sort((a, b) => b.rating - a.rating);
    } else if (sortOption === "Nearest First" && userLocation) {
      result = [...result].sort((a, b) => {
        const ca = a.coordinates ? parseCoordinates(a.coordinates) : null;
        const cb = b.coordinates ? parseCoordinates(b.coordinates) : null;
        const da = ca ? haversineDistance(userLocation.latitude, userLocation.longitude, ca.lat, ca.lng) : 9999;
        const db = cb ? haversineDistance(userLocation.latitude, userLocation.longitude, cb.lat, cb.lng) : 9999;
        return da - db;
      });
    }

    return result;
  }, [browseTurfs, selectedLocation, selectedSport, selectedFormat, selectedAmenities, selectedAvailability, priceRange, sortOption, selectedDistance, userLocation]);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-4 shrink-0">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Image
                src="/logo.png"
                alt="TurfBuddie"
                width={36}
                height={36}
                className="rounded-lg shrink-0"
                priority
              />
              <span className="text-lg font-bold text-green-600 hidden sm:block">TurfBuddie</span>
            </Link>
            <nav className="hidden md:flex items-center gap-5">
              <a href="#browse" onClick={scrollToBrowse} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400">Browse</a>
              <a href="#split-pay" className="text-sm font-medium text-green-600 dark:text-green-400">Split Pay</a>
              <a href="#find-player" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400">Find Player</a>
              <a href="#tournaments" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-green-600 dark:hover:text-green-400">Tournaments</a>
            </nav>
          </div>

          {/* Right: City + Theme + Book Now */}
          <div className="flex items-center gap-2 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-1.5 dark:border-gray-700 dark:text-gray-200 justify-between px-2.5 md:min-w-[140px]">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="hidden sm:block truncate max-w-[80px] md:max-w-none text-sm">
                      {locationLoading
                        ? "Locating..."
                        : selectedLocation === "All"
                          ? headerCity === "All"
                            ? "All Cities"
                            : headerCity
                          : selectedLocation}
                    </span>
                  </span>
                  <ChevronDown className="w-4 h-4 shrink-0 hidden sm:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={() => { setHeaderCity("All"); setSelectedLocation("All"); }}
                  className={headerCity === "All" ? "font-semibold text-green-600" : ""}
                >
                  <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400" />
                  All Cities
                </DropdownMenuItem>
                {locations.map((city) => (
                  <DropdownMenuItem
                    key={city}
                    onSelect={() => { setHeaderCity(city); setSelectedLocation(city); }}
                    className={headerCity === city ? "font-semibold text-green-600" : ""}
                  >
                    <MapPin className="w-3.5 h-3.5 mr-2 text-gray-400" />
                    {city}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem
                  onSelect={() => {
                    if (navigator.geolocation) {
                      setLocationLoading(true);
                      navigator.geolocation.getCurrentPosition(
                        (pos) => { setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }); setHeaderCity("Near Me"); setSelectedLocation("All"); setLocationLoading(false); },
                        () => setLocationLoading(false),
                        { enableHighAccuracy: true },
                      );
                    }
                  }}
                  className="text-green-600 font-medium border-t mt-1 pt-2"
                >
                  📍 Use My Location
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {/* Dark/Light toggle */}
            <ThemeToggle />
            {/* Book Now — hidden on mobile */}
            <Button onClick={scrollToBrowse} className="hidden md:inline-flex bg-green-600 hover:bg-green-700 text-white">Book Now</Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white dark:bg-gray-950 py-12 md:py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Left: Copy + CTA + Stats */}
            <div className="order-1 md:order-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 mb-4">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                Live Now
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-gray-900 dark:text-white leading-tight">
                Find. Book.{" "}
                <span className="text-green-600 dark:text-green-400">
                  Play Together.
                </span>
              </h1>
              <p className="text-base md:text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-xl">
                The smartest turf booking platform. Real-time slot availability, split payments with your squad, find new players, and compete in local tournaments.
              </p>
              <div className="flex flex-wrap gap-3 mb-10">
                <Button
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 gap-2"
                  onClick={() => document.getElementById("browse")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  ⚽ Browse Turfs
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2"
                  onClick={() => document.getElementById("tournaments")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  🏆 View Tournaments
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
                {stats.map((stat, i) => (
                  <div key={i}>
                    <div className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                      {stat.value}
                    </div>
                    <div className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Field mockup with turf card overlay */}
            <div className="relative order-2 md:order-2 min-w-0">
              {/* Floating "Instant" badge */}
              <div className="absolute -top-4 right-4 z-20 bg-white rounded-2xl shadow-xl px-4 py-2 flex items-center gap-2 ring-1 ring-green-100">
                <span className="text-lg">⚡</span>
                <span className="text-sm font-semibold text-gray-900">Instant</span>
              </div>

              {/* Field mockup — show real turf image if available, else green field */}
              <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl bg-gray-900 max-h-[480px]">
                {(() => {
                  // Find a turf image that isn't a broken base64 data URL
                  const isUsable = (url: string | undefined) =>
                    !!url && !url.startsWith("data:");
                  const featured =
                    (popularTurfs.find((t) => isUsable(t.imageurl)) ||
                      browseTurfs.find((t) => isUsable(t.imageurl))) ??
                    null;
                  if (featured?.imageurl) {
                    return (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={featured.imageurl}
                        alt={featured.name}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="eager"
                      />
                    );
                  }
                  // Green field fallback (always renders)
                  return <TurfField />;
                })()}
                {/* Subtle dark tint so text overlays remain readable on real images */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/0 to-black/0" />
              </div>

              {/* Floating turf card overlay (bottom) */}
              <div className="relative -mt-20 sm:-mt-24 mx-4 sm:mx-8 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-4 sm:p-5 ring-1 ring-black/5 z-10">
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-bold text-base sm:text-lg text-gray-900 dark:text-white">
                    Greenfield Sports Arena
                  </h3>
                </div>
                <div className="flex items-center gap-2 mb-3 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <Badge className="bg-green-100 text-green-700 border-0 gap-1 px-1.5 py-0.5">
                    <Star className="h-3 w-3 fill-green-600 text-green-600" />
                    <span className="font-semibold">4.7</span>
                  </Badge>
                  <MapPin className="h-3.5 w-3.5 text-red-500" />
                  <span>2.1 km · Dharampeth</span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {["6 AM", "7 AM", "8 AM", "9 AM", "10 AM", "5 PM", "6 PM"].map(
                    (slot, idx) => {
                      const isStrikethrough = idx === 1 || idx === 4;
                      const isHighlighted = idx === 2 || idx === 3 || idx === 5 || idx === 6;
                      return (
                        <span
                          key={slot}
                          className={cn(
                            "px-2.5 py-1 text-xs rounded-md border",
                            isStrikethrough
                              ? "bg-gray-100 text-gray-400 border-gray-200 line-through"
                              : isHighlighted
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-white text-gray-700 border-gray-200"
                          )}
                        >
                          {slot}
                        </span>
                      );
                    }
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                      ₹800
                    </span>
                    <span className="text-sm text-gray-500"> /hr</span>
                  </div>
                  <Button className="bg-green-600 hover:bg-green-700 text-white gap-2">
                    Book Now
                  </Button>
                </div>
              </div>

              {/* Floating "Split Pay" badge */}
              <div className="absolute -bottom-2 -left-2 z-20 bg-white rounded-2xl shadow-xl px-4 py-3 ring-1 ring-green-100 flex items-center gap-3">
                <div className="text-2xl">👥</div>
                <div>
                  <div className="text-sm font-bold text-gray-900">Split Pay</div>
                  <div className="text-xs text-gray-500">Share with squad</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Browse & Discover */}
      <section id="browse" className="py-16 bg-white dark:bg-gray-950 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Section Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 mb-4">
              <span className="text-green-500">⚡</span> BROWSE &amp; DISCOVER
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Find the perfect <span className="text-green-500">turf near you</span>
            </h2>
            <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm max-w-md">
              Filter by sport, distance, amenities and price. Real-time slot updates via WhatsApp bot.
            </p>
          </div>

          {/* Results bar + Sort */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6">
            <span className="text-sm text-gray-500">
              Showing <strong>{filteredBrowseTurfs.length}</strong> turfs near {selectedLocation === "All" ? headerCity : selectedLocation}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sort:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 rounded-lg border-gray-200 text-sm font-medium">
                    {sortOption}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {["Nearest First", "Top Rated", "Price Low to High", "Price High to Low"].map((option) => (
                    <DropdownMenuItem
                      key={option}
                      onSelect={() => setSortOption(option)}
                      className={option === sortOption ? "font-semibold text-green-600" : ""}
                    >
                      {option}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid gap-8 xl:grid-cols-[280px_minmax(0,1fr)]">
            {/* Filter Sidebar */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 h-fit">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-base font-bold text-gray-900 dark:text-white">Filters</h3>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSport("All");
                    setPriceRange([1200]);
                    setSelectedFormat("All");
                    setSelectedAmenities([]);
                    setSelectedAvailability("Open Now");
                    setSelectedLocation("All");
                  }}
                  className="text-xs font-medium text-green-600 hover:text-green-700"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-5">
                {/* SPORT */}
                <div>
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase mb-3">Sport</p>
                  <div className="flex flex-wrap gap-2">
                    {sportsFilters.map((sport) => (
                      <button
                        key={sport.label}
                        type="button"
                        onClick={() => setSelectedSport(sport.label === selectedSport ? "All" : sport.label)}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${selectedSport === sport.label
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                          }`}
                      >
                        {sport.icon} {sport.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* DISTANCE */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Distance</p>
                    <span className="text-xs font-medium text-gray-600">Within {selectedDistance} km</span>
                  </div>
                  <Slider
                    value={[selectedDistance]}
                    onValueChange={(value) => setSelectedDistance(value[0])}
                    min={1}
                    max={50}
                    step={1}
                  />
                  {!userLocation && (
                    <button
                      type="button"
                      onClick={() => {
                        if (navigator.geolocation) {
                          setLocationLoading(true);
                          navigator.geolocation.getCurrentPosition(
                            (pos) => {
                              setUserLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
                              setHeaderCity("Near Me");
                              setLocationLoading(false);
                            },
                            () => setLocationLoading(false),
                            { enableHighAccuracy: true },
                          );
                        }
                      }}
                      className="flex items-center gap-1.5 text-[11px] text-amber-600 hover:text-amber-700 font-medium"
                    >
                      <MapPin className="w-3 h-3" />
                      {locationLoading ? "Getting location..." : "Enable location to use distance filter"}
                    </button>
                  )}
                  {userLocation && (
                    <p className="text-[11px] text-green-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> Location active — filtering by distance
                    </p>
                  )}
                </div>

                <div className="h-px bg-gray-100" />

                {/* PRICE/HR */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Price / hr</p>
                    <span className="text-xs font-medium text-gray-600">Up to ₹{priceRange[0]}</span>
                  </div>
                  <Slider
                    value={priceRange}
                    onValueChange={(value) => setPriceRange(value)}
                    max={2000}
                    step={100}
                  />
                </div>

                <div className="h-px bg-gray-100" />

                {/* FORMAT */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Format</p>
                  <div className="flex flex-wrap gap-2">
                    {["5v5", "7v7", "11v11"].map((format) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => setSelectedFormat(format === selectedFormat ? "All" : format)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${selectedFormat === format
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                          }`}
                      >
                        {format}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* AMENITIES */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Amenities</p>
                  <div className="space-y-2.5">
                    {amenityFilters.map((amenity) => {
                      const active = selectedAmenities.includes(amenity.label);
                      return (
                        <label key={amenity.label} className="flex items-center gap-3 cursor-pointer group">
                          <div
                            onClick={() => {
                              setSelectedAmenities((prev) =>
                                prev.includes(amenity.label)
                                  ? prev.filter((item) => item !== amenity.label)
                                  : [...prev, amenity.label],
                              );
                            }}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 cursor-pointer transition-all ${active
                              ? "bg-green-600 border-green-600"
                              : "border-gray-300 group-hover:border-green-400"
                              }`}
                          >
                            {active && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8">
                                <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </div>
                          <span className="text-sm text-gray-600 flex items-center gap-1.5">
                            <span>{amenity.icon}</span> {amenity.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* AVAILABILITY */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold tracking-widest text-gray-400 uppercase">Availability</p>
                  <div className="flex flex-wrap gap-2">
                    {["Open Now", "Morning", "Evening"].map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedAvailability(option)}
                        className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${selectedAvailability === option
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-600 border-gray-200 hover:border-green-300"
                          }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Turf Cards Grid */}
            <div>
              {loadingBrowse ? (
                <div className="flex justify-center py-12">
                  <Spinner className="h-8 w-8" />
                </div>
              ) : browseTurfs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No turfs available yet.</div>
              ) : filteredBrowseTurfs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No turfs found. Try adjusting your filters.
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2">
                  {filteredBrowseTurfs.map((turf) => {
                    const availableSlots = turf.availableSlotsToday ?? (turf.totalSlots ?? 13);
                    const coordinatePair = turf.coordinates ? parseCoordinates(turf.coordinates) : null;
                    const distance =
                      coordinatePair && userLocation
                        ? haversineDistance(
                          userLocation.latitude,
                          userLocation.longitude,
                          coordinatePair.lat,
                          coordinatePair.lng,
                        )
                        : null;

                    // Badge logic
                    const badge =
                      turf.rating >= 4.8
                        ? { label: "⭐ Top Rated", bg: "bg-amber-500", text: "text-white" }
                        : turf.price <= 700
                          ? { label: "💰 Budget Pick", bg: "bg-green-600", text: "text-white" }
                          : turf.active === false
                            ? { label: "🆕 New Venue", bg: "bg-blue-500", text: "text-white" }
                            : { label: "✅ Open Now", bg: "bg-green-600", text: "text-white" };

                    // Sport icon for gradient card
                    const sportIcon =
                      turf.sport?.includes("Cricket")
                        ? "🏏"
                        : turf.sport?.includes("Football")
                          ? "⚽"
                          : turf.sport?.includes("Badminton")
                            ? "🏸"
                            : turf.sport?.includes("Tennis")
                              ? "🎾"
                              : "🏟️";

                    // Format string
                    const formatStr = turf.formats?.join(" · ") || "";

                    return (
                      <Link
                        key={turf.id}
                        href={`/turfs/${turf.id}`}
                        className="block rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow group"
                      >
                        {/* Card Image / Gradient Header */}
                        <div className="relative h-[180px] overflow-hidden">
                          {turf.imageurl ? (
                            <>
                              <SafeImage
                                src={turf.imageurl}
                                alt={turf.name}
                                fill
                                className="object-cover group-hover:scale-105 transition-transform duration-300"
                                sizes="(max-width: 768px) 100vw, 50vw"
                              />
                              <div className="absolute inset-0 bg-black/20" />
                            </>
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-6xl opacity-30 select-none grayscale">
                                {sportIcon}
                              </span>
                            </div>
                          )}

                          {/* Badge top-left */}
                          <div className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </div>

                          {/* Heart top-right */}
                          <button
                            type="button"
                            onClick={(e) => e.preventDefault()}
                            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-gray-400 shadow hover:text-red-500 transition-colors"
                            aria-label="Save turf"
                          >
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Card Body */}
                        <div className="p-4">
                          <h3 className="text-[15px] font-bold text-gray-900 dark:text-white mb-2">{turf.name}</h3>

                          {/* Rating + distance + format row */}
                          <div className="flex flex-wrap items-center gap-2 mb-3">
                            <span className="inline-flex items-center gap-1 rounded-md bg-green-600 px-2 py-0.5 text-xs font-bold text-white">
                              <Star className="w-3 h-3 fill-white" />
                              {turf.rating.toFixed(1)}
                            </span>
                            {distance !== null && (
                              <span className="flex items-center gap-1 text-xs text-gray-500">
                                <MapPin className="w-3 h-3 text-red-400" />
                                {distance.toFixed(1)} km
                              </span>
                            )}
                            {formatStr && (
                              <span className="text-xs text-gray-400">{formatStr}</span>
                            )}
                          </div>

                          {/* Amenity pills */}
                          <div className="flex flex-wrap gap-1.5 mb-4">
                            {(turf.amenities?.slice(0, 4) ?? ["Lights", "Washroom"]).map((amenity) => (
                              <span
                                key={amenity}
                                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] text-gray-500"
                              >
                                {amenity}
                              </span>
                            ))}
                          </div>

                          <div className="h-px bg-gray-100 dark:bg-gray-800 mb-3" />

                          {/* Price + Book Now */}
                          <div className="flex items-end justify-between">
                            <div>
                              <span className="text-xl font-bold text-green-600">₹{turf.price}</span>
                              <span className="text-xs text-gray-400 ml-1">/hr</span>
                              <p className="text-[11px] font-medium text-green-600 mt-0.5">
                                {availableSlots} slots open today
                              </p>
                            </div>
                            <span className="bg-green-600 hover:bg-green-700 text-white rounded-xl px-5 h-9 text-sm font-semibold inline-flex items-center">
                              Book Now
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Slot Booking Section */}
      <section className="py-16 bg-[#f5f7f5] dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 mb-4">
              🎯 SLOT BOOKING
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Pick your slot, <span className="text-green-500">play today</span>
            </h2>
            <p className="text-gray-400 mt-2 text-sm max-w-sm">
              Slots sync live with venue WhatsApp bot. What you see is what&apos;s available right now.
            </p>
          </div>

          {loadingTurfs ? (
            <div className="flex justify-center py-12"><Spinner className="h-8 w-8" /></div>
          ) : popularTurfs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No turfs available. Check back soon!</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-6 items-start">
              {/* ── LEFT PANEL ── */}
              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-6 space-y-6">
                {/* Turf selector row */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-green-600 flex items-center justify-center shrink-0 overflow-hidden">
                    {selectedTurf?.imageurl ? (
                      <SafeImage src={selectedTurf.imageurl} alt={selectedTurf.name} width={56} height={56} className="object-cover w-full h-full" />
                    ) : (
                      <span className="text-2xl">⚽</span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <select
                      value={selectedTurf?.id || ""}
                      onChange={(e) => {
                        const turf = popularTurfs.find((t) => t.id === e.target.value);
                        if (turf) { setSelectedTurf(turf); setSplitPrice(turf.price || 800); setSelectedTime(null); }
                      }}
                      className="font-bold text-base bg-transparent border-none focus:outline-none cursor-pointer w-full text-gray-900 dark:text-white"
                    >
                      {popularTurfs.map((turf) => (
                        <option key={turf.id} value={turf.id}>{turf.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                      <span className="flex items-center gap-0.5">
                        <MapPin className="w-3 h-3 text-red-400" />
                        {selectedTurf?.address?.split(",").slice(0, 2).join(",").trim() || "Location"}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        {selectedTurf?.rating?.toFixed(1) || "0"}
                      </span>
                      <span className="text-amber-500 font-semibold">⚡ Open Now</span>
                    </div>
                  </div>
                  <div className="shrink-0 flex items-center gap-1.5 rounded-full bg-green-600 text-white px-3 py-1.5 text-xs font-semibold">
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                    WA Synced
                  </div>
                </div>

                <div className="h-px bg-gray-100" />

                {/* Select Date */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Select Date</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {dates.map((d, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedDate(d.date)}
                        className={`flex flex-col items-center px-3 py-2 rounded-xl border min-w-[52px] transition-all ${selectedDate === d.date
                          ? "bg-green-600 border-green-600 text-white"
                          : "border-gray-200 text-gray-600 hover:border-green-300"
                          }`}
                      >
                        <span className="text-[9px] font-bold tracking-wide">{d.day}</span>
                        <span className="text-lg font-bold leading-tight">{d.date}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Available Slots */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-gray-800">Available Slots</p>
                    <div className="flex items-center gap-3 text-[11px] text-gray-500">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-100 border border-green-300 inline-block" />Available</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200 inline-block" />Booked</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-50 border border-amber-200 inline-block" />Peak hrs</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {timeSlots.map((slot) => {
                      const isSelected = selectedTime === slot;
                      const hour = parseInt(slot.split(":")[0]);
                      const isPM = slot.includes("PM");
                      const hour24 = isPM && hour !== 12 ? hour + 12 : (!isPM && hour === 12 ? 0 : hour);
                      const isPeak = hour24 >= 16 && hour24 <= 20;
                      return (
                        <button
                          key={slot}
                          onClick={() => setSelectedTime(isSelected ? null : slot)}
                          className={`py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all text-center ${isSelected
                            ? "bg-green-600 border-green-600 text-white shadow-sm"
                            : isPeak
                              ? "bg-amber-50 border-amber-200 text-amber-700 hover:border-amber-400"
                              : "bg-green-50 border-green-200 text-green-700 hover:border-green-400"
                            }`}
                        >
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Select Format */}
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">Select Format</p>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "5 vs 5", short: "5v5", price: selectedTurf?.price || 800 },
                      { label: "7 vs 7", short: "7v7", price: Math.round((selectedTurf?.price || 800) * 1.25) },
                      { label: "11 vs 11", short: "11v11", price: Math.round((selectedTurf?.price || 800) * 1.75) },
                    ].map((f) => (
                      <button
                        key={f.short}
                        onClick={() => { setSplitFormat(f.short); setSplitPrice(f.price); }}
                        className={`rounded-xl border py-4 text-sm font-semibold transition-all flex flex-col items-center gap-1 ${splitFormat === f.short
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-200 text-gray-700 hover:border-green-300 bg-white"
                          }`}
                      >
                        <span className="text-xl">⚽</span>
                        <span className="font-bold">{f.label}</span>
                        <span className="text-[11px] text-gray-400 font-normal">₹{f.price}/hr</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Coupon */}
                <div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponApplied(false); setCouponDiscount(0); }}
                      placeholder="Enter coupon code"
                      className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white"
                    />
                    <button
                      onClick={() => {
                        if (couponCode === "TURFPLAY20") {
                          setCouponDiscount(Math.round(splitPrice * 0.20));
                          setCouponApplied(true);
                        } else {
                          setCouponDiscount(0);
                          setCouponApplied(false);
                        }
                      }}
                      className="rounded-xl bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {couponApplied && (
                    <p className="text-xs text-green-600 font-medium mt-2">✓ 20% off applied! You save ₹{couponDiscount}</p>
                  )}
                </div>
              </div>

              {/* ── RIGHT PANEL — Booking Summary ── */}
              <div className="rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm p-5 sticky top-24">
                <h3 className="font-bold text-base text-gray-900 dark:text-white mb-4">Booking Summary</h3>

                {/* Turf summary card */}
                <div className="rounded-xl bg-green-600 text-white p-3.5 mb-4">
                  <p className="font-bold text-sm">🏟 {selectedTurf?.name || "—"}</p>
                  <p className="text-xs text-green-100 mt-1">
                    🗓 {dates.find(d => d.date === selectedDate)?.day || "Today"} · {selectedTime || "No slot"} · {splitFormat}
                  </p>
                </div>

                {/* Price breakdown */}
                <div className="space-y-3 text-sm mb-4">
                  <div className="flex justify-between text-gray-500">
                    <span>Turf charge (1hr)</span>
                    <span className="text-gray-900 font-medium">₹{splitPrice}</span>
                  </div>
                  {couponApplied && couponDiscount > 0 && (
                    <div className="flex justify-between text-gray-500">
                      <span>Discount ({couponCode})</span>
                      <span className="text-green-600 font-semibold">−₹{couponDiscount}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-gray-500">
                    <span>Platform fee</span>
                    <span className="text-gray-900 font-medium">₹{Math.round(splitPrice * 0.02)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>Taxes (GST 18%)</span>
                    <span className="text-gray-900 font-medium">₹{Math.round((splitPrice - couponDiscount) * 0.18)}</span>
                  </div>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between font-bold text-base">
                    <span>🏷 Total to Pay</span>
                    <span className="text-gray-900">₹{splitPrice - couponDiscount + Math.round(splitPrice * 0.02) + Math.round((splitPrice - couponDiscount) * 0.18)}</span>
                  </div>
                </div>

                {/* Pay button */}
                {user ? (
                  <Link href={selectedTurf ? `/turfs/${selectedTurf.id}` : "/explore"}>
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3.5 text-sm font-bold transition-colors mb-3">
                      🔒 Pay ₹{splitPrice - couponDiscount + Math.round(splitPrice * 0.02) + Math.round((splitPrice - couponDiscount) * 0.18)} Now
                    </button>
                  </Link>
                ) : (
                  <Link href={`/login?redirect=${encodeURIComponent(selectedTurf ? `/turfs/${selectedTurf.id}` : "/explore")}`}>
                    <button className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-3.5 text-sm font-bold transition-colors mb-3">
                      🔒 Login to Pay ₹{splitPrice - couponDiscount + Math.round(splitPrice * 0.02) + Math.round((splitPrice - couponDiscount) * 0.18)}
                    </button>
                  </Link>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className="h-px flex-1 bg-gray-100" />
                  <span className="text-[11px] text-gray-400">— or —</span>
                  <div className="h-px flex-1 bg-gray-100" />
                </div>

                <Link href={selectedTurf ? `/turfs/${selectedTurf.id}` : "/explore"}>
                  <button className="w-full border-2 border-green-500 text-green-600 rounded-xl py-3 text-sm font-bold hover:bg-green-50 transition-colors mb-4">
                    💸 Split with Teammates
                  </button>
                </Link>

                <div className="flex items-center justify-center gap-4 mb-4">
                  {["UPI", "GPay", "PhonePe", "Card"].map((m) => (
                    <span key={m} className="text-[11px] text-gray-400 font-medium">{m}</span>
                  ))}
                </div>

                <div className="rounded-xl bg-green-50 border border-green-100 px-3 py-2.5 text-xs text-gray-600 text-center">
                  🔔 You&apos;ll receive a <span className="font-semibold text-gray-800">WhatsApp confirmation</span> within 30 seconds
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Split Payment Section */}
      <section id="split-pay" className="py-16 bg-white dark:bg-gray-950 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4">
          {/* Header */}
          <div className="mb-10">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 mb-4">
              💸 SPLIT PAYMENT
            </div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
              Split the cost, <span className="text-green-500">play together</span>
            </h2>
            <p className="text-gray-400 dark:text-gray-500 mt-2 text-sm max-w-md">
              Never chase your teammates for money again. Everyone pays their share via WhatsApp + UPI.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

            {/* ── LEFT — Interactive Split Demo ── */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm p-6 space-y-5">

              {/* Booking info bar */}
              <div className="rounded-xl bg-green-600 text-white p-4 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{selectedTurf?.name || "Greenfield Sports Arena"}</p>
                  <p className="text-xs text-green-100 mt-0.5">
                    {selectedTime ? `🕐 ${selectedTime}` : "Today · 4:00 PM – 5:00 PM"} · {splitFormat}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-green-200">Total</p>
                  <p className="font-bold text-lg">₹{splitPrice}</p>
                </div>
              </div>

              {/* Split count selector */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-800">Split between</p>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={2}
                      max={50}
                      value={splitCount}
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (!isNaN(val) && val >= 2) setSplitCount(val);
                      }}
                      className="w-16 rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-bold text-center text-gray-800 focus:outline-none focus:border-green-400"
                    />
                    <span className="text-sm text-gray-400">players</span>
                  </div>
                </div>

                {/* Per person amount */}
                <div className="rounded-xl bg-green-50 border border-green-100 p-3 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    ₹{splitPrice} ÷ {splitCount} players
                  </div>
                  <div className="font-bold text-green-700 text-lg">
                    ₹{Math.ceil(splitPrice / splitCount)} <span className="text-xs font-normal text-gray-400">each</span>
                  </div>
                </div>
              </div>

              {/* Team members list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">Squad Members</p>
                  <span className="text-xs text-gray-400">
                    {teamMembers.filter(m => m.status === "Paid").length} paid · {teamMembers.filter(m => m.status === "Pending").length} pending
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${(teamMembers.filter(m => m.status === "Paid").length / teamMembers.length) * 100}%` }}
                  />
                </div>

                {teamMembers.map((member, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${member.status === "Paid" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                        }`}>
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{member.name}</p>
                        <p className="text-xs text-gray-400">{member.phone || member.role || "Organiser"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₹{member.amount}</p>
                      <p className={`text-xs font-medium ${member.status === "Paid" ? "text-green-600" : "text-amber-500"}`}>
                        {member.status === "Paid" ? "✓ Paid" : "⏳ Pending"}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Add teammate input */}
                <div className="flex gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="+ Add teammate phone number"
                    className="flex-1 rounded-xl border border-dashed border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:border-green-400 bg-white text-gray-600 placeholder:text-gray-400"
                  />
                  <button className="rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors">
                    Add
                  </button>
                </div>
              </div>

              {/* Action buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => {
                    const msg = `🏟 Hey! Let's book ${selectedTurf?.name || "the turf"} together. Your share: ₹${Math.ceil(splitPrice / splitCount)}. Pay via UPI and confirm your slot!`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white py-3 text-sm font-bold transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                  Send WhatsApp Payment Links
                </button>
                <button className="w-full rounded-xl border border-gray-200 text-gray-600 hover:border-green-400 hover:text-green-700 py-3 text-sm font-semibold transition-colors">
                  📲 Send Reminder to Pending Members
                </button>
              </div>

              {/* Custom split note */}
              <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 flex gap-2">
                <span className="text-base shrink-0">💡</span>
                <div>
                  <p className="text-xs font-semibold text-amber-800">Custom Split Available</p>
                  <p className="text-xs text-amber-700 mt-0.5">Not everyone paying equal? Set custom amounts per player — perfect when one person books for the group.</p>
                </div>
              </div>
            </div>

            {/* ── RIGHT — How it Works ── */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">How Split Payment Works</h3>

              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    icon: "🏟",
                    title: "Book your slot",
                    desc: "Select the turf, pick your time slot and choose 'Split with Teammates'",
                    color: "bg-green-100 text-green-700",
                  },
                  {
                    step: "2",
                    icon: "👥",
                    title: "Add squad members",
                    desc: "Enter phone numbers or select from your saved contacts. Cost divides equally (or custom).",
                    color: "bg-blue-100 text-blue-700",
                  },
                  {
                    step: "3",
                    icon: "💬",
                    title: "WhatsApp link sent",
                    desc: "Each player gets a WhatsApp message with their share amount and a UPI payment link.",
                    color: "bg-[#e8fdf0] text-[#25D366]",
                  },
                  {
                    step: "4",
                    icon: "✅",
                    title: "Slot confirmed once all pay",
                    desc: "As soon as 100% is collected, booking auto-confirms and everyone gets a confirmation.",
                    color: "bg-purple-100 text-purple-700",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-green-200 hover:shadow-sm transition-all">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0 ${item.color}`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-full px-2 py-0.5">STEP {item.step}</span>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">{item.title}</p>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 pt-2">
                {[
                  { value: "₹0", label: "Chasing teammates", sub: "Zero follow-ups" },
                  { value: "30s", label: "WhatsApp delivery", sub: "Instant links" },
                  { value: "100%", label: "Auto-confirm", sub: "When all pay" },
                ].map((stat, i) => (
                  <div key={i} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3 text-center">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{stat.value}</p>
                    <p className="text-[11px] font-semibold text-gray-700 dark:text-gray-300 mt-0.5">{stat.label}</p>
                    <p className="text-[10px] text-gray-400">{stat.sub}</p>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link href={user ? (selectedTurf ? `/turfs/${selectedTurf.id}` : "/explore") : "/login"}>
                <button className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-3.5 text-sm font-bold transition-colors flex items-center justify-center gap-2">
                  💸 Try Split Payment Now
                  <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features (duplicate placed before Find Your Player) */}
      <section className="py-16 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12 text-gray-900 dark:text-white">Platform Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <Card key={`dup-${i}`} className="p-6 hover:shadow-lg transition-shadow bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-4">
                  <span className="text-3xl">{feature.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{feature.title}</h3>
                      <Badge variant="secondary" className="text-xs">{feature.tag}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{feature.desc}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Find Your Player Section */}
      <section id="find-player" className="py-16 bg-gray-50 dark:bg-gray-900 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Find Your Player</h2>
            <p className="text-gray-500 dark:text-gray-400">Got a team slot? Find your squad.</p>
          </div>

          <div className="flex flex-wrap gap-4 mb-8 justify-center">
            {["⚽ Football", "🏏 Cricket", "🏸 Badminton", "All"].map((sport, i) => (
              <Button
                key={i}
                variant={selectedSport === sport ? "default" : "outline"}
                onClick={() => setSelectedSport(sport)}
                className={selectedSport === sport ? "bg-green-600" : ""}
              >
                {sport}
              </Button>
            ))}
            <Select value={selectedPlayerSkill} onValueChange={setSelectedPlayerSkill}>
              <SelectTrigger className="w-36"><SelectValue placeholder="All Skills" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Skills</SelectItem>
                <SelectItem value="Beginner">Beginner</SelectItem>
                <SelectItem value="Intermediate">Intermediate</SelectItem>
                <SelectItem value="Advanced">Advanced</SelectItem>
                <SelectItem value="Pro">Pro</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedGender} onValueChange={setSelectedGender}>
              <SelectTrigger className="w-32"><SelectValue placeholder="Gender" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                <SelectItem value="Male">Male</SelectItem>
                <SelectItem value="Female">Female</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {players.map((player, i) => (
              <Card key={i} className="p-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-lg font-bold text-green-600 dark:text-green-400">
                    {player.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{player.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{player.position}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm mb-3 text-gray-700 dark:text-gray-300">
                  <span>{player.sport}</span>
                  <span>·</span>
                  <span className="text-amber-500">{"⭐".repeat(player.skill === "Beginner" ? 1 : player.skill === "Intermediate" ? 3 : player.skill === "Advanced" ? 4 : 5)}</span>
                  <span>{player.skill}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Played {player.games} games</p>
                <Button variant="outline" className="w-full gap-2">📲 Invite to Squad</Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Tournaments Section */}
      <section id="tournaments" className="py-16 bg-white dark:bg-gray-950 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Tournaments & Events</h2>
            <p className="text-gray-500 dark:text-gray-400">Compete, win, repeat.</p>
          </div>

          {loadingTournaments ? (
            <div className="flex justify-center py-12">
              <Spinner className="h-8 w-8" />
            </div>
          ) : liveTournaments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">No tournaments available right now.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {liveTournaments.slice(0, 6).map((tournament) => {
                const sportEmoji =
                  tournament.sport === "football" ? "⚽" :
                    tournament.sport === "cricket" ? "🏏" :
                      tournament.sport === "badminton" ? "🏸" :
                        tournament.sport === "tennis" ? "🎾" :
                          tournament.sport === "pickleball" ? "🏓" : "🏆";

                const spotsLeft = tournament.maxTeams - tournament.registeredTeams;
                const isFull = spotsLeft <= 0;
                const startDate = tournament.startDate
                  ? new Date(tournament.startDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                  : "TBD";

                return (
                  <Link
                    key={tournament.id}
                    href={`/tournaments/${tournament.id}`}
                    className="block rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow group"
                  >
                    {/* Header */}
                    <div className="relative h-36 bg-gradient-to-r from-green-600 to-emerald-500 p-4 text-white overflow-hidden">
                      {tournament.image && (
                        <SafeImage
                          src={tournament.image}
                          alt={tournament.name}
                          fill
                          className="object-cover opacity-30 group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      )}
                      <div className="relative z-10">
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold mb-2">
                          {sportEmoji} {tournament.sport.charAt(0).toUpperCase() + tournament.sport.slice(1)}
                        </span>
                        <h3 className="font-bold text-base leading-tight">{tournament.name}</h3>
                        <p className="text-xs opacity-80 mt-0.5 line-clamp-1">{tournament.description}</p>
                      </div>
                      {/* Status badge */}
                      <div className={`absolute right-3 top-3 rounded-full px-2 py-0.5 text-[10px] font-bold ${tournament.status === "registration_open" ? "bg-green-400 text-white" :
                        tournament.status === "ongoing" ? "bg-amber-400 text-white" :
                          tournament.status === "completed" ? "bg-gray-400 text-white" :
                            "bg-blue-400 text-white"
                        }`}>
                        {tournament.status === "registration_open" ? "Open" :
                          tournament.status === "ongoing" ? "Live" :
                            tournament.status === "completed" ? "Done" : "Upcoming"}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3 bg-white dark:bg-gray-900">
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {tournament.prizePool ? (
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-semibold">Prize Pool</p>
                            <p className="font-bold text-green-600 dark:text-green-400">₹{tournament.prizePool.toLocaleString("en-IN")}</p>
                          </div>
                        ) : null}
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Entry Fee</p>
                          <p className="font-semibold text-gray-800 dark:text-gray-200">₹{tournament.registrationFee}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Date</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300">📅 {startDate}</p>
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase font-semibold">Venue</p>
                          <p className="font-medium text-gray-700 dark:text-gray-300 truncate">📍 {tournament.venue}</p>
                        </div>
                      </div>

                      <div className="h-px bg-gray-100 dark:bg-gray-800" />

                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          <span className="font-semibold text-gray-800 dark:text-gray-200">{tournament.registeredTeams}</span>
                          /{tournament.maxTeams} teams
                          {!isFull && (
                            <span className="ml-1 text-green-600 dark:text-green-400 font-medium">· {spotsLeft} left</span>
                          )}
                        </div>
                        <span className={`inline-flex items-center rounded-xl px-4 py-1.5 text-xs font-semibold text-white ${isFull ? "bg-gray-400" : tournament.status === "ongoing" ? "bg-amber-500" : "bg-green-600"}`}>
                          {isFull ? "Full" : tournament.status === "ongoing" ? "Watch" : "Register →"}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {liveTournaments.length > 6 && (
            <div className="text-center mt-8">
              <Link href="/tournaments">
                <Button variant="outline" className="gap-2">
                  View All Tournaments <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Image
                  src="/logo.png"
                  alt="TurfBuddie"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
                <h3 className="font-bold text-xl">TurfBuddie</h3>
              </div>
              <p className="text-sm text-gray-400">The smartest sports booking platform.</p>
            </div>
            <div>
              <h4 className="font-medium mb-3">Platform</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {[
                  { label: "Browse Turfs", id: "browse" },
                  { label: "Book a Slot", id: "browse" },
                  { label: "Split Payment", id: "split-pay" },
                  { label: "Find Player", id: "find-player" },
                  { label: "Tournaments", id: "tournaments" },
                ].map(({ label, id }) => (
                  <li key={label}>
                    <button
                      type="button"
                      onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}
                      className="hover:text-green-400 transition-colors text-left"
                    >
                      {label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">Company</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                {[
                  { label: "About Us", href: "/about" },
                  { label: "Contact", href: "/contact" },
                  { label: "Privacy Policy", href: "/privacy" },
                  { label: "Terms of Use", href: "/terms" },
                ].map(({ label, href }) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-green-400 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">📲 Chat on WhatsApp</h4>
              <a
                href="http://wa.me/917020495817"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 transition-colors"
              >
                <span>💬</span>
                Message Us
              </a>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-400">
            © 2025 TurfBuddie Private Limited · All rights reserved
          </div>
        </div>
      </footer>
    </div>
  );
}
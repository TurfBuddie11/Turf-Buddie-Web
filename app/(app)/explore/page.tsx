"use client";

import { useState, useMemo, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormControl, FormItem, FormLabel } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { FormProvider, useForm } from "react-hook-form";

import {
  collection,
  DocumentData,
  getDocs,
  QuerySnapshot,
  GeoPoint,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Turf } from "@/lib/types/booking";

// Helper for INR formatting from 1000 => ₹1000.00
const formatINR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(v);

// Extract city from address string
const extractCity = (address: string) => {
  const parts = address.split(",");
  return parts.length >= 2 ? parts[parts.length - 2].trim() : "Unknown";
};

export default function ExplorePage() {
  const form = useForm();
  const shouldReduceMotion = useReducedMotion();

  // State for client-side readiness and data loading
  const [hasMounted, setHasMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [turfs, setTurfs] = useState<Turf[]>([]);

  // Filter states
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("all");
  const [price, setPrice] = useState<[number, number]>([400, 10000]);
  const [minRating, setMinRating] = useState(0);

  useEffect(() => {
    // This effect runs only once on the client after initial render
    setHasMounted(true);

    async function fetchTurfs() {
      setIsLoading(true);
      try {
        const turfCollection = collection(db, "Turfs");
        const snapshot: QuerySnapshot<DocumentData> = await getDocs(
          turfCollection
        );

        const turfList: Turf[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const locationData = data.location as GeoPoint | undefined;
          // const createdAtData = data.createdAt as Timestamp | undefined;

          return {
            id: doc.id,
            name: data.name || "",
            address: data.address || "",
            imageurl: data.imageurl || "",
            rating: data.rating || 0,
            price: data.price || 0,
            timeSlots: data.timeSlots || [],
            // amenities: data.amenities || [],
            // description: data.description || "",
            location: locationData
              ? { lat: locationData.latitude, lng: locationData.longitude }
              : { lat: 0, lng: 0 },
            // ownerId: data.ownerId || "",
            // FIX: Use a static date for fallback to prevent hydration mismatch
            // createdAt: createdAtData ? createdAtData.toDate() : new Date(0),
          };
        });
        setTurfs(turfList);
      } catch (err) {
        console.error("Failed to fetch turfs:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTurfs();
  }, []);

  // Used for getiing location
  useEffect(() => {
    // This effect runs only on the client after the component has mounted
    if (hasMounted && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        showCity,
        handleGeolocationError,
        { enableHighAccuracy: true }
      );
    }
  }, [hasMounted]);

  const cities = useMemo(() => {
    const unique = Array.from(
      new Set(turfs.map((t) => extractCity(t.address)))
    );
    return ["all", ...unique];
  }, [turfs]);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function showCity(_: GeolocationPosition) {} // Keep empty function for API compatibility
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function handleGeolocationError(_: GeolocationPositionError) {} // Keep empty function for API compatibility
  const filtered = useMemo(() => {
    return turfs.filter((t) => {
      const inSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.address.toLowerCase().includes(search.toLowerCase());
      const inLocation =
        location === "all" || extractCity(t.address) === location;
      const inPrice = t.price >= price[0] && t.price <= price[1];
      const inRating = t.rating >= minRating;
      return inSearch && inLocation && inPrice && inRating;
    });
  }, [turfs, search, location, price, minRating]);

  // Render a loading state on the server and on initial client render
  // if (!hasMounted) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 text-white flex items-center justify-center">
  //       <div>Loading...</div>
  //     </div>
  //   );
  // }

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 py-10 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.5 }}
          >
            <h1 className="text-4xl font-bold tracking-tight mt-10">
              Find your turf 🏟️
            </h1>
            <p className="text-muted-foreground mt-2">
              Filter by location, rating, and price. Let’s play.
            </p>
          </motion.div>

          {/* Render filters and results only after initial data load */}

          {isLoading ? (
            <div className="text-center text-muted-foreground py-16">
              Loading turfs...
            </div>
          ) : (
            <>
              <Card className="glass-card bg-gradient-to-br from-gray-950 via-black to-gray-900">
                <CardHeader>
                  <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <FormProvider {...form}>
                      <FormItem>
                        <FormLabel>Search</FormLabel>
                        <FormControl>
                          <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search turfs"
                            inputMode="search"
                          />
                        </FormControl>
                      </FormItem>
                      {/* ... other filters */}
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Select
                            value={location}
                            onValueChange={(val) => setLocation(val)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {cities.map((c) => (
                                <SelectItem key={c} value={c}>
                                  {c === "all" ? "All cities" : c}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                      </FormItem>

                      <FormItem>
                        <FormLabel>
                          Price: {formatINR(price[0])} – {formatINR(price[1])}
                        </FormLabel>
                        <FormControl>
                          <Slider
                            value={price}
                            min={400}
                            max={1000}
                            step={50}
                            onValueChange={(v: number[]) =>
                              setPrice([v[0], v[1]])
                            }
                          />
                        </FormControl>
                      </FormItem>

                      <FormItem>
                        <FormLabel>Minimum rating</FormLabel>
                        <FormControl>
                          <div className="flex gap-2 flex-wrap">
                            {[0, 1, 2, 3, 4, 5].map((r) => (
                              <Button
                                key={r}
                                size="sm"
                                variant={
                                  r === minRating ? "default" : "outline"
                                }
                                onClick={() => setMinRating(r)}
                                aria-pressed={r === minRating}
                              >
                                {r}{" "}
                                <Star className="w-3 h-3 ml-1 fill-current" />
                              </Button>
                            ))}
                          </div>
                        </FormControl>
                      </FormItem>
                    </FormProvider>
                  </div>
                  <Separator className="my-6" />
                  <div className="text-muted-foreground text-sm">
                    Showing {filtered.length} turf{filtered.length !== 1 && "s"}
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((t, i) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: i * 0.05,
                      duration: shouldReduceMotion ? 0 : 0.4,
                    }}
                  >
                    <Card className="glass-card overflow-hidden bg-gradient-to-br from-gray-950 via-black to-gray-900">
                      <div className="relative h-44 w-full">
                        {t.imageurl && (
                          <Image
                            src={t.imageurl}
                            alt={`Image of ${t.name}`}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover"
                          />
                        )}
                      </div>
                      <CardContent className="p-4 space-y-2">
                        <div className="flex justify-between">
                          <div>
                            <h3 className="text-lg font-semibold">{t.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {t.address.length > 50
                                ? `${t.address.slice(0, 50)}...`
                                : t.address}
                            </p>
                          </div>
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                            {t.rating.toFixed(1)}
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-sm">
                          <div>
                            <span className="font-medium">
                              {formatINR(t.price)}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              / hour
                            </span>
                          </div>
                        </div>
                        <Link
                          href={`/turfs/${t.id}`}
                          className="w-full pt-2 block"
                        >
                          <Button className="w-full" variant="secondary">
                            View Details
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>

              {filtered.length === 0 && (
                <div className="text-center text-muted-foreground py-16">
                  No turfs match your filters. Try adjusting your search or
                  selection.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}

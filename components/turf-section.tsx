"use client";
import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Turf } from "@/lib/types/booking";
import {
  collection,
  DocumentData,
  GeoPoint,
  getDocs,
  QuerySnapshot,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useAuth } from "@/context/auth-provider";

const formatINR = (v: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(v);

const TurfListSection = () => {
  const [loading, setLoading] = useState(true);
  const [turfs, setTurfs] = useState<Turf[]>([]);

  const router = useRouter();

  const { user } = useAuth();

  useEffect(() => {
    async function fetchTurfs() {
      setLoading(true);
      try {
        const turfCollection = collection(db, "Turfs");
        const snapshot: QuerySnapshot<DocumentData> = await getDocs(
          turfCollection
        );

        const turfList: Turf[] = snapshot.docs.map((doc) => {
          const data = doc.data();
          const locationData = data.location as GeoPoint | undefined;

          return {
            id: doc.id,
            name: data.name || "",
            address: data.address || "",
            imageurl: data.imageurl || "",
            rating: data.rating || 0,
            price: data.price || 0,
            timeSlots: data.timeSlots || [],
            location: locationData
              ? { lat: locationData.latitude, lng: locationData.longitude }
              : { lat: 0, lng: 0 },
          };
        });

        setTurfs(turfList);
      } catch (error) {
        console.error("Failed to fetch turfs:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTurfs();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="text-lg text-muted-foreground animate-pulse">
          Loading turfs...
        </span>
      </div>
    );
  }

  return (
    <section id="turfs" className="section-padding">
      <div className="container max-w-7xl mx-auto px-4">
        {/* Heading */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-foreground">
            Explore
            <span className="bg-gradient-hero bg-clip-text text-transparent">
              {" "}
              Turfs
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Book your preferred turfs in your city. Check availability, timings,
            and slots, and reserve instantly!
          </p>
        </div>

        {/* Turf Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-8">
          {turfs.slice(0, 3).map((turf) => (
            <Card
              key={turf.id}
              className="glass-card overflow-hidden bg-gradient-to-br from-gray-950 via-black to-gray-900"
            >
              <div className="relative h-44 w-full">
                {turf.imageurl && (
                  <Image
                    src={turf.imageurl}
                    alt={`Image of ${turf.name}`}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                )}
              </div>
              <CardContent className="p-4 space-y-2">
                <div className="flex justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{turf.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {turf.address.length > 50
                        ? `${turf.address.slice(0, 50)}...`
                        : turf.address}
                    </p>
                  </div>
                  <span className="flex items-center gap-1 text-sm">
                    <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    {turf.rating.toFixed(1)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <span className="font-medium">{formatINR(turf.price)}</span>{" "}
                    <span className="text-muted-foreground">/ hour</span>
                  </div>
                  <div className="text-muted-foreground">
                    {turf.timeSlots.length} slots
                  </div>
                </div>
                <Link href={`/turfs/${turf.id}`} className="w-full pt-2 block">
                  <Button className="w-full" variant="secondary">
                    View Details
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Show More Button */}
        {turfs.length > 2 && (
          <div className="flex justify-center">
            <Button
              size="lg"
              className="glow-button text-md px-8 py-6"
              onClick={() => {
                if (user) {
                  router.push("/explore");
                } else {
                  router.push("/login");
                }
              }}
            >
              Show more
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default TurfListSection;

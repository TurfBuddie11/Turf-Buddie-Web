import { notFound } from "next/navigation";
import type { Turf } from "@/lib/types/booking";
import TurfDetailsClient from "@/components/turfs-details-client";
import { Metadata } from "next";

async function fetchTurf(id: string): Promise<Turf | null> {
  const { doc, getDoc } = await import("firebase/firestore");
  const { db } = await import("@/lib/firebase/config");

  const docRef = doc(db, "Turfs", id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;

  const data = docSnap.data();

  // Your formatTimeSlots logic or inline here
  interface RawTimeSlot {
    timeSlot?: string;
    status?: string;
    price?: number;
  }

  function formatTimeSlots(rawTimeSlots: RawTimeSlot[]) {
    return rawTimeSlots.map((slot, idx) => ({
      id: `slot_${idx}`,
      startTime: slot.timeSlot?.split(" - ")[0] || "00:00",
      endTime: slot.timeSlot?.split(" - ")[1] || "01:00",
      isAvailable: slot.status !== "confirmed",
      price: slot.price || 499,
    }));
  }

  return {
    id,
    name: data.name || "",
    address: data.address || "",
    imageurl: data.imageurl || "",
    rating: data.rating || 0,
    price: data.price || 0,
    timeSlots: formatTimeSlots(data.timeSlots || []),
    // amenities: data.amenities || [],
    // description: data.description || "",
    location: data.location
      ? { lat: data.location.latitude, lng: data.location.longitude }
      : { lat: 0, lng: 0 },
    // ownerId: data.ownerId || "",
    // createdAt: data.createdAt ? data.createdAt.toDate() : new Date(0),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const turf = await fetchTurf(id);

  if (!turf) {
    return {
      title: "Turf Not Found | TurfBuddie",
      description: "The requested turf could not be found.",
    };
  }

  return {
    title: turf.name,
    description: `Book ${turf.name} located at ${turf.address}. Enjoy seamless booking with secure payments on TurfBuddie.`,
    openGraph: {
      title: turf.name,
      description: `Book ${turf.name} located at ${turf.address}. Enjoy seamless booking with secure payments on TurfBuddie.`,
      url: `https://turfbuddie.com/turfs/${turf.id}`,
      siteName: "TurfBuddie",
      images: [
        {
          url: turf.imageurl || "https://turfbuddie.com/logo.png",
          width: 800,
          height: 600,
          alt: turf.name,
        },
      ],
      locale: "en-US",
      type: "website",
    },
  };
}

export default async function TurfDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const turf = await fetchTurf(id);

  if (!turf) return notFound();

  const today = new Date();
  const offset = today.getTimezoneOffset();
  const localDate = new Date(today.getTime() - offset * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  return (
    <div className="min-h-screen  overflow-x-hidden px-4">
      <TurfDetailsClient turf={turf} localDate={localDate} />
    </div>
  );
}

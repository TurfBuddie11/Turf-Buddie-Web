import { notFound } from "next/navigation";
import type { Turf } from "@/lib/types/booking";
import TurfDetailsClient from "@/components/turfs-details-client";

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
    <div className="min-h-screen bg-gradient-to-br overflow-x-hidden from-gray-950 via-black to-gray-900 text-white pt-8 px-4">
      <TurfDetailsClient turf={turf} localDate={localDate} />
    </div>
  );
}

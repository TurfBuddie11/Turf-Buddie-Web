"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { db, storage } from "@/lib/firebase/config";
import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  GeoPoint,
  DocumentData,
  Timestamp,
  arrayUnion,
  arrayRemove,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// ================= TYPES =================

export interface TimeSlot {
  timeSlot: string;
  bookingDate: Timestamp;
  status:
    | "confirmed"
    | "cancelled"
    | "available"
    | "booked_offline"
    | "Confirmed"
    | "blocked";
  userUid?: string;
  price: number;
  transactionId?: string;
  paid?: string;
  commission?: number;
  payout?: number;
  daySlot?: string;
  monthSlot?: string;
}

export interface Turf {
  id: string;
  name: string;
  address: string;
  coordinates: string;
  price: number;
  rating: number;
  imageUrl?: string;
  timeSlots: TimeSlot[];
}

interface ContextProps {
  turfs: Turf[];
  selectedTurf: Turf | null;
  bookings: TimeSlot[];
  loading: boolean;
  addTurf: (
    data: Omit<Turf, "id" | "rating" | "timeSlots" | "imageUrl"> & {
      imageFile?: File;
    },
  ) => Promise<void>;
  editTurf: (
    turfId: string,
    data: Partial<Omit<Turf, "id" | "rating" | "timeSlots" | "imageUrl">> & {
      imageFile?: File;
    },
  ) => Promise<void>;
  setSelectedTurf: (turf: Turf) => void;
  refreshBookings: () => Promise<void>;
  getBookings: () => Promise<TimeSlot[]>;
  addOfflineBooking: (
    booking: Omit<TimeSlot, "status" | "bookingDate"> & { bookingDate: Date },
  ) => Promise<void>;
  deleteOfflineBooking: (slot: TimeSlot) => Promise<void>;
}

const TurfContext = createContext<ContextProps | null>(null);

export const TurfProvider = ({ children }: { children: React.ReactNode }) => {
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [selectedTurf, setSelectedTurf] = useState<Turf | null>(null);
  const [bookings, setBookings] = useState<TimeSlot[]>([]);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/owner-session/check");
        const data = await res.json();
        if (data.isAuthenticated) setOwnerId(data.uid);
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const loadTurfs = useCallback(async () => {
    if (!ownerId) return;

    const q = query(collection(db, "Turfs"), where("ownerId", "==", ownerId));
    const snap = await getDocs(q);

    const list: Turf[] = snap.docs.map((d) => {
      const data = d.data() as DocumentData;
      return {
        id: d.id,
        name: data.name || "",
        address: data.address || "",
        imageUrl: data.imageurl ?? "",
        price: data.price ?? 0,
        rating: data.rating ?? 0,
        coordinates: data.location
          ? `${data.location.latitude}, ${data.location.longitude}`
          : "",
        timeSlots: (data.timeSlots as TimeSlot[]) ?? [],
      };
    });

    setTurfs(list);
    if (!selectedTurf && list.length > 0) setSelectedTurf(list[0]);
  }, [ownerId, selectedTurf]);

  const getBookings = useCallback(async () => {
    if (!selectedTurf?.id) return [];
    const turfRef = doc(db, "Turfs", selectedTurf.id);
    const snap = await getDoc(turfRef);
    if (!snap.exists()) return [];
    const slots = (snap.data()?.timeSlots as TimeSlot[]) ?? [];

    // Case-insensitive filtering for "Confirmed" and "confirmed"
    const filtered = slots.filter(
      (s) =>
        s.status?.toLowerCase() === "confirmed" ||
        s.status?.toLowerCase() === "booked_offline" ||
        s.status?.toLowerCase() == "blocked",
    );

    setBookings(filtered);
    return filtered;
  }, [selectedTurf?.id]);

  const refreshBookings = useCallback(async () => {
    await getBookings();
  }, [getBookings]);

  const addOfflineBooking = async (
    bookingData: Omit<TimeSlot, "status" | "bookingDate"> & {
      bookingDate: Date;
    },
  ) => {
    if (!selectedTurf) return;
    const turfRef = doc(db, "Turfs", selectedTurf.id);

    const newSlot: TimeSlot = {
      ...bookingData,
      bookingDate: Timestamp.fromDate(bookingData.bookingDate),
      status: "booked_offline",
      paid: "Paid to Owner",
      payout: bookingData.price,
    };

    await updateDoc(turfRef, {
      timeSlots: arrayUnion(newSlot),
    });
    await getBookings();
  };

  const deleteOfflineBooking = async (slotToDelete: TimeSlot) => {
    if (!selectedTurf) return;
    const turfRef = doc(db, "Turfs", selectedTurf.id);

    try {
      const turfDoc = await getDoc(turfRef);
      if (!turfDoc.exists()) {
        throw new Error("Turf document not found!");
      }

      const existingSlots = (turfDoc.data()?.timeSlots || []) as TimeSlot[];

      // Filter out the slot to be deleted based on a unique combination of properties
      const updatedSlots = existingSlots.filter(
        (slot) =>
          !(
            slot.timeSlot === slotToDelete.timeSlot &&
            slot.monthSlot === slotToDelete.monthSlot &&
            slot.daySlot === slotToDelete.daySlot &&
            (slot.bookingDate as Timestamp).isEqual(
              slotToDelete.bookingDate as Timestamp,
            )
          ),
      );

      await updateDoc(turfRef, {
        timeSlots: updatedSlots,
      });

      // Refresh bookings from the source of truth
      await getBookings();
    } catch (error) {
      console.error("Error deleting offline booking:", error);
      // Optionally, handle the error more gracefully in the UI
    }
  };

  const addTurf = async (
    data: Omit<Turf, "id" | "rating" | "timeSlots" | "imageUrl"> & {
      imageFile?: File;
    },
  ) => {
    if (!ownerId) return;
    let imageUrl = "";
    if (data.imageFile) {
      const storageRef = ref(
        storage,
        `Turf/${data.name}/${Date.now()}-${data.imageFile.name}`,
      );
      const upload = await uploadBytes(storageRef, data.imageFile);
      imageUrl = await getDownloadURL(upload.ref);
    }
    const [lat, lng] = data.coordinates
      .split(",")
      .map((v) => parseFloat(v.trim()));
    await addDoc(collection(db, "Turfs"), {
      name: data.name,
      address: data.address,
      location: new GeoPoint(lat, lng),
      price: data.price,
      rating: 0,
      timeSlots: [],
      imageurl: imageUrl,
      ownerId,
    });
    await loadTurfs();
  };

  const editTurf = async (
    turfId: string,
    data: Partial<Omit<Turf, "id" | "rating" | "timeSlots" | "imageUrl">> & {
      imageFile?: File;
    },
  ) => {
    if (!ownerId) return;
    const turfRef = doc(db, "Turfs", turfId);
    let imageUrl: string | undefined;
    if (data.imageFile) {
      const storageRef = ref(
        storage,
        `Turf/${data.name ?? "Updated"}/${Date.now()}-${data.imageFile.name}`,
      );
      const upload = await uploadBytes(storageRef, data.imageFile);
      imageUrl = await getDownloadURL(upload.ref);
    }
    let geo: GeoPoint | undefined;
    if (data.coordinates) {
      const [lat, lng] = data.coordinates
        .split(",")
        .map((v) => parseFloat(v.trim()));
      geo = new GeoPoint(lat, lng);
    }
    const payload: Record<string, string | number | GeoPoint | undefined> = {
      ...(data.name && { name: data.name }),
      ...(data.address && { address: data.address }),
      ...(geo && { location: geo }),
      ...(data.price !== undefined && { price: data.price }),
      ...(imageUrl && { imageurl: imageUrl }),
    };
    await updateDoc(turfRef, payload);
    await loadTurfs();
  };

  useEffect(() => {
    if (ownerId) loadTurfs();
  }, [ownerId, loadTurfs]);

  useEffect(() => {
    if (selectedTurf) refreshBookings();
  }, [selectedTurf, refreshBookings]);

  return (
    <TurfContext.Provider
      value={{
        turfs,
        selectedTurf,
        bookings,
        loading,
        addTurf,
        editTurf,
        setSelectedTurf,
        refreshBookings,
        getBookings,
        addOfflineBooking,
        deleteOfflineBooking,
      }}
    >
      {children}
    </TurfContext.Provider>
  );
};

export const useTurf = () => {
  const ctx = useContext(TurfContext);
  if (!ctx) throw new Error("useTurf must be used inside TurfProvider");
  return ctx;
};

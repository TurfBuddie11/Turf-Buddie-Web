export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  price: number;
}

export interface Turf {
  id: string;
  name: string;
  address: string;
  image: string;
  rating: number;
  price: number;
  timeSlots: TimeSlot[];
  amenities: string[];
  description: string;
  location: {
    lat: number;
    lng: number;
  };
  ownerId: string;
  createdAt: Date;
}

export interface Booking {
  id?: string;
  turfId: string;
  timeSlot: string;
  daySlot: string;
  monthSlot: string;
  userUid: string;
  transactionId: string;
  status:
    | "pending"
    | "confirmed"
    | "cancelled"
    | "completed"
    | "booked_offline";
  price: number;
  commission?: number; // Optional for offline bookings
  commision?: number; // Typo in database - keeping for compatibility
  payout?: number; // Optional for offline bookings
  paid?: "Not Paid to Owner" | "Paid to Owner"; // Optional for offline bookings
  createdAt?: Date; // Optional since some bookings might not have this
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  image: string;
  prizePool: number;
  registrationFee: number;
  startDate: Date;
  endDate: Date;
  venue: string;
  maxTeams: number;
  registeredTeams: number;
  status: "upcoming" | "registration_open" | "ongoing" | "completed";
  sport: "cricket" | "football" | "badminton" | "tennis";
  rules: string[];
  organizer: string;
  createdAt: Date;
}
export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  price: number;
}

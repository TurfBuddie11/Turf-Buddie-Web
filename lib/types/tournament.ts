import { Timestamp } from "firebase/firestore";

export interface Team {
  id?: string;
  teamName: string;
  captainName: string;
  captainPhone: string;
  players: Player[]; // Array of player names
  registeredAt: Timestamp;
}

export interface Player {
  name: string;
  phone: string;
}

export interface Tournament {
  id: string;
  name: string;
  description: string;
  image: string;
  prizePool?: number;
  registrationFee: number;
  startDate: Date;
  endDate: Date;
  venue: string;
  teamSize: number;
  maxTeams: number;
  registeredTeams: number;
  status: "upcoming" | "registration_open" | "ongoing" | "completed";
  sport: "cricket" | "football" | "badminton" | "tennis" | "pickleball";
  rules: string[];
  organizer?: string;
  createdAt: Date;
  teams?: Team[]; // Added teams array
}

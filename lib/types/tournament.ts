import { Timestamp } from "firebase/firestore";

export interface Team {
  id?: string;
  teamName: string;
  captainName: string;
  captainPhone: string;
  players: string[]; // Array of player names
  registeredAt: Timestamp;
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

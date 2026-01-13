import { Tournament } from "@/lib/types/tournament";

export const sampleTournament: Tournament = {
  id: "tourn_001",
  name: "Mumbai Monsoon Cricket League",
  description:
    "A high-stakes T20 tournament held at the historic Shivaji Park. Open for all amateur clubs in the Mumbai region. Professional kit and refreshments provided.",
  image:
    "https://plus.unsplash.com/premium_photo-1679917506585-2c7b89054610?q=80&w=1374&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  prizePool: 50000,
  registrationFee: 1500,
  startDate: new Date("2026-06-15"),
  endDate: new Date("2026-06-30"),
  venue: "Shivaji Park, Dadar",
  teamSize: 11,
  maxTeams: 16,
  registeredTeams: 12,
  status: "registration_open",
  sport: "cricket",
  rules: [
    "White ball tournament",
    "Standard ICC T20 rules apply",
    "Minimum age: 18 years",
    "Maximum 2 pro players per squad",
  ],
  organizer: "TurfBuddie Events",
  createdAt: new Date(),
};

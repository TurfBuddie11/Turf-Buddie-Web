"use client";

import ComingSoonPage from "@/components/coming-soon";
import { useReducedMotion } from "framer-motion";

export default function TournamentPage() {
  const shouldReduceMotion = useReducedMotion() ?? false; // auto-detects user's motion preference

  return <ComingSoonPage shouldReduceMotion={shouldReduceMotion} />;
}

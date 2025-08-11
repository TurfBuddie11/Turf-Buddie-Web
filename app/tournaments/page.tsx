"use client";

import ComingSoonPage from "@/components/coming-soon";
import Header2 from "@/components/header2";
import { useReducedMotion } from "framer-motion";

export default function TournamentPage() {
  const shouldReduceMotion = useReducedMotion() ?? false; // auto-detects user's motion preference

  return (
    <>
      <Header2 />
      <ComingSoonPage shouldReduceMotion={shouldReduceMotion} />
    </>
  );
}

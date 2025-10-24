import ExplorePageComponent from "@/components/explore-page";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Explore Turfs | TurfBuddie",
  description:
    "Discover and book the best football, cricket, and badminton turfs in your area with TurfBuddie. Filter by location, price, and ratings to find your perfect match.",
};

import React from "react";

export default function ExplorePage() {
  return <ExplorePageComponent />;
}

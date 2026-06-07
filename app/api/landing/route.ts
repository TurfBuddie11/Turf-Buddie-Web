import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get("city") || "Nagpur";

    const [turfDocs, userDocs, ownerDocs, tournamentDocs, teamDocs, playerDocs] = await Promise.all([
      adminDb.collection("Turfs").get(),
      adminDb.collection("users").get(),
      adminDb.collection("owners").get(),
      adminDb.collection("tournaments").get(),
      adminDb.collection("teams").get(),
      adminDb.collection("players").get(),
    ]);

    const turfs = turfDocs.docs.map((doc) => {
      const data = doc.data();
      const timeSlotsObj = data.timeSlots || {};
      const timeSlotsArray = Object.values(timeSlotsObj);
      
      return {
        id: doc.id,
        name: data.name || "",
        address: data.address || "",
        imageurl: data.imageurl || "",
        rating: data.rating || 0,
        price: data.price || 0,
        city: data.city || city,
        ownerUid: data.ownerUid,
        amenities: data.amenities || [],
        formats: data.formats || ["5v5"],
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        totalBookings: timeSlotsArray.length,
      };
    });

    const usersCount = userDocs.size;
    const ownersCount = userDocs.size;
    const playersConnected = usersCount + ownersCount;
    
    let totalBookings = 0;
    let openSlots = 0;
    turfs.forEach((turf) => {
      totalBookings += turf.totalBookings || 0;
      openSlots += Math.max(0, 40 - (turf.totalBookings || 0));
    });

    const tournaments = tournamentDocs.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        sport: data.sport || "⚽ Football",
        format: data.format || "",
        prize: data.prize || "₹0",
        date: data.date || "",
        venue: data.venue || "",
        teams: data.teams || "",
        maxTeams: data.maxTeams || 16,
        registered: data.registered || 0,
        status: data.status || "upcoming",
        price: data.price || 0,
        imageurl: data.imageurl || "",
      };
    });

    const activeTournaments = tournaments.filter(
      (t) => t.status === "ongoing" || t.status === "registration_open"
    ).length;

    const sportsCounts: Record<string, number> = {};
    turfs.forEach((turf) => {
      const sport = turf.formats?.[0] || "Football";
      sportsCounts[sport] = (sportsCounts[sport] || 0) + 1;
    });

    const cities: string[] = [];
    turfs.forEach((turf) => {
      if (turf.city && !cities.includes(turf.city)) {
        cities.push(turf.city);
      }
    });
    if (!cities.includes(city)) cities.push(city);

    const teams = teamDocs.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        sport: data.sport || "Football",
        format: data.format || "5v5",
        members: data.members?.length || 0,
        maxMembers: data.maxMembers || 5,
        captain: data.captainName || "",
        imageurl: data.imageurl || "",
      };
    });

    const players = playerDocs.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        sport: data.sport || "Football",
        position: data.position || "",
        skill: data.skillLevel || "Intermediate",
        games: data.gamesPlayed || 0,
        gender: data.gender || "Male",
        city: data.city || city,
        phone: data.phone || "",
      };
    });

    return NextResponse.json({
      stats: {
        totalTurfs: turfs.length,
        totalBookings,
        playersConnected,
        activeTournaments,
        openSlots,
      },
      turfs,
      tournaments: tournaments.filter((t) => t.status !== "completed").slice(0, 6),
      teams: teams.slice(0, 8),
      players: players.slice(0, 8),
      filters: {
        sports: Object.keys(sportsCounts).map((sport) => ({
          name: sport,
          count: sportsCounts[sport],
        })),
        cities,
        amenities: ["Floodlights", "Washroom", "Parking", "Café", "Drinking Water"],
        formats: ["5v5", "7v7", "11v11", "Badminton", "Tennis"],
      },
    });
  } catch (error) {
    console.error("Error fetching landing data:", error);
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 });
  }
}
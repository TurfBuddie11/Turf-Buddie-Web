"use client";

import React, { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { useAuth } from "@/context/auth-provider";
import { UserProfile } from "@/lib/types/user";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, Phone, User, MapPin } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import ProfileActions from "@/components/profile-actions";

interface EditableUserProfile {
  name: string;
  gender?: string;
  email: string;
  mobile?: string;
  dob: Date | null;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
  referralCode?: string;
  uid: string;
  createdAt: Timestamp | null;
  emailVerified: boolean;
}

/**
 * Helper function to convert the profile from AuthContext (with string DOB)
 * to the local state format (with Date object DOB).
 */
const toInitialState = (profile: UserProfile | null): EditableUserProfile => {
  if (!profile) {
    return {
      name: "",
      gender: "",
      email: "",
      mobile: "",
      dob: null,
      area: "",
      city: "",
      state: "",
      pincode: "",
      referralCode: "",
      createdAt: null,
      emailVerified: false,
      uid: "",
    };
  }
  return {
    ...profile,
    dob: profile.dob ? parse(profile.dob, "dd/MM/yyyy", new Date()) : null,
    uid: profile.uid,
  };
};

export default function ProfilePage() {
  const { user, profile } = useAuth();

  const [userData, setUserData] = useState<EditableUserProfile>(
    toInitialState(profile),
  );
  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(0);

  useEffect(() => {
    if (profile) {
      setUserData(toInitialState(profile));
    }
    if (user) {
      const fetchLoyaltyPoints = async () => {
        try {
          const idToken = await user.getIdToken();
          const response = await fetch("/api/loyalty/points", {
            headers: { Authorization: `Bearer ${idToken}` },
          });
          if (!response.ok) throw new Error("Failed to fetch loyalty points.");
          const data = await response.json();
          setLoyaltyPoints(data.balance);
        } catch (error) {
          console.error("Error fetching loyalty points:", error);
          setLoyaltyPoints(0);
        }
      };
      fetchLoyaltyPoints();
    }
  }, [profile, user]);

  return (
    <div className="container min-h-screen py-10 px-4 p-6">
      <div className="max-w-7xl mx-auto grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* LEFT SIDEBAR PROFILE CARD */}
        <Card className="p-4 h-auto">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4 ">
              <AvatarFallback className="text-4xl font-bold bg-primary text-background">
                {userData?.name?.charAt(0).toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <h2 className="text-xl font-bold">{userData?.name || "Unnamed"}</h2>
            <p className="text-sm text-muted-foreground">{userData?.email}</p>
          </div>
          <Separator className="my-4" />
          <div className="space-y-3 text-sm">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{userData?.gender || "Not set"}</span>
            </div>
            <div className="flex items-center">
              <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{userData?.mobile || "Not set"}</span>
            </div>
            <div className="flex items-center">
              <CalendarIcon className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>
                {userData?.dob ? format(userData.dob, "PPP") : "Not set"}
              </span>
            </div>
            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>
                {userData?.city && userData?.state
                  ? `${userData.city}, ${userData.state}`
                  : "Location not set"}
              </span>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Points</CardTitle>
              <CardDescription>
                View your points balance, history, and redeem rewards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Current Points Display */}
              <div className="rounded-lg bg-secondary/50 p-6 text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  Current Balance
                </p>
                <p className="text-4xl font-bold tracking-tight">
                  {loyaltyPoints} PTS
                </p>
              </div>
            </CardContent>
          </Card>
        </Card>

        <Card className="px-4 h-auto py-8 max-sm:px-1">
          <CardHeader>
            <CardTitle className="text-xl">Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfileActions />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

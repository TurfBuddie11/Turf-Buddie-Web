"use client";

import type React from "react";

import { useState, useEffect } from "react"; // Added useEffect
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  Phone,
  MapPin,
  Calendar,
  Award,
  LogOut,
  History,
  Gift,
} from "lucide-react"; // Added History & Gift
import { Separator } from "@/components/ui/separator";

// Define types for loyalty data for better code quality
interface LoyaltyHistoryItem {
  date: string;
  description: string;
  points: number;
}

interface LoyaltyData {
  currentPoints: number;
  history: LoyaltyHistoryItem[];
}

export default function ProfilePage() {
  const [profileData, setProfileData] = useState({
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "+91 98765 43210",
    location: "Mumbai, Maharashtra",
    joinDate: "January 2024",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // State for loyalty points
  const [loyaltyData, setLoyaltyData] = useState<LoyaltyData>({
    currentPoints: 0,
    history: [],
  });
  const [redeemAmount, setRedeemAmount] = useState("");

  // Fetch loyalty data from the API when the component mounts
  useEffect(() => {
    // This is a mock fetch function. Replace with your actual API call.
    const fetchLoyaltyData = async () => {
      try {
        // const response = await fetch("/api/loyalty");
        // const data = await response.json();

        // Using mock data for demonstration
        const mockData: LoyaltyData = {
          currentPoints: 1250,
          history: [
            {
              date: "2025-10-10",
              description: "Booked football turf",
              points: 100,
            },
            {
              date: "2025-10-05",
              description: "Redeemed for discount",
              points: -500,
            },
            {
              date: "2025-09-28",
              description: "Tournament entry fee",
              points: 750,
            },
            { date: "2025-09-15", description: "Welcome bonus", points: 900 },
          ],
        };
        setLoyaltyData(mockData);
      } catch (error) {
        console.error("Failed to fetch loyalty data:", error);
        // Optionally, set an error state to show a message to the user
      }
    };

    fetchLoyaltyData();
  }, []); // Empty dependency array ensures this runs only once on mount

  const handleProfileUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    // Add logic to save profile data to your backend
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    // Add password change logic here
  };

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(redeemAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid number of points to redeem.");
      return;
    }
    if (amount > loyaltyData.currentPoints) {
      alert("You do not have enough points to redeem this amount.");
      return;
    }
    // Add logic to process the redemption via your API
    // On success, you might want to refetch the loyalty data
    alert(`${amount} points redeemed successfully!`);
    setRedeemAmount("");
  };

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1 bg-muted/30 py-8">
        <div className="container mx-auto max-w-5xl px-4">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">My Profile</h1>
            <p className="text-muted-foreground">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
            {/* Profile Sidebar */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    <Avatar className="h-24 w-24">
                      <AvatarImage
                        src="/placeholder.svg?height=96&width=96"
                        alt={profileData.name}
                      />
                      <AvatarFallback className="text-2xl">
                        {profileData.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <button className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="text-center">
                    <h3 className="font-semibold">{profileData.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {profileData.email}
                    </p>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Award className="h-3 w-3" />
                    Gold Member
                  </Badge>
                  <Separator />
                  <div className="w-full space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>{profileData.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{profileData.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>Joined {profileData.joinDate}</span>
                    </div>
                  </div>
                  <Separator />
                  <Button
                    variant="outline"
                    className="w-full gap-2 bg-transparent"
                    size="sm"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Profile Content */}
            <Tabs defaultValue="personal" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                {" "}
                {/* Changed to 4 columns */}
                <TabsTrigger value="personal">Personal Info</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
                <TabsTrigger value="loyalty">Loyalty</TabsTrigger>{" "}
                {/* Added Loyalty Trigger */}
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>

              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>
                      Update your personal details and contact information
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input
                            id="name"
                            value={profileData.name}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                name: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            type="email"
                            value={profileData.email}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                email: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number</Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={profileData.phone}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                phone: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={profileData.location}
                            onChange={(e) =>
                              setProfileData({
                                ...profileData,
                                location: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                        <Button type="submit">Save Changes</Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>
                      Manage your password and security preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handlePasswordChange} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="currentPassword">
                          Current Password
                        </Label>
                        <Input
                          id="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              currentPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              newPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={(e) =>
                            setPasswordData({
                              ...passwordData,
                              confirmPassword: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline">
                          Cancel
                        </Button>
                        <Button type="submit">Update Password</Button>
                      </div>
                    </form>
                    <Separator className="my-6" />
                    <div className="space-y-4">
                      <h4 className="font-semibold">
                        Two-Factor Authentication
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Add an extra layer of security to your account by
                        enabling two-factor authentication.
                      </p>
                      <Button variant="outline">Enable 2FA</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* ===== START: NEW LOYALTY TAB CONTENT ===== */}
              <TabsContent value="loyalty">
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
                        {loyaltyData.currentPoints.toLocaleString()} PTS
                      </p>
                    </div>

                    {/* Redeem Points Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Gift className="h-5 w-5" />
                        <h4 className="font-semibold">Redeem Points</h4>
                      </div>
                      <form
                        onSubmit={handleRedeem}
                        className="flex items-end gap-4"
                      >
                        <div className="flex-grow space-y-2">
                          <Label htmlFor="redeem">Points to Redeem</Label>
                          <Input
                            id="redeem"
                            type="number"
                            placeholder="e.g., 500"
                            value={redeemAmount}
                            onChange={(e) => setRedeemAmount(e.target.value)}
                          />
                        </div>
                        <Button type="submit">Redeem Now</Button>
                      </form>
                    </div>

                    <Separator />

                    {/* Points History Section */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <History className="h-5 w-5" />
                        <h4 className="font-semibold">Points History</h4>
                      </div>
                      <div className="space-y-3">
                        {loyaltyData.history.length > 0 ? (
                          loyaltyData.history.map((item, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm"
                            >
                              <div>
                                <p className="font-medium">
                                  {item.description}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.date}
                                </p>
                              </div>
                              <span
                                className={`font-semibold ${item.points > 0 ? "text-green-600" : "text-red-600"}`}
                              >
                                {item.points > 0 ? "+" : ""}
                                {item.points.toLocaleString()}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No transaction history found.
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* ===== END: NEW LOYALTY TAB CONTENT ===== */}

              <TabsContent value="preferences">
                <Card>
                  <CardHeader>
                    <CardTitle>Preferences</CardTitle>
                    <CardDescription>
                      Customize your experience and notification settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="font-semibold">Email Notifications</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Booking Confirmations</p>
                            <p className="text-sm text-muted-foreground">
                              Receive emails when bookings are confirmed
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="h-4 w-4"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Promotional Offers</p>
                            <p className="text-sm text-muted-foreground">
                              Get notified about special deals and offers
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="h-4 w-4"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Tournament Updates</p>
                            <p className="text-sm text-muted-foreground">
                              Stay updated on tournament schedules
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="h-4 w-4"
                          />
                        </div>
                      </div>
                    </div>
                    <Separator />
                    <div className="space-y-4">
                      <h4 className="font-semibold">Display Settings</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Show Loyalty Points</p>
                            <p className="text-sm text-muted-foreground">
                              Display points balance in header
                            </p>
                          </div>
                          <input
                            type="checkbox"
                            defaultChecked
                            className="h-4 w-4"
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">Compact View</p>
                            <p className="text-sm text-muted-foreground">
                              Use compact layout for turf listings
                            </p>
                          </div>
                          <input type="checkbox" className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button>Save Preferences</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

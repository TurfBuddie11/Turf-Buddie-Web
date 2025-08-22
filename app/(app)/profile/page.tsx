"use client";

import { useEffect, useState } from "react";
import { format, parse } from "date-fns";
import { useAuth } from "@/context/auth-provider";
import { UserProfile } from "@/lib/types/user";
import { updateUserProfile } from "@/lib/firebase/auth";
import { toast } from "sonner";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarIcon, Phone, User, MapPin } from "lucide-react";
import { CustomCalendar } from "@/components/custom-calendar";

interface EditableUserProfile {
  name: string;
  gender: string;
  email: string;
  mobile: string;
  dob: Date | null;
  area: string;
  city: string;
  state: string;
  pincode: string;
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
    };
  }
  return {
    ...profile,
    dob: profile.dob ? parse(profile.dob, "dd/MM/yyyy", new Date()) : null,
  };
};

export default function ProfilePage() {
  const { user, profile } = useAuth();

  const [userData, setUserData] = useState<EditableUserProfile>(
    toInitialState(profile)
  );
  const [editing, setEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Effect to reset the form state if the profile from context changes.
  useEffect(() => {
    if (profile) {
      setUserData(toInitialState(profile));
    }
  }, [profile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCancel = () => {
    setUserData(toInitialState(profile)); // Revert any changes
    setEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("You must be logged in to update your profile.");
      return;
    }

    setIsSaving(true);
    try {
      // Prepare data for Firestore: convert Date object back to "dd/MM/yyyy" string.
      const dataToSave = {
        name: userData.name,
        gender: userData.gender,
        mobile: userData.mobile,
        dob: userData.dob ? format(userData.dob, "dd/MM/yyyy") : "", // Ensure dob is always a string
        area: userData.area,
        city: userData.city,
        pincode: userData.pincode,
        state: userData.state,
        email: userData.email, // Include non-editable fields if the type requires them
      };

      await updateUserProfile(user.uid, dataToSave);
      toast.success("Profile updated successfully! 🎉"); // ✨ 2. Use sonner's toast
      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container bg-gradient-to-br from-gray-950 via-black to-gray-900 py-10 px-4 p-6 pt-24">
      <div className="max-w-7xl mx-auto   grid gap-6 lg:grid-cols-[320px_1fr]">
        {/* LEFT SIDEBAR PROFILE CARD */}
        <Card className="p-6 h-fit">
          <div className="flex flex-col items-center text-center">
            <Avatar className="h-24 w-24 mb-4 ">
              <AvatarFallback className="text-2xl text-black font-bold bg-primary">
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
        </Card>

        {/* RIGHT MAIN FORM */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <p className="text-sm text-muted-foreground">
              Manage your personal and address details
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-8">
              {/* PERSONAL INFO */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Personal Info</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Full Name</label>
                    <Input
                      name="name"
                      disabled={!editing}
                      value={userData.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Gender</label>
                    <Input
                      name="gender"
                      disabled={!editing}
                      value={userData.gender}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input disabled value={userData.email} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Mobile</label>
                    <Input
                      name="mobile"
                      disabled={!editing}
                      value={userData.mobile}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Date of Birth</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          disabled={!editing}
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {userData?.dob
                            ? format(userData.dob, "PPP")
                            : "Pick a date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent>
                        <CustomCalendar
                          selected={userData.dob ?? undefined}
                          onSelect={(date) =>
                            setUserData({ ...userData, dob: date ?? null })
                          }
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <Separator />

              {/* ADDRESS INFO */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Address Info</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Area</label>
                    <Input
                      name="area"
                      disabled={!editing}
                      value={userData.area}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">City</label>
                    <Input
                      name="city"
                      disabled={!editing}
                      value={userData.city}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">State</label>
                    <Input
                      name="state"
                      disabled={!editing}
                      value={userData.state}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Pincode</label>
                    <Input
                      name="pincode"
                      disabled={!editing}
                      value={userData.pincode}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="flex justify-end space-x-4">
                {editing ? (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? "Saving..." : "Save"}
                    </Button>
                  </>
                ) : (
                  <Button type="button" onClick={() => setEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

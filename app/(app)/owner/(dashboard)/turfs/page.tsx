"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Item, ItemHeader } from "@/components/ui/item";
import { Switch } from "@/components/ui/switch";
import { Calendar, Calendar1, Edit, Percent } from "lucide-react";
import Image from "next/image";
import React, { useEffect, useState } from "react";
import z from "zod";

const formObj = z.object({
  name: z.string(),
  address: z.string(),
  coordinates: z.string(),
});

type FormState = z.infer<typeof formObj>;

export default function TurfsPage() {
  const [formData, setFormData] = useState<FormState>({
    name: "",
    address: "",
    coordinates: "",
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setFormData((prev) => ({
            ...prev,
            coordinates: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          }));
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
      );
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = () => {
    const result = formObj.safeParse(formData);
    if (!result.success) {
      console.error("Validation failed:", result.error.format());
    }
  };

  return (
    <div className="container mx-auto">
      <div className="px-4 py-6">
        <h2 className="text-3xl font-bold">My Turf</h2>
        <p className="text-muted-foreground">
          Manage your turf and availability
        </p>
      </div>

      <div className="w-full p-4 space-y-4">
        <Image
          src="/hero-turf.jpg"
          alt="turf-image"
          width={400}
          height={400}
          className="w-full h-auto rounded-xl"
        />

        <div className="bg-card relative p-4 rounded-xl shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-foreground">
                {formData.name || "Run Bhumi Turf"}
              </div>
              <div className="text-sm text-muted-foreground">
                [{formData.coordinates || "25°30′90″, 25°30′90″"}]
              </div>
            </div>

            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Edit turf details"
                >
                  <Edit className="size-4 text-muted-foreground hover:text-foreground transition-colors" />
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Turf Details</DialogTitle>
                </DialogHeader>

                <form className="space-y-4" onSubmit={handleSubmit}>
                  <Field>
                    <FieldLabel>Name</FieldLabel>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Address</FieldLabel>
                    <Input
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Coordinates</FieldLabel>
                    <Input
                      name="coordinates"
                      value={formData.coordinates}
                      onChange={handleChange}
                    />
                  </Field>

                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button type="submit">Save changes</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>
      <div className="flex max-md:space-x-4 space-x-6 justify-between px-4 py-6">
        <Card className="w-full border-border bg-card shadow-sm max-md:flex justify-center max-md:text-center">
          <CardHeader className="flex max-md:flex-col items-center justify-between">
            <Calendar />
            <CardTitle className="text-md font-semibold text-muted-foreground">
              Today&apos;s Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">0</div>
          </CardContent>
        </Card>
        <Card className="w-full border-border bg-card shadow-sm max-md:text-center">
          <CardHeader className="flex  max-md:flex-col items-center justify-between">
            <Calendar1 />
            <CardTitle className="text-md  font-semibold text-muted-foreground">
              Monthly Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">0</div>
          </CardContent>
        </Card>
        <Card className="w-full border-border bg-card shadow-sm max-md:text-center">
          <CardHeader className="flex max-md:flex-col items-center  justify-between">
            <Percent />
            <CardTitle className="text-md  font-semibold text-muted-foreground">
              Occupancy Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-foreground">0</div>
          </CardContent>
        </Card>
      </div>

      <div className="p-6">
        <div>
          <h4 className="text-lg font-semibold">Time Slots and Pricing</h4>
        </div>
        <div className="space-y-4">
          <Item className="bg-card p-6 shadow-lg rounded-xl">
            <ItemHeader className="flex justify-between">
              <div>
                <div className="text-lg font-bold">9:00 AM - 10:00 AM</div>
                <div className="text-md font-medium">₹1000</div>
              </div>
              <div>
                <Switch id="booked" />
              </div>
            </ItemHeader>
          </Item>

          <Item className="bg-card p-6 shadow-lg rounded-xl">
            <ItemHeader className="flex justify-between">
              <div>
                <div className="text-lg font-bold">10:00 AM - 11:00 AM</div>
                <div className="text-md font-medium">₹1000</div>
              </div>
              <div>
                <Switch id="booked" />
              </div>
            </ItemHeader>
          </Item>
          <Item className="bg-card p-6 shadow-lg rounded-xl">
            <ItemHeader className="flex justify-between">
              <div>
                <div className="text-lg font-bold">11:00 AM - 12:00 PM</div>
                <div className="text-md font-medium">₹1000</div>
              </div>
              <div>
                <Switch id="booked" />
              </div>
            </ItemHeader>
          </Item>
          <Item className="bg-card p-6 shadow-lg rounded-xl">
            <ItemHeader className="flex justify-between">
              <div>
                <div className="text-lg font-bold">12:00 PM - 1:00 PM</div>
                <div className="text-md font-medium">₹1000</div>
              </div>
              <div>
                <Switch id="booked" />
              </div>
            </ItemHeader>
          </Item>
        </div>
      </div>
    </div>
  );
}

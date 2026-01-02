"use client";

import Image from "next/image";
import { Edit, IndianRupee, MapPin, PlusCircle } from "lucide-react";
import React, { useState, useEffect } from "react";
import z from "zod";
import { useTurf } from "@/context/turf-context";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const formObj = z.object({
  name: z.string(),
  address: z.string(),
  coordinates: z.string(),
  price: z.coerce.number(),
});

type FormState = z.infer<typeof formObj>;

export default function TurfsPage() {
  const { turfs, addTurf, editTurf } = useTurf();

  // form state
  const [formData, setFormData] = useState<FormState>({
    name: "",
    address: "",
    coordinates: "",
    price: 0,
  });

  const [imageFile, setImageFile] = useState<File | null>(null);

  // editing flag
  const [editTurfId, setEditTurfId] = useState<string | null>(null);

  // auto coordinates
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      const { latitude, longitude } = pos.coords;
      setFormData((p) => ({
        ...p,
        coordinates: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
      }));
    });
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = formObj.safeParse(formData);
    if (!result.success) return;

    await addTurf({
      ...formData,
      imageFile: imageFile ?? undefined,
    });

    setFormData({ name: "", address: "", coordinates: "", price: 0 });
    setImageFile(null);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTurfId) return;

    const result = formObj.safeParse(formData);
    if (!result.success) return;

    await editTurf(editTurfId, {
      ...formData,
      imageFile: imageFile ?? undefined,
    });

    setEditTurfId(null);
    setImageFile(null);
  };

  return (
    <div className="container max-w-6xl mx-auto space-y-8 py-8 px-4">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">My Turfs</h2>

        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              Add New Turf
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Turf</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddSubmit} className="space-y-4">
              <Field>
                <FieldLabel>Name</FieldLabel>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, name: e.target.value }))
                  }
                />
              </Field>

              <Field>
                <FieldLabel>Address</FieldLabel>
                <Input
                  value={formData.address}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, address: e.target.value }))
                  }
                />
              </Field>

              <Field>
                <FieldLabel>Coordinates</FieldLabel>
                <Input
                  value={formData.coordinates}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, coordinates: e.target.value }))
                  }
                />
              </Field>

              <Field>
                <FieldLabel>Base Price (₹)</FieldLabel>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      price: Number(e.target.value),
                    }))
                  }
                />
              </Field>

              <Field>
                <FieldLabel>Upload Image</FieldLabel>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) =>
                    e.target.files?.[0] && setImageFile(e.target.files[0])
                  }
                />
              </Field>

              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* ===== TURF GRID ===== */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {turfs.map((turf) => (
          <Card key={turf.id} className="shadow-md">
            <CardHeader className="flex flex-row justify-between">
              <CardTitle>{turf.name}</CardTitle>

              {/* ===== EDIT BUTTON ===== */}
              <Dialog
                open={editTurfId === turf.id}
                onOpenChange={(open) => setEditTurfId(open ? turf.id : null)}
              >
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-1" /> Edit
                  </Button>
                </DialogTrigger>

                {/* ===== EDIT DIALOG ===== */}
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Turf</DialogTitle>
                  </DialogHeader>

                  {/* preload values when dialog opened */}
                  {editTurfId === turf.id && (
                    <form onSubmit={handleEditSubmit} className="space-y-4">
                      <Field>
                        <FieldLabel>Name</FieldLabel>
                        <Input
                          defaultValue={turf.name}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              name: e.target.value,
                            }))
                          }
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Address</FieldLabel>
                        <Input
                          defaultValue={turf.address}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              address: e.target.value,
                            }))
                          }
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Coordinates</FieldLabel>
                        <Input
                          defaultValue={turf.coordinates}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              coordinates: e.target.value,
                            }))
                          }
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Base Price (₹)</FieldLabel>
                        <Input
                          type="number"
                          defaultValue={turf.price}
                          onChange={(e) =>
                            setFormData((p) => ({
                              ...p,
                              price: Number(e.target.value),
                            }))
                          }
                        />
                      </Field>

                      <Field>
                        <FieldLabel>Upload Image</FieldLabel>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(e) =>
                            e.target.files?.[0] &&
                            setImageFile(e.target.files[0])
                          }
                        />
                      </Field>

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button variant="outline">Cancel</Button>
                        </DialogClose>
                        <Button type="submit">Save Changes</Button>
                      </DialogFooter>
                    </form>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>

            <CardContent className="space-y-4">
              <Image
                src={turf.imageUrl || "/hero-turf.jpg"}
                alt="turf image"
                width={700}
                height={400}
                className="rounded-xl object-cover"
                priority
              />

              <p className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" /> {turf.address}
              </p>

              <p className="font-medium flex items-center gap-1">
                <IndianRupee className="h-4 w-4" />
                {turf.price} / hour
              </p>

              {turf.rating !== undefined && (
                <p className="text-sm">⭐ {turf.rating}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {turfs.length === 0 && (
        <p className="text-muted-foreground text-center">
          No turfs yet — add one to get started.
        </p>
      )}
    </div>
  );
}

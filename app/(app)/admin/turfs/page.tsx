"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { SafeImage } from "@/components/ui/safe-image";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  MapPin,
  Plus,
  Star,
  IndianRupee,
  MapPinOff,
  Eye,
  EyeOff,
  Loader2,
  Search,
  Download,
} from "lucide-react";
import { Turf } from "@/lib/types/turf";
import { Pagination } from "@/components/admin/pagination";

const ITEMS_PER_PAGE = 6;

export default function AdminTurfsPage() {
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSportFilter, setSelectedSportFilter] = useState("All");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const sportOptions = ["All", "Football", "Cricket", "Badminton", "Tennis", "Basketball"];
  const statusOptions = ["All", "Active", "Inactive"];
  const formatOptions = ["5v5", "7v7", "11v11"];
  const amenityOptions = ["Floodlights", "Washroom", "Parking", "Café", "Drinking Water"];

  const [selectedSportCategories, setSelectedSportCategories] = useState<string[]>([]);
  const [selectedFormats, setSelectedFormats] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [activeStatus, setActiveStatus] = useState("Active");

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    city: "",
    coordinates: "",
    price: "",
    ownerId: "",
  });
  const [editingTurfId, setEditingTurfId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [owners, setOwners] = useState<{ uid: string; name: string; email: string }[]>([]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showCoords, setShowCoords] = useState(false);
  const [cityFilter, setCityFilter] = useState<string>("all");

  const resetForm = () => {
    setEditingTurfId(null);
    setDialogMode("add");
    setFormData({ name: "", address: "", city: "", coordinates: "", price: "", ownerId: "" });
    setSelectedSportCategories([]);
    setSelectedFormats([]);
    setSelectedAmenities([]);
    setActiveStatus("Active");
    setImageFile(null);
    setShowCoords(false);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogMode("add");
    setIsAddDialogOpen(true);
  };

  const openEditDialog = async (turf: Turf) => {
    setEditingTurfId(turf.id);
    setDialogMode("edit");
    setIsAddDialogOpen(true);

    try {
      const response = await fetch(`/api/turfs/${turf.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch turf details");
      }

      const data = await response.json();
      const existingTurf = data.turf;

      setFormData({
        name: existingTurf.name || "",
        address: existingTurf.address || "",
        city: existingTurf.city || "",
        coordinates: existingTurf.coordinates || "",
        price: existingTurf.price?.toString() || "",
        ownerId: existingTurf.ownerId || "",
      });
      setSelectedSportCategories(existingTurf.sport || []);
      setSelectedFormats(existingTurf.formats || []);
      setSelectedAmenities(existingTurf.amenities || []);
      setActiveStatus(existingTurf.active === false ? "Inactive" : "Active");
      setImageFile(null);
      setShowCoords(false);
    } catch (error) {
      console.error("Error loading turf for edit:", error);
      setFormData({
        name: turf.name || "",
        address: turf.address || "",
        city: turf.city || "",
        coordinates: turf.coordinates || "",
        price: turf.price?.toString() || "",
        ownerId: turf.ownerId || "",
      });
      setSelectedSportCategories(turf.sport || []);
      setSelectedFormats(turf.formats || []);
      setSelectedAmenities(turf.amenities || []);
      setActiveStatus(turf.active === false ? "Inactive" : "Active");
      setImageFile(null);
      setShowCoords(false);
    }
  };

  const uniqueCities = useMemo(() => {
    const cities = new Set<string>();
    turfs.forEach((t) => {
      if (t.city && typeof t.city === "string") {
        cities.add(t.city.trim());
      }
    });
    return Array.from(cities).sort();
  }, [turfs]);

  const filteredTurfs = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return turfs.filter((t) => {
      const matchesSearch =
        !query ||
        (t.name || "").toLowerCase().includes(query) ||
        (t.address || "").toLowerCase().includes(query) ||
        (t.ownerName || "").toLowerCase().includes(query);

      const matchesSport =
        selectedSportFilter === "All" ||
        t.sport?.includes(selectedSportFilter);

      const matchesStatus =
        selectedStatusFilter === "All" ||
        (selectedStatusFilter === "Active" && t.active !== false) ||
        (selectedStatusFilter === "Inactive" && t.active === false);

      const matchesCity =
        cityFilter === "all" ||
        (typeof t.city === "string" &&
          t.city.toLowerCase() === cityFilter.toLowerCase());

      return matchesSearch && matchesSport && matchesStatus && matchesCity;
    });
  }, [turfs, searchQuery, selectedSportFilter, selectedStatusFilter, cityFilter]);

  const totalPages = Math.ceil(filteredTurfs.length / ITEMS_PER_PAGE);
  const paginatedTurfs = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTurfs.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTurfs, currentPage]);

  const exportTurfs = () => {
    const headers = ["Name", "Address", "Price", "Owner", "Status"];
    const rows = filteredTurfs.map((t) => [
      t.name,
      t.address,
      t.price,
      t.ownerName || "N/A",
      t.active === false ? "Inactive" : "Active",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `turfs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [turfsRes, ownersRes] = await Promise.all([
          fetch("/api/turfs"),
          fetch("/api/owners"),
        ]);

        if (turfsRes.ok) {
          const turfsData = await turfsRes.json();
          setTurfs(turfsData.turfs || []);
        }

        if (ownersRes.ok) {
          const ownersData = await ownersRes.json();
          setOwners(ownersData.owners || []);
        }
      } catch (err) {
        setError("Failed to load data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedSportFilter, selectedStatusFilter]);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setFormData((p) => ({
            ...p,
            coordinates: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          }));
          setShowCoords(true);
        },
        () => {
          alert("Unable to get location");
        }
      );
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.address || !formData.price) {
      return;
    }

    setSubmitting(true);

    try {
      const formPayload = new FormData();
      formPayload.append("name", formData.name);
      formPayload.append("address", formData.address);
      formPayload.append("city", formData.city || "");
      formPayload.append("coordinates", formData.coordinates);
      formPayload.append("price", formData.price);
      if (formData.ownerId) {
        formPayload.append("ownerId", formData.ownerId);
      }
      formPayload.append("active", activeStatus === "Active" ? "true" : "false");
      formPayload.append("availability", activeStatus);
      formPayload.append("rating", "4.5");
      selectedSportCategories.forEach((sport) => formPayload.append("sport", sport));
      selectedFormats.forEach((format) => formPayload.append("formats", format));
      selectedAmenities.forEach((amenity) => formPayload.append("amenities", amenity));
      if (imageFile) {
        formPayload.append("image", imageFile);
      }

      const isEditMode = dialogMode === "edit" && editingTurfId;
      const url = isEditMode ? `/api/turfs/${editingTurfId}` : "/api/turfs";
      const method = isEditMode ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        body: formPayload,
      });

      if (response.ok) {
        const data = await response.json();
        const selectedOwner = owners.find((o) => o.uid === formData.ownerId);
        const updatedTurf = { ...data.turf, ownerName: selectedOwner?.name || data.turf.ownerName || "Unknown" };

        setTurfs((prev) => {
          if (isEditMode) {
            return prev.map((t) => (t.id === updatedTurf.id ? updatedTurf : t));
          }
          return [updatedTurf, ...prev];
        });

        resetForm();
        setIsAddDialogOpen(false);
      } else {
        throw new Error(isEditMode ? "Failed to update turf" : "Failed to create turf");
      }
    } catch (err) {
      console.error(err);
      alert(dialogMode === "edit" ? "Failed to update turf" : "Failed to add turf");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Turfs Management</h1>
          <p className="text-muted-foreground">
            Manage all registered turfs in the system
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportTurfs}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Dialog
            open={isAddDialogOpen}
            onOpenChange={(open) => {
              setIsAddDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Turf
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-3xl max-h-[calc(100vh-3rem)] overflow-hidden">
              <DialogHeader>
                <DialogTitle>{dialogMode === "edit" ? "Edit Turf" : "Add New Turf"}</DialogTitle>
              </DialogHeader>

              <form onSubmit={handleAddSubmit} className="space-y-4">
                <div className="overflow-y-auto max-h-[calc(100vh-22rem)] pr-2">
                  <Field>
                    <FieldLabel>Turf Name</FieldLabel>
                    <Input
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Enter turf name"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Address</FieldLabel>
                    <Input
                      value={formData.address}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, address: e.target.value }))
                      }
                      placeholder="Enter full address"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>City</FieldLabel>
                    <Input
                      value={formData.city}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, city: e.target.value }))
                      }
                      placeholder="e.g., Nagpur, Mumbai, Pune"
                      list="city-suggestions"
                    />
                    <datalist id="city-suggestions">
                      {uniqueCities.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </Field>

                  <Field>
                    <FieldLabel className="flex items-center justify-between">
                      Coordinates
                      <button
                        type="button"
                        onClick={getCurrentLocation}
                        className="text-xs text-primary hover:underline"
                      >
                        Use Current Location
                      </button>
                    </FieldLabel>
                    <div className="relative">
                      <Input
                        value={formData.coordinates}
                        onChange={(e) =>
                          setFormData((p) => ({ ...p, coordinates: e.target.value }))
                        }
                        placeholder="Latitude, Longitude"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCoords(!showCoords)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showCoords ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>Base Price (₹/hour)</FieldLabel>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, price: e.target.value }))
                      }
                      placeholder="Enter price"
                    />
                  </Field>

                  <Field>
                    <FieldLabel>Sport Categories</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {sportOptions.slice(1).map((sport) => (
                        <button
                          key={sport}
                          type="button"
                          onClick={() =>
                            setSelectedSportCategories((prev) =>
                              prev.includes(sport)
                                ? prev.filter((item) => item !== sport)
                                : [...prev, sport],
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-sm ${
                            selectedSportCategories.includes(sport)
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {sport}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>Formats</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {formatOptions.map((format) => (
                        <button
                          key={format}
                          type="button"
                          onClick={() =>
                            setSelectedFormats((prev) =>
                              prev.includes(format)
                                ? prev.filter((item) => item !== format)
                                : [...prev, format],
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-sm ${
                            selectedFormats.includes(format)
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {format}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>Amenities</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {amenityOptions.map((amenity) => (
                        <button
                          key={amenity}
                          type="button"
                          onClick={() =>
                            setSelectedAmenities((prev) =>
                              prev.includes(amenity)
                                ? prev.filter((item) => item !== amenity)
                                : [...prev, amenity],
                            )
                          }
                          className={`rounded-full border px-3 py-1 text-sm ${
                            selectedAmenities.includes(amenity)
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {amenity}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>Status</FieldLabel>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.slice(1).map((status) => (
                        <button
                          key={status}
                          type="button"
                          onClick={() => setActiveStatus(status)}
                          className={`rounded-full border px-3 py-1 text-sm ${
                            activeStatus === status
                              ? "bg-green-600 text-white border-green-600"
                              : "bg-white text-gray-700 border-gray-200"
                          }`}
                        >
                          {status}
                        </button>
                      ))}
                    </div>
                  </Field>

                  <Field>
                    <FieldLabel>Owner</FieldLabel>
                    <select
                      value={formData.ownerId}
                      onChange={(e) =>
                        setFormData((p) => ({ ...p, ownerId: e.target.value }))
                      }
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      <option value="">Select Owner (Optional)</option>
                      {owners.map((owner) => (
                        <option key={owner.uid} value={owner.uid}>
                          {owner.name} ({owner.email})
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field>
                    <FieldLabel>Turf Image</FieldLabel>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) =>
                        e.target.files?.[0] && setImageFile(e.target.files[0])
                      }
                    />
                    {imageFile && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Selected: {imageFile.name}
                      </p>
                    )}
                  </Field>
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline" type="button">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {dialogMode === "edit" ? "Saving..." : "Adding..."}
                      </>
                    ) : (
                      dialogMode === "edit" ? "Save Changes" : "Add Turf"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border border-gray-200 bg-white shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-lg font-semibold mb-2">Filters</h2>
              <p className="text-sm text-gray-500">Search and filter turfs side by side.</p>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, address, owner..."
                className="h-11 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Sport Category</label>
                <select
                  value={selectedSportFilter}
                  onChange={(e) => setSelectedSportFilter(e.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {sportOptions.map((sport) => (
                    <option key={sport} value={sport}>
                      {sport}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Status</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">City</label>
                <select
                  value={cityFilter}
                  onChange={(e) => {
                    setCityFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="all">All cities</option>
                  {uniqueCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Sport Categories</label>
                <div className="flex flex-wrap gap-2">
                  {sportOptions.slice(1).map((sport) => (
                    <button
                      key={sport}
                      type="button"
                      onClick={() =>
                        setSelectedSportCategories((prev) =>
                          prev.includes(sport)
                            ? prev.filter((item) => item !== sport)
                            : [...prev, sport],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-sm ${
                        selectedSportCategories.includes(sport)
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      {sport}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Formats</label>
                <div className="flex flex-wrap gap-2">
                  {formatOptions.map((format) => (
                    <button
                      key={format}
                      type="button"
                      onClick={() =>
                        setSelectedFormats((prev) =>
                          prev.includes(format)
                            ? prev.filter((item) => item !== format)
                            : [...prev, format],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-sm ${
                        selectedFormats.includes(format)
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {amenityOptions.map((amenity) => (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() =>
                        setSelectedAmenities((prev) =>
                          prev.includes(amenity)
                            ? prev.filter((item) => item !== amenity)
                            : [...prev, amenity],
                        )
                      }
                      className={`rounded-full border px-3 py-1 text-sm ${
                        selectedAmenities.includes(amenity)
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-white text-gray-700 border-gray-200"
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          {turfs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MapPinOff className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Turfs Yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add your first turf to get started
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Turf
            </Button>
          </CardContent>
        </Card>
      ) : paginatedTurfs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Results Found</h3>
            <p className="text-muted-foreground text-sm">
              Try a different search term
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 items-stretch">
            {paginatedTurfs.map((turf) => (
              <Card
                key={turf.id}
                className="overflow-hidden hover:shadow-md transition-shadow flex flex-col p-0"
              >
                <div className="relative h-44 w-full bg-muted rounded-t-lg flex-shrink-0">
                  {turf.imageurl ? (
                    <SafeImage
                      src={turf.imageurl}
                      alt={turf.name}
                      fill
                      className="object-cover rounded-t-lg"
                      unoptimized
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg">
                      <MapPin className="h-12 w-12 text-primary/50" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge
                      variant={turf.active === false ? "secondary" : "default"}
                    >
                      {turf.active === false ? "Inactive" : "Active"}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pt-2 pb-0 px-3">
                  <CardTitle className="text-lg line-clamp-1">
                    {turf.name}
                  </CardTitle>
                  {turf.ownerName && (
                    <p className="text-sm text-muted-foreground">
                      Owner: {turf.ownerName}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="pt-2 space-y-2 px-3">
                  <p className="text-sm text-muted-foreground flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{turf.address}</span>
                  </p>
                  {turf.city && (
                    <p className="text-xs text-muted-foreground pl-6">
                      📍 {turf.city}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 font-semibold">
                      <IndianRupee className="h-4 w-4" />
                      <span>{formatCurrency(turf.price || 0)}</span>
                      <span className="text-muted-foreground font-normal text-sm">
                        /hr
                      </span>
                    </div>
                    {turf.rating !== undefined && (
                      <div className="flex items-center gap-1 text-sm">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span>{turf.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>

                  {turf.sport && turf.sport.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {turf.sport.map((s) => (
                        <Badge key={s} variant="outline" className="text-xs">
                          {s}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2 mt-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => openEditDialog(turf)}
                    >
                      Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1">
                      View Details
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </>
      )}
      </div>
    </div>
  </div>
  );
}


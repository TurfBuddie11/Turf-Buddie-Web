"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, UserRoundX } from "lucide-react";
import { Pagination } from "@/components/admin/pagination";
import { CreateOwnerDialog, type CreatedOwner } from "@/components/admin/create-owner-dialog";

const ITEMS_PER_PAGE = 10;

interface OwnerRow {
  uid: string;
  name: string;
  email: string;
  mobile: string;
  city: string;
  createdBy: string;
  createdAt: string | null;
  turfs: { id: string; name: string }[];
}

interface TurfLite {
  id: string;
  name: string;
  ownerId?: string;
}

export default function AdminOwnersPage() {
  const [owners, setOwners] = useState<OwnerRow[]>([]);
  const [turfs, setTurfs] = useState<TurfLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [ownersRes, turfsRes] = await Promise.all([
          fetch("/api/admin/owners", { credentials: "include", cache: "no-store" }),
          fetch("/api/turfs", { cache: "no-store" }),
        ]);
        if (!ownersRes.ok) throw new Error("Failed to load owners");
        const ownersData = await ownersRes.json();
        setOwners(ownersData.owners || []);

        if (turfsRes.ok) {
          const turfsData = await turfsRes.json();
          setTurfs(
            (turfsData.turfs || []).map((t: TurfLite) => ({
              id: t.id,
              name: t.name,
              ownerId: t.ownerId,
            })),
          );
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load owners");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const ownerNameById = useMemo(
    () => new Map(owners.map((o) => [o.uid, o.name])),
    [owners],
  );

  const assignableTurfs = useMemo(
    () =>
      turfs
        .map((t) => ({
          ...t,
          ownerName: t.ownerId ? ownerNameById.get(t.ownerId) : undefined,
        }))
        // Unassigned turfs first, then alphabetical.
        .sort((a, b) =>
          Number(!!a.ownerId) - Number(!!b.ownerId) || (a.name || "").localeCompare(b.name || ""),
        ),
    [turfs, ownerNameById],
  );

  const filteredOwners = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return owners;
    return owners.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        o.email.toLowerCase().includes(q) ||
        o.mobile.toLowerCase().includes(q) ||
        o.city.toLowerCase().includes(q) ||
        o.turfs.some((t) => t.name.toLowerCase().includes(q)),
    );
  }, [owners, searchQuery]);

  useEffect(() => setCurrentPage(1), [searchQuery]);

  const totalPages = Math.ceil(filteredOwners.length / ITEMS_PER_PAGE);
  const paginatedOwners = filteredOwners.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  const handleCreated = (owner: CreatedOwner) => {
    const assigned = turfs.filter((t) => owner.turfIds.includes(t.id));

    setOwners((prev) => [
      { ...owner, turfs: assigned.map(({ id, name }) => ({ id, name })) },
      // Turfs that were reassigned no longer belong to their previous owner.
      ...prev.map((o) => ({
        ...o,
        turfs: o.turfs.filter((t) => !owner.turfIds.includes(t.id)),
      })),
    ]);
    setTurfs((prev) =>
      prev.map((t) => (owner.turfIds.includes(t.id) ? { ...t, ownerId: owner.uid } : t)),
    );
  };

  const formatDate = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

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
          <h1 className="text-2xl font-bold text-foreground">Turf Owners</h1>
          <p className="text-muted-foreground">
            Create owner accounts and assign turfs to them
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Owner
        </Button>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, email, mobile, city, turf..."
              className="h-9 w-full rounded-md border border-input bg-background pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {filteredOwners.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <UserRoundX className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-1">
                {owners.length === 0 ? "No owners yet" : "No results"}
              </h3>
              <p className="text-muted-foreground text-sm">
                {owners.length === 0
                  ? "Add your first turf owner to get started"
                  : "Try a different search term"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>Turfs</TableHead>
                      <TableHead>Added</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedOwners.map((owner) => (
                      <TableRow key={owner.uid}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {owner.name}
                            {owner.createdBy === "admin" && (
                              <Badge variant="outline" className="text-[10px]">
                                by admin
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{owner.email}</TableCell>
                        <TableCell>{owner.mobile || "—"}</TableCell>
                        <TableCell>{owner.city || "—"}</TableCell>
                        <TableCell>
                          {owner.turfs.length === 0 ? (
                            <span className="text-muted-foreground text-sm">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {owner.turfs.map((t) => (
                                <Badge key={t.id} variant="secondary" className="text-xs">
                                  {t.name}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground whitespace-nowrap">
                          {formatDate(owner.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </CardContent>
      </Card>

      <CreateOwnerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onCreated={handleCreated}
        turfs={assignableTurfs}
      />
    </div>
  );
}

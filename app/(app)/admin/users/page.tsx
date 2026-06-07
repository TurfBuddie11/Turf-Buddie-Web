"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  User,
  Shield,
  Eye,
  Edit,
  Mail,
  Phone,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Pagination } from "@/components/admin/pagination";

const ITEMS_PER_PAGE = 10;

interface UserData {
  uid: string;
  name: string;
  email: string;
  type: "owner" | "user";
  createdAt?: unknown;
  mobile: string;
  city: string;
  emailVerified: boolean;
}

interface BookingData {
  id: string;
  turfId: string;
  turfName: string;
  timeSlot: string;
  price: number;
  date: Date | string;
  monthSlot: string;
  daySlot: string;
  status: string;
  transactionId?: string;
  paid?: string;
  payout?: number;
  commission?: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updating, setUpdating] = useState(false);
  const [bookings, setBookings] = useState<{
    upcoming: BookingData[];
    past: BookingData[];
    total: number;
  } | null>(null);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [showUpcoming, setShowUpcoming] = useState(true);
  const [showPast, setShowPast] = useState(false);
  const [bookingSearch, setBookingSearch] = useState("");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingType, setBookingType] = useState("all");

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch("/api/admin/users");
        if (!response.ok) throw new Error("Failed to fetch");
        const data = await response.json();
        setUsers(data.users || []);
      } catch (err) {
        setError("Failed to load users");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users;
    const query = searchQuery.toLowerCase();
    return users.filter(
      (user) =>
        (user.name || "").toLowerCase().includes(query) ||
        (user.email || "").toLowerCase().includes(query) ||
        (user.type || "").toLowerCase().includes(query)
    );
  }, [users, searchQuery]);

  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  const parseBookingDate = (d: Date | string) => typeof d === "string" ? new Date(d) : d;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const formatDate = (date: unknown) => {
    if (!date || typeof date !== "object") return "N/A";
    const dateObj = date as { toDate?: () => Date; _seconds?: number };
    if (dateObj.toDate && typeof dateObj.toDate === "function") {
      try {
        return dateObj.toDate().toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
      } catch {
        return "N/A";
      }
    }
    if (dateObj._seconds) {
      return new Date(dateObj._seconds * 1000).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }
    return "N/A";
  };

  const handleViewUser = async (user: UserData) => {
    setSelectedUser(user);
    setBookings(null);
    setShowUpcoming(true);
    setShowPast(false);
    setBookingSearch("");
    setBookingDate("");
    setBookingType("all");
    setIsViewDialogOpen(true);
    setLoadingBookings(true);

    try {
      const response = await fetch(`/api/admin/users/${user.uid}/bookings`);
      if (response.ok) {
        const data = await response.json();
        setBookings({
          upcoming: data.upcomingBookings,
          past: data.pastBookings,
          total: data.totalBookings,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selectedUser || !newPassword || newPassword.length < 6) return;
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUser.uid}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      if (response.ok) {
        setNewPassword("");
        setIsPasswordDialogOpen(false);
        setIsViewDialogOpen(false);
        setSelectedUser(null);
      } else {
        throw new Error("Failed to reset password");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to reset password");
    } finally {
      setUpdating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Users Management</h1>
          <p className="text-muted-foreground">
            Manage all users and owners in the system
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <Card className="p-0 overflow-hidden">
        <CardHeader className="px-4 py-3 border-b">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchQuery ? "No users found" : "No users found"}
                  </TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={`${user.type}-${user.uid}`}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={user.type === "owner" ? "default" : "secondary"} className="gap-1">
                        {user.type === "owner" ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {user.type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(user.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleViewUser(user)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-semibold">{selectedUser.name}</p>
                  <Badge variant={selectedUser.type === "owner" ? "default" : "secondary"} className="mt-1">
                    {selectedUser.type === "owner" ? <Shield className="h-3 w-3 mr-1" /> : <User className="h-3 w-3 mr-1" />}
                    {selectedUser.type}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{selectedUser.email}</span>
                    {selectedUser.emailVerified && <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />}
                  </div>
                  {selectedUser.mobile && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedUser.mobile}</span>
                    </div>
                  )}
                  {selectedUser.city && (
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{selectedUser.city}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Joined: {formatDate(selectedUser.createdAt)}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => {
                      setIsViewDialogOpen(false);
                      setIsPasswordDialogOpen(true);
                      setNewPassword("");
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Reset Password
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Bookings ({bookings?.total || 0})
                </h3>

                {loadingBookings ? (
                  <div className="flex items-center justify-center py-8">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : bookings && bookings.total > 0 ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="Search by TXN ID..."
                          value={bookingSearch}
                          onChange={(e) => setBookingSearch(e.target.value)}
                          className="pl-7 h-8 text-xs"
                        />
                      </div>
                      <Input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="h-8 text-xs w-36"
                      />
                      <Select value={bookingType} onValueChange={setBookingType}>
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="upcoming">Upcoming</SelectItem>
                          <SelectItem value="past">Past</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {(() => {
                      const all = [...bookings.upcoming, ...bookings.past];
                      const filtered = all.filter((b) => {
                        const matchTxn = bookingSearch
                          ? (b.transactionId || "").toLowerCase().includes(bookingSearch.toLowerCase())
                          : true;
                        const matchDate = bookingDate
                          ? parseBookingDate(b.date).toISOString().startsWith(bookingDate)
                          : true;
                        const matchType =
                          bookingType === "upcoming" ? parseBookingDate(b.date) >= new Date() :
                          bookingType === "past" ? parseBookingDate(b.date) < new Date() :
                          true;
                        return matchTxn && matchDate && matchType;
                      });
                      const filteredUpcoming = filtered.filter((b) => parseBookingDate(b.date) >= new Date());
                      const filteredPast = filtered.filter((b) => parseBookingDate(b.date) < new Date());

                      if (filtered.length === 0) {
                        return (
                            <div className="space-y-2">
                              {all.map((booking, i) => (
                                <div key={`${booking.id}-${i}`} className="p-3 bg-muted/50 rounded-lg border">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-medium text-sm">{booking.turfName}</p>
                                    <p className="text-xs text-muted-foreground">{booking.daySlot}, {booking.monthSlot}</p>
                                    <p className="text-xs text-muted-foreground">{booking.timeSlot}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-semibold">{formatCurrency(booking.price)}</p>
                                    <Badge variant="outline" className="text-xs mt-1">
                                      {booking.status}
                                    </Badge>
                                    {booking.paid && (
                                      <p className="text-xs text-muted-foreground mt-1">{booking.paid}</p>
                                    )}
                                  </div>
                                </div>
                                {booking.transactionId && (
                                  <p className="text-xs text-muted-foreground mt-1">TXN: {booking.transactionId}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        );
                      }

                      return (
                        <>
                          {filteredUpcoming.length > 0 && (
                            <div>
                              <button
                                onClick={() => setShowUpcoming(!showUpcoming)}
                                className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground mb-2"
                              >
                                Upcoming ({filteredUpcoming.length})
                                {showUpcoming ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                              {showUpcoming && (
                                <div className="space-y-2">
                              {filteredUpcoming.map((booking, i) => (
                                <div key={`up-${booking.id}-${i}`} className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium text-sm">{booking.turfName}</p>
                                          <p className="text-xs text-muted-foreground">{booking.daySlot}, {booking.monthSlot}</p>
                                          <p className="text-xs text-muted-foreground">{booking.timeSlot}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-semibold">{formatCurrency(booking.price)}</p>
                                          <Badge variant="outline" className="text-xs mt-1 bg-green-100 dark:bg-green-900/30">
                                            {booking.status}
                                          </Badge>
                                        </div>
                                      </div>
                                      {booking.transactionId && (
                                        <p className="text-xs text-muted-foreground mt-1">TXN: {booking.transactionId}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}

                          {filteredPast.length > 0 && (
                            <div>
                              <button
                                onClick={() => setShowPast(!showPast)}
                                className="flex items-center justify-between w-full text-sm font-medium text-muted-foreground hover:text-foreground mb-2"
                              >
                                Past ({filteredPast.length})
                                {showPast ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              </button>
                              {showPast && (
                                <div className="space-y-2">
                              {filteredPast.map((booking, i) => (
                                <div key={`past-${booking.id}-${i}`} className="p-3 bg-muted/50 rounded-lg border">
                                      <div className="flex justify-between items-start">
                                        <div>
                                          <p className="font-medium text-sm">{booking.turfName}</p>
                                          <p className="text-xs text-muted-foreground">{booking.daySlot}, {booking.monthSlot}</p>
                                          <p className="text-xs text-muted-foreground">{booking.timeSlot}</p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-semibold">{formatCurrency(booking.price)}</p>
                                          <Badge variant="outline" className="text-xs mt-1">
                                            {booking.status}
                                          </Badge>
                                          {booking.paid && (
                                            <p className="text-xs text-muted-foreground mt-1">{booking.paid}</p>
                                          )}
                                        </div>
                                      </div>
                                      {booking.transactionId && (
                                        <p className="text-xs text-muted-foreground mt-1">TXN: {booking.transactionId}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">No bookings found</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter new password for <strong>{selectedUser?.name}</strong>
            </p>
            <Field>
              <FieldLabel>New Password</FieldLabel>
              <Input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
              />
            </Field>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => { setIsPasswordDialogOpen(false); setNewPassword(""); }} className="flex-1">
                Cancel
              </Button>
              <Button onClick={handleResetPassword} disabled={!newPassword || newPassword.length < 6 || updating} className="flex-1">
                {updating ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

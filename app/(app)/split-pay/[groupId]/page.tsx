"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-provider";
import { initiatePayment } from "@/lib/razorpay/payment";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, Clock, Users, MapPin, AlertCircle } from "lucide-react";
import Link from "next/link";
import { SplitGroup } from "@/lib/types/split-payment";

export default function SplitPayPage() {
    const { groupId } = useParams<{ groupId: string }>();
    const { user, profile } = useAuth();
    const router = useRouter();

    const [group, setGroup] = useState<SplitGroup | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [payingIndex, setPayingIndex] = useState<number | null>(null);
    const [myIndex, setMyIndex] = useState<number | null>(null);

    const fetchGroup = useCallback(async () => {
        try {
            const res = await fetch(`/api/split-payment/${groupId}`);
            if (!res.ok) {
                const data = await res.json();
                setError(data.error || "Failed to load group");
                return;
            }
            const data = await res.json();
            setGroup(data.group);

            // Find which member index matches current user (by phone or uid)
            if (user && data.group) {
                const idx = data.group.members.findIndex(
                    (m: { uid?: string; phone?: string }) =>
                        m.uid === user.uid ||
                        (profile?.mobile && m.phone === profile.mobile),
                );
                setMyIndex(idx >= 0 ? idx : null);
            }
        } catch {
            setError("Failed to load split group");
        } finally {
            setLoading(false);
        }
    }, [groupId, user, profile]);

    useEffect(() => {
        fetchGroup();
        // Poll every 10s to update payment status
        const interval = setInterval(fetchGroup, 10000);
        return () => clearInterval(interval);
    }, [fetchGroup]);

    const handlePay = async (memberIndex: number) => {
        if (!user) {
            toast.error("Please login to pay your share");
            router.push(`/login?redirect=/split-pay/${groupId}`);
            return;
        }

        setPayingIndex(memberIndex);
        try {
            // Step 1: Create order for this member
            const orderRes = await fetch(`/api/split-payment/${groupId}/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberIndex }),
            });

            if (!orderRes.ok) {
                const err = await orderRes.json();
                throw new Error(err.error || "Failed to create order");
            }

            const { orderId, amount, memberName, memberAmount } = await orderRes.json();

            // Step 2: Open Razorpay
            const { paymentId, signature } = await initiatePayment({
                amount: amount.toString(),
                currency: "INR",
                orderId,
                userDetails: {
                    name: profile?.name || memberName || "Player",
                    email: profile?.email || user.email || "",
                    contact: profile?.mobile || "",
                },
            });

            // Step 3: Verify
            const verifyRes = await fetch(`/api/split-payment/${groupId}/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ memberIndex, paymentId, orderId, signature }),
            });

            if (!verifyRes.ok) {
                const err = await verifyRes.json();
                throw new Error(err.error || "Payment verification failed");
            }

            const result = await verifyRes.json();

            toast.success(
                result.allPaid
                    ? "🎉 All paid! Booking confirmed!"
                    : `✅ ₹${memberAmount} paid! Waiting for others.`,
            );

            await fetchGroup();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Payment failed");
        } finally {
            setPayingIndex(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Spinner className="h-10 w-10 text-green-600" />
            </div>
        );
    }

    if (error || !group) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Group Not Found</h2>
                    <p className="text-gray-500 mb-6">{error || "This split group doesn't exist or has expired."}</p>
                    <Link href="/" className="text-green-600 font-semibold hover:underline">← Back to Home</Link>
                </div>
            </div>
        );
    }

    const paidCount = group.members.filter((m) => m.status === "paid").length;
    const progressPct = Math.round((group.collectedAmount / group.totalAmount) * 100);
    const isConfirmed = group.status === "confirmed";
    const isExpired = group.status === "expired";

    // Time remaining
    const expiresAt = new Date(group.expiresAt);
    const msLeft = expiresAt.getTime() - Date.now();
    const minsLeft = Math.max(0, Math.floor(msLeft / 60000));

    return (
        <div className="min-h-screen bg-[#f5f7f5] py-8 px-4">
            <div className="max-w-lg mx-auto space-y-4">

                {/* Header */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 mb-3">
                        💸 SPLIT PAYMENT
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Pay Your Share</h1>
                    <p className="text-gray-400 text-sm mt-1">
                        {isConfirmed
                            ? "All payments received — booking confirmed!"
                            : `${paidCount}/${group.splitCount} members paid`}
                    </p>
                </div>

                {/* Booking info card */}
                <div className="rounded-2xl bg-green-600 text-white p-5">
                    <p className="font-bold text-lg">{group.turfName}</p>
                    <div className="flex items-center gap-1.5 text-green-100 text-sm mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {group.timeSlots.join(", ")} · {group.daySlot}, {group.monthSlot}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-green-200">Total Amount</p>
                            <p className="font-bold text-xl">₹{group.totalAmount}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-green-200">Per Person</p>
                            <p className="font-bold text-xl">₹{group.perPersonAmount}</p>
                        </div>
                    </div>
                </div>

                {/* Status banner */}
                {isConfirmed && (
                    <div className="rounded-2xl bg-green-50 border border-green-200 p-4 flex items-center gap-3">
                        <CheckCircle className="w-8 h-8 text-green-600 shrink-0" />
                        <div>
                            <p className="font-bold text-green-800">Booking Confirmed!</p>
                            <p className="text-sm text-green-600">All {group.splitCount} members have paid. Slot is locked.</p>
                        </div>
                    </div>
                )}

                {isExpired && (
                    <div className="rounded-2xl bg-red-50 border border-red-200 p-4 flex items-center gap-3">
                        <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
                        <div>
                            <p className="font-bold text-red-800">Group Expired</p>
                            <p className="text-sm text-red-600">Payment window closed. Slot has been released.</p>
                        </div>
                    </div>
                )}

                {!isConfirmed && !isExpired && (
                    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-700 font-medium">
                            Slot held for {minsLeft} more minute{minsLeft !== 1 ? "s" : ""}. Pay before it expires.
                        </p>
                    </div>
                )}

                {/* Progress */}
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-500" />
                            <span className="text-sm font-semibold text-gray-800">Collection Progress</span>
                        </div>
                        <span className="text-sm font-bold text-green-600">
                            ₹{group.collectedAmount} / ₹{group.totalAmount}
                        </span>
                    </div>
                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden mb-1">
                        <div
                            className="h-full bg-green-500 rounded-full transition-all duration-500"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <p className="text-xs text-gray-400 text-right">{progressPct}% collected</p>
                </div>

                {/* Members list */}
                <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 space-y-3">
                    <h3 className="text-sm font-bold text-gray-800 mb-1">Squad Members</h3>

                    {group.members.map((member, i) => {
                        const isMe = myIndex === i;
                        const canPay = !isConfirmed && !isExpired && member.status === "pending" && isMe;

                        return (
                            <div
                                key={i}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${member.status === "paid"
                                        ? "bg-green-50 border-green-200"
                                        : isMe
                                            ? "bg-blue-50 border-blue-200"
                                            : "bg-gray-50 border-gray-100"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${member.status === "paid"
                                                ? "bg-green-200 text-green-800"
                                                : "bg-gray-200 text-gray-600"
                                            }`}
                                    >
                                        {member.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">
                                            {member.name}
                                            {i === 0 && (
                                                <span className="ml-1.5 text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 font-bold">
                                                    Organizer
                                                </span>
                                            )}
                                            {isMe && (
                                                <span className="ml-1.5 text-[10px] bg-blue-100 text-blue-700 rounded-full px-1.5 py-0.5 font-bold">
                                                    You
                                                </span>
                                            )}
                                        </p>
                                        <p className="text-xs text-gray-400">{member.phone}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-gray-900">₹{member.amount}</p>
                                        <p
                                            className={`text-xs font-medium ${member.status === "paid" ? "text-green-600" : "text-amber-500"
                                                }`}
                                        >
                                            {member.status === "paid" ? "✓ Paid" : "⏳ Pending"}
                                        </p>
                                    </div>

                                    {canPay && (
                                        <button
                                            onClick={() => handlePay(i)}
                                            disabled={payingIndex === i}
                                            className="rounded-xl bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-xs font-bold transition-colors disabled:opacity-60 flex items-center gap-1.5"
                                        >
                                            {payingIndex === i ? (
                                                <><Spinner className="w-3 h-3" /> Paying...</>
                                            ) : (
                                                `Pay ₹${member.amount}`
                                            )}
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Not logged in — show login prompt */}
                {!user && !isConfirmed && (
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5 text-center">
                        <p className="text-sm text-gray-600 mb-3">Login to pay your share</p>
                        <Link
                            href={`/login?redirect=/split-pay/${groupId}`}
                            className="inline-block rounded-xl bg-green-600 hover:bg-green-700 text-white px-6 py-3 text-sm font-bold transition-colors"
                        >
                            🔒 Login to Pay
                        </Link>
                    </div>
                )}

                {/* Share link */}
                {!isConfirmed && !isExpired && (
                    <div className="rounded-2xl bg-white border border-gray-100 shadow-sm p-5">
                        <p className="text-sm font-semibold text-gray-800 mb-3">Share with teammates</p>
                        <div className="flex gap-2">
                            <input
                                readOnly
                                value={typeof window !== "undefined" ? `${window.location.origin}/split-pay/${groupId}` : ""}
                                className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-600 bg-gray-50 focus:outline-none"
                            />
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`${window.location.origin}/split-pay/${groupId}`);
                                    toast.success("Link copied!");
                                }}
                                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:border-green-400 hover:text-green-700 transition-colors"
                            >
                                Copy
                            </button>
                        </div>
                        <button
                            onClick={() => {
                                const msg = `🏟 Hey! Pay your share for ${group.turfName} booking.\n💰 Your share: ₹${group.perPersonAmount}\n🔗 Pay here: ${window.location.origin}/split-pay/${groupId}`;
                                window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
                            }}
                            className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white py-2.5 text-sm font-bold transition-colors"
                        >
                            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                            Share on WhatsApp
                        </button>
                    </div>
                )}

                {isConfirmed && (
                    <Link href="/bookings" className="block">
                        <button className="w-full rounded-xl bg-green-600 hover:bg-green-700 text-white py-3.5 text-sm font-bold transition-colors">
                            View My Bookings →
                        </button>
                    </Link>
                )}
            </div>
        </div>
    );
}

"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Referral } from "@/lib/types/referral";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, Copy } from "lucide-react";
import { useAuth } from "@/context/auth-provider";
import { toast } from "sonner";

const ReferAndEarnPage = () => {
  const [referralCode, setReferralCode] = useState("");
  const [referralsHistory, setReferralsHistory] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { user, profile } = useAuth();

  useEffect(() => {
    const fetchReferralData = async () => {
      if (!user && !profile) {
        setLoading(false);
        return;
      }
      try {
        const idToken = await user?.getIdToken();
        const response = await fetch("/api/referrals", {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setReferralCode(data.referralCode);
          setReferralsHistory(data.referralsHistory);
          console.log(data);
        } else {
          const errorText = "Failed to fetch referral data.";
          setError(errorText);
          toast.error(errorText);
        }
      } catch (error) {
        const errorText = "An error occurred while fetching referral data.";
        setError(errorText);
        toast.error(errorText);
        console.error("Error fetching referral data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReferralData();
  }, [user, profile]);

  const handleCopyToClipboard = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied to clipboard!");
  };

  const handleSubmitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submittedCode) {
      return;
    }
    setError("");
    setIsSubmitting(true);
    try {
      const idToken = await user?.getIdToken();

      const response = await fetch("/api/referrals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ referralCode: submittedCode }),
      });

      if (response.ok) {
        toast.success(
          "Referral code applied successfully! You've earned 50 points.",
        );
        setSubmittedCode("");
        // The auth context should refresh the profile, which will hide this form on re-render.
      } else {
        const errorData = await response.text();
        setError(errorData || "Failed to submit referral code.");
        toast.error(errorData || "Failed to submit referral code.");
      }
    } catch (error) {
      const errorMessage = "An error occurred while submitting the code.";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error submitting referral code:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto pt-10">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center mb-4">
          <Link href="/profile" className="mr-4">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold">Refer & Earn</h1>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <div className="rounded-lg p-4 mb-8">
              <h2 className="text-lg font-semibold">Your Referral Code</h2>
              <p className="text-sm text-muted-foreground mb-2">
                Share this code with your friends. When they use it, you both
                get bonus points!
              </p>
              <div className="flex items-center space-x-2 mt-2">
                <Input value={referralCode} readOnly />
                <Button
                  onClick={handleCopyToClipboard}
                  size="icon"
                  disabled={!referralCode}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!profile?.referredBy && (
              <div className="rounded-lg p-4 mb-8">
                <h2 className="text-lg font-semibold">Have a referral code?</h2>
                <p className="text-sm text-muted-foreground mb-2">
                  Enter a code from a friend to get your welcome bonus.
                </p>
                <form
                  onSubmit={handleSubmitCode}
                  className="flex items-center space-x-2 mt-2"
                >
                  <Input
                    placeholder="Enter code"
                    value={submittedCode}
                    onChange={(e) => setSubmittedCode(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Submitting..." : "Submit"}
                  </Button>
                </form>
                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              </div>
            )}

            <div className="rounded-lg p-4 mb-8">
              <h2 className="text-lg font-semibold">Your Referrals</h2>
              {referralsHistory.length === 0 ? (
                <p className=" mt-2">You haven&apos;t referred anyone yet.</p>
              ) : (
                <div className="space-y-4 mt-2">
                  {referralsHistory.map((referral, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-900 rounded-lg p-4"
                    >
                      <p>Referred user: {referral.refereeName}</p>
                      <p className="text-green-500">Completed</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ReferAndEarnPage;

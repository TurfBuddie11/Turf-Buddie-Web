"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { LoyaltyTransaction } from "@/lib/types/loyalty";
import { useAuth } from "@/context/auth-provider";

const CoinHistoryPage = () => {
  const [history, setHistory] = useState<LoyaltyTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  const { user } = useAuth();

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const idToken = await user?.getIdToken();
        const response = await fetch("/api/loyalty/history", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (response.ok) {
          const data = await response.json();
          setHistory(data);
        }
      } catch (error) {
        console.error("Error fetching loyalty history:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  return (
    <div className="container min-h-screen pt-10">
      <div className="max-w-7xl mx-auto py-10 px-4">
        <div className="flex items-center mb-4">
          <Link href="/profile" className="mr-4">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold">Coin History</h1>
        </div>

        <Card className="max-w-7xl mx-auto px-4 py-6">
          {loading ? (
            <p>Loading...</p>
          ) : history.length === 0 ? (
            <p>No transactions found.</p>
          ) : (
            <div className="space-y-4">
              {history.map((transaction, index) => (
                <div
                  key={
                    transaction.transactionId ||
                    `${transaction.timestamp._seconds}-${index}`
                  }
                  className="flex items-center justify-between rounded-lg p-4"
                >
                  <div>
                    <h3 className="font-semibold">{transaction.reason}</h3>
                    <p className="text-sm">
                      {new Date(
                        transaction.timestamp._seconds * 1000,
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div
                    className={`text-lg font-bold ${
                      transaction.type === "credit"
                        ? "text-green-500"
                        : "text-red-500"
                    }`}
                  >
                    {transaction.type === "credit" ? "+" : "-"}
                    {transaction.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CoinHistoryPage;

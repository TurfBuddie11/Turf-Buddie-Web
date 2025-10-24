import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Item,
  ItemDescription,
  ItemHeader,
  ItemTitle,
} from "@/components/ui/item";
import { ArrowRight, ArrowUp, Check, IndianRupee } from "lucide-react";
import React from "react";

export default function PayoutPage() {
  return (
    <div className="container max-w-7xl mx-auto">
      <section className="p-6">
        <h3 className="text-2xl font-bold">Payout</h3>
        <p>Track your earning&apos;s and transactions</p>
      </section>
      <section className="p-6">
        <Card className="bg-green-600 flex flex-col justify-center p-6">
          <div className="flex justify-between">
            <div>
              <p className="text-md font-semibold text-accent-foreground">
                Pending Payout
              </p>
              <p className="text-3xl font-bold text-accent-foreground">₹1000</p>
            </div>
            <IndianRupee className="font-bold size-12 rounded-full border-3 p-2 text-primary-foreground border-primary-foreground" />
          </div>
          <div className="flex justify-between">
            <div className="text-lg font-semibold text-primary-foreground">
              Next Payout
            </div>
            <Button variant="secondary">Request Early</Button>
          </div>
        </Card>
      </section>
      <section className="p-6 flex  space-x-4">
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center gap-2">
            <ArrowUp className="rounded-full border-3 size-12 p-2" />
            <p className="text-4xl font-bold">₹7894</p>
            <p>This Month</p>
          </CardContent>
        </Card>
        <Card className="w-full">
          <CardContent className="flex flex-col items-center justify-center gap-2">
            <Check className="rounded-full border-3 size-12 p-2" />
            <p className="text-4xl font-bold">₹9405</p>
            <p>Total Earned</p>
          </CardContent>
        </Card>
      </section>
      <section className="p-6">
        <div>
          <h4 className="text-xl font-semibold">Recent Transactions</h4>
        </div>
        <div className="mt-10 space-y-4">
          <Item className="bg-card flex  px-6 py-4 shadow-md">
            <ItemHeader className="flex justify-between">
              <div className="flex items-center gap-4">
                <ArrowRight className="text-primary rounded-full size-8" />
                <div>
                  <div className="flex items-center gap-4">
                    <ItemTitle className="text-xl font-semibold">
                      Weekly Payout
                    </ItemTitle>
                  </div>
                  <ItemDescription>
                    {new Date().toLocaleDateString()}
                  </ItemDescription>
                </div>
              </div>
              <div className="text-green-600">
                <div className="font-semibold">+₹23400</div>
                <div className="font-semibold">Completed</div>
              </div>
            </ItemHeader>
          </Item>
          <Item className="bg-card flex  px-6 py-4 shadow-md">
            <ItemHeader className="flex justify-between">
              <div className="flex items-center gap-4">
                <ArrowRight className="text-primary rounded-full size-8" />
                <div>
                  <div className="flex items-center gap-4">
                    <ItemTitle className="text-xl font-semibold">
                      Weekly Payout
                    </ItemTitle>
                  </div>
                  <ItemDescription>
                    {new Date().toLocaleDateString()}
                  </ItemDescription>
                </div>
              </div>
              <div className="text-green-600">
                <div className="font-semibold">+₹23400</div>
                <div className="font-semibold">Not Completed</div>
              </div>
            </ItemHeader>
          </Item>
        </div>
      </section>
    </div>
  );
}

// app/(marketing)/grow-turf/page.tsx

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { MailIcon, LeafIcon } from "lucide-react";
import Link from "next/link";

export default function GrowTurfPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      <section className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          🌿 Grow Your Turf Business with TurfBuddies
        </h1>
        <p className="text-lg text-muted-foreground">
          TurfBuddies is a platform helping turf owners bring their business
          online with ease. If you manage a turf and want to simplify bookings,
          increase visibility, and build trust—we&apos;re here to help.
        </p>
      </section>

      <Separator />

      <section className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🌱 Why Join Us</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-4">
              <li>Built by students who understand local turf needs</li>
              <li>Get discovered by players and teams in your area</li>
              <li>
                Digitize your turf with branded booking and feedback flows
              </li>
              <li>No tech hassle—just plug in and start receiving bookings</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>📈 What You’ll Get</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <ul className="list-disc pl-4">
              <li>Online booking system with real-time availability</li>
              <li>Branded turf profile with images, pricing, and location</li>
              <li>Dashboard to manage bookings, feedback, and visibility</li>
              <li>Support from our student team to onboard and grow</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      <Separator />

      <section className="text-center space-y-4">
        <h2 className="text-2xl font-semibold">📬 Ready to Go Online?</h2>
        <p className="text-muted-foreground">
          If you own or manage a turf and want to simplify bookings and grow
          your business online, request access below. We&apos;ll walk you
          through our onboarding and get you live in no time.
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/owner/signup">
            <Button variant="default">
              <LeafIcon className="w-4 h-4 mr-2" />
              Join as Turf Owner
            </Button>
          </Link>
          <Link href="mailto:turfbuddy11@gmail.com">
            <Button variant="outline">
              <MailIcon className="w-4 h-4 mr-2" />
              Contact Us
            </Button>
          </Link>
        </div>
      </section>
    </main>
  );
}

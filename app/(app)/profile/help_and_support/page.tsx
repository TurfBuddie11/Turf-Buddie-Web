import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function HelpAndSupportPage() {
  return (
    <div className="container mx-auto">
      <div className="max-w-7xl mx-auto py-4 px-4">
        <div className="flex items-center mb-4">
          <Link href="/profile" className="mr-4">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold">Help and Support </h1>
        </div>
        <Card className="max-w-7xl mx-auto px-6 py-12">
          <p className="mb-8">
            Have a question or need help? Fill out the form below and we&apos;ll
            get back to you as soon as possible.
          </p>
          <form className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium mb-2"
                >
                  Name
                </label>
                <Input id="name" placeholder="Enter your name" />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium mb-2"
                >
                  Email
                </label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
            </div>
            <div>
              <label
                htmlFor="subject"
                className="block text-sm font-medium mb-2"
              >
                Subject
              </label>
              <Input id="subject" placeholder="Enter the subject" />
            </div>
            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium mb-2"
              >
                Message
              </label>
              <Textarea
                id="message"
                placeholder="Enter your message"
                rows={6}
              />
            </div>
            <div className="text-right">
              <Button type="submit">Submit</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

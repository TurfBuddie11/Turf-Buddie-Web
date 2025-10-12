import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";

export default function FAQsPage() {
  return (
    <div className="container mx-auto">
      <div className="max-w-7xl mx-auto py-4 px-4">
        <div className="flex items-center mb-4">
          <Link href="/profile" className="mr-4">
            <ChevronLeft className="h-6 w-6" />
          </Link>
          <h1 className="text-2xl font-bold">Frequently asked questions</h1>
        </div>
        <Card className="max-w-7xl mx-auto px-4">
          <div className="space-y-4">
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger> How do I book a turf ?</AccordionTrigger>
                <AccordionContent>
                  Go to the booking section, select your preferred queues date
                  and time and complete the payment process.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>
                  What payment methods are accepted ?
                </AccordionTrigger>
                <AccordionContent>
                  We accept all major credit cards, debit cards, UPI payments
                  and net banking.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger> Can I cancel my booking ?</AccordionTrigger>
                <AccordionContent>
                  Yes can share lessons are allowed up to 24 hours before the
                  booking time full refund.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </Card>
      </div>
    </div>
  );
}

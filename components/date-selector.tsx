import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { format, addDays } from "date-fns";
import { useState, useEffect } from "react";

export function DateSelector({
  selectedDate,
  setSelectedDate,
}: {
  selectedDate: string;
  setSelectedDate: (value: string) => void;
}) {
  const [isClient, setIsClient] = useState(false);
  const [selected, setSelected] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);
  const [maxDate, setMaxDate] = useState<Date | null>(null);

  // Prevent hydration mismatch by only initializing dates on client
  useEffect(() => {
    const selectedDate_ = new Date(selectedDate);
    const today_ = new Date();
    const maxDate_ = addDays(today_, 30);

    setSelected(selectedDate_);
    setToday(today_);
    setMaxDate(maxDate_);
    setIsClient(true);
  }, [selectedDate]);

  // Show loading state during hydration
  if (!isClient || !selected || !today || !maxDate) {
    return (
      <div className="space-y-3">
        <label htmlFor="date" className="text-sm  font-medium">
          Select Date
        </label>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal"
          disabled
        >
          <CalendarIcon className="mr-2 h-4 w-4 /80" />
          <span className="/50">Loading...</span>
        </Button>
        <p className="text-xs ">You can book up to 30 days in advance.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label htmlFor="date" className="text-sm  font-medium">
        Select Date
      </label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal transition-colors"
          >
            <CalendarIcon className="mr-2 h-4 w-4 /80" />
            {selectedDate ? (
              format(selected, "EEEE, MMMM d, yyyy") // e.g. "Friday, August 9, 2025"
            ) : (
              <span className="/50">Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent className="w-auto p-0  shadow-xl" align="start">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) {
                // Convert to YYYY-MM-DD format
                const localDate = new Date(
                  date.getTime() - date.getTimezoneOffset() * 60000,
                );
                setSelectedDate(localDate.toISOString().slice(0, 10));
              }
            }}
            disabled={(date) => {
              // Disable past dates and dates more than 30 days in the future
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today || date > maxDate;
            }}
            className=""
            classNames={{
              months: "",
              month: "",
              caption: "",
              caption_label: "",
              table: "",
              head_row: "/70",
              head_cell: "/70",
              row: "",
              cell: "  rounded-md",
              day: " hover: aria-selected:bg-green-600 aria-selected:",
              day_today: "  font-semibold",
              day_selected: "bg-green-600  hover:bg-green-600",
              day_disabled: "/30 cursor-not-allowed",
              day_outside: "/30",
              day_range_middle:
                "aria-selected:bg-accent aria-selected:text-accent-foreground",
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <p className="text-xs ">You can book up to 30 days in advance.</p>
    </div>
  );
}

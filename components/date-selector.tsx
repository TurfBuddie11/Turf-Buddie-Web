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
        <label htmlFor="date" className="text-sm text-white font-medium">
          Select Date
        </label>
        <Button
          variant="outline"
          className="w-full justify-start text-left font-normal text-white bg-slate-800/50 border-slate-700"
          disabled
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-white/80" />
          <span className="text-white/50">Loading...</span>
        </Button>
        <p className="text-xs text-slate-400">
          You can book up to 30 days in advance.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label htmlFor="date" className="text-sm text-white font-medium">
        Select Date
      </label>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-start text-left font-normal text-white bg-slate-800/50 border-slate-700 hover:bg-slate-700/50 hover:border-slate-600 transition-colors"
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-white/80" />
            {selectedDate ? (
              format(selected, "EEEE, MMMM d, yyyy") // e.g. "Friday, August 9, 2025"
            ) : (
              <span className="text-white/50">Pick a date</span>
            )}
          </Button>
        </PopoverTrigger>

        <PopoverContent 
          className="w-auto p-0 bg-slate-900 border-slate-700 shadow-xl" 
          align="start"
        >
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (date) {
                // Convert to YYYY-MM-DD format
                const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
                setSelectedDate(localDate.toISOString().slice(0, 10));
              }
            }}
            disabled={(date) => {
              // Disable past dates and dates more than 30 days in the future
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today || date > maxDate;
            }}
            className="text-white"
            classNames={{
              months: "text-white",
              month: "text-white", 
              caption: "text-white",
              caption_label: "text-white",
              nav: "text-white",
              nav_button: "text-white hover:bg-slate-700",
              nav_button_previous: "text-white hover:bg-slate-700",
              nav_button_next: "text-white hover:bg-slate-700",
              table: "text-white",
              head_row: "text-white/70",
              head_cell: "text-white/70",
              row: "text-white",
              cell: "text-white hover:bg-slate-700 rounded-md",
              day: "text-white hover:bg-slate-700 hover:text-white aria-selected:bg-green-600 aria-selected:text-white",
              day_today: "bg-slate-700 text-white font-semibold",
              day_selected: "bg-green-600 text-white hover:bg-green-700",
              day_disabled: "text-white/30 cursor-not-allowed",
              day_outside: "text-white/30",
              day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
            }}
            initialFocus
          />
        </PopoverContent>
      </Popover>

      <p className="text-xs text-slate-400">
        You can book up to 30 days in advance.
      </p>
    </div>
  );
}

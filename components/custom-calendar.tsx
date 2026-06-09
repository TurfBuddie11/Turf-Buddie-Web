import { Calendar } from "@/components/ui/calendar";
import { useState } from "react";

export const CustomCalendar = ({
  selected,
  onSelect,
}: {
  selected?: Date;
  onSelect: (date?: Date) => void;
}) => {
  const [month, setMonth] = useState(selected ?? new Date());

  return (
    <Calendar
      mode="single"
      selected={selected}
      onSelect={onSelect}
      month={month}
      onMonthChange={setMonth}
      captionLayout="dropdown"
      fromYear={1950}
      toYear={new Date().getFullYear()}
      disabled={(date) => date > new Date()}
      className="bg-transparent text-foreground"
    />
  );
};

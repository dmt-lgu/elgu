import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { format, startOfYear, endOfYear } from "date-fns";

type YearOnly = { year: number };

interface DateRangeYearProps {
  className?: string;
  value?: { start: Date | null; end: Date | null };
  onChange?: (range: { start: Date | null; end: Date | null }) => void;
}

function DateRangeYear({
  className,
  value,
  onChange,
}: DateRangeYearProps) {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = React.useState(false);

  // Internal state for year selection
  const [from, setFrom] = React.useState<YearOnly | null>(null);
  const [to, setTo] = React.useState<YearOnly | null>(null);

  // Sync with value prop
  React.useEffect(() => {
    if (value?.start) {
      setFrom({ year: value.start.getFullYear() });
    } else {
      setFrom(null);
    }
    if (value?.end) {
      setTo({ year: value.end.getFullYear() });
    } else {
      setTo(null);
    }
  }, [value?.start, value?.end]);

  // Compute the date range based on selected years
  let dateRange: { from: Date | undefined; to: Date | undefined } = { from: undefined, to: undefined };
  if (from && to) {
    dateRange = {
      from: startOfYear(new Date(from.year, 0, 1)),
      to: endOfYear(new Date(to.year, 0, 1)),
    };
  } else if (from) {
    dateRange = {
      from: startOfYear(new Date(from.year, 0, 1)),
      to: undefined,
    };
  }

  // Generate years for dropdown (e.g., currentYear-10 to currentYear+1)
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 10 + i);

  // Label for the button
  const getLabel = () => {
    if (dateRange?.from && dateRange.to) {
      return `${format(dateRange.from, "yyyy")} - ${format(dateRange.to, "yyyy")}`;
    }
    if (dateRange?.from) {
      return `${format(dateRange.from, "yyyy")}`;
    }
    return "Select year";
  };

  // Handlers
  const handleFromYear = (year: number) => {
    setFrom({ year });
    setTo(null);
  };
  const handleToYear = (year: number) => {
    if (from && year < from.year) {
      setTo(from);
      setFrom({ year });
    } else {
      setTo({ year });
    }
  };

  // Apply button handler
  const handleApply = () => {
    if (from && to && onChange) {
      let startYear = from;
      let endYear = to;
      if (from.year > to.year) {
        startYear = to;
        endYear = from;
      }
      onChange({
        start: startOfYear(new Date(startYear.year, 0, 1)),
        end: endOfYear(new Date(endYear.year, 0, 1)),
      });
    } else if (from && onChange) {
      onChange({
        start: startOfYear(new Date(from.year, 0, 1)),
        end: null,
      });
    }
    setOpen(false);
  };

  // Clear button handler
  const handleClear = () => {
    setFrom(null);
    setTo(null);
    if (onChange) {
      onChange({ start: null, end: null });
    }
    setOpen(false);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[350px] justify-start text-left font-normal",
              !dateRange.from && "text-black"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {getLabel()}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex flex-col gap-4">
            <div>
              <div className="font-semibold mb-1">Start Year</div>
              <select
                className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={from ? from.year : ""}
                onChange={e => handleFromYear(Number(e.target.value))}
              >
                <option value="" disabled>Select year</option>
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <div className="font-semibold mb-1">End Year</div>
              <select
                className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={to ? to.year : ""}
                onChange={e => handleToYear(Number(e.target.value))}
                disabled={!from}
              >
                <option value="" disabled>Select year</option>
                {years
                  .filter(y => from ? y >= from.year : true)
                  .map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
              </select>
            </div>
            <div className="flex gap-2 mt-2">
              <Button
                variant="default"
                onClick={handleApply}
                disabled={!from}
                className="h-8 "
              >
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={handleClear}
                className="bg-red-500 text-white hover:bg-red-600 hover:text-white h-8"
              >
                Clear
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default DateRangeYear;
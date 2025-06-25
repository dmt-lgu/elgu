import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { format, startOfMonth, endOfMonth, isAfter } from "date-fns";

type MonthYear = { month: number; year: number };

function getFirstDay(month: number, year: number) {
  return startOfMonth(new Date(year, month, 1));
}

function getLastDay(month: number, year: number) {
  return endOfMonth(new Date(year, month, 1));
}

function getMonthLabel(month: number, year: number) {
  return format(new Date(year, month, 1), "LLLL yyyy");
}

const months = Array.from({ length: 12 }, (_, i) => i);

interface DateRangeMonthProps {
  className?: string;
  value?: { start: Date | null; end: Date | null };
  onChange?: (range: { start: Date | null; end: Date | null }) => void;
}

function DateRangeMonth({
  className,
  value,
  onChange,
}: DateRangeMonthProps) {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = React.useState(false);

  // Internal state for month/year selection
  const [from, setFrom] = React.useState<MonthYear | null>(null);
  const [to, setTo] = React.useState<MonthYear | null>(null);

  // Sync with value prop
  React.useEffect(() => {
    if (value?.start) {
      setFrom({ month: value.start.getMonth(), year: value.start.getFullYear() });
    } else {
      setFrom(null);
    }
    if (value?.end) {
      setTo({ month: value.end.getMonth(), year: value.end.getFullYear() });
    } else {
      setTo(null);
    }
  }, [value?.start, value?.end]);


  // Generate years for dropdown (e.g., currentYear-10 to currentYear+1)
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 10 + i);

  // Apply button handler
  const handleApply = () => {
    if (from && to && onChange) {
      // Always ensure start <= end
      let startMonth = from;
      let endMonth = to;
      const fromDate = new Date(from.year, from.month, 1);
      const toDate = new Date(to.year, to.month, 1);
      if (isAfter(fromDate, toDate)) {
        // swap
        startMonth = to;
        endMonth = from;
      }
      onChange({
        start: getFirstDay(startMonth.month, startMonth.year),
        end: getLastDay(endMonth.month, endMonth.year),
      });
    } else if (from && onChange) {
      onChange({
        start: getFirstDay(from.month, from.year),
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
              !from && "text-black"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {from ? (
              to ? (
                <>
                  {getMonthLabel(from.month, from.year)} - {getMonthLabel(to.month, to.year)}
                </>
              ) : (
                getMonthLabel(from.month, from.year)
              )
            ) : (
              <span>Select month</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start">
          <div className="flex flex-col gap-4">
            <div>
              <div className="font-semibold mb-1">Start Month</div>
              <div className="flex gap-2">
                <select
                  className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={from ? from.month : ""}
                  onChange={e => {
                    const month = Number(e.target.value);
                    setFrom(from ? { ...from, month } : { month, year: currentYear });
                  }}
                >
                  <option value="" disabled>Select month</option>
                  {months.map(m => (
                    <option key={m} value={m}>{format(new Date(currentYear, m, 1), "LLLL")}</option>
                  ))}
                </select>
                <select
                  className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={from ? from.year : ""}
                  onChange={e => {
                    const year = Number(e.target.value);
                    setFrom(from ? { ...from, year } : { month: 0, year });
                  }}
                >
                  <option value="" disabled>Select year</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <div className="font-semibold mb-1">End Month</div>
              <div className="flex gap-2">
                <select
                  className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={to ? to.month : ""}
                  onChange={e => {
                    const month = Number(e.target.value);
                    setTo(to ? { ...to, month } : from ? { month, year: from.year } : { month, year: currentYear });
                  }}
                  disabled={!from}
                >
                  <option value="" disabled>Select month</option>
                  {months.map(m => (
                    <option key={m} value={m}>{format(new Date(from ? from.year : currentYear, m, 1), "LLLL")}</option>
                  ))}
                </select>
                <select
                  className="border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={to ? to.year : ""}
                  onChange={e => {
                    const year = Number(e.target.value);
                    setTo(to ? { ...to, year } : from ? { month: from.month, year } : { month: 0, year });
                  }}
                  disabled={!from}
                >
                  <option value="" disabled>Select year</option>
                  {years.map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-2 justify-end">
              <Button
              className="h-8 "
                variant="default"
                onClick={handleApply}
                disabled={!from}
              >
                Apply
              </Button>
              <Button
                className="bg-red-500 text-white hover:bg-red-600 hover:text-white h-8"
                variant="outline"
                onClick={handleClear}
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

export default DateRangeMonth;
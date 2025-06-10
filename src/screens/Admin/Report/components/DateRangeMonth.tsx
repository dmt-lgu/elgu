import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import React from "react";
import { DateRange } from "react-day-picker";
import { addDays, format, startOfMonth, endOfMonth, isAfter, isBefore, isSameMonth } from "date-fns";

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

function DateRangeMonth({
  className,
}: React.HTMLAttributes<HTMLDivElement>) {
  const currentYear = new Date().getFullYear();
  const [open, setOpen] = React.useState(false);
  const [from, setFrom] = React.useState<MonthYear | null>(null);
  const [to, setTo] = React.useState<MonthYear | null>(null);

  // Compute the date range based on selected months
  const dateRange: DateRange | undefined = from && to
    ? {
        from: getFirstDay(from.month, from.year),
        to: getLastDay(to.month, to.year),
      }
    : from
    ? {
        from: getFirstDay(from.month, from.year),
        to: undefined,
      }
    : undefined;

  // Handler for month selection
  const handleMonthSelect = (selected: MonthYear) => {
    if (!from || (from && to)) {
      setFrom(selected);
      setTo(null);
    } else if (from) {
      // If selecting the same month, treat as single month
      if (from.month === selected.month && from.year === selected.year) {
        setTo(selected);
        setOpen(false);
      } else if (
        isAfter(new Date(selected.year, selected.month, 1), new Date(from.year, from.month, 1))
      ) {
        setTo(selected);
        setOpen(false);
      } else {
        // If selected month is before from, swap
        setTo(from);
        setFrom(selected);
        setOpen(false);
      }
    }
  };

  // Generate years for dropdown (e.g., currentYear-10 to currentYear+1)
  const years = Array.from({ length: 15 }, (_, i) => currentYear - 10 + i);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[350px] justify-start text-left font-normal",
              !dateRange && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLLL yyyy")} -{" "}
                  {format(dateRange.to, "LLLL yyyy")}
                </>
              ) : (
                format(dateRange.from, "LLLL yyyy")
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
            <div className="flex gap-2 mt-2">
              <Button
                variant="default"
                onClick={() => setOpen(false)}
                disabled={!from || !to}
              >
                Apply
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFrom(null);
                  setTo(null);
                  setOpen(false);
                }}
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
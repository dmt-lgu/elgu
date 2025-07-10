import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";
import { format, lastDayOfMonth } from "date-fns";
import Select from "react-select";
import { selectLoad } from '@/redux/loadSlice';
import { useSelector } from "react-redux";
const months = Array.from({ length: 12 }, (_, i) => i);

function getFirstDay(month: number, year: number) {
  return new Date(year, month, 1);
}

function getLastDay(month: number, year: number) {
  return lastDayOfMonth(new Date(year, month, 1));
}

interface DateRangeMonthProps {
  className?: string;
  value?: { start: Date | string | null; end: Date | string | null };
  onChange?: (range: { start: string | null; end: string | null }) => void;
}

function DateRangeMonth({
  className,
  value,
  onChange,
}: DateRangeMonthProps) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Internal state for month/year selection
  const [fromMonth, setFromMonth] = React.useState<number | undefined>(undefined);
  const [fromYear, setFromYear] = React.useState<number | undefined>(undefined);
  const [toMonth, setToMonth] = React.useState<number | undefined>(undefined);
  const [toYear, setToYear] = React.useState<number | undefined>(undefined);
  const loading = useSelector(selectLoad);

  // Set default values on mount or when value changes
  React.useEffect(() => {
    // If both are null, set to current date
    if (!value?.start && !value?.end) {
      setFromMonth(currentMonth);
      setFromYear(currentYear);
      setToMonth(undefined);
      setToYear(undefined);
      return;
    }
    // If value.start is provided, set fromMonth/fromYear
    if (value?.start) {
      const d = new Date(value.start);
      if (!isNaN(d.getTime())) {
        setFromMonth(d.getMonth());
        setFromYear(d.getFullYear());
      }
    }
    // If value.end is provided, set toMonth/toYear
    if (value?.end) {
      const d = new Date(value.end);
      if (!isNaN(d.getTime())) {
        setToMonth(d.getMonth());
        setToYear(d.getFullYear());
      }
    }
  }, [value?.start, value?.end, currentMonth, currentYear]);

  // Generate years for dropdown (from currentYear down to currentYear-14)
  const years = Array.from({ length: 15 }, (_, i) => currentYear - i);
  const monthOptions = months.map(m => ({
    value: m,
    label: format(new Date(currentYear, m), "LLLL"),
  }));
  const yearOptions = years.map(y => ({
    value: y,
    label: y.toString(),
  }));

  // Handlers
  const handleFromMonth = (month: number | null) => {
    setFromMonth(month === null ? undefined : month);
  };
  const handleFromYear = (year: number | null) => {
    setFromYear(year === null ? undefined : year);
  };
  const handleToMonth = (month: number | null) => {
    setToMonth(month === null ? undefined : month);
  };
  const handleToYear = (year: number | null) => {
    setToYear(year === null ? undefined : year);
  };

  const handleApply = () => {
    if (
      fromMonth !== undefined &&
      fromYear !== undefined &&
      onChange
    ) {
      const startDate = getFirstDay(fromMonth, fromYear);
      const start = format(startDate, "yyyy-MM-dd");

      let end: string | null = null;
      if (toMonth !== undefined && toYear !== undefined) {
        const endDate = getLastDay(toMonth, toYear);
        end = format(endDate, "yyyy-MM-dd");
      }

      onChange({ start, end });
    }
  };

  const handleClear = () => {
    setFromMonth(currentMonth);
    setFromYear(currentYear);
    setToMonth(undefined);
    setToYear(undefined);
    if (onChange) {
      onChange({ start: null, end: null });
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-col gap-4">
        <div>
          <div className="font-semibold mb-1">Start Month</div>
          <div className="flex gap-2">
            <Select
              options={monthOptions}
              value={fromMonth !== undefined ? monthOptions.find(opt => opt.value === fromMonth) : null}
              onChange={option => handleFromMonth(option ? option.value : null)}
              placeholder="Month"
              isClearable
              className="w-full"
            />
            <Select
              options={yearOptions}
              value={fromYear !== undefined ? yearOptions.find(opt => opt.value === fromYear) : null}
              onChange={option => handleFromYear(option ? option.value : null)}
              placeholder="Year"
              isClearable
              className="w-full"
            />
          </div>
        </div>
        <div>
          <div className="font-semibold mb-1">End Month</div>
          <div className="flex gap-2">
            <Select
              options={monthOptions}
              value={toMonth !== undefined ? monthOptions.find(opt => opt.value === toMonth) : null}
              onChange={option => handleToMonth(option ? option.value : null)}
              placeholder="Month"
              isClearable
              isDisabled={fromMonth === undefined || fromYear === undefined}
              className="w-full"
            />
            <Select
              options={yearOptions}
              value={toYear !== undefined ? yearOptions.find(opt => opt.value === toYear) : null}
              onChange={option => handleToYear(option ? option.value : null)}
              placeholder="Year"
              isClearable
              isDisabled={fromMonth === undefined || fromYear === undefined}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-2 justify-end">
          <Button
            className={loading ? " h-8 pointer-events-none" : "h-8"}
            variant="default"
            onClick={handleApply}
            disabled={fromMonth === undefined || fromYear === undefined}
          >
            {loading ? "Applying..." : "Apply"}
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
    </div>
  );
}

export default DateRangeMonth;
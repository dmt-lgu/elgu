import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";
import { format, lastDayOfMonth } from "date-fns";
import Select from "react-select";

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
  onChange?: (range: { start: Date | null; end: Date | null }) => void;
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

  // Generate years for dropdown (e.g., currentYear-10 to currentYear+1)
  const years = React.useMemo(
    () => Array.from({ length: 15 }, (_, i) => currentYear - 10 + i),
    [currentYear]
  );
  const monthOptions = React.useMemo(
    () =>
      months.map(m => ({
        value: m,
        label: format(new Date(currentYear, m, 1), "LLLL"),
      })),
    [currentYear]
  );
  const yearOptions = React.useMemo(
    () =>
      years.map(y => ({
        value: y,
        label: y.toString(),
      })),
    [years]
  );

  // Handlers
  const handleFromMonth = (option: any) => {
    setFromMonth(option ? option.value : undefined);
  };
  const handleFromYear = (option: any) => {
    setFromYear(option ? option.value : undefined);
  };
  const handleToMonth = (option: any) => {
    setToMonth(option ? option.value : undefined);
  };
  const handleToYear = (option: any) => {
    setToYear(option ? option.value : undefined);
  };

  const handleApply = () => {
    if (
      fromMonth !== undefined &&
      fromYear !== undefined &&
      onChange
    ) {
      const start = getFirstDay(fromMonth, fromYear);

      let end: Date | null = null;
      if (toMonth !== undefined && toYear !== undefined) {
        end = getLastDay(toMonth, toYear);
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
              onChange={handleFromMonth}
              placeholder="Month"
              isClearable
              className="w-full"
            />
            <Select
              options={yearOptions}
              value={fromYear !== undefined ? yearOptions.find(opt => opt.value === fromYear) : null}
              onChange={handleFromYear}
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
              onChange={handleToMonth}
              placeholder="Month"
              isClearable
              isDisabled={fromMonth === undefined || fromYear === undefined}
              className="w-full"
            />
            <Select
              options={yearOptions}
              value={toYear !== undefined ? yearOptions.find(opt => opt.value === toYear) : null}
              onChange={handleToYear}
              placeholder="Year"
              isClearable
              isDisabled={fromMonth === undefined || fromYear === undefined}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-2 justify-end">
          <Button
            className="h-8 "
            variant="default"
            onClick={handleApply}
            disabled={fromMonth === undefined || fromYear === undefined}
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
    </div>
  );
}

export default DateRangeMonth;
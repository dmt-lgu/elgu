import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";
import Select from "react-select";
// import { selectData } from "@/redux/dataSlice"; // Update the import path as needed

// Utility to get year range (same as DateRangeMonth)
function getYearRange(currentYear: number, range: number = 15) {
  // Default: currentYear down to currentYear - 14 (15 years)
  return Array.from({ length: range }, (_, i) => currentYear - i);
}

interface DateRangeYearProps {
  className?: string;
  value?: { start: string | null; end: string | null };
  onChange?: (range: { start: string | null; end: string | null }) => void;
}

function DateRangeYear({
  className,
  value,
  onChange,
}: DateRangeYearProps) {
  // Get startDate and endDate from Redux (if you want to use them for min/max)
  // const data = useSelector(selectData);

  // Use current year for consistency with DateRangeMonth
  const now = new Date();
  const currentYear = now.getFullYear();

  // Use the same year range as DateRangeMonth
  const years = getYearRange(currentYear, 15);
  const yearOptions = years.map(y => ({
    value: y,
    label: y.toString(),
  }));

  // Internal state for year selection
  const [from, setFrom] = React.useState<number | null>(null);
  const [to, setTo] = React.useState<number | null>(null);

  // Sync with value prop (robust to string)
  React.useEffect(() => {
    if (value?.start) {
      const startDate = new Date(value.start);
      if (!isNaN(startDate.getTime())) {
        setFrom(startDate.getFullYear());
      } else {
        setFrom(null);
      }
    } else {
      setFrom(null);
    }
    if (value?.end) {
      const endDate = new Date(value.end);
      if (!isNaN(endDate.getTime())) {
        setTo(endDate.getFullYear());
      } else {
        setTo(null);
      }
    } else {
      setTo(null);
    }
  }, [value?.start, value?.end]);

  // Handlers
  const handleFromYear = (year: number | null) => {
    setFrom(year);
    // If to is before from, reset to
    if (to !== null && year !== null && to < year) {
      setTo(null);
    }
  };
  const handleToYear = (year: number | null) => {
    setTo(year);
  };

  // Apply button handler
  const handleApply = () => {
    if (from && to && onChange) {
      onChange({
        start: `${from}-01-01`,
        end: `${to}-12-31`,
      });
    } else if (from && onChange) {
      onChange({
        start: `${from}-01-01`,
        end: null,
      });
    }
  };

  // Clear button handler
  const handleClear = () => {
    setFrom(null);
    setTo(null);
    if (onChange) {
      onChange({ start: null, end: null });
    }
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-col gap-4">
        <div className=" flex w-full items-center gap-4 justify-between">
          <div className="w-full">
            <div className="font-semibold mb-1">Start Year</div>
            <Select
              options={yearOptions}
              value={from ? yearOptions.find(opt => opt.value === from) : null}
              onChange={option => {
                if (option && typeof option.value === "number") {
                  handleFromYear(option.value);
                } else {
                  handleFromYear(null);
                }
              }}
              placeholder="Select year"
              isClearable
              className="w-full"
            />
          </div>
          <div className="w-full">
            <div className="font-semibold mb-1">End Year</div>
            <Select
              options={yearOptions.filter(opt => from ? opt.value >= from : true)}
              value={to ? yearOptions.find(opt => opt.value === to) : null}
              onChange={option => {
                if (option && typeof option.value === "number") {
                  handleToYear(option.value);
                } else {
                  handleToYear(null);
                }
              }}
              placeholder="Select year"
              isClearable
              isDisabled={!from}
              className="w-full"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
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
    </div>
  );
}

export default DateRangeYear;
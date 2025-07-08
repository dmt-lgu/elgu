import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import React from "react";
import Select from "react-select";
import { useSelector } from "react-redux";
import { selectData } from "@/redux/dataSlice"; // Update the import path as needed

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
  // Get startDate and endDate from Redux
  const data = useSelector(selectData);
  const reduxStart = data?.startDate;
  const reduxEnd = data?.endDate;

  // Parse years from Redux dates, fallback to current year if not set
  const startYearRedux = reduxStart ? new Date(reduxStart).getFullYear() : new Date().getFullYear() - 10;
  const endYearRedux = reduxEnd ? new Date(reduxEnd).getFullYear() : new Date().getFullYear() + 1;

  // Generate years for dropdown based on Redux
  const years = Array.from(
    { length: endYearRedux - startYearRedux + 1 },
    (_, i) => startYearRedux + i
  );
  const yearOptions = years.map(y => ({
    value: y,
    label: y.toString(),
  }));

  // Internal state for year selection
  const [from, setFrom] = React.useState<YearOnly | null>(null);
  const [to, setTo] = React.useState<YearOnly | null>(null);

  // Sync with value prop (robust to string or Date)
  React.useEffect(() => {
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    if (value?.start) {
      startDate = value.start instanceof Date ? value.start : new Date(value.start);
      if (!isNaN(startDate.getTime())) {
        setFrom({ year: startDate.getFullYear() });
      } else {
        setFrom(null);
      }
    } else {
      setFrom(null);
    }
    if (value?.end) {
      endDate = value.end instanceof Date ? value.end : new Date(value.end);
      if (!isNaN(endDate.getTime())) {
        setTo({ year: endDate.getFullYear() });
      } else {
        setTo(null);
      }
    } else {
      setTo(null);
    }
  }, [value?.start, value?.end]);

  // Handlers
  const handleFromYear = (year: number) => {
    setFrom({ year });
    // Do not reset 'to' here!
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
      let startYear = from.year;
      let endYear = to.year;
      if (startYear > endYear) {
        [startYear, endYear] = [endYear, startYear];
      }
      onChange({
        start: new Date(startYear, 1, -29), // 01-01-YYYY
        end: new Date(endYear, 11, 32), // 12-31-YYYY
      });
    } else if (from && onChange) {
      onChange({
        start: new Date(from.year, 0, 1),
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
              value={from ? yearOptions.find(opt => opt.value === from.year) : null}
              onChange={option => {
                if (option && typeof option.value === "number") {
                  handleFromYear(option.value);
                } else {
                  setFrom(null);
                  setTo(null);
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
              options={yearOptions.filter(opt => from ? opt.value >= from.year : true)}
              value={to ? yearOptions.find(opt => opt.value === to.year) : null}
              onChange={option => {
                if (option && typeof option.value === "number") {
                  handleToYear(option.value);
                } else {
                  setTo(null);
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
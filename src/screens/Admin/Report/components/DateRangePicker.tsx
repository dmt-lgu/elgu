import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  const [startDate, setStartDate] = useState<Date | null>(value?.start ?? null);
  const [endDate, setEndDate] = useState<Date | null>(value?.end ?? null);

  // Keep local state in sync with parent value
  useEffect(() => {
    setStartDate(value?.start ?? null);
    setEndDate(value?.end ?? null);
  }, [value?.start, value?.end]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setStartDate(date);
    onChange?.({ start: date, end: endDate });
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setEndDate(date);
    onChange?.({ start: startDate, end: date });
  };

  return (
    <div className="relative">
      <div className="flex border border-border rounded-md overflow-hidden">
        <input
          type="date"
          value={startDate ? format(startDate, 'yyyy-MM-dd') : ''}
          onChange={handleStartDateChange}
          className="w-32 flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="Start date"
        />
        <div className="bg-border px-2 flex items-center text-secondary-foreground">to</div>
        <input
          type="date"
          value={endDate ? format(endDate, 'yyyy-MM-dd') : ''}
          onChange={handleEndDateChange}
          className="w-32 flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="End date"
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
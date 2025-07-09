import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from "@/components/ui/button";
import { selectLoad } from '@/redux/loadSlice';
import { useSelector } from 'react-redux';

interface DateRange {
  start: Date | null;
  end: Date | null;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
}

const DateRangeDay: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  // Last applied values
  const [_appliedStart, setAppliedStart] = useState<Date | null>(value?.start ?? null);
  const [_appliedEnd, setAppliedEnd] = useState<Date | null>(value?.end ?? null);

  // Draft values (user editing)
  const [draftStart, setDraftStart] = useState<Date | null>(value?.start ?? null);
  const [draftEnd, setDraftEnd] = useState<Date | null>(value?.end ?? null);
  const loading = useSelector(selectLoad);
  // Sync with parent value
  useEffect(() => {
    setAppliedStart(value?.start ?? null);
    setAppliedEnd(value?.end ?? null);
    setDraftStart(value?.start ?? null);
    setDraftEnd(value?.end ?? null);
  }, [value?.start, value?.end]);

  const handleDraftStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setDraftStart(date);
  };

  const handleDraftEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : null;
    setDraftEnd(date);
  };

  const handleApply = () => {
    setAppliedStart(draftStart);
    setAppliedEnd(draftEnd);
    onChange?.({ start: draftStart, end: draftEnd });
  };

  const handleClear = () => {
    setDraftStart(null);
    setDraftEnd(null);
    setAppliedStart(null);
    setAppliedEnd(null);
    onChange?.({ start: null, end: null });
  };

  return (
    <div className="relative">
      <div className="flex border border-border rounded-md overflow-hidden">
        <input
          type="date"
          value={draftStart ? format(draftStart, 'yyyy-MM-dd') : ''}
          onChange={handleDraftStartChange}
          className="w-32 flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="Start date"
        />
        <div className="bg-border px-2 flex items-center text-secondary-foreground">to</div>
        <input
          type="date"
          value={draftEnd ? format(draftEnd, 'yyyy-MM-dd') : ''}
          onChange={handleDraftEndChange}
          className="w-32 flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="End date"
        />
      </div>
      <div className="flex gap-2 mt-2 justify-end">
        <Button
          className={loading?" h-8 pointer-events-none":"h-8"}
          variant="default"
          onClick={handleApply}
          disabled={!draftStart}
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
  );
};

export default DateRangeDay;
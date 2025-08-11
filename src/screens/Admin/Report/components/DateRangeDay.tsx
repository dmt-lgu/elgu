import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";

interface DateRange {
  start: string | null;
  end: string | null;
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange?: (range: DateRange) => void;
}

const DateRangeDay: React.FC<DateRangePickerProps> = ({ value, onChange }) => {
  // Last applied values
  const [_appliedStart, setAppliedStart] = useState<string | null>(value?.start ?? null);
  const [_appliedEnd, setAppliedEnd] = useState<string | null>(value?.end ?? null);

  // Draft values (user editing)
  const [draftStart, setDraftStart] = useState<string | null>(value?.start ?? null);
  const [draftEnd, setDraftEnd] = useState<string | null>(value?.end ?? null);

  // Sync with parent value
  useEffect(() => {
    setAppliedStart(value?.start ?? null);
    setAppliedEnd(value?.end ?? null);
    setDraftStart(value?.start ?? null);
    setDraftEnd(value?.end ?? null);
  }, [value?.start, value?.end]);

const handleDraftStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setDraftStart(e.target.value || null);
};

  const handleDraftEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? e.target.value : null;
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
          value={draftStart ?? ''}
          onChange={handleDraftStartChange}
          className="w-32 flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="Start date"
        />
        <div className="bg-border px-2 flex items-center text-secondary-foreground">to</div>
        <input
          type="date"
          value={draftEnd ?? ''}
          onChange={handleDraftEndChange}
          className="w-32 flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="End date"
        />
      </div>
      <div className="flex gap-2 mt-2 justify-end">
        <Button
          className="h-8"
          variant="default"
          onClick={handleApply}
          disabled={!draftStart}
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
  );
};

export default DateRangeDay;
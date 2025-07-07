import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, parse } from 'date-fns';
import { useDispatch, useSelector } from 'react-redux';
import { selectData, setData } from '@/redux/dataSlice';


interface DateRangePickerProps {
  onChange?: (range: { start: Date | null; end: Date | null }) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ onChange }) => {
  const dispatch = useDispatch();
  const data = useSelector(selectData);

  const defaultStartDate = startOfMonth(new Date());
  const defaultEndDate = endOfMonth(new Date());

  const initializeDates = () => {
    if (data?.startDate && data?.endDate) {
      try {
        const start = parse(data.startDate, 'yyyy-MM-dd', new Date());
        const end = parse(data.endDate, 'yyyy-MM-dd', new Date());
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          return { start: defaultStartDate, end: defaultEndDate };
        }
        return { start, end };
      } catch {
        return { start: defaultStartDate, end: defaultEndDate };
      }
    }
    return { start: defaultStartDate, end: defaultEndDate };
  };

  const initialDates = initializeDates();

  // "Applied" values (last confirmed)
  const [startDate, setStartDate] = useState<Date>(initialDates.start);
  const [endDate, setEndDate] = useState<Date>(initialDates.end);

  // "Draft" values (user editing)
  const [draftStart, setDraftStart] = useState<Date>(initialDates.start);
  const [draftEnd, setDraftEnd] = useState<Date>(initialDates.end);

  useEffect(() => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
  }, [startDate, endDate]);

  // Only update Redux and parent on Apply
  const handleApply = () => {
    setStartDate(draftStart);
    setEndDate(draftEnd);

    dispatch(setData({
      ...data,
      startDate: format(draftStart, 'yyyy-MM-dd'),
      endDate: format(draftEnd, 'yyyy-MM-dd')
    }));

    onChange?.({ start: draftStart, end: draftEnd });
  };

  // Revert draft to last applied on Cancel
  const handleCancel = () => {
    setDraftStart(startDate);
    setDraftEnd(endDate);
  };

  const handleDraftStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : defaultStartDate;
    setDraftStart(date);
  };

  const handleDraftEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : defaultEndDate;
    setDraftEnd(date);
  };

  return (
    <div className="relative w-full">
      <div className="flex border border-border text-sm rounded-md overflow-hidden">
        <input
          type="date"
          value={format(draftStart, 'yyyy-MM-dd')}
          onChange={handleDraftStartChange}
          className="flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="Start date"
        />
        <div className="bg-border px-2 flex items-center text-secondary-foreground">to</div>
        <input
          type="date"
          value={format(draftEnd, 'yyyy-MM-dd')}
          onChange={handleDraftEndChange}
          className="flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="End date"
        />
      </div>
      <div className="flex gap-2 mt-2 justify-end">
        <button
          className="h-8 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={handleApply}
        >
          Apply
        </button>
        <button
          className="h-8 px-4 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default DateRangePicker;
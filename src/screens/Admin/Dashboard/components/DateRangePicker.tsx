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
  
  // Get first and last day of current month for defaults
  const defaultStartDate = startOfMonth(new Date());
  const defaultEndDate = endOfMonth(new Date());

  // Initialize dates from Redux data or defaults
  const initializeDates = () => {
    if (data?.startDate && data?.endDate) {
      try {
        // Try to parse dates from data
        const start = parse(data.startDate, 'yyyy-MM-dd', new Date());
        const end = parse(data.endDate, 'yyyy-MM-dd', new Date());
        
        // Validate parsed dates
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
  const [startDate, setStartDate] = useState<Date>(initialDates.start);
  const [endDate, setEndDate] = useState<Date>(initialDates.end);

  // Set initial dates and update Redux on mount
  useEffect(() => {
    const dates = initializeDates();
    setStartDate(dates.start);
    setEndDate(dates.end);
    
    // Update Redux with initial dates if they're not already set
    if (!data?.startDate || !data?.endDate) {
      dispatch(setData({
        ...data,
        startDate: format(dates.start, 'yyyy-MM-dd'),
        endDate: format(dates.end, 'yyyy-MM-dd')
      }));
    }
    
    // Notify parent component
    onChange?.({ start: dates.start, end: dates.end });
  }, []);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : defaultStartDate;
    setStartDate(date);
    
    dispatch(setData({
      ...data,
      startDate: format(date, 'yyyy-MM-dd'),
      endDate: format(endDate, 'yyyy-MM-dd')
    }));
    
    onChange?.({ start: date, end: endDate });
  };
  
  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = e.target.value ? new Date(e.target.value) : defaultEndDate;
    setEndDate(date);
    
    dispatch(setData({
      ...data,
      startDate: format(startDate, 'yyyy-MM-dd'),
      endDate: format(date, 'yyyy-MM-dd')
    }));
    
    onChange?.({ start: startDate, end: date });
  };

  return (
    <div className="relative w-full">
      <div className="flex border border-border text-sm rounded-md overflow-hidden">
        <input
          type="date"
          value={format(startDate, 'yyyy-MM-dd')}
          onChange={handleStartDateChange}
          className="flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="Start date"
        />
        <div className="bg-border px-2 flex items-center text-secondary-foreground">to</div>
        <input
          type="date"
          value={format(endDate, 'yyyy-MM-dd')}
          onChange={handleEndDateChange}
          className="flex-1 py-2 px-3 text-secondary-foreground bg-card focus:outline-none"
          placeholder="End date"
        />
      </div>
    </div>
  );
};

export default DateRangePicker;
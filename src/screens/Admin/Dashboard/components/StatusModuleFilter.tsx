import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { selectData, setData } from '@/redux/dataSlice';

interface StatusModuleFilterProps {
  className?: string;
}

const StatusModuleFilter: React.FC<StatusModuleFilterProps> = ({ className = "" }) => {
  const data = useSelector(selectData);
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Show all enabled modules plus "All" option
  const statusModuleOptions = [
    "All",
    ...(data.modules || [])
  ];

  const selectedFilter = data.selectedStatusModuleFilter || "All";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleFilterChange = (filter: string) => {
    dispatch(setData({
      ...data,
      selectedStatusModuleFilter: filter
    }));
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Filter size={16} />
        <span>{selectedFilter}</span>
        <ChevronDown 
          size={16} 
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-md shadow-lg z-50">
          <div className="py-1">
            {statusModuleOptions.map((option) => (
              <button
                key={option}
                onClick={() => handleFilterChange(option)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${
                  selectedFilter === option 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-secondary-foreground'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusModuleFilter;

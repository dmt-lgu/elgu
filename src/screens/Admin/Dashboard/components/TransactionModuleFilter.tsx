import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Filter } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { selectData, setData } from '@/redux/dataSlice';

interface TransactionModuleFilterProps {
  className?: string;
}

const TransactionModuleFilter: React.FC<TransactionModuleFilterProps> = ({ className = "" }) => {
  const data = useSelector(selectData);
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Only show transaction-related modules (Business Permit and Working Permit)
  const transactionModuleOptions = [
    "All",
    "Business Permit",
    "Working Permit"
  ];

  const selectedFilter = data.selectedTransactionModuleFilter || "All";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFilterChange = (module: string) => {
    dispatch(setData({
      ...data,
      selectedTransactionModuleFilter: module
    }));
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-card border border-border rounded-md py-2 px-3 text-sm text-secondary-foreground hover:bg-muted focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <Filter size={14} />
        <span>Module: {selectedFilter}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10 min-w-[180px]">
          <div className="py-1">
            {transactionModuleOptions.map((module) => (
              <button
                key={module}
                onClick={() => handleFilterChange(module)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${
                  selectedFilter === module 
                    ? 'bg-blue-50 text-blue-700 font-medium' 
                    : 'text-secondary-foreground'
                }`}
              >
                {module}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionModuleFilter;

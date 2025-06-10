import React, { useRef, useEffect, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import { modules } from '../utils/mockData';
import { FilterState } from '../utils/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { regionMapping } from '../utils/mockData';

interface FilterSectionProps {
  filterState: FilterState;
  setFilterState: React.Dispatch<React.SetStateAction<FilterState>>;
  onDownload?: (type: "pdf" | "excel") => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  filterState,
  setFilterState,
  onDownload,
}) => {
  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const moduleRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  // Local state for filters, synced with parent
  const [localModules, setLocalModules] = useState<string[]>(filterState.selectedModules.length > 0 ? filterState.selectedModules : ["Business Permit"]);
  const [localRegions, setLocalRegions] = useState<string[]>(filterState.selectedRegions);
  const [localDateRange, setLocalDateRange] = useState<{ start: Date | null; end: Date | null }>(filterState.dateRange);

  // Sync local state with parent filterState
  useEffect(() => {
    setLocalModules(filterState.selectedModules.length > 0 ? filterState.selectedModules : ["Business Permit"]);
    setLocalRegions(filterState.selectedRegions);
    setLocalDateRange(filterState.dateRange);
  }, [filterState]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moduleRef.current && !moduleRef.current.contains(event.target as Node)) {
        setIsModuleOpen(false);
      }
      if (regionRef.current && !regionRef.current.contains(event.target as Node)) {
        setIsRegionOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Module handlers
  const toggleModule = (module: string) => {
    setLocalModules((prev) =>
      prev.includes(module) ? prev.filter((m) => m !== module) : [...prev, module]
    );
  };
  const selectAllModules = () => setLocalModules([...modules]);
  const deselectAllModules = () => setLocalModules([]);

  // Region handlers
  const toggleRegion = (region: string) => {
    setLocalRegions((prev) =>
      prev.includes(region) ? prev.filter((r) => r !== region) : [...prev, region]
    );
  };
  const selectAllRegions = () => setLocalRegions(Object.keys(regionMapping));
  const deselectAllRegions = () => setLocalRegions([]);

  // Date range handler
  const handleDateRangeChange = (range: { start: Date | null; end: Date | null }) => {
    setLocalDateRange(range);
  };

  // Apply filters
  const handleSearch = () => {
    setFilterState({
      selectedModules: localModules,
      selectedRegions: localRegions,
      dateRange: localDateRange,
    });
  };

  // Reset both local and parent state
  const handleReset = () => {
    setLocalModules(["Business Permit"]);
    setLocalRegions([]);
    setLocalDateRange({ start: null, end: null });
    setFilterState({
      selectedModules: [],
      selectedRegions: [],
      dateRange: { start: null, end: null },
    });
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-1 gap-4 mb-6">
      {/* Module Filter */}
      <div className="flex flex-col" ref={moduleRef}>
        <label className="text-sm font-medium text-secondary-foreground mb-1">Module:</label>
        <div className="relative">
          <button
            onClick={() => setIsModuleOpen(!isModuleOpen)}
            className="w-full bg-card border border-border rounded-md py-2 px-3 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="text-sm text-secondary-foreground">
              {localModules.length > 0
                ? `${localModules.length} selected`
                : 'Select modules'}
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-500 transition-transform ${isModuleOpen ? 'transform rotate-180' : ''}`}
            />
          </button>
          {isModuleOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10">
              <div className="flex justify-between p-2 border-b border-gray-200">
                <button
                  onClick={selectAllModules}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllModules}
                  className="text-sm text-red-400 hover:text-red-800"
                >
                  Deselect All
                </button>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {modules.map((module, index) => (
                  <label
                    key={`module-${index}`}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={localModules.includes(module)}
                        onChange={() => toggleModule(module)}
                        className="opacity-0 absolute h-4 w-4 cursor-pointer"
                      />
                      <div
                        className={`border h-4 w-4 rounded flex items-center justify-center ${
                          localModules.includes(module)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {localModules.includes(module) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="ml-2 text-sm text-secondary-foreground">{module}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Region Filter */}
      <div className="flex flex-col" ref={regionRef}>
        <label className="text-sm font-medium text-secondary-foreground mb-1">Region:</label>
        <div className="relative">
          <button
            onClick={() => setIsRegionOpen(!isRegionOpen)}
            className="w-full bg-card border border-border rounded-md py-2 px-3 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="text-sm text-secondary-foreground">
              {localRegions.length === 0
                ? 'All Regions'
                : `${localRegions.length} selected`}
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-500 transition-transform ${isRegionOpen ? 'transform rotate-180' : ''}`}
            />
          </button>
          {isRegionOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10">
              <div className="flex justify-between p-2 border-b border-gray-200">
                <button
                  onClick={selectAllRegions}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllRegions}
                  className="text-sm text-red-400 hover:text-red-800"
                >
                  Deselect All
                </button>
              </div>
              <div className="max-h-[300px] overflow-y-auto">
                {Object.entries(regionMapping).map(([key, value], index) => (
                  <label
                    key={`region-${index}`}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={localRegions.includes(key)}
                        onChange={() => toggleRegion(key)}
                        className="opacity-0 absolute h-4 w-4 cursor-pointer"
                      />
                      <div
                        className={`border h-4 w-4 rounded flex items-center justify-center ${
                          localRegions.includes(key)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {localRegions.includes(key) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="ml-2 text-sm text-secondary-foreground">{value}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-secondary-foreground mb-1">Date Range:</label>
        <DateRangePicker onChange={handleDateRangeChange} value={localDateRange} />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col">
        <div className="grid grid-cols-3 gap-2 mt-[25px] md:mt-0">
          <Button className="bg-[#CB371C] hover:bg-[#CB371C]" onClick={handleReset}>Reset</Button>
          <Button className="bg-primary" onClick={handleSearch}>Search</Button>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button className="bg-[#8411DD] hover:bg-[#8411DD] max-w-full">Download</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Download Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDownload?.("pdf")}>PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDownload?.("excel")}>Excel</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
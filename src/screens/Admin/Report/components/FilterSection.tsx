import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import { modules, regions } from '../utils/mockData';
import { FilterState } from '../utils/types';
import { Button } from '@/components/ui/button';

const FilterSection: React.FC = () => {
  const [filterState, setFilterState] = useState<FilterState>({
    selectedModules: [modules[0]],
    selectedRegions: [],
    dateRange: {
      start: null,
      end: null,
    },
  });

  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const moduleRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

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

  const toggleModule = (module: string) => {
    setFilterState((prev) => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(module)
        ? prev.selectedModules.filter((m) => m !== module)
        : [...prev.selectedModules, module],
    }));
  };

  const toggleRegion = (region: string) => {
    setFilterState((prev) => ({
      ...prev,
      selectedRegions: prev.selectedRegions.includes(region)
        ? prev.selectedRegions.filter((r) => r !== region)
        : [...prev.selectedRegions, region],
    }));
  };

  const selectAllModules = () => {
    setFilterState((prev) => ({
      ...prev,
      selectedModules: [...modules],
    }));
  };

  const deselectAllModules = () => {
    setFilterState((prev) => ({
      ...prev,
      selectedModules: [],
    }));
  };

  const selectAllRegions = () => {
    setFilterState((prev) => ({
      ...prev,
      selectedRegions: [...regions],
    }));
  };

  const deselectAllRegions = () => {
    setFilterState((prev) => ({
      ...prev,
      selectedRegions: [],
    }));
  };

  const handleDateRangeChange = (range: { start: Date | null; end: Date | null }) => {
    setFilterState((prev) => ({
      ...prev,
      dateRange: range,
    }));
  };

  return (
    <div className="grid grid-cols-4 md:grid-cols-1 gap-4 mb-6">
      <div className="flex flex-col" ref={moduleRef}>
        <label className="text-sm font-medium text-secondary-foreground mb-1">Module:</label>
        <div className="relative">
          <button
            onClick={() => setIsModuleOpen(!isModuleOpen)}
            className="w-full bg-card border border-border rounded-md py-2 px-3 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="text-sm text-secondary-foreground">
              {filterState.selectedModules.length > 0
                ? `${filterState.selectedModules.length} selected`
                : 'Select modules'}
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-500 transition-transform ${
                isModuleOpen ? 'transform rotate-180' : ''
              }`}
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
                        checked={filterState.selectedModules.includes(module)}
                        onChange={() => toggleModule(module)}
                        className="opacity-0 absolute h-4 w-4 cursor-pointer"
                      />
                      <div
                        className={`border h-4 w-4 rounded flex items-center justify-center ${
                          filterState.selectedModules.includes(module)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {filterState.selectedModules.includes(module) && (
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

      <div className="flex flex-col" ref={regionRef}>
        <label className="text-sm font-medium text-secondary-foreground mb-1">Region:</label>
        <div className="relative">
          <button
            onClick={() => setIsRegionOpen(!isRegionOpen)}
            className="w-full bg-card border border-border rounded-md py-2 px-3 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="text-sm text-secondary-foreground">
              {filterState.selectedRegions.length === 0
                ? 'All Regions'
                : `${filterState.selectedRegions.length} selected`}
            </span>
            <ChevronDown
              size={18}
              className={`text-gray-500 transition-transform ${
                isRegionOpen ? 'transform rotate-180' : ''
              }`}
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
                {regions.map((region, index) => (
                  <label
                    key={`region-${index}`}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={filterState.selectedRegions.includes(region)}
                        onChange={() => toggleRegion(region)}
                        className="opacity-0 absolute h-4 w-4 cursor-pointer"
                      />
                      <div
                        className={`border h-4 w-4 rounded flex items-center justify-center ${
                          filterState.selectedRegions.includes(region)
                            ? 'bg-blue-600 border-blue-600'
                            : 'border-gray-300'
                        }`}
                      >
                        {filterState.selectedRegions.includes(region) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="ml-2 text-sm text-secondary-foreground">{region}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-medium text-secondary-foreground mb-1">Date Range:</label>
        <DateRangePicker onChange={handleDateRangeChange} />
      </div>

      <div className="flex flex-col">
        <div className="grid grid-cols-3 gap-2 mt-[25px] md:mt-0">
          <Button className="bg-[#CB371C] hover:bg-[#CB371C]">Reset</Button>
          <Button className="bg-primary">Search</Button>
          <Button className="bg-[#8411DD] hover:bg-[#8411DD]">Download</Button>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
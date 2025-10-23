import React, { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectData, setData } from '@/redux/dataSlice';
import { BarChart3, Users, ChevronDown, X, Check } from 'lucide-react';

interface ModuleFilterProps {
  title?: string;
  filterType: 'card' | 'chart';
  className?: string;
}

const ModuleFilter: React.FC<ModuleFilterProps> = ({ 
  title,
  filterType,
  className = ""
}) => {
  const data = useSelector(selectData);
  const dispatch = useDispatch();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleModuleFilterChange = (selectedModule: string) => {
    const filterKey = filterType === 'card' ? 'selectedCardModuleFilter' : 'selectedChartModuleFilter';
    const currentFilters = Array.isArray(data[filterKey]) ? data[filterKey] : [];
    
    let newFilters;
    if (selectedModule === 'All') {
      // If "All" is selected, clear all other selections
      newFilters = [];
    } else {
      // Toggle the selected module
      if (currentFilters.includes(selectedModule)) {
        newFilters = currentFilters.filter((filter: string) => filter !== selectedModule);
      } else {
        newFilters = [...currentFilters, selectedModule];
      }
    }
    
    dispatch(setData({
      ...data,
      [filterKey]: newFilters
    }));
  };

  const currentFilter = filterType === 'card' 
    ? data.selectedCardModuleFilter 
    : data.selectedChartModuleFilter;

  const selectedModules = Array.isArray(currentFilter) ? currentFilter : [];
  const isAllSelected = selectedModules.length === 0;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const availableModules = [
    { value: 'Business Permit', label: 'Business Permit' },
    { value: 'Working Permit', label: 'Working Permit' },
    { value: 'Building Permit', label: 'Building Permit' },
    { value: 'Certificate of Occupancy', label: 'Certificate of Occupancy' },
    { value: 'Barangay Clearance', label: 'Barangay Clearance' }
  ].filter(module => data.modules?.includes(module.value));

  const getDisplayText = () => {
    if (isAllSelected) return 'All Modules';
    if (selectedModules.length === 1) return selectedModules[0];
    if (selectedModules.length === 2) return `${selectedModules[0]} & ${selectedModules[1]}`;
    return `${selectedModules.length} Modules Selected`;
  };

  const removeModule = (moduleToRemove: string) => {
    const filterKey = filterType === 'card' ? 'selectedCardModuleFilter' : 'selectedChartModuleFilter';
    const newFilters = selectedModules.filter(module => module !== moduleToRemove);
    dispatch(setData({
      ...data,
      [filterKey]: newFilters
    }));
  };

  const getTitle = () => {
    if (title) return title;
    return filterType === 'card' ? 'Transaction Statistics' : 'Chart Analytics';
  };

  const getIcon = () => {
    return filterType === 'card' ? <Users className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm mb-6 sticky top-0 z-30 ${className}`}>
      <div className="flex items-center sm:flex-col sm:gap-4 justify-between px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg text-white">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{getTitle()}</h3>
            <p className="text-sm text-gray-500">View data by module</p>
          </div>
        </div>
        
        <div className="flex  justify-center gap-2 ">
          {!isAllSelected && selectedModules.length > 0 && (
            <div className="flex flex-wrap gap-1 max-w-xs">
              {selectedModules.slice(0, 3).map((module) => (
                <div
                  key={module}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                >
                  <span className="max-w-[100px] truncate">{module}</span>
                  <button
                    type="button"
                    className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-blue-200"
                    onClick={() => removeModule(module)}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {selectedModules.length > 3 && (
                <div className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                  +{selectedModules.length - 3} more
                </div>
              )}
            </div>
          )}
          <div className="relative" ref={dropdownRef}>
            {/* Custom Multi-Select Dropdown */}
            <div
              className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-10 text-sm font-medium text-gray-700 cursor-pointer
                       hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       transition-colors duration-200 min-w-[300px] flex items-center justify-between"
              onClick={() => setIsOpen(!isOpen)}
            >
              <span className="truncate">{getDisplayText()}</span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
            
            {/* Dropdown Menu */}
            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto">
                {/* All Modules Option */}
                <div
                  className={`px-4 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                    isAllSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                  }`}
                  onClick={() => {
                    handleModuleFilterChange('All');
                    setIsOpen(false);
                  }}
                >
                  <span>All Modules</span>
                  {isAllSelected && <Check className="w-4 h-4 text-blue-600" />}
                </div>

                {/* Individual Module Options */}
                {availableModules.map((module) => (
                  <div
                    key={module.value}
                    className={`px-4 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between ${
                      selectedModules.includes(module.value) ? 'bg-blue-50 text-blue-700' : 'text-gray-900'
                    }`}
                    onClick={() => handleModuleFilterChange(module.value)}
                  >
                    <span>{module.label}</span>
                    {selectedModules.includes(module.value) && <Check className="w-4 h-4 text-blue-600" />}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Selected Module Tags */}
          
        </div>
      </div>
    </div>
  );
};

export default ModuleFilter;

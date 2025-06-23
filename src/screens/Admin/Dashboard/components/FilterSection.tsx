import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select';
import { Check, ChevronDown } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import DateRangePicker from './DateRangePicker';
import { modules, groupOfIslands, regionGroups } from '../utils/mockData';
import { FilterState } from '../utils/types';
import { selectRegions } from '@/redux/regionSlice';
import { selectData, setData } from '@/redux/dataSlice';

const formatDate = (date: Date | null): string => {
  if (!date) return '';
  return date.toISOString().split('T')[0]; // Returns YYYY-MM-DD format
};

// Add this type for the formatted state
interface FormattedFilterState {
  selectedModules: string[];
  selectedRegions: string[];
  dateRange: {
    start: string;
    end: string;
  };
}

// Map group of islands to their regions
const islandRegionMap = {
  "Luzon": ["I", "II", "III", "IV-A", "V", "CAR", "NCR"],
  "Visayas": ["VI", "VII", "VIII"],
  "Mindanao": ["IX", "X", "XI", "XII", "XIII", "BARMM1", "BARMM2"]
};

const FilterSection: React.FC = () => {
  const regions = useSelector(selectRegions);
  const data = useSelector(selectData);
  const dispatch = useDispatch();

  // Initialize filterState with data from Redux
  const [filterState, setFilterState] = useState<FilterState>({
    selectedModules: [modules[0]],
    selectedRegions: data?.locationName || [], // Initialize from Redux data
    dateRange: {
      start: null,
      end: null
    }
  });

  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [selectedIslands, setSelectedIslands] = useState<string[]>([]);
  const [selectedCityOptions, setSelectedCityOptions] = useState<{ value: string; label: string; }[]>([]);

  const moduleRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  // Sync with Redux data changes
  useEffect(() => {
    if (data?.locationName) {
      setFilterState(prev => ({
        ...prev,
        selectedRegions: Array.isArray(data.locationName) ? data.locationName : [data.locationName]
      }));

      // Update selected islands based on locationName
      const selectedIslandsList = groupOfIslands.filter(island => {
        const islandRegions = islandRegionMap[island] || [];
        return islandRegions.every(region => 
          Array.isArray(data.locationName) 
            ? data.locationName.includes(region)
            : data.locationName === region
        );
      });
      setSelectedIslands(selectedIslandsList);
    }
  }, [data?.locationName]);

  // Update Redux when filterState changes
  useEffect(() => {

    const formattedState = getFormattedState();
    console.log("Formatted filter state:", formattedState);

    if (JSON.stringify(data?.locationName) !== JSON.stringify(filterState.selectedRegions)) {
      dispatch(setData({
        ...data,
        locationName: filterState.selectedRegions,real:formattedState ? formattedState.selectedRegions : [],
      }));
    }
  }, [filterState.selectedRegions]);

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

  // Get municipalities for selected regions
  const getMunicipalitiesForRegions = (selectedRegionTexts: string[]) => {
    const selectedRegionData = regions.filter(r => selectedRegionTexts.includes(r.text));
    return selectedRegionData.flatMap(r => r.municipalities);
  };

  // City select handler (multi)
  const handleCityChange = (options: any) => {
    setSelectedCityOptions(options || []);
  };

  // Get city options based on selected regions
  const getCityOptions = (selectedRegionTexts: string[]) => {
    const municipalities = getMunicipalitiesForRegions(selectedRegionTexts);
    return municipalities.map(city => ({
      value: city,
      label: city,
    }));
  };

  // --- Other handlers ---
  const toggleModule = (module: string) => {
    setFilterState(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(module)
        ? prev.selectedModules.filter(m => m !== module)
        : [...prev.selectedModules, module]
    }));
  };

  const selectAllModules = () => {
    setFilterState(prev => ({
      ...prev,
      selectedModules: [...modules]
    }));
  };

  const deselectAllModules = () => {
    setFilterState(prev => ({
      ...prev,
      selectedModules: []
    }));
  };

  const selectAllRegions = () => {
    const allRegions = Array.from(
      new Set(
        groupOfIslands.flatMap(island => islandRegionMap[island] || [])
      )
    );
    setFilterState(prev => ({
      ...prev,
      selectedRegions: allRegions,
    }));
    setSelectedIslands([...groupOfIslands]);
  };

  const deselectAllRegions = () => {
    setFilterState(prev => ({
      ...prev,
      selectedRegions: [],
    }));
    setSelectedIslands([]);
    setSelectedCityOptions([]);
  };

  // Helper: get all regions from selected islands
  const getRegionsFromIslands = (islands: string[]) => {
    const regionsList = islands.flatMap(island => islandRegionMap[island] || []);
    return Array.from(new Set(regionsList));
  };

  // When group of islands is toggled
  const toggleIsland = (island: string) => {
    const regionsToAdd = islandRegionMap[island] || [];
    
    setFilterState(prevState => {
      const isRemoving = selectedIslands.includes(island);
      let newRegions: string[];

      if (isRemoving) {
        // Remove regions for this island while keeping others
        newRegions = prevState.selectedRegions.filter(r => !regionsToAdd.includes(r));
      } else {
        // Add regions for this island while keeping existing ones
        newRegions = Array.from(new Set([...prevState.selectedRegions, ...regionsToAdd]));
      }

      return {
        ...prevState,
        selectedRegions: newRegions,
      };
    });

    // Update selected islands
    setSelectedIslands(prev => {
      if (prev.includes(island)) {
        return prev.filter(i => i !== island);
      }
      return [...prev, island];
    });

    // Reset city options if removing all regions
    if (selectedIslands.length === 1 && selectedIslands[0] === island) {
      setSelectedCityOptions([]);
    }
  };

  // Update the toggleRegion function
  const toggleRegion = (region: string) => {
    setFilterState(prev => {
      const newRegions = prev.selectedRegions.includes(region)
        ? prev.selectedRegions.filter(r => r !== region)
        : [...prev.selectedRegions, region];

      return {
        ...prev,
        selectedRegions: newRegions
      };
    });
  };

  const handleDateRangeChange = (range: { start: Date | null; end: Date | null }) => {
    setFilterState(prev => ({
      ...prev,
      dateRange: range
    }));
  };

  useEffect(() => {
    // Update selected islands based on selected regions
    const selectedIslandsList = groupOfIslands.filter(island => {
      const islandRegions = islandRegionMap[island] || [];
      return islandRegions.every(region => filterState.selectedRegions.includes(region));
    });
    
    if (JSON.stringify(selectedIslandsList.sort()) !== JSON.stringify(selectedIslands.sort())) {
      setSelectedIslands(selectedIslandsList);
    }
  }, [filterState.selectedRegions]); // Only depend on selectedRegions

  // Add this function inside your component to format the state
  const getFormattedState = (): FormattedFilterState => {
    return {
      selectedModules: filterState.selectedModules,
      selectedRegions: filterState.selectedRegions.map(region => {
        const matchedRegion = regions.find(r => r.text === region);
        return matchedRegion ? matchedRegion.id : region;
      }),
      dateRange: {
        start: formatDate(filterState.dateRange.start),
        end: formatDate(filterState.dateRange.end)
      }
    };
  };

  // Update your useEffect to log the formatted state


  return (
    <div className="grid grid-cols-3 md:grid-cols-1 gap-4 mb-6">
      {/* Module */}
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
            <ChevronDown size={18} className={`text-secondary-foreground  transition-transform ${isModuleOpen ? 'transform rotate-180' : ''}`} />
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
                      <div className={`border h-4 w-4 rounded flex items-center justify-center ${
                        filterState.selectedModules.includes(module)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
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

      {/* Region, Group of Islands, Province, City/Municipality */}
      <div className="flex flex-col" ref={regionRef}>
        <label className="text-sm font-bold text-secondary-foreground mb-1">Region:</label>
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
            <ChevronDown size={18} className={`text-secondary-foreground  transition-transform ${isRegionOpen ? 'transform rotate-180' : ''}`} />
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
              <div className="max-h-[400px] overflow-y-auto p-3">
                {/* Group of Islands */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-blue-700 mb-2">Group of Islands</label>
                  <div className="flex gap-6 mb-2">
                    {groupOfIslands.map(island => (
                      <label key={island} className="flex items-center gap-1 text-secondary-foreground  text-sm">
                        <input
                          type="checkbox"
                          checked={selectedIslands.includes(island)}
                          onChange={() => toggleIsland(island)}
                          className="accent-blue-600"
                        />
                        {island}
                      </label>
                    ))}
                  </div>
                </div>
                {/* Regions */}
                <label className="block text-sm font-bold text-blue-700 mb-2">Regions</label>
                <div className="grid grid-cols-5 gap-2 mb-4">
                  
                  {regionGroups.map((col, colIdx) => (
                    <div key={colIdx} className="flex flex-col gap-2">
                      {col.map((region:any) => (
                        <label key={region} className="flex items-center gap-1 text-secondary-foreground  text-sm">
                          <input
                            type="checkbox"
                            checked={filterState.selectedRegions.includes(region)}
                            onChange={() => toggleRegion(region)}
                            className="accent-blue-600"
                          />
                          {region}
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
                {/* City/Municipality (multi) */}
                <div className="relative z-50">
                  <label className="block text-sm font-bold text-blue-700 mb-1">City/Municipality</label>
                  <div className="relative">
                    <Select
                      options={getCityOptions(filterState.selectedRegions)}
                      value={selectedCityOptions}
                      onChange={handleCityChange}
                      placeholder="Select city/municipality"
                      isClearable
                      isMulti
                      isDisabled={filterState.selectedRegions.length === 0}
                      classNamePrefix="react-select"
                      className="text-sm"
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                        menu: base => ({ ...base, zIndex: 9999 }),
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Range */}
      <div className="flex flex-col">
        <label className="text-sm font-medium text-secondary-foreground mb-1">Date Range:</label>
        <DateRangePicker onChange={handleDateRangeChange} />
      </div>
    </div>
  );
};

export default FilterSection;
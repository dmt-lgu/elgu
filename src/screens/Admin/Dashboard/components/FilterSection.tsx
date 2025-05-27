import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select';
import { Check, ChevronDown } from 'lucide-react';
import DateRangePicker from './DateRangePicker';
import { modules,groupOfIslands,regionGroups,provinces ,cities,islandRegionMap,regionProvinceMap } from '../utils/mockData';
import { FilterState } from '../utils/types';


const provinceOptions = provinces.map(province => ({
  value: province,
  label: province,
}));
const getCityOptions = (selectedProvinces: string[]) => {
  let cityList: { value: string; label: string }[] = [];
  selectedProvinces.forEach(province => {
    cityList = cityList.concat(
      (cities[province] || []).map((city:any) => ({
        value: city,
        label: city,
        province,
      }))
    );
  });
  // Remove duplicates
  return Array.from(new Map(cityList.map(item => [item.value, item])).values());
};

// Map group of islands to their regions


const FilterSection: React.FC = () => {
  const [filterState, setFilterState] = useState<FilterState>({
    selectedModules: [modules[0]],
    selectedRegions: [],
    dateRange: {
      start: null,
      end: null
    }
  });

  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [selectedIslands, setSelectedIslands] = useState<string[]>([]);
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<string>("");

  const [selectedProvinceOptions, setSelectedProvinceOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedCityOptions, setSelectedCityOptions] = useState<{ value: string; label: string; province?: string }[]>([]);

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
    setFilterState(prev => ({
      ...prev,
      selectedModules: prev.selectedModules.includes(module)
        ? prev.selectedModules.filter(m => m !== module)
        : [...prev.selectedModules, module]
    }));
  };

  // const toggleRegion = (region: string) => {
  //   setFilterState(prev => ({
  //     ...prev,
  //     selectedRegions: prev.selectedRegions.includes(region)
  //       ? prev.selectedRegions.filter(r => r !== region)
  //       : [...prev.selectedRegions, region]
  //   }));
  // };

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
    // Select all regions from all group of islands
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
    setSelectedProvinceOptions([]);
    setSelectedCityOptions([]);
  };

  const handleDateRangeChange = (range: { start: Date | null; end: Date | null }) => {
    setFilterState(prev => ({
      ...prev,
      dateRange: range
    }));
  };

  // Helper: get all regions from selected islands
  const getRegionsFromIslands = (islands: string[]) => {
    const regions = islands.flatMap(island => islandRegionMap[island] || []);
    // Remove duplicates
    return Array.from(new Set(regions));
  };

  // Helper: get all provinces from selected regions
  const getProvincesFromRegions = (regions: string[]) => {
    const provs = regions.flatMap(region => regionProvinceMap[region] || []);
    // Remove duplicates
    return Array.from(new Set(provs));
  };

  // Province options filtered by selected regions
  const filteredProvinceOptions = provinceOptions.filter(opt =>
    getProvincesFromRegions(filterState.selectedRegions).includes(opt.value)
  );

  // --- Handlers ---
  // When group of islands is toggled, select/deselect its regions
  const toggleIsland = (island: string) => {
    setSelectedIslands(prev => {
      let newIslands: string[];
      if (prev.includes(island)) {
        newIslands = prev.filter(i => i !== island);
      } else {
        newIslands = [...prev, island];
      }
      // Update regions based on islands
      const regionsFromIslands = getRegionsFromIslands(newIslands);
      setFilterState(prevState => ({
        ...prevState,
        selectedRegions: regionsFromIslands,
      }));
      // Reset province/city if no region selected
      if (regionsFromIslands.length === 0) {
        setSelectedProvinceOptions([]);
        setSelectedCityOptions([]);
      }
      return newIslands;
    });
  };

  // When region is toggled, update selectedRegions and reset provinces/cities if needed
  const toggleRegion = (region: string) => {
    setFilterState(prev => {
      let newRegions: string[];
      if (prev.selectedRegions.includes(region)) {
        newRegions = prev.selectedRegions.filter(r => r !== region);
      } else {
        newRegions = [...prev.selectedRegions, region];
      }
      // Reset province/city if no region selected
      if (newRegions.length === 0) {
        setSelectedProvinceOptions([]);
        setSelectedCityOptions([]);
      }
      return {
        ...prev,
        selectedRegions: newRegions,
      };
    });
  };

  // Province select handler (multi)
  const handleProvinceChange = (options: any) => {
    setSelectedProvinceOptions(options || []);
    setSelectedCityOptions([]); // Reset city when province changes
    setSelectedProvince("");
    setSelectedCity("");
  };

  // City select handler (multi)
  const handleCityChange = (options: any) => {
    setSelectedCityOptions(options || []);
    setSelectedCity("");
  };

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
                      {col.map(region => (
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
                {/* Province (multi) */}
                <div className="mb-2 relative z-50">
                  <label className="block text-sm font-bold text-blue-700 mb-1">Province</label>
                  <div className="relative">
                    <Select
                      options={filteredProvinceOptions}
                      value={selectedProvinceOptions}
                      onChange={handleProvinceChange}
                      placeholder="Select province(s)"
                      isClearable
                      isMulti
                      isDisabled={filterState.selectedRegions.length === 0}
                      classNamePrefix="react-select"
                      className="text-sm z-50"
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 9999 }),
                        menu: base => ({ ...base, zIndex: 9999 }),
                      }}
                    />
                  </div>
                </div>
                {/* City/Municipality (multi) */}
                <div className="relative z-50">
                  <label className="block text-sm font-bold text-blue-700 mb-1">City/Municipality</label>
                  <div className="relative">
                    <Select
                      options={getCityOptions(selectedProvinceOptions.map(opt => opt.value))}
                      value={selectedCityOptions}
                      onChange={handleCityChange}
                      placeholder="Select city/municipality"
                      isClearable
                      isMulti
                      isDisabled={selectedProvinceOptions.length === 0}
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
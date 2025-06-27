import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Check, ChevronDown } from 'lucide-react';
import DateRangeDay from './DateRangeDay';
import DateRangeMonth from './DateRangeMonth';
import DateRangeYear from './DateRangeYear';
import {
  modules,
  category,
  groupOfIslands,
  dateRange,
  regionMapping,
  islandRegionMap,
  regionProvinceMap,
} from '../utils/mockData';
import { Bp } from '../utils/types';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import axios from '../../../../plugin/axios';

// Redux imports
import { useSelector, useDispatch } from 'react-redux';
import { updateFilterField } from './reportFilterSlice';
import { AppDispatch, RootState } from '@/redux/store';

// --- City/Province API Integration ---

function displayCityName(name: string) {
  if (/^City of /i.test(name.trim())) return name;
  const match = name.match(/^(.+?)\s*City$/i);
  if (match) {
    return `City of ${match[1].trim()}`;
  }
  return name.trim();
}

function normalizeApiCities(apiCities: Record<string, string[]>): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};
  for (const [province, cityList] of Object.entries(apiCities)) {
    normalized[province] = cityList.map(cityProv => {
      const city = cityProv.split(',')[0].trim();
      return displayCityName(city);
    });
  }
  return normalized;
}

function useCities() {
  const [cities, setCities] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios
      .get(`${import.meta.env.VITE_URL}/api/bp/municipality-list`)
      .then(res => {
        if (mounted) {
          setCities(normalizeApiCities(res.data));
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Failed to fetch cities');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  return { cities, loading, error };
}

function useProvinces() {
  const [provinces, setProvinces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios
      .get(`${import.meta.env.VITE_URL}/api/bp/municipality-list`)
      .then(res => {
        if (mounted) {
          setProvinces(Object.keys(res.data));
          setLoading(false);
        }
      })
      .catch(err => {
        if (mounted) {
          setError(err.message || 'Failed to fetch provinces');
          setLoading(false);
        }
      });
    return () => { mounted = false; };
  }, []);

  return { provinces, loading, error };
}

// --- End of city/province API integration ---

const getCityOptions = (
  selectedProvinces: string[],
  cities: Record<string, string[]>
) => {
  let cityList: { value: string; label: string; province?: string }[] = [];
  selectedProvinces.forEach(province => {
    cityList = cityList.concat(
      (cities[province] || []).map((city: any) => ({
        value: city,
        label: displayCityName(city),
        province,
      }))
    );
  });
  return Array.from(new Map(cityList.map(item => [item.value, item])).values());
};

const FilterSection: React.FC<{
  onSearch: (filters: any) => void;
  onDownload?: (type: "pdf" | "excel") => void;
  onReset?: () => void;
}> = ({
  onSearch,
  onDownload,
  onReset,
}) => {
  // Redux
  const dispatch = useDispatch<AppDispatch>();
  const filterState = useSelector((state: RootState) => state.reportFilter);

  // --- Local UI state ---
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);

  // --- Use Redux for selectedIslands ---
  const selectedIslands = filterState.selectedIslands || [];

  const [selectedProvinceOptions, setSelectedProvinceOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedCityOptions, setSelectedCityOptions] = useState<{ value: string; label: string; province?: string }[]>([]);

  const moduleRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const categoryRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // --- Fetch cities and provinces from API ---
  const { cities, loading: citiesLoading, error: citiesError } = useCities();
  const { provinces } = useProvinces();

  // Province options (dynamic)
  const provinceOptions = useMemo(() =>
    provinces.map(province => ({
      value: province,
      label: province,
    })), [provinces]);

  // Ensure BP is always selected
  useEffect(() => {
    if (!filterState.selectedModules.includes(Bp)) {
      dispatch(updateFilterField({ key: 'selectedModules', value: [Bp, ...filterState.selectedModules.filter((m: string) => m !== Bp)] }));
    }
    // eslint-disable-next-line
  }, []);

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

  // --- Module Logic ---
  const toggleModule = (module: string) => {
    const newModules = filterState.selectedModules.includes(module)
      ? filterState.selectedModules.filter((m: string) => m !== module)
      : [...filterState.selectedModules, module];
    dispatch(updateFilterField({ key: 'selectedModules', value: newModules }));
  };

  const selectAllModules = () => {
    dispatch(updateFilterField({ key: 'selectedModules', value: [...modules] }));
  };

  const deselectAllModules = () => {
    dispatch(updateFilterField({ key: 'selectedModules', value: [] }));
  };

  // --- Category Logic (local only, not persisted) ---
  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev =>
      prev.includes(cat)
        ? prev.filter(c => c !== cat)
        : [...prev, cat]
    );
  };

  const selectAllCategories = () => setSelectedCategories([...category]);
  const deselectAllCategories = () => setSelectedCategories([]);

  // --- Region Logic ---
  const selectAllRegions = () => {
    const allRegionInternalKeys = Object.values(regionMapping);
    dispatch(updateFilterField({ key: 'selectedRegions', value: allRegionInternalKeys }));
    dispatch(updateFilterField({ key: 'selectedIslands', value: [...groupOfIslands] }));
  };

  const deselectAllRegions = () => {
    dispatch(updateFilterField({ key: 'selectedRegions', value: [] }));
    dispatch(updateFilterField({ key: 'selectedIslands', value: [] }));
    setSelectedProvinceOptions([]);
    setSelectedCityOptions([]);
    dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
  };

    const handleDateRangeChange = (range: { start: Date | null; end: Date | null }) => {
    dispatch(
      updateFilterField({
        key: 'dateRange',
        value: {
          start: range.start ?? null,
          end: range.end ?? null,
        },
      })
    );
  };

  // Helper: get all provinces from selected regions
  const getProvincesFromRegions = (regions: string[]) => {
    const provs = regions.flatMap(region => (regionProvinceMap as Record<string, string[]>)[region] || []);
    return Array.from(new Set(provs));
  };

  // Province options filtered by selected regions
  const filteredProvinceOptions = useMemo(() =>
    provinceOptions.filter(opt =>
      getProvincesFromRegions(filterState.selectedRegions).includes(opt.value)
    ), [provinceOptions, filterState.selectedRegions]);

  // --- Handlers ---
  const toggleIsland = (island: string) => {
    let newIslands: string[];
    if (selectedIslands.includes(island)) {
      newIslands = selectedIslands.filter(i => i !== island);
    } else {
      newIslands = [...selectedIslands, island];
    }

    // Gather all region codes from selected islands
    const regionCodes = newIslands.flatMap(isle => islandRegionMap[isle] || []);
    // Map region codes to internal keys
    const internalKeys = regionCodes.map(code => regionMapping[code]).filter(Boolean);

    dispatch(updateFilterField({ key: 'selectedIslands', value: newIslands }));
    dispatch(updateFilterField({ key: 'selectedRegions', value: internalKeys }));

    if (newIslands.length === 0) {
      setSelectedProvinceOptions([]);
      setSelectedCityOptions([]);
      dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
      dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    }
  };

  const toggleRegion = (region: string) => {
    let newRegions: string[];
    if (filterState.selectedRegions.includes(region)) {
      newRegions = filterState.selectedRegions.filter((r: string) => r !== region);
    } else {
      newRegions = [...filterState.selectedRegions, region];
    }
    if (newRegions.length === 0) {
      setSelectedProvinceOptions([]);
      setSelectedCityOptions([]);
      dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
      dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    }
    dispatch(updateFilterField({ key: 'selectedRegions', value: newRegions }));
  };

  const handleProvinceChange = (options: any) => {
    setSelectedProvinceOptions(options || []);
    setSelectedCityOptions([]);
    dispatch(updateFilterField({ key: 'selectedProvinces', value: (options || []).map((opt: any) => opt.value) }));
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
  };

  const handleCityChange = (options: any) => {
    setSelectedCityOptions(options || []);
    dispatch(updateFilterField({ key: 'selectedCities', value: (options || []).map((opt: any) => opt.value) }));
  };

  // --- Date Range Logic (Redux) ---
  const selectedDateType = filterState.selectedDateType || ""; // "Day" | "Month" | "Year" | ""

  const deselectAllDates = () => {
    dispatch(updateFilterField({ key: 'selectedDateType', value: "" }));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
  };

  const handleDateTypeToggle = (dateType: string) => {
    dispatch(updateFilterField({ key: 'selectedDateType', value: dateType }));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
  };

  // --- UPDATED: Map region codes to internal keys before search ---
  const handleSearchClick = () => {
    onSearch({
      selectedRegions: filterState.selectedRegions,
      selectedProvinces: filterState.selectedProvinces,
      selectedCities: filterState.selectedCities,
      dateRange: filterState.dateRange,
      selectedDateType: filterState.selectedDateType,
      selectedIslands: filterState.selectedIslands,
    });
  };

  const handleReset = () => {
    setSelectedCategories([]);
    setSelectedCityOptions([]);
    setSelectedProvinceOptions([]);
    dispatch(updateFilterField({ key: 'selectedRegions', value: [] }));
    dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
    dispatch(updateFilterField({ key: 'selectedDateType', value: "" }));
    dispatch(updateFilterField({ key: 'selectedIslands', value: [] }));
    // Do NOT reset selectedModules!
    if (onReset) {
      onReset();
    }
    setIsCategoryOpen(false);
    setIsDateOpen(false);
    setIsRegionOpen(false);
  };

  useEffect(() => {
    setSelectedProvinceOptions(
      provinceOptions.filter(opt =>
        filterState.selectedProvinces?.includes(opt.value)
      )
    );
    setSelectedCityOptions(
      getCityOptions(filterState.selectedProvinces || [], cities).filter(opt =>
        (filterState.selectedCities || []).includes(opt.value)
      )
    );
  }, [filterState.selectedProvinces, filterState.selectedCities, provinceOptions, cities]);

  return (
    <div className="grid grid-cols-5 md:grid-cols-1 gap-4 mb-6">
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
            <div className="w-[250px] absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10">
              <div className="flex justify-between p-2 border-b border-gray-200 ">
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

      {/* Category */}
      <div className="flex flex-col" ref={categoryRef}>
        <label className="text-sm font-medium text-secondary-foreground mb-1">Category:</label>
        <div className="relative">
          <button
            onClick={() => setIsCategoryOpen(!isCategoryOpen)} disabled
            className="w-full bg-gray border cursor-not-allowed border-border rounded-md py-2 px-3 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="text-sm text-secondary-foreground">
              {selectedCategories.length > 0
                ? `${selectedCategories.length} selected`
                : 'Select categories'}
            </span>
            <ChevronDown size={18} className={`text-secondary-foreground  transition-transform ${isCategoryOpen ? 'transform rotate-180' : ''}`} />
          </button>
          {isCategoryOpen && (
            <div className="w-[250px] absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10">
              <div className="flex justify-between p-2 border-b border-gray-200">
                <button
                  onClick={selectAllCategories}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllCategories}
                  className="text-sm text-red-400 hover:text-red-800"
                >
                  Deselect All
                </button>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {category.map((cat, index) => (
                  <label
                    key={`category-${index}`}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="opacity-0 absolute h-4 w-4 cursor-pointer"
                      />
                      <div className={`border h-4 w-4 rounded flex items-center justify-center ${
                        selectedCategories.includes(cat)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedCategories.includes(cat) && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="ml-2 text-sm text-secondary-foreground">{cat}</span>
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
            <div
              className="w-[350px] absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10"
              role="dialog"
              aria-modal="true"
              aria-label="Region Filter"
            >
              {/* Header with Select/Deselect All */}
              <div className="flex justify-between p-2 border-b border-gray-200">
                <button
                  onClick={selectAllRegions}
                  className="text-sm text-blue-600 hover:text-blue-800"
                  type="button"
                  aria-label="Select all regions"
                >
                  Select All
                </button>
                <button
                  onClick={deselectAllRegions}
                  className="text-sm text-red-400 hover:text-red-800"
                  type="button"
                  aria-label="Deselect all regions"
                >
                  Deselect All
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto p-3">
                {/* Group of Islands */}
                <div className="mb-4">
                  <label className="block text-sm font-bold text-blue-700 mb-2">
                    Group of Islands
                  </label>
                  <div className="flex gap-6 mb-2">
                    {groupOfIslands.map(island => (
                      <label
                        key={island}
                        className="flex items-center gap-1 text-secondary-foreground text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIslands.includes(island)}
                          onChange={() => toggleIsland(island)}
                          className="accent-blue-600"
                          aria-checked={selectedIslands.includes(island)}
                          aria-label={`Toggle island ${island}`}
                        />
                        {island}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Regions */}
                <label className="block text-sm font-bold text-blue-700 mb-2">
                  Regions
                </label>
                <div
                  className="columns-4 gap-2 mb-4"
                  style={{ columnCount: 4 }}
                >
                  {Object.entries(regionMapping).map(([regionCode, internalKey]) => (
                    <label
                      key={regionCode}
                      className="flex items-center gap-1 text-secondary-foreground text-sm break-inside-avoid-column mb-2"
                    >
                      <input
                        type="checkbox"
                        checked={filterState.selectedRegions.includes(internalKey)}
                        onChange={() => toggleRegion(internalKey)}
                        className="accent-blue-600"
                        aria-checked={filterState.selectedRegions.includes(internalKey)}
                        aria-label={`Toggle region ${regionCode}`}
                      />
                      {regionCode}
                    </label>
                  ))}
                </div>

                {/* Province (multi-select) */}
                <div className="mb-2 relative z-50">
                  <label className="block text-sm font-bold text-blue-700 mb-1">
                    Province
                  </label>
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
                      aria-label="Select provinces"
                    />
                  </div>
                </div>

                {/* City/Municipality (multi-select) */}
                <div className="relative z-50">
                  <label className="block text-sm font-bold text-blue-700 mb-1">
                    City/Municipality
                  </label>
                  <div className="relative">
                    {citiesLoading ? (
                      <div className="text-xs text-muted-foreground py-2 px-2">
                        Loading cities...
                      </div>
                    ) : citiesError ? (
                      <div className="text-xs text-red-500 py-2 px-2">
                        Failed to load cities
                      </div>
                    ) : (
                      <Select
                        options={getCityOptions(
                          selectedProvinceOptions.map(opt => opt.value),
                          cities
                        )}
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
                        aria-label="Select cities or municipalities"
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Date Range */}
      <div className="flex flex-col" ref={dateRef}>
        <label className="text-sm font-medium text-secondary-foreground mb-1">Date Range:</label>
        <div className="relative">
          <button
            onClick={() => setIsDateOpen(!isDateOpen)}
            className="w-full bg-card border border-border rounded-md py-2 px-3 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <span className="text-sm text-secondary-foreground">
              {selectedDateType
                ? selectedDateType
                : 'Date'}
            </span>
            <ChevronDown size={18} className={`text-secondary-foreground  transition-transform ${isDateOpen ? 'transform rotate-180' : ''}`} />
          </button>
          {isDateOpen && (
            <div className="w-[400px] absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-md shadow-lg z-10">
              <div className="flex justify-start p-2 border-b border-gray-200">
                <button
                  onClick={deselectAllDates}
                  className="text-sm text-red-400 hover:text-red-800"
                >
                  Deselect
                </button>
              </div>
              <div className="max-h-[200px] overflow-y-auto">
                {dateRange.map((date, index) => (
                  <label
                    key={`Date-${index}`}
                    className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="relative flex items-center">
                      <input
                        type="radio"
                        name="date-range-radio"
                        checked={selectedDateType === date}
                        onChange={() => handleDateTypeToggle(date)}
                        className="opacity-0 absolute h-4 w-4 cursor-pointer"
                      />
                      <div className={`border h-4 w-4 rounded flex items-center justify-center ${
                        selectedDateType === date
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {selectedDateType === date && (
                          <Check size={12} className="text-white" />
                        )}
                      </div>
                      <span className="ml-2 text-sm text-secondary-foreground">{date}</span>
                    </div>
                  </label>
                ))}
                <div className='flex flex-col gap-4 p-5 border-t border-gray-200'>
                  {!selectedDateType && (
                    <span className="text-sm text-muted-foreground text-center">
                      Please select day, month, or year
                    </span>
                  )}
                  {selectedDateType === 'Day' && (
                    <DateRangeDay value={filterState.dateRange} onChange={handleDateRangeChange} />
                  )}
                  {selectedDateType === 'Month' && (
                    <DateRangeMonth
                      value={filterState.dateRange}
                      onChange={handleDateRangeChange}
                    />
                  )}
                  {selectedDateType === 'Year' && (
                    <DateRangeYear
                      value={filterState.dateRange}
                      onChange={handleDateRangeChange}
                    />
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action button */}
<div className="flex flex-col ">
  <div className="grid grid-cols-3 gap-2 mt-[25px] md:mt-0">
    <Button
      className="bg-[#CB371C] hover:bg-[#CB371C] h-9 text-[12px]"
      onClick={handleReset}
      
    >
      Reset
    </Button>
    <Button
      className="bg-primary h-9 text-[12px]"
      onClick={handleSearchClick}
    >
      Search
    </Button>
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Button className="bg-[#8411DD] hover:bg-[#8411DD] max-w-full text-[10px] h-9 md:w-full">
          Download
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Download Options</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onDownload?.("pdf")}
          className='cursor-pointer hover:bg-primary hover:text-white'
        >
          PDF
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onDownload?.("excel")}
          className='cursor-pointer'
        >
          Excel
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</div>
    </div>
  );
};

export default FilterSection;
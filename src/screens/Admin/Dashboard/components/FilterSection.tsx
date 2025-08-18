import React, { useState, useRef, useEffect } from 'react';
import Select from 'react-select';
import { Check, ChevronDown, Filter, MapPin, Calendar, Settings2,  Loader2,  BarChart3, Monitor } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';

import DateRangeDay from './DateRangeDay';
import DateRangeMonth from './DateRangeMonth';
import DateRangeYear from './DateRangeYear';
import { modules, groupOfIslands, regionGroups } from '../utils/mockData';
import { FilterState } from '../utils/types';
import { selectRegions } from '@/redux/regionSlice';
import { selectData, setData } from '@/redux/dataSlice';
import { selectLoad } from '@/redux/loadSlice';

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
const islandRegionMap: any = {
  "Luzon": ["I", "II", "III", "IV-A", "V", "CAR", "IV-B"],
  "Visayas": ["VI", "VII", "VIII"],
  "Mindanao": ["IX", "X", "XI", "XII", "XIII", "BARMM I", "BARMM II"]
};

const dateTypes = ['Day', 'Month', 'Year'];

const FilterSection: React.FC = () => {
  const regions = useSelector(selectRegions);
  const data = useSelector(selectData);
  const isLoading = useSelector(selectLoad);
  const dispatch = useDispatch();

  // Province and municipality options
  const [provinceOptions, setProvinceOptions] = useState<{ value: string; label: string }[]>([]);
  const [cityOptions, setCityOptions] = useState<{ value: string; label: string }[]>([]);

  // Always use Redux as the source of truth for selected provinces and municipalities
  const selectedProvinces = data.province || [];
  const selectedCityOptions = data.municipalities || [];

  // Update province options when regions or selected regions change
  useEffect(() => {
    const selectedRegionData = regions.filter(r => (data.locationName || []).includes(r.text));
    const allMunicipalities = selectedRegionData.flatMap(r => r.municipalities);

    const provinceSet = new Set<string>();
    allMunicipalities.forEach((m: string) => {
      if (typeof m === 'string') {
        const parts = m.split(',');
        if (parts.length > 1) {
          provinceSet.add(parts[1].trim());
        }
      }
    });

    const options = Array.from(provinceSet).map(prov => ({
      value: prov,
      label: prov,
    }));

    setProvinceOptions(options);
  }, [data.locationName, regions]);

  // Update city options when regions or provinces change
  useEffect(() => {
    const selectedRegionData = regions.filter(r => (data.locationName || []).includes(r.text));
    const allMunicipalities = selectedRegionData.flatMap(r => r.municipalities);

    let filtered = allMunicipalities;
    if (selectedProvinces.length > 0) {
      filtered = allMunicipalities.filter(city =>
        selectedProvinces.some((prov: any) => city.endsWith(prov.value))
      );
    }
    setCityOptions(
      filtered.map(city => ({
        value: city,
        label: city,
      }))
    );
  }, [data]);

  // Province select handler (multi)
  const handleProvinceChange = (options: any) => {
    dispatch(setData({
      ...data,
      province: options || [],
      // Optionally clear municipalities if province changes
      municipalities: [],
    }));
  };

  // City select handler (multi)
  const handleCityChange = (options: any) => {
    dispatch(setData({
      ...data,
      municipalities: options || [],
    }));
  };

  // Initialize filterState with Redux modules if available, otherwise use first module as default
  const [filterState, setFilterState] = useState<FilterState>({
    selectedModules: data?.modules && data.modules.length > 0 ? data.modules : [modules[0]],
    selectedRegions: data?.locationName || [],
    dateRange: {
      start: null,
      end: null
    }
  });

  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [selectedIslands, setSelectedIslands] = useState<string[]>([]);

  const moduleRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);

  // Sync filterState with Redux data on mount and when Redux changes
  useEffect(() => {
    // Update modules from Redux
    if (data?.modules && JSON.stringify(filterState.selectedModules) !== JSON.stringify(data.modules)) {
      setFilterState(prev => ({
        ...prev,
        selectedModules: data.modules
      }));
    }

    // Update regions from Redux
    if (
      Array.isArray(data?.locationName) &&
      JSON.stringify(filterState.selectedRegions) !== JSON.stringify(data.locationName)
    ) {
      setFilterState(prev => ({
        ...prev,
        selectedRegions: data.locationName
      }));

      // Update selected islands based on locationName
      const selectedIslandsList = groupOfIslands.filter(island => {
        const islandRegions: any = islandRegionMap[island] || [];
        return islandRegions.every((region: any) =>
          data.locationName.includes(region)
        );
      });
      setSelectedIslands(selectedIslandsList);
    }
  }, [data?.modules, data?.locationName]);

  // Update Redux when filterState.selectedModules changes
  useEffect(() => {
    if (
      Array.isArray(filterState.selectedModules) &&
      JSON.stringify(data?.modules) !== JSON.stringify(filterState.selectedModules)
    ) {
      dispatch(setData({
        ...data,
        modules: filterState.selectedModules,
      }));
    }
  }, [filterState.selectedModules]);

  // Update Redux when filterState.selectedRegions changes
  useEffect(() => {
    if (
      Array.isArray(filterState.selectedRegions) &&
      JSON.stringify(data?.locationName) !== JSON.stringify(filterState.selectedRegions)
    ) {
      const formattedState = getFormattedState();
      dispatch(setData({
        ...data,
        locationName: filterState.selectedRegions,
        real: formattedState ? formattedState.selectedRegions : [],
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

  // Module handlers
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

  // Region handlers
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
    setCityOptions([]);
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
      setCityOptions([]);
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

  // Date Range dropdown state and ref
  const [isDateOpen, setIsDateOpen] = useState(false);
  const dateRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      // If click is inside the date picker popup, do nothing
      if (
        dateRef.current &&
        !dateRef.current.contains(event.target as Node) &&
        !(event.target as HTMLElement).closest('.date-picker-popup')
      ) {
        setIsDateOpen(false);
      }
    }
    if (isDateOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDateOpen]);

  // Redux state for date range
  const selectedDateType = data.selectedDateType || "";
  const startDate = data.startDate ? new Date(data.startDate) : null;
  const endDate = data.endDate ? new Date(data.endDate) : null;

  const handleDateTypeToggle = (dateType: string) => {
    dispatch(setData({
      ...data,
      selectedDateType: dateType
    }));
  };

  // Store dates as strings in Redux
  const handleDateRangeChange = (range: { start: Date | null; end: Date | null }) => {
    // Use 'Asia/Manila' for date format
    const formatLocal = (date: Date | null) =>
      date
        ? date.toLocaleDateString('en-CA', { timeZone: 'Asia/Manila' }) // 'YYYY-MM-DD'
        : "";

    // Store as strings in Redux
    dispatch(setData({
      ...data,
      startDate: formatLocal(range.start),
      endDate: formatLocal(range.end)
    }));
  };

  const deselectAllDates = () => {
    dispatch(setData({
      ...data,
      selectedDateType: "",
      startDate: "",
      endDate: ""
    }));
  };

  useEffect(() => {
    // Update selected islands based on selected regions
    const selectedIslandsList = groupOfIslands.filter(island => {
      const islandRegions = islandRegionMap[island] || [];
      return islandRegions.every((region: any) => filterState.selectedRegions.includes(region));
    });
    
    if (JSON.stringify(selectedIslandsList.sort()) !== JSON.stringify(selectedIslands.sort())) {
      setSelectedIslands(selectedIslandsList);
    }
  }, [filterState.selectedRegions]);

  // Update the getFormattedState function
  const getFormattedState = (): FormattedFilterState => {
    return {
      selectedModules: filterState.selectedModules,
      selectedRegions: filterState.selectedRegions.map(region => {
        const matchedRegion = regions.find(r => r.text === region);
        return matchedRegion ? matchedRegion.id : region;
      }),
      dateRange: {
        // Use the Redux state values which are already strings
        start: data.startDate || "",
        end: data.endDate || ""
      }
    };
  };

  // Function to trigger the API request
  const handleFilterClick = () => {
    // Check if we have required data
    if (!data.locationName || data.locationName.length === 0) {
      alert('Please select at least one region');
      return;
    }
    if (!data.startDate || !data.endDate) {
      alert('Please select date range');
      return;
    }
    if (!data.modules || data.modules.length === 0) {
      alert('Please select at least one module');
      return;
    }

    // Close all open dropdowns
    setIsModuleOpen(false);
    setIsRegionOpen(false);
    setIsDateOpen(false);

    // Dispatch a custom event that the Admin component can listen to
    window.dispatchEvent(new CustomEvent('triggerFilterAPI'));
  };

  // Function to cancel the API request
 

  return (
    <div className="relative bg-white border border-gray-200 rounded-md shadow-sm p-6 mb-6 z-50">
      
      {/* Title Section */}
      <div className="mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-[#2162e7]/10 rounded-lg flex items-center justify-center">
            <Monitor size={20} className="text-[#2162e7]" />
          </div>
          <h1 className="text-2xl font-bold text-[#2162e7]">eLGU Services Data Monitoring Tool</h1>
          <div className="w-8 h-8 bg-[#2162e7]/10 rounded-md flex items-center justify-center">
            <BarChart3 size={16} className="text-[#2162e7]" />
          </div>
        </div>
        <p className="text-sm text-gray-600 ml-13">Monitor and analyze eLGU service transactions across different regions </p>
      </div>
      
      <div className="relative grid grid-cols-10 lg:grid-cols-3 md:grid-cols-1 gap-2 ">
        {/* Module */}
        <div className="flex col-span-3 flex-col group" ref={moduleRef}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#2162e7]/10 rounded-md flex items-center justify-center">
              <Settings2 size={16} className="text-[#2162e7]" />
            </div>
            <label className="text-sm font-semibold text-gray-800">Module Selection</label>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsModuleOpen(!isModuleOpen)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-left flex justify-between items-center hover:border-[#2162e7] hover:bg-[#2162e7]/5 focus:outline-none focus:ring-2 focus:ring-[#2162e7]/20 focus:border-[#2162e7] transition-all duration-200 shadow-sm"
            >
              <span className="text-sm font-medium text-gray-700">
                {filterState.selectedModules.length > 0
                  ? `${filterState.selectedModules.length} module${filterState.selectedModules.length > 1 ? 's' : ''} selected`
                  : 'Select modules'}
              </span>
              <ChevronDown size={18} className={`text-gray-400 transition-all duration-300 ${isModuleOpen ? 'transform rotate-180 text-[#2162e7]' : ''}`} />
            </button>
            {isModuleOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between p-4 bg-gray-50 border-b border-gray-200">
                  <button
                    onClick={selectAllModules}
                    className="text-sm text-[#2162e7] hover:text-[#2162e7]/80 font-semibold hover:bg-[#2162e7]/10 px-3 py-1 rounded-sm transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllModules}
                    className="text-sm text-red-500 hover:text-red-600 font-semibold hover:bg-red-50 px-3 py-1 rounded-sm transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-[200px] overflow-y-auto">
                  {modules.map((module, index) => (
                    <label
                      key={`module-${index}`}
                      className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer transition-all duration-150 group"
                    >
                      <div className="relative flex items-center">
                        <input
                          type="checkbox"
                          checked={filterState.selectedModules.includes(module)}
                          onChange={() => toggleModule(module)}
                          className="opacity-0 absolute h-5 w-5 cursor-pointer"
                        />
                        <div className={`border-2 h-5 w-5 rounded-sm flex items-center justify-center transition-all duration-200 ${
                          filterState.selectedModules.includes(module)
                            ? 'bg-[#2162e7] border-[#2162e7] shadow-sm'
                            : 'border-gray-300 hover:border-[#2162e7] group-hover:bg-gray-50'
                        }`}>
                          {filterState.selectedModules.includes(module) && (
                            <Check size={12} className="text-white" />
                          )}
                        </div>
                        <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-[#2162e7]">{module}</span>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Region, Group of Islands, Province, City/Municipality */}
        <div className="flex col-span-4 flex-col group" ref={regionRef}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#2162e7]/10 rounded-md flex items-center justify-center">
              <MapPin size={16} className="text-[#2162e7]" />
            </div>
            <label className="text-sm font-semibold text-gray-800">Region Selection</label>
          </div>
          <div className="relative">
            <button
              onClick={() => setIsRegionOpen(!isRegionOpen)}
              className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-left flex justify-between items-center hover:border-[#2162e7] hover:bg-[#2162e7]/5 focus:outline-none focus:ring-2 focus:ring-[#2162e7]/20 focus:border-[#2162e7] transition-all duration-200 shadow-sm"
            >
              <span className="text-sm font-medium text-gray-700">
                {filterState.selectedRegions.length === 0
                  ? 'All Regions'
                  : `${filterState.selectedRegions.length} region${filterState.selectedRegions.length > 1 ? 's' : ''} selected`}
              </span>
              <ChevronDown size={18} className={`text-gray-400 transition-all duration-300 ${isRegionOpen ? 'transform rotate-180 text-[#2162e7]' : ''}`} />
            </button>
            {isRegionOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] animate-in slide-in-from-top-2 duration-200">
                <div className="flex justify-between p-4 bg-gray-50 border-b border-gray-200">
                  <button
                    onClick={selectAllRegions}
                    className="text-sm text-[#2162e7] hover:text-[#2162e7]/80 font-semibold hover:bg-[#2162e7]/10 px-3 py-1 rounded-sm transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={deselectAllRegions}
                    className="text-sm text-red-500 hover:text-red-600 font-semibold hover:bg-red-50 px-3 py-1 rounded-sm transition-colors"
                  >
                    Clear All
                  </button>
                </div>
                <div className="max-h-[400px] overflow-y-auto p-4">
                  {/* Group of Islands */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      
                      <label className="text-sm font-bold text-gray-800">Island Groups</label>
                    </div>
                    <div className="flex gap-6 mb-3">
                      {groupOfIslands.map(island => (
                        <label key={island} className="flex items-center gap-2 text-gray-700 text-sm font-medium hover:text-[#2162e7] cursor-pointer transition-colors">
                          <input
                            type="checkbox"
                            checked={selectedIslands.includes(island)}
                            onChange={() => toggleIsland(island)}
                            className="accent-[#2162e7] w-4 h-4 rounded-sm"
                          />
                          {island}
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* Regions */}
                  <div className="mb-4">
                    <div className="flex items-center gap-2 mb-2">
                     
                      <label className="text-sm font-bold text-gray-800">Regions</label>
                    </div>
                    <div className="grid grid-cols-4 gap-2 mb-3">
                      {regionGroups.map((col, colIdx) => (
                        <div key={colIdx} className="flex flex-col gap-2">
                          {col.map((region: any) => (
                            <label key={region} className="flex items-center gap-2 text-gray-700 text-sm hover:text-[#2162e7] cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                checked={filterState.selectedRegions.includes(region)}
                                onChange={() => toggleRegion(region)}
                                className="accent-[#2162e7] w-4 h-4 rounded-sm"
                              />
                              <span className="text-xs font-medium">{region}</span> 
                            </label>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Province */}
                  <div className="flex flex-col mb-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings2 size={14} className="text-[#2162e7]" />
                      <label className="text-sm font-bold text-gray-800">Province</label>
                    </div>
                    <Select
                      options={provinceOptions}
                      value={selectedProvinces}
                      onChange={handleProvinceChange}
                      placeholder="Select province(s)"
                      isClearable
                      isMulti
                      isDisabled={provinceOptions.length === 0}
                      classNamePrefix="react-select"
                      className="text-sm"
                      menuPortalTarget={document.body}
                      styles={{
                        menuPortal: base => ({ ...base, zIndex: 99999 }),
                        menu: base => ({ ...base, zIndex: 99999 }),
                        control: (base, state) => ({
                          ...base,
                          borderColor: state.isFocused ? '#2162e7' : '#d1d5db',
                          boxShadow: state.isFocused ? '0 0 0 3px rgba(33, 98, 231, 0.1)' : 'none',
                          backgroundColor: '#f9fafb',
                          '&:hover': {
                            borderColor: '#2162e7'
                          }
                        })
                      }}
                    />
                  </div>
                  {/* City/Municipality (multi) */}
                  <div className="relative z-50">
                    <div className="flex items-center gap-2 mb-2">
                      <Settings2 size={14} className="text-[#2162e7]" />
                      <label className="text-sm font-bold text-gray-800">City/Municipality</label>
                    </div>
                    <div className="relative">
                      <Select
                        options={cityOptions}
                        value={selectedCityOptions}
                        onChange={handleCityChange}
                        placeholder="Select city/municipality"
                        isClearable
                        isMulti
                        isDisabled={cityOptions.length === 0}
                        classNamePrefix="react-select"
                        className="text-sm"
                        menuPortalTarget={document.body}
                        styles={{
                          menuPortal: base => ({ ...base, zIndex: 99999 }),
                          menu: base => ({ ...base, zIndex: 99999 }),
                          control: (base, state) => ({
                            ...base,
                            borderColor: state.isFocused ? '#2162e7' : '#d1d5db',
                            boxShadow: state.isFocused ? '0 0 0 3px rgba(33, 98, 231, 0.1)' : 'none',
                            backgroundColor: '#f9fafb',
                            '&:hover': {
                              borderColor: '#2162e7'
                            }
                          })
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
        <div className="flex col-span-2 flex-col group" ref={dateRef}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-[#2162e7]/10 rounded-md flex items-center justify-center">
              <Calendar size={16} className="text-[#2162e7]" />
            </div>
            <label className="text-sm font-semibold text-gray-800">Date Range</label>
          </div>
          <div className="relative w-full">
            <button
              type="button"
              className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-left flex justify-between items-center hover:border-[#2162e7] hover:bg-[#2162e7]/5 focus:outline-none focus:ring-2 focus:ring-[#2162e7]/20 focus:border-[#2162e7] transition-all duration-200 shadow-sm"
              onClick={() => setIsDateOpen((open) => !open)}
            >
              <span className="text-sm font-medium text-gray-700">
                {selectedDateType ? selectedDateType : "Select date type"}
              </span>
              <ChevronDown size={18} className={`text-gray-400 transition-all duration-300 ${isDateOpen ? "rotate-180 text-[#2162e7]" : ""}`} />
            </button>
            {isDateOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] animate-in slide-in-from-top-2 duration-200">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                  <span className="text-sm font-bold text-gray-800">Date Range</span>
                  <button
                    className="text-sm text-red-500 hover:text-red-600 font-semibold hover:bg-red-50 px-3 py-1 rounded-sm transition-colors focus:outline-none"
                    onClick={deselectAllDates}
                    type="button"
                  >
                    Clear
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex flex-col gap-3 mb-4">
                    {dateTypes.map((type) => (
                      <label key={type} className="flex items-center gap-3 text-sm cursor-pointer text-gray-700 hover:text-[#2162e7] transition-colors group">
                        <input
                          type="radio"
                          checked={selectedDateType === type}
                          onChange={() => handleDateTypeToggle(type)}
                          className="accent-[#2162e7] w-4 h-4"
                          name="date-type"
                        />
                        <span className="font-medium group-hover:font-semibold">{type}</span>
                      </label>
                    ))}
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    {!selectedDateType && (
                      <div className="flex items-center justify-center py-6">
                        <span className="text-sm text-gray-500 text-center">
                          Please select day, month, or year
                        </span>
                      </div>
                    )}
                    {selectedDateType === 'Day' && (
                      <DateRangeDay 
                        value={{ start: startDate, end: endDate }} 
                        onChange={handleDateRangeChange}
                        onApply={() => setIsDateOpen(false)}
                      />
                    )}
                    {selectedDateType === 'Month' && (
                      <DateRangeMonth 
                        value={{ start: startDate, end: endDate }} 
                        onChange={handleDateRangeChange}
                        onApply={() => setIsDateOpen(false)}
                      />
                    )}
                    {selectedDateType === 'Year' && (
                      <DateRangeYear 
                        value={{ start: startDate, end: endDate }} 
                        onChange={handleDateRangeChange}
                        onApply={() => setIsDateOpen(false)}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filter Button Section - Inline with filters */}
        <div className="flex flex-col justify-end">
          
          <div className="flex flex-col gap-3">
            
            <button
              onClick={handleFilterClick}
              disabled={isLoading}
              className={`flex items-center justify-center gap-2 px-6 text-sm py-3 font-semibold rounded-md transition-all duration-200 ${
                isLoading
                  ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                  : 'bg-[#2162e7] text-[#fcfcfc] border border-[#2162e7] hover:bg-[#1d56d1] hover:border-[#1d56d1] focus:outline-none focus:ring-2 focus:ring-[#2162e7]/20 shadow-sm'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Filter size={16} />
                  Run
                </>
              )}
            </button>
           
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
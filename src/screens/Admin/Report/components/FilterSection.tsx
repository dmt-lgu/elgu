import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Check, ChevronDown } from 'lucide-react';
import DateRangeDay from './DateRangeDay';
import DateRangeMonth from './DateRangeMonth';
import DateRangeYear from './DateRangeYear';
import {
  modules,
  groupOfIslands,
  dateRange,
  regionMapping,
  islandRegionMap,
  regionProvinceMap,
} from '../utils/mockData';
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
import { updateFilterField } from '../../../../redux/reportFilterSlice';
import { AppDispatch } from '@/redux/store';
import Swal from 'sweetalert2';

// --- Utility Functions ---
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

interface FilterSectionProps {
  onSearch: (filters: any) => void;
  onDownload?: (type: "pdf" | "excel", permitTypes?: ("business" | "working" | "barangay")[]) => void;
  onReset?: () => void;
  hasTableData?: boolean;
  loading?: boolean;
  onCancel?: () => void;
  hasSearched?: boolean;
  isActive?: boolean;
  
}



const FilterSection: React.FC<FilterSectionProps> = ({
  onSearch,
  onDownload,
  onReset,
  hasTableData = false,
  loading = false,
  onCancel,
  hasSearched = false,
  isActive = true, 
}) => {
  // Redux
  const dispatch = useDispatch<AppDispatch>();
  const filterState = useSelector((state: any) => state.reportFilter);

  // --- Local UI state ---
  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);

  // --- Use Redux for selectedIslands ---
  const selectedIslands = filterState.selectedIslands || [];

  const [selectedProvinceOptions, setSelectedProvinceOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedCityOptions, setSelectedCityOptions] = useState<{ value: string; label: string; province?: string }[]>([]);

  const moduleRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
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

  // --- Province Logic ---
  const selectAllProvinces = () => {
    setSelectedProvinceOptions([...filteredProvinceOptions]);
    dispatch(updateFilterField({ key: 'selectedProvinces', value: filteredProvinceOptions.map(opt => opt.value) }));
    setSelectedCityOptions([]); // Reset cities when provinces change
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
  };

  const deselectAllProvinces = () => {
    setSelectedProvinceOptions([]);
    dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
    setSelectedCityOptions([]);
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
  };

  // --- City Logic ---
  const selectAllCities = () => {
    const allCityOptions = getCityOptions(selectedProvinceOptions.map(opt => opt.value), cities);
    setSelectedCityOptions(allCityOptions);
    dispatch(updateFilterField({ key: 'selectedCities', value: allCityOptions.map(opt => opt.value) }));
  };

  const deselectAllCities = () => {
    setSelectedCityOptions([]);
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
  };

  const isSearchDisabled =
    filterState.selectedRegions.length === 0 ||
    filterState.selectedModules.length === 0 ||
    !filterState.dateRange.start ||
    !filterState.dateRange.end;

  const isDownloadDisabled = isSearchDisabled || !hasTableData;

  // --- Download Handler with Permit Choice ---
  const handleDownloadWithPermitChoice = async (type: "pdf" | "excel") => {
  if (isDownloadDisabled || loading) return;

  // Dynamically build checkboxes based on selected modules
  const selectedModules = filterState.selectedModules || [];
  const checkboxOptions: { id: string; value: string; label: string }[] = [];
  if (selectedModules.includes("Business Permit")) {
    checkboxOptions.push({ id: "swal-bp", value: "business", label: "Business Permit" });
  }
  if (selectedModules.includes("Working Permit")) {
    checkboxOptions.push({ id: "swal-wp", value: "working", label: "Working Permit" });
  }
  if (selectedModules.includes("Barangay Clearance")) {
    checkboxOptions.push({ id: "swal-bc", value: "barangay", label: "Barangay Clearance" });
  }

  if (checkboxOptions.length === 0) return;

  // If only one permit type, download automatically
  if (checkboxOptions.length === 1) {
    if (onDownload) {
      onDownload(type, [checkboxOptions[0].value as "business" | "working" | "barangay"]);
    }
    return;
  }

  // Build HTML for checkboxes with Select All
  const html = `
    <div style="display: flex; flex-direction: column; align-items: flex-start;">
      <label style="margin-bottom: 8px; font-weight: bold;">
        <input type="checkbox" id="swal-select-all" />
        Select All
      </label>
      ${checkboxOptions
        .map(
          (opt) => `
        <label style="margin-bottom: 8px;">
          <input type="checkbox" id="${opt.id}" value="${opt.value}" />
          ${opt.label}
        </label>
      `
        )
        .join("")}
    </div>
  `;

  await Swal.fire({
    title: "Choose Permit Type(s)",
    html,
    focusConfirm: false,
    didOpen: () => {
      // --- Select All logic ---
      const selectAllBox = document.getElementById("swal-select-all") as HTMLInputElement;
      const checkboxes = checkboxOptions.map(opt => document.getElementById(opt.id) as HTMLInputElement);

      // Check all by default when modal opens
      checkboxes.forEach(cb => { cb.checked = true; });
      selectAllBox.checked = true;

      // When Select All is clicked, check/uncheck all
      selectAllBox.addEventListener("change", () => {
        checkboxes.forEach(cb => {
          cb.checked = selectAllBox.checked;
        });
      });

      // When any individual checkbox is changed, update Select All
      checkboxes.forEach(cb => {
        cb.addEventListener("change", () => {
          const allChecked = checkboxes.every(c => c.checked);
          selectAllBox.checked = allChecked;
        });
      });
    },
    preConfirm: () => {
      // Only checked permit types will be included
      const checked = checkboxOptions.filter(
        (opt) => (document.getElementById(opt.id) as HTMLInputElement)?.checked
      );
      if (checked.length === 0) {
        Swal.showValidationMessage("Please select at least one permit type!");
        return false;
      }
      // Only return checked permit types
      return checked.map((opt) => opt.value);
    },

    confirmButtonText: "Download",
    showCancelButton: true,
    cancelButtonText: "Cancel",
    customClass: {
      popup: "swal2-popup-custom-width",
    },
    confirmButtonColor: "#3b82f6",
    cancelButtonColor: "#ef4444",
  }).then((result) => {
    // Only checked permit types are passed to onDownload
    if (result.isConfirmed && Array.isArray(result.value)) {
      if (onDownload) {
        onDownload(type, result.value as ("business" | "working" | "barangay")[]);
      }
    }
  });
};

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

const handleDateRangeChange = (range: { start: string | null; end: string | null }) => {
  dispatch(
    updateFilterField({
      key: 'dateRange',
      value: {
        start: range.start,
        end: range.end,
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
      newIslands = selectedIslands.filter((i: string) => i !== island);
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
    const allRegionInternalKeys = Object.values(regionMapping);
    const allRegionsSelected =
      filterState.selectedRegions.length === allRegionInternalKeys.length &&
      allRegionInternalKeys.every(key => filterState.selectedRegions.includes(key));

    onSearch({
      selectedRegions: allRegionsSelected ? allRegionInternalKeys : filterState.selectedRegions,
      selectedProvinces: filterState.selectedProvinces,
      selectedCities: filterState.selectedCities,
      dateRange: filterState.dateRange,
      selectedDateType: filterState.selectedDateType,
      selectedIslands: filterState.selectedIslands,
      allRegionsSelected,
    });
  };

  const handleReset = () => {
    setSelectedCityOptions([]);
    setSelectedProvinceOptions([]);
    dispatch(updateFilterField({ key: 'selectedRegions', value: [] }));
    dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
    dispatch(updateFilterField({ key: 'selectedDateType', value: "" }));
    dispatch(updateFilterField({ key: 'selectedIslands', value: [] }));
    dispatch(updateFilterField({ key: 'selectedModules', value: [] }));
    if (onReset) {
      onReset();
    }
    setIsDateOpen(false);
    setIsRegionOpen(false);
  };

  useEffect(() => {
    setSelectedProvinceOptions(
      filteredProvinceOptions.filter(opt =>
        filterState.selectedProvinces?.includes(opt.value)
      )
    );
    setSelectedCityOptions(
      getCityOptions(filterState.selectedProvinces || [], cities).filter(opt =>
        (filterState.selectedCities || []).includes(opt.value)
      )
    );
  }, [filterState.selectedProvinces, filterState.selectedCities, filteredProvinceOptions, cities]);

  return (
    <div className="grid grid-cols-4 md:grid-cols-1 gap-4 mb-6">
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
                    className="flex items-center px-3 py-2 hover:bg-blue-200 cursor-pointer"
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
                          : 'border-gray-400'
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
                  <div className="flex justify-between mb-1">
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:text-blue-800"
                      onClick={selectAllProvinces}
                      disabled={filteredProvinceOptions.length === 0}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:text-red-800"
                      onClick={deselectAllProvinces}
                      disabled={filteredProvinceOptions.length === 0}
                    >
                      Deselect All
                    </button>
                  </div>
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
                  <div className="flex justify-between mb-1">
                    <button
                      type="button"
                      className="text-xs text-blue-600 hover:text-blue-800"
                      onClick={selectAllCities}
                      disabled={selectedProvinceOptions.length === 0}
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      className="text-xs text-red-400 hover:text-red-800"
                      onClick={deselectAllCities}
                      disabled={selectedProvinceOptions.length === 0}
                    >
                      Deselect All
                    </button>
                  </div>
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
        <div className="relative w-full ">
          <button
            type="button"
            className="w-full bg-card border border-border rounded-md py-2 px-3 text-left flex justify-between items-center focus:outline-none focus:ring-2 focus:ring-blue-500"
            onClick={() => setIsDateOpen((open) => !open)}
          >
            <span className="text-sm text-secondary-foreground">
              {selectedDateType ? selectedDateType : "Select date type"}
            </span>
            <ChevronDown size={18} className={`text-secondary-foreground transition-transform ${isDateOpen ? "rotate-180" : ""}`} />
          </button>
          {isDateOpen && (
            <div className="absolute w-96 left-0 bg-white right-0 mt-2 border border-border rounded-md shadow-lg z-20 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[15px] font-semibold">Date Range</span>
                <button
                  className="text-red-400 text-[15px] font-semibold hover:text-red-600 focus:outline-none"
                  onClick={deselectAllDates}
                  type="button"
                >
                  Deselect
                </button>
              </div>
              
              <div className="flex flex-col gap-2 mb-3">
                {dateRange.map((type) => (
                  <label key={type} className="flex items-center gap-2 text-[15px] cursor-pointer">
                    <input
                      type="radio"
                      checked={selectedDateType === type}
                      onChange={() => handleDateTypeToggle(type)}
                      className="accent-blue-600"
                      name="date-type"
                    />
                    {type}
                  </label>
                ))}
              </div>
              <div>
                {!selectedDateType && (
                  <span className="text-sm text-muted-foreground text-center">
                    Please select day, month, or year
                  </span>
                )}
                {selectedDateType === 'Day' && (
                  <DateRangeDay
                    value={filterState.dateRange}
                    onChange={handleDateRangeChange}
                  />
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
          )}
        </div>
      </div>

      {/* Action button */}
      <div className="flex flex-col ">
        <div className="grid grid-cols-3 gap-2 mt-[25px] md:mt-0">
          <Button
            className="bg-[#CB371C] hover:bg-[#CB371C] h-9 text-[12px] text-white"
            onClick={handleReset}
            disabled={loading || !isActive}
          >
            Reset
          </Button>
          {/* Search/Cancel Button */}
          {loading && hasSearched && isActive ? (
            <Button
              className="bg-red-500 hover:bg-red-600 h-9 text-[12px] text-white"
              onClick={onCancel}
              disabled={!loading || !isActive}
              type="button"
            >
              Cancel
            </Button>
          ) : (
            <Button
              className="bg-primary h-9 text-[12px] text-white"
              onClick={handleSearchClick}
              disabled={isSearchDisabled || loading || !isActive}
            >
              Search
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger>
              <Button
                disabled={isDownloadDisabled || loading || !isActive}
                className="bg-[#8411DD] hover:bg-[#8411DD] text-white max-w-full text-[10px] h-9 md:w-full"
              >
                Download
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>Download Options</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => isActive && handleDownloadWithPermitChoice("pdf")}
                className={`cursor-pointer hover:bg-primary hover:text-white ${isDownloadDisabled || loading || !isActive ? 'opacity-50 pointer-events-none' : ''}`}
                disabled={isDownloadDisabled || loading || !isActive}
              >
                PDF
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => isActive && handleDownloadWithPermitChoice("excel")}
                className={`cursor-pointer ${isDownloadDisabled || loading || !isActive ? 'opacity-50 pointer-events-none' : ''}`}
                disabled={isDownloadDisabled || loading || !isActive}
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
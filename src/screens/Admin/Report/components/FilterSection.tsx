import React, { useState, useRef, useEffect, useMemo } from 'react';
import Select from 'react-select';
import { Check, ChevronDown, Loader2Icon } from 'lucide-react';
import DateRangeDay from './DateRangeDay';
import DateRangeMonth from './DateRangeMonth';
import DateRangeYear from './DateRangeYear';
import './css/style.css'; // Import the stylesheet
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
import { useSelector, useDispatch } from 'react-redux';
import { updateFilterField } from '../../../../redux/reportFilterSlice';
import { AppDispatch } from '@/redux/store';
import Swal from 'sweetalert2';

// --- (Utility Functions are unchanged) ---
function displayCityName(name: string) {
  if (/^City of /i.test(name.trim())) return name;
  const match = name.match(/^(.+?)\s*City$/i);
  if (match) return `City of ${match[1].trim()}`;
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
    axios.get(`${import.meta.env.VITE_URL}/api/bp/municipality-list`).then(res => {
      if (mounted) setCities(normalizeApiCities(res.data));
    }).catch(err => {
      if (mounted) setError(err.message || 'Failed to fetch cities');
    }).finally(() => {
      if (mounted) setLoading(false);
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
    axios.get(`${import.meta.env.VITE_URL}/api/bp/municipality-list`).then(res => {
      if (mounted) setProvinces(Object.keys(res.data));
    }).catch(err => {
      if (mounted) setError(err.message || 'Failed to fetch provinces');
    }).finally(() => {
      if (mounted) setLoading(false);
    });
    return () => { mounted = false; };
  }, []);
  return { provinces, loading, error };
}
const getCityOptions = (selectedProvinces: string[], cities: Record<string, string[]>) => {
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
  onDownload?: (type: "pdf" | "excel", permitTypes?: ("business" | "working" | "barangay" | "building" | "certificate")[]) => void;
  onReset?: () => void;
  hasTableData?: boolean;
  loading?: boolean;
  onCancel?: () => void;
  hasSearched?: boolean;
  isActive?: boolean;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  onSearch, onDownload, onReset, hasTableData = false, loading = false,
  onCancel, hasSearched = false, isActive = true,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const filterState = useSelector((state: any) => state.reportFilter);

  const [isDateOpen, setIsDateOpen] = useState(false);
  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);

  const selectedIslands = filterState.selectedIslands || [];
  const [selectedProvinceOptions, setSelectedProvinceOptions] = useState<{ value: string; label: string }[]>([]);
  const [selectedCityOptions, setSelectedCityOptions] = useState<{ value: string; label: string; province?: string }[]>([]);

  const moduleRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  const { cities, loading: citiesLoading, error: citiesError } = useCities();
  const { provinces } = useProvinces();

  const provinceOptions = useMemo(() => provinces.map(p => ({ value: p, label: p })), [provinces]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moduleRef.current && !moduleRef.current.contains(event.target as Node)) setIsModuleOpen(false);
      if (regionRef.current && !regionRef.current.contains(event.target as Node)) setIsRegionOpen(false);
      if (dateRef.current && !dateRef.current.contains(event.target as Node)) setIsDateOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- (All logic functions are unchanged) ---
  const toggleModule = (module: string) => {
    const newModules = filterState.selectedModules.includes(module)
      ? filterState.selectedModules.filter((m: string) => m !== module)
      : [...filterState.selectedModules, module];
    dispatch(updateFilterField({ key: 'selectedModules', value: newModules }));
    onSearch({ ...filterState, selectedModules: newModules, skipApi: true });
  };
  const selectAllModules = () => {
    dispatch(updateFilterField({ key: 'selectedModules', value: [...modules] }));
    onSearch({ ...filterState, selectedModules: [...modules], skipApi: true });
  };
  const deselectAllModules = () => {
    dispatch(updateFilterField({ key: 'selectedModules', value: [] }));
    onSearch({ ...filterState, selectedModules: [], skipApi: true });
  };
  const [elapsedSec, setElapsedSec] = useState(0);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    const shouldRun = loading && hasSearched && isActive;
    if (shouldRun) {
      if (timerRef.current == null) {
        const start = Date.now();
        setElapsedSec(0);
        timerRef.current = window.setInterval(() => setElapsedSec(Math.floor((Date.now() - start) / 1000)), 1000);
      }
    } else {
      if (timerRef.current != null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setElapsedSec(0);
    }
    return () => {
      if (timerRef.current != null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [loading, hasSearched, isActive]);
  const elapsedLabel = useMemo(() => {
    const mm = String(Math.floor(elapsedSec / 60)).padStart(2, "0");
    const ss = String(elapsedSec % 60).padStart(2, "0");
    return `${mm}:${ss}`;
  }, [elapsedSec]);
  const handleCancelClick = () => {
    if (timerRef.current != null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsedSec(0);
    onCancel?.();
  };
  const selectAllProvinces = () => {
    setSelectedProvinceOptions([...filteredProvinceOptions]);
    dispatch(updateFilterField({ key: 'selectedProvinces', value: filteredProvinceOptions.map(opt => opt.value) }));
    setSelectedCityOptions([]); 
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    onSearch({ ...filterState, selectedProvinces: filteredProvinceOptions.map(opt => opt.value), selectedCities: [], skipApi: true });
  };
  const deselectAllProvinces = () => {
    setSelectedProvinceOptions([]);
    dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
    setSelectedCityOptions([]);
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    onSearch({ ...filterState, selectedProvinces: [], selectedCities: [], skipApi: true });
  };
  const selectAllCities = () => {
    const allCityOptions = getCityOptions(selectedProvinceOptions.map(opt => opt.value), cities);
    setSelectedCityOptions(allCityOptions);
    dispatch(updateFilterField({ key: 'selectedCities', value: allCityOptions.map(opt => opt.value) }));
    onSearch({ ...filterState, selectedCities: allCityOptions.map(opt => opt.value), skipApi: true });
  };
  const deselectAllCities = () => {
    setSelectedCityOptions([]);
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    onSearch({ ...filterState, selectedCities: [], skipApi: true });
  };
  const isSearchDisabled = filterState.selectedRegions.length === 0 || filterState.selectedModules.length === 0 || !filterState.dateRange.start || !filterState.dateRange.end;
  const isDownloadDisabled = isSearchDisabled || !hasTableData;

  const handleDownloadWithPermitChoice = async (type: "pdf" | "excel") => {
    if (isDownloadDisabled || loading) return;
    const selectedModules = filterState.selectedModules || [];
    const allPermitOptions = [
        { id: "swal-business", value: "business", label: "Business Permit", moduleName: "Business Permit", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.25m11.25 0H21.75m-16.5 0a1.125 1.125 0 01-1.125-1.125V6.75A1.125 1.125 0 012.25 5.625h12a1.125 1.125 0 011.125 1.125v13.25A1.125 1.125 0 0114.25 21h-1.5m-9-1.498a1.125 1.125 0 011.125-1.125h2.25a1.125 1.125 0 011.125 1.125v1.126A1.125 1.125 0 018.25 21H6.75a1.125 1.125 0 01-1.125-1.125v-1.126z" /></svg>` },
        { id: "swal-working", value: "working", label: "Working Permit", moduleName: "Working Permit", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>` },
        { id: "swal-barangay", value: "barangay", label: "Barangay Clearance", moduleName: "Barangay Clearance", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>` },
        { id: "swal-building", value: "building", label: "Building Permit", moduleName: "Building Permit", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" /></svg>` },
        { id: "swal-occupancy", value: "certificate", label: "Certificate of Occupancy", moduleName: "Certificate of Occupancy", icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>` },
    ];
    const checkboxOptions = allPermitOptions.filter(opt => selectedModules.includes(opt.moduleName));
    if (checkboxOptions.length === 0) return;
    if (checkboxOptions.length === 1) {
      if (onDownload) onDownload(type, [checkboxOptions[0].value as any]);
      return;
    }
    const checkmarkSVG = `<svg viewBox="0 0 16 16" fill="currentColor"><path d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"/></svg>`;
    const html = `
      <div class="swal-checkbox-container">
        <label for="swal-select-all" class="swal-checkbox-row" id="swal-select-all-row">
          <input type="checkbox" id="swal-select-all">
          <span class="custom-checkbox">${checkmarkSVG}</span>
          <span class="swal-checkbox-label">Select All</span>
        </label>
        ${checkboxOptions.map(opt => `
          <label for="${opt.id}" class="swal-checkbox-row">
            <input type="checkbox" id="${opt.id}" value="${opt.value}">
            <span class="custom-checkbox">${checkmarkSVG}</span>
            <span class="swal-checkbox-icon">${opt.icon}</span>
            <span class="swal-checkbox-label">${opt.label}</span>
          </label>
        `).join('')}
      </div>
    `;
    await Swal.fire({
      title: `<div class="swal-custom-title">Choose Permit Type(s)</div>`,
      html,
      focusConfirm: false,
      didOpen: () => {
        const selectAllBox = document.getElementById("swal-select-all") as HTMLInputElement;
        const checkboxes = checkboxOptions.map(opt => document.getElementById(opt.id) as HTMLInputElement);
        checkboxes.forEach(cb => { cb.checked = true; });
        selectAllBox.checked = true;
        selectAllBox.addEventListener("change", () => checkboxes.forEach(cb => { cb.checked = selectAllBox.checked; }));
        checkboxes.forEach(cb => cb.addEventListener("change", () => { selectAllBox.checked = checkboxes.every(c => c.checked); }));
      },
      preConfirm: () => {
        const checked = checkboxOptions.filter(opt => (document.getElementById(opt.id) as HTMLInputElement)?.checked);
        if (checked.length === 0) {
          Swal.showValidationMessage("Please select at least one permit type!");
          return false;
        }
        return checked.map((opt) => opt.value);
      },
      confirmButtonText: "Download",
      showCancelButton: true,
      cancelButtonText: "Cancel",
      customClass: { 
        popup: "swal-wide",
        confirmButton: 'swal-button swal-button-confirm',
        cancelButton: 'swal-button swal-button-cancel',
      },
    }).then((result) => {
      if (result.isConfirmed && Array.isArray(result.value)) {
        if (onDownload) onDownload(type, result.value as any);
      }
    });
  };
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
    dispatch(updateFilterField({ key: 'dateRange', value: { start: range.start, end: range.end } }));
  };
  const getProvincesFromRegions = (regions: string[]) => {
    const provs = regions.flatMap(region => (regionProvinceMap as Record<string, string[]>)[region] || []);
    return Array.from(new Set(provs));
  };
  const filteredProvinceOptions = useMemo(() => provinceOptions.filter(opt => getProvincesFromRegions(filterState.selectedRegions).includes(opt.value)), [provinceOptions, filterState.selectedRegions]);
  const toggleIsland = (island: string) => {
    const newIslands = selectedIslands.includes(island) ? selectedIslands.filter((i: string) => i !== island) : [...selectedIslands, island];
    const regionCodes = newIslands.flatMap((isle:any) => islandRegionMap[isle] || []);
    const internalKeys = regionCodes.map((code:any) => regionMapping[code]).filter(Boolean);
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
    const newRegions = filterState.selectedRegions.includes(region) ? filterState.selectedRegions.filter((r: string) => r !== region) : [...filterState.selectedRegions, region];
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
    const provinceValues = (options || []).map((opt: any) => opt.value);
    dispatch(updateFilterField({ key: 'selectedProvinces', value: provinceValues }));
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    onSearch({ ...filterState, selectedProvinces: provinceValues, selectedCities: [], skipApi: true });
  };
  const handleCityChange = (options: any) => {
    setSelectedCityOptions(options || []);
    const cityValues = (options || []).map((opt: any) => opt.value);
    dispatch(updateFilterField({ key: 'selectedCities', value: cityValues }));
    onSearch({ ...filterState, selectedCities: cityValues, skipApi: true });
  };
  const selectedDateType = filterState.selectedDateType || "";
  const deselectAllDates = () => {
    dispatch(updateFilterField({ key: 'selectedDateType', value: "" }));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
  };
  const handleDateTypeToggle = (dateType: string) => {
    dispatch(updateFilterField({ key: 'selectedDateType', value: dateType }));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
  };
  const handleSearchClick = () => {
    const allRegionInternalKeys = Object.values(regionMapping);
    const allRegionsSelected = filterState.selectedRegions.length === allRegionInternalKeys.length && allRegionInternalKeys.every(key => filterState.selectedRegions.includes(key));
    onSearch({
      selectedRegions: allRegionsSelected ? allRegionInternalKeys : filterState.selectedRegions,
      selectedProvinces: filterState.selectedProvinces,
      selectedCities: filterState.selectedCities,
      dateRange: filterState.dateRange,
      selectedDateType: filterState.selectedDateType,
      selectedIslands: filterState.selectedIslands,
      selectedModules: filterState.selectedModules,
      allRegionsSelected,
    });
    setIsModuleOpen(false);
    setIsRegionOpen(false);
    setIsDateOpen(false);
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
    if (onReset) onReset();
    setIsDateOpen(false);
    setIsRegionOpen(false);
    setIsModuleOpen(false);
  };
  useEffect(() => {
    setSelectedProvinceOptions(filteredProvinceOptions.filter(opt => filterState.selectedProvinces?.includes(opt.value)));
    setSelectedCityOptions(getCityOptions(filterState.selectedProvinces || [], cities).filter(opt => (filterState.selectedCities || []).includes(opt.value)));
  }, [filterState.selectedProvinces, filterState.selectedCities, filteredProvinceOptions, cities]);

  return (
    <div className="grid grid-cols-4 md:grid-cols-1 gap-4 mb-6">
      <div className="filter-group" ref={moduleRef}>
        <label className="filter-label">Module</label>
        <div className="relative">
          <button onClick={() => setIsModuleOpen(!isModuleOpen)} className={`filter-button ${isModuleOpen && 'filter-button-active'}`}>
            <span className="filter-button-value">{filterState.selectedModules.length > 0 ? `${filterState.selectedModules.length} selected` : 'Select modules'}</span>
            <ChevronDown size={18} className={`filter-chevron ${isModuleOpen && 'filter-chevron-open'}`} />
          </button>
          {isModuleOpen && (
            <div className="filter-dropdown w-full"> 
              <div className="filter-dropdown-header">
                <button onClick={selectAllModules} className="filter-link-button select-all">Select All</button>
                <button onClick={deselectAllModules} className="filter-link-button deselect-all">Deselect All</button>
              </div>
              <div className="filter-dropdown-body max-h-[200px]">
                {modules.map((module) => (
                  <label key={module} className="custom-checkbox-label">
                    <input type="checkbox" className="hidden" checked={filterState.selectedModules.includes(module)} onChange={() => toggleModule(module)} />
                    <span className="custom-checkbox"><Check size={12}/></span>
                    <span>{module}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="filter-group" ref={regionRef}>
        <label className="filter-label">Region</label>
        <div className="relative">
          <button onClick={() => setIsRegionOpen(!isRegionOpen)} className={`filter-button ${isRegionOpen && 'filter-button-active'}`}>
            <span className="filter-button-value">{filterState.selectedRegions.length === 0 ? 'All Regions' : `${filterState.selectedRegions.length} selected`}</span>
            <ChevronDown size={18} className={`filter-chevron ${isRegionOpen && 'filter-chevron-open'}`} />
          </button>
          {isRegionOpen && (
            <div className="filter-dropdown">
              <div className="filter-dropdown-header">
                <button onClick={selectAllRegions} className="filter-link-button select-all">Select All</button>
                <button onClick={deselectAllRegions} className="filter-link-button deselect-all">Deselect All</button>
              </div>
              <div className="filter-dropdown-body">
                <div className="mb-2">
                  <h4 className="filter-dropdown-title">Group of Islands</h4>
                  <div className="flex gap-2"> 
                    {groupOfIslands.map(island => (
                      <label key={island} className="custom-checkbox-label">
                        <input type="checkbox" className="hidden" checked={selectedIslands.includes(island)} onChange={() => toggleIsland(island)} />
                        <span className="custom-checkbox"><Check size={12}/></span>
                        {island}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <h4 className="filter-dropdown-title">Regions</h4>
                  <div className="region-grid">
                    {Object.entries(regionMapping).map(([regionCode, internalKey]) => (
                      <label key={regionCode} className="custom-checkbox-label break-inside-avoid">
                        <input type="checkbox" className="hidden" checked={filterState.selectedRegions.includes(internalKey)} onChange={() => toggleRegion(internalKey)} />
                        <span className="custom-checkbox"><Check size={12}/></span>
                        <span className="text-xs">{regionCode}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="flex justify-between items-center mb-1"><h4 className="filter-dropdown-title">Province</h4>
                    <div className="flex gap-3">
                      <button type="button" className="filter-link-button select-all" onClick={selectAllProvinces} disabled={filteredProvinceOptions.length === 0}>Select All</button>
                    <button type="button" className="filter-link-button deselect-all" onClick={deselectAllProvinces}>Deselect</button>
                  </div>
                  </div>
                  <Select options={filteredProvinceOptions} value={selectedProvinceOptions} onChange={handleProvinceChange} placeholder="Select province(s)" isMulti isDisabled={filterState.selectedRegions.length === 0} className="react-select-container" classNamePrefix="react-select" menuPortalTarget={document.body} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="filter-dropdown-title">City/Municipality</h4>
                    <div className="flex gap-3">
                      <button type="button" className="filter-link-button select-all" onClick={selectAllCities} disabled={selectedProvinceOptions.length === 0}>Select All</button><button type="button" className="filter-link-button deselect-all" onClick={deselectAllCities}>Deselect</button></div></div>
                   {citiesLoading ? <div className="text-xs text-slate-400 p-2">Loading cities...</div>
                    : citiesError ? <div className="text-xs text-red-500 p-2">Failed to load cities</div>
                    : <Select options={getCityOptions(selectedProvinceOptions.map(opt => opt.value), cities)} value={selectedCityOptions} onChange={handleCityChange} placeholder="Select city/municipality" isMulti isDisabled={selectedProvinceOptions.length === 0} className="react-select-container" classNamePrefix="react-select" menuPortalTarget={document.body} />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="filter-group" ref={dateRef}>
        <label className="filter-label">Date Range</label>
        <div className="relative">
          <button type="button" className={`filter-button ${isDateOpen && 'filter-button-active'}`} onClick={() => setIsDateOpen(o => !o)}>
            <span className="filter-button-value">{selectedDateType ? selectedDateType : "Select date type"}</span>
            <ChevronDown size={18} className={`filter-chevron ${isDateOpen && 'filter-chevron-open'}`} />
          </button>
          {isDateOpen && (
            <div className="filter-dropdown w-[360px]">
              <div className="filter-dropdown-header">
                <h3 className="font-semibold text-slate-700">Select Date Type</h3>
                <button className="filter-link-button deselect-all" onClick={deselectAllDates} type="button">Deselect</button>
              </div>
              <div className="filter-dropdown-body">
                <div className="flex flex-col gap-1 mb-4">
                  {dateRange.map((type) => (
                    <label key={type} className="custom-radio-label">
                      <input type="radio" className="hidden" checked={selectedDateType === type} onChange={() => handleDateTypeToggle(type)} name="date-type" />
                      <span className="custom-radio"></span>
                      <span>{type}</span>
                    </label>
                  ))}
                </div>
                <div className="border-t border-slate-100 pt-3">
                  {!selectedDateType && <div className="text-sm text-slate-400 text-center p-4">Please select a date type above.</div>}
                  {selectedDateType === 'Day' && <DateRangeDay value={filterState.dateRange} onChange={handleDateRangeChange} />}
                  {selectedDateType === 'Month' && <DateRangeMonth value={filterState.dateRange} onChange={handleDateRangeChange} />}
                  {selectedDateType === 'Year' && <DateRangeYear value={filterState.dateRange} onChange={handleDateRangeChange} />}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="filter-group justify-end">
        <div className="grid grid-cols-3 gap-2 mt-4">
          <Button className="bg-red-500 hover:bg-red-600 h-10 text-white font-semibold text-xs" onClick={handleReset} disabled={loading || !isActive}>Reset</Button>
          {loading && hasSearched && isActive ? (
            <Button className="bg-red-500 hover:bg-red-600 h-10 text-xs text-white col-span-2" onClick={handleCancelClick} disabled={!loading || !isActive}>
              <Loader2Icon className="inline w-4 h-4 animate-spin mr-1" />
              Cancel ({elapsedLabel})
            </Button>
          ) : (
            <>
              <Button className="bg-blue-600 hover:bg-blue-700 h-10 text-xs text-white" onClick={handleSearchClick} disabled={isSearchDisabled || loading || !isActive}>Search</Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button disabled={isDownloadDisabled || loading || !isActive} className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-10">Download</Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Download Options</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className='cursor-pointer' onClick={() => isActive && handleDownloadWithPermitChoice("pdf")} disabled={isDownloadDisabled || loading || !isActive}>PDF</DropdownMenuItem>
                  <DropdownMenuItem className='cursor-pointer' onClick={() => isActive && handleDownloadWithPermitChoice("excel")} disabled={isDownloadDisabled || loading || !isActive}>Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FilterSection;
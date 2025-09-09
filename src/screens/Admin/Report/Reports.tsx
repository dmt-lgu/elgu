import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import FilterSection from './components/FilterSection';
import axios from '../../../plugin/axios';
import { regionMapping } from '../../../screens/Admin/Report/utils/mockData';
import dictImage from '../../../assets/logo/dict.png';
import { exportReportToPdf, exportReportToExcel } from './utils/reportGenerator';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store';
import { updateFilterField } from '../../../redux/reportFilterSlice';
import { setTableData, setAppliedFilter } from '../../../redux/businessPermitSlice';
import ScrollToTopButton from './components/ScrollToTopButton';
import Swal from 'sweetalert2';
import WorkingPermitReport from './table/WorkingPermitReport';
import BrgyClearanceReport from './table/BrgyClearanceReport';
import { setWorkingPermitTableData, setWorkingPermitAppliedFilter } from '@/redux/workingPermitTableSlice';
import { setBrgyClearanceTableData, setBrgyClearanceAppliedFilter } from '@/redux/brgyClearanceTableSlice';

import BuildingPermitReport from './table/BuildingPermitReport';
import { setbuildingPermiAppliedFilter, setbuildingPermitData } from '@/redux/buildingPermitSlice';
import CertificateOfOccupancyReport from './table/CertificateOfOccupancyReport';
import { setcertificateOfOccupancy, setCertificateOfOccupancyAppliedFilter } from '@/redux/CertificateOfOccupancySlice';
import ProgressIndicator from './components/ProgressIndicator';
import { filterTableResults, getDateRangeLabel } from './utils/reportUtils';
import BusinessPermitReport from './table/BusinessPermitReport';

// Type definitions and helper functions remain the same
type DateRange = { start: string | null; end: string | null };
type AppliedFilter = {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  dateRange: DateRange;
  selectedDateType: string;
  selectedIslands: string[];
  selectedModules: string[];
  allRegionsSelected?: boolean;
};
type ReportData = { results: any[] } | null;
type ProgressiveDataState = { [key: string]: ReportData };
type ProgressDetail = { currentRegion: string; currentIndex: number; totalRegions: number };
type ProgressState = { [moduleKey: string]: ProgressDetail | null };

const BP = "Business Permit";
const WP = "Working Permit";
const BC = "Barangay Clearance";
const BLDG = "Building Permit";
const CO = "Certificate of Occupancy";

// Other helper functions (areFiltersEqual, ensureDate, etc.) remain the same...
function areFiltersEqual(a: any, b: any) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  return JSON.stringify({ ...a, selectedModules: (a.selectedModules || []).slice().sort() }) === JSON.stringify({ ...b, selectedModules: (b.selectedModules || []).slice().sort() });
}
function ensureDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}
function normalizeDateRange(dateRange: { start: Date | string | null; end: Date | string | null }) {
  return { start: ensureDate(dateRange.start), end: ensureDate(dateRange.end) };
}
function formatLocalDate(date: Date | null): string | null {
  if (!date) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function useReportData({
  moduleKey, apiUrl, appliedFilter, reduxTableData, reduxAppliedFilter,
  setReduxTableData, setReduxAppliedFilter, hasSearched, abortSignal,
  skipLoading, isSelectAll,
}: {
  moduleKey: string; apiUrl: string; appliedFilter: AppliedFilter & { skipLoading?: boolean };
  lguToRegion: Record<string, string>; reduxTableData: any; reduxAppliedFilter: any;
  setReduxTableData: (data: any) => void; setReduxAppliedFilter: (filter: any) => void;
  hasSearched: boolean; abortSignal: AbortSignal | undefined;
  skipLoading?: boolean; isSelectAll?: boolean;
}) {
  const [_data, setData] = useState<ReportData>(null);
  const [loading, setLoading] = useState(false);
  const currentFilter = useMemo(() => ({
    selectedRegions: appliedFilter.selectedRegions,
    selectedProvinces: appliedFilter.selectedProvinces,
    selectedCities: appliedFilter.selectedCities,
    selectedIslands: appliedFilter.selectedIslands,
    dateRange: appliedFilter.dateRange,
  }), [
    appliedFilter.selectedRegions, appliedFilter.selectedProvinces, appliedFilter.selectedCities,
    appliedFilter.selectedIslands, appliedFilter.dateRange?.start, appliedFilter.dateRange?.end,
  ]);
  useEffect(() => {
    if (isSelectAll) { setData(null); setLoading(false); return; }
    if (!hasSearched || skipLoading || (!appliedFilter.selectedRegions.length && !appliedFilter.selectedIslands.length) || !appliedFilter.dateRange.start || !appliedFilter.dateRange.end) {
      setData(null); setLoading(false); return;
    }
    if (reduxTableData && reduxAppliedFilter && JSON.stringify(currentFilter) === JSON.stringify(reduxAppliedFilter)) {
      setData(reduxTableData); setLoading(false); return;
    }
    setLoading(true);
    const payload: any = {
      locationName: appliedFilter.selectedRegions,
      startDate: appliedFilter.dateRange.start ? formatLocalDate(ensureDate(appliedFilter.dateRange.start)) : null,
      endDate: appliedFilter.dateRange.end ? formatLocalDate(ensureDate(appliedFilter.dateRange.end)) : null,
    };
    Object.keys(payload).forEach(key => ((Array.isArray(payload[key]) && payload[key].length === 0) || payload[key] === null) ? delete payload[key] : {});
    // If multiple regions selected and not select-all, fetch sequentially per-region so progress is step-by-step.
    const doFetch = async () => {
      try {
        if (Array.isArray(appliedFilter.selectedRegions) && appliedFilter.selectedRegions.length > 1 && !isSelectAll) {
          const regions = appliedFilter.selectedRegions.slice();
          const aggregated: any[] = [];
          for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            if (abortSignal?.aborted) break;
            const regionPayload = { ...payload, locationName: [region] };
            try {
              // eslint-disable-next-line no-await-in-loop
              const res = await axios.post(apiUrl, regionPayload, { signal: abortSignal });
              const rawData = res?.data;
              if (rawData && Array.isArray(rawData.results)) {
                rawData.results.forEach((r: any) => {
                  if (!aggregated.some(a => a.lgu === r.lgu)) aggregated.push(r);
                });
              }
            } catch (err: any) {
              if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') {
                break;
              }
              // otherwise continue to next region
            }
            // call parent-updater via a custom event so Reports can update its progressState (since hook is inside same module)
            try {
              const progressEvent = new CustomEvent('report-progress', { detail: { moduleKey: moduleKey, currentRegion: region, currentIndex: i + 1, totalRegions: regions.length } });
              window.dispatchEvent(progressEvent);
            } catch (e) {
              // ignore
            }
            // Push intermediate aggregated results to state/redux so tables update progressively
            try {
              const interim = { results: aggregated.slice(), lguCount: aggregated.length };
              setData(interim);
              setReduxTableData(interim);
              setReduxAppliedFilter(currentFilter);
            } catch (e) {
              // ignore
            }
            // Small delay to keep UI responsive
          }
          const final = { results: aggregated, lguCount: aggregated.length };
          setData(final);
          setReduxTableData(final);
          setReduxAppliedFilter(currentFilter);
        } else {
          const response = await axios.post(apiUrl, payload, { signal: abortSignal });
          // --- START OF FIX ---
          const rawData = response.data;
          let cleanedData = rawData;
          if (rawData && Array.isArray(rawData.results)) {
            const seenLgus = new Set();
            const uniqueResults = rawData.results.filter((lgu:any) => {
              if (seenLgus.has(lgu.lgu)) {
                return false;
              }
              seenLgus.add(lgu.lgu);
              return true;
            });
            cleanedData = { ...rawData, results: uniqueResults, lguCount: uniqueResults.length };
          }
          setData(cleanedData);
          setReduxTableData(cleanedData);
          setReduxAppliedFilter(currentFilter);
          // --- END OF FIX ---
        }
      } catch (err: any) {
        if (!(err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled')) {
          setData(null); setReduxTableData(null);
        }
      } finally {
        setLoading(false);
      }
    };
    void doFetch();
  }, [ hasSearched, JSON.stringify(currentFilter), JSON.stringify(reduxAppliedFilter), reduxTableData, apiUrl, skipLoading, isSelectAll, setReduxTableData, setReduxAppliedFilter, abortSignal ]);
  return { loading };
}


const Reports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { selectedModules: uiSelectedModules, selectedProvinces, selectedCities, selectedRegions: uiSelectedRegions, selectedIslands: uiSelectedIslands, dateRange: uiDateRange, selectedDateType: uiSelectedDateType } = useSelector((state: RootState) => state.reportFilter);
  
  const { tableData: bpTableData, appliedFilter: bpPersistedAppliedFilter } = useSelector((state: RootState) => state.businessPermitTable);
  const { tableData: wpTableData, appliedFilter: wpPersistedAppliedFilter } = useSelector((state: RootState) => state.workingPermitTable);
  const { tableData: bcTableData, appliedFilter: bcPersistedAppliedFilter } = useSelector((state: RootState) => state.brgyClearanceTable);
  const { tableData: bldgTableData, appliedFilter: bldgPersistedAppliedFilter } = useSelector((state: RootState) => state.buildingPermit);
  const { tableData: coTableData, appliedFilter: coPersistedAppliedFilter } = useSelector((state: RootState) => state.certificateOfOccupancy);

  const [appliedFilter, setAppliedFilterState] = useState<AppliedFilter>(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
    const defaultFilter: AppliedFilter = {
      selectedRegions: (uiSelectedRegions as string[]) || [],
      selectedProvinces: (selectedProvinces as string[]) || [],
      selectedCities: (selectedCities as string[]) || [],
      dateRange: (uiDateRange as DateRange) || { start: monthStart, end: monthEnd },
      selectedDateType: (uiSelectedDateType as string) || 'Month',
      selectedIslands: (uiSelectedIslands as string[]) || [],
      allRegionsSelected: false,
      selectedModules: (uiSelectedModules as string[]) || [],
    };
    return { ...defaultFilter, ...(bpPersistedAppliedFilter || {}) };
  });

  // Start with searched = true only when there is a persisted applied filter.
  // Do NOT auto-trigger search when the UI filter (redux) merely has defaults.
  const [hasSearched, setHasSearched] = useState<boolean>(() => !!bpPersistedAppliedFilter);
  const [lastAppliedFilters, setLastAppliedFilters] = useState<any>(() => bpPersistedAppliedFilter);
  const [cancelled, setCancelled] = useState(false);
  const [hasTableData, setHasTableData] = useState(false);
  const [lguToRegion, setLguToRegion] = useState<Record<string, string>>({});
  const [lguRegionLoading, setLguRegionLoading] = useState(true);
  const searchAbortController = useRef<AbortController | null>(null);
  const exportAbortController = useRef<AbortController | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
  const [progressiveData, setProgressiveData] = useState<ProgressiveDataState>({ [BP]: null, [WP]: null, [BC]: null, [BLDG]: null, [CO]: null });
  const [progressState, setProgressState] = useState<ProgressState>({});
  
  // --- MODIFICATION START ---
  // New state to explicitly track if a user-initiated request (search or download) is active.
  const [isRequestActive, setIsRequestActive] = useState(false);
  // --- MODIFICATION END ---

  // Listen to progress events dispatched by useReportData and update local progress state
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail as { moduleKey: string; currentRegion: string; currentIndex: number; totalRegions: number };
        if (!detail || !detail.moduleKey) return;
        setProgressState(prev => ({ ...prev, [detail.moduleKey]: { currentRegion: detail.currentRegion, currentIndex: detail.currentIndex, totalRegions: detail.totalRegions } }));
      } catch (err) {
        // ignore
      }
    };
    window.addEventListener('report-progress', handler as EventListener);
    return () => window.removeEventListener('report-progress', handler as EventListener);
  }, []);
  
  const [generatedAt, setGeneratedAt] = useState(new Date());

  useEffect(() => {
    const fetchLguToRegion = async () => {
      setLguRegionLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_URL}/api/bp/lgu-list`);
        const mapping: Record<string, string> = {};
        Object.entries(res.data).forEach(([regionKey, lguList]) => {
          (lguList as string[]).forEach(lguName => {
            mapping[lguName] = regionMapping[regionKey] || regionKey;
          });
        });
        setLguToRegion(mapping);
      } catch {
        setLguToRegion({});
      } finally {
        setLguRegionLoading(false);
      }
    };
    fetchLguToRegion();
  }, []);

  const isSelectAll = !!appliedFilter.allRegionsSelected;

  useEffect(() => {
    if (!hasSearched || !isSelectAll) return;
    const abortController = new AbortController();
    const { signal } = abortController;
    const fetchSequentially = async () => {
      setIsProgressiveLoading(true);
      const regionOrder = ["Region I", "Region II", "Region III", "IV-A", "IV-B", "Region V", "Region VI", "Region VII", "Region VIII", "Region IX", "Region X", "Region XI", "Region XII", "Region XIII", "CAR", "BARMM1", "BARMM2"];
      const sortedRegions = appliedFilter.selectedRegions.slice().sort((a, b) => regionOrder.indexOf(a) - regionOrder.indexOf(b));
      const initialProgress: ProgressState = {};
      (appliedFilter.selectedModules || []).forEach(moduleKey => { initialProgress[moduleKey] = { currentRegion: "Initializing...", currentIndex: 0, totalRegions: sortedRegions.length }; });
      setProgressState(initialProgress);
      const initialState: ProgressiveDataState = {};
      (appliedFilter.selectedModules || []).forEach(moduleKey => { initialState[moduleKey] = { results: [] }; });
      setProgressiveData(initialState);
      for (let i = 0; i < sortedRegions.length; i++) {
        const region = sortedRegions[i];
        if (signal.aborted) break;
        const payload = { locationName: [region], startDate: formatLocalDate(ensureDate(appliedFilter.dateRange.start)), endDate: formatLocalDate(ensureDate(appliedFilter.dateRange.end)) };
        const promisesForRegion = (appliedFilter.selectedModules || []).map(moduleKey => {
          let url = '';
          if (moduleKey === BP) url = `${import.meta.env.VITE_URL}/api/bp/transaction-count`;
          if (moduleKey === WP) url = `${import.meta.env.VITE_URL}/api/wp/transaction-count`;
          if (moduleKey === BC) url = `${import.meta.env.VITE_URL}/api/bc/transaction-count`;
          if (moduleKey === BLDG) url = `${import.meta.env.VITE_URL}/api/bpco/transaction-count-bp`;
          if (moduleKey === CO) url = `${import.meta.env.VITE_URL}/api/bpco/transaction-count-co`;
          if (!url) return Promise.resolve();
          return axios.post(url, payload, { signal })
            .then(res => { if (res.data?.results) { setProgressiveData(prev => ({ ...prev, [moduleKey]: { results: [...(prev[moduleKey]?.results || []), ...res.data.results] } })); } })
            .catch(err => { if (err.name !== 'CanceledError') { console.error(`Failed to fetch ${moduleKey} for ${region}`); } })
            .finally(() => { if (!signal.aborted) { setProgressState(prev => ({ ...prev, [moduleKey]: { currentRegion: region, currentIndex: i + 1, totalRegions: sortedRegions.length } })); } });
        });
        await Promise.all(promisesForRegion);
      }
      setIsProgressiveLoading(false);
    };
    fetchSequentially();
    return () => abortController.abort();
  }, [hasSearched, isSelectAll, JSON.stringify(appliedFilter)]);
  
  const setBpTableData = useCallback((data:any) => dispatch(setTableData(data)), [dispatch]);
  const setBpAppliedFilter = useCallback((filter:any) => dispatch(setAppliedFilter(filter)), [dispatch]);
  const setWpTableData = useCallback((data:any) => dispatch(setWorkingPermitTableData(data)), [dispatch]);
  const setWpAppliedFilter = useCallback((filter:any) => dispatch(setWorkingPermitAppliedFilter(filter)), [dispatch]);
  const setBcTableData = useCallback((data:any) => dispatch(setBrgyClearanceTableData(data)), [dispatch]);
  const setBcAppliedFilter = useCallback((filter:any) => dispatch(setBrgyClearanceAppliedFilter(filter)), [dispatch]);
  const setBldgTableData = useCallback((data:any) => dispatch(setbuildingPermitData(data)), [dispatch]);
  const setBldgAppliedFilter = useCallback((filter:any) => dispatch(setbuildingPermiAppliedFilter(filter)), [dispatch]);
  const setCoTableData = useCallback((data:any) => dispatch(setcertificateOfOccupancy(data)), [dispatch]);
  const setCoAppliedFilter = useCallback((filter:any) => dispatch(setCertificateOfOccupancyAppliedFilter(filter)), [dispatch]);
  
  const { loading: bpLoading } = useReportData({ moduleKey: BP, apiUrl: `${import.meta.env.VITE_URL}/api/bp/transaction-count`, appliedFilter, lguToRegion, reduxTableData: bpTableData, reduxAppliedFilter: bpPersistedAppliedFilter, setReduxTableData: setBpTableData, setReduxAppliedFilter: setBpAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(BP), isSelectAll });
  const { loading: wpLoading } = useReportData({ moduleKey: WP, apiUrl: `${import.meta.env.VITE_URL}/api/wp/transaction-count`, appliedFilter, lguToRegion, reduxTableData: wpTableData, reduxAppliedFilter: wpPersistedAppliedFilter, setReduxTableData: setWpTableData, setReduxAppliedFilter: setWpAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(WP), isSelectAll });
  const { loading: bcLoading } = useReportData({ moduleKey: BC, apiUrl: `${import.meta.env.VITE_URL}/api/bc/transaction-count`, appliedFilter, lguToRegion, reduxTableData: bcTableData, reduxAppliedFilter: bcPersistedAppliedFilter, setReduxTableData: setBcTableData, setReduxAppliedFilter: setBcAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(BC), isSelectAll });
  const { loading: bldgLoading } = useReportData({ moduleKey: BLDG, apiUrl: `${import.meta.env.VITE_URL}/api/bpco/transaction-count-bp`, appliedFilter, lguToRegion, reduxTableData: bldgTableData, reduxAppliedFilter: bldgPersistedAppliedFilter, setReduxTableData: setBldgTableData, setReduxAppliedFilter: setBldgAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(BLDG), isSelectAll });
  const { loading: coLoading } = useReportData({ moduleKey: CO, apiUrl: `${import.meta.env.VITE_URL}/api/bpco/transaction-count-co`, appliedFilter, lguToRegion, reduxTableData: coTableData, reduxAppliedFilter: coPersistedAppliedFilter, setReduxTableData: setCoTableData, setReduxAppliedFilter: setCoAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(CO), isSelectAll });

  const searchedModules = appliedFilter.selectedModules || [];
  const loading = !cancelled && (isProgressiveLoading || (!isSelectAll && ((searchedModules.includes(BP) && bpLoading) || (searchedModules.includes(WP) && wpLoading) || (searchedModules.includes(BC) && bcLoading) || (searchedModules.includes(BLDG) && bldgLoading) || (searchedModules.includes(CO) && coLoading))));

  // --- MODIFICATION START ---
  // This effect synchronizes our explicit `isRequestActive` state.
  // It ensures that when all individual loading flags turn false, the overall request is marked as inactive.
  useEffect(() => {
    if (!loading) {
      setIsRequestActive(false);
    }
  }, [loading]);
  // --- MODIFICATION END ---
  
  // per-module loading map for ProgressIndicator
  const moduleLoading: Record<string, boolean> = {
    [BP]: (progressState[BP] ? (progressState[BP]!.currentIndex < progressState[BP]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!bpLoading)),
    [WP]: (progressState[WP] ? (progressState[WP]!.currentIndex < progressState[WP]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!wpLoading)),
    [BC]: (progressState[BC] ? (progressState[BC]!.currentIndex < progressState[BC]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!bcLoading)),
    [BLDG]: (progressState[BLDG] ? (progressState[BLDG]!.currentIndex < progressState[BLDG]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!bldgLoading)),
    [CO]: (progressState[CO] ? (progressState[CO]!.currentIndex < progressState[CO]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!coLoading)),
  };
  
  const handleSearch = (filters: any) => {
    // --- MODIFICATION START ---
    setIsRequestActive(true); // Explicitly mark a request as active
    // --- MODIFICATION END ---
    setCancelled(false);
    setGeneratedAt(new Date());
    const normalizedDateRangeVal = { start: filters.dateRange?.start ? (typeof filters.dateRange.start === "string" ? filters.dateRange.start : filters.dateRange.start.toISOString().slice(0, 10)) : null, end: filters.dateRange?.end ? (typeof filters.dateRange.end === "string" ? filters.dateRange.end : filters.dateRange.end.toISOString().slice(0, 10)) : null };
    const normalizedFilters = { ...filters, dateRange: normalizedDateRangeVal, selectedModules: (filters.selectedModules || []).slice().sort(), selectedDateType: filters.selectedDateType || 'Month' };
    if (filters.skipApi || areFiltersEqual(normalizedFilters, lastAppliedFilters)) return;
    // Initialize progress entries so ProgressIndicator can show during normal (non-select-all) fetches
    try {
      const initialProgress: ProgressState = {};
      (normalizedFilters.selectedModules || []).forEach((moduleKey: string) => {
        initialProgress[moduleKey] = { currentRegion: 'Initializing...', currentIndex: 0, totalRegions: (normalizedFilters.selectedRegions && normalizedFilters.selectedRegions.length) ? normalizedFilters.selectedRegions.length : 1 };
      });
      setProgressState(initialProgress);
    } catch (e) {
      // ignore
    }
    setAppliedFilterState(normalizedFilters);
    setHasSearched(true);
    setLastAppliedFilters(normalizedFilters);
    const selected = normalizedFilters.selectedModules || [];
    if (selected.includes(BP)) dispatch(setAppliedFilter(normalizedFilters));
    if (selected.includes(WP)) dispatch(setWorkingPermitAppliedFilter(normalizedFilters));
    if (selected.includes(BC)) dispatch(setBrgyClearanceAppliedFilter(normalizedFilters));
    if (selected.includes(BLDG)) dispatch(setbuildingPermiAppliedFilter(normalizedFilters));
    if (selected.includes(CO)) dispatch(setCertificateOfOccupancyAppliedFilter(normalizedFilters));
    if (searchAbortController.current) searchAbortController.current.abort();
    searchAbortController.current = new AbortController();
  };

  // Auto-run search reactively when the UI filter has modules + location + date range,
  // but avoid duplicate calls by comparing against lastAppliedFilters.
  useEffect(() => {
    if (hasSearched) return;
    const hasModules = Array.isArray(uiSelectedModules) && uiSelectedModules.length > 0;
    const hasLocation = (Array.isArray(uiSelectedRegions) && uiSelectedRegions.length > 0) || (Array.isArray(uiSelectedIslands) && uiSelectedIslands.length > 0);
    const hasDate = Boolean(uiDateRange && uiDateRange.start && uiDateRange.end);
    if (!hasModules || !hasLocation || !hasDate) return;
    const normalized = {
      selectedModules: (uiSelectedModules || []).slice().sort(),
      selectedProvinces: selectedProvinces || [],
      selectedCities: selectedCities || [],
      selectedRegions: uiSelectedRegions || [],
      selectedIslands: uiSelectedIslands || [],
      dateRange: uiDateRange,
      selectedDateType: uiSelectedDateType || 'Month',
    };
    // Avoid calling search if filters equal lastAppliedFilters
    if (!areFiltersEqual(normalized, lastAppliedFilters)) {
      handleSearch(normalized);
    }
  // re-run when any UI filter value changes
  }, [uiSelectedModules, uiSelectedRegions, uiSelectedIslands, uiDateRange, uiSelectedDateType, selectedProvinces, selectedCities, hasSearched, lastAppliedFilters]);

  // No auto-search: users must explicitly click Search in the FilterSection to load table data.

  const handleReset = () => {
    // --- MODIFICATION START ---
    setIsRequestActive(false); // Ensure request is marked as inactive
    // --- MODIFICATION END ---
    setProgressState({});
    const keys: (keyof RootState['reportFilter'])[] = ['selectedRegions', 'selectedProvinces', 'selectedCities', 'selectedIslands', 'selectedModules'];
    keys.forEach(key => dispatch(updateFilterField({ key, value: [] })));
  dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
  // Restore default date type to 'Month' in the filter UI
  dispatch(updateFilterField({ key: 'selectedDateType', value: 'Month' }));
    setHasSearched(false);
    setLastAppliedFilters(null);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  setAppliedFilterState({ selectedRegions: [], selectedProvinces: [], selectedCities: [], dateRange: { start: monthStart, end: monthEnd }, selectedDateType: 'Month', selectedIslands: [], selectedModules: [] });
    setHasTableData(false);
    dispatch(setTableData(null)); dispatch(setAppliedFilter(null));
    dispatch(setWorkingPermitTableData(null)); dispatch(setWorkingPermitAppliedFilter(null));
    dispatch(setBrgyClearanceTableData(null)); dispatch(setBrgyClearanceAppliedFilter(null));
    dispatch(setbuildingPermitData(null)); dispatch(setbuildingPermiAppliedFilter(null));
    dispatch(setcertificateOfOccupancy(null)); dispatch(setCertificateOfOccupancyAppliedFilter(null));
  };
  
  const handleCancelSearch = () => {
    // --- MODIFICATION START ---
    setIsRequestActive(false); // Explicitly mark the request as inactive
    // --- MODIFICATION END ---
    setProgressState({});
    if (searchAbortController.current) searchAbortController.current.abort();
    if (exportAbortController.current) exportAbortController.current.abort();
    setHasSearched(false);
    setCancelled(true);
    setIsProgressiveLoading(false);
    Swal.fire({ icon: "info", title: "Search Cancelled", timer: 1200, showConfirmButton: false });
  };

   const handleDownload = async (
    type: "pdf" | "excel",
    filters: RootState['reportFilter'], 
    permitTypes?: ("business" | "working" | "barangay" | "building" | "certificate")[]
) => {
    // --- MODIFICATION START ---
    setIsRequestActive(true); // Explicitly mark a request as active
    // --- MODIFICATION END ---
    setGeneratedAt(new Date());
    // create a fresh abort controller for this export operation
    if (exportAbortController.current) exportAbortController.current.abort();
    exportAbortController.current = new AbortController();
    const exportSignal = exportAbortController.current.signal;
    
    try {
      const normalizedDateRange = normalizeDateRange(filters.dateRange);
      const dateRangeLabel = getDateRangeLabel(normalizedDateRange.start, normalizedDateRange.end, filters.selectedDateType);

      const modulesToExport = permitTypes ? permitTypes.map(pt => {
          if (pt === "business") return BP; if (pt === "working") return WP;
          if (pt === "barangay") return BC; if (pt === "building") return BLDG;
          if (pt === "certificate") return CO;
          return "";
      }).filter(Boolean) : (filters.selectedModules || []);

      for (const moduleKey of modulesToExport) {
          if (exportSignal.aborted) break;

          const isSelectAllMode = !!appliedFilter.allRegionsSelected;
          let rawData;
          switch (moduleKey) {
              case BP: rawData = isSelectAllMode ? progressiveData[BP] : bpTableData; break;
              case WP: rawData = isSelectAllMode ? progressiveData[WP] : wpTableData; break;
              case BC: rawData = isSelectAllMode ? progressiveData[BC] : bcTableData; break;
              case BLDG: rawData = isSelectAllMode ? progressiveData[BLDG] : bldgTableData; break;
              case CO: rawData = isSelectAllMode ? progressiveData[CO] : coTableData; break;
              default: rawData = null;
          }

          if (!rawData || !rawData.results || rawData.results.length === 0) {
              Swal.fire({ icon: "info", title: "No Data", text: `There is no data to download for the ${moduleKey} report.`, timer: 2000, showConfirmButton: false });
              continue;
          }
          
          const finalSortedData = filterTableResults({
              apiData: rawData,
              lguToRegion,
              dateRange: filters.dateRange,
              selectedRegions: filters.selectedRegions,
              selectedProvinces: filters.selectedProvinces,
              selectedCities: filters.selectedCities,
              selectedIslands: filters.selectedIslands,
              selectedDates: filters.selectedDateType ? [filters.selectedDateType] : []
          });

          try {
            if (type === "pdf") {
              await exportReportToPdf({
                data: finalSortedData,
                logoUrl: dictImage,
                moduleLabel: moduleKey,
                dateRangeLabel,
                isDayMode: filters.selectedDateType === 'Day',
                generatedAt: generatedAt,
              }, exportSignal);
            } else {
              await exportReportToExcel({
                data: finalSortedData,
                moduleLabel: moduleKey,
                isDayMode: filters.selectedDateType === 'Day'
              }, exportSignal);
            }
          } catch (err: any) {
            if (err?.name === 'CanceledError' || err?.message === 'canceled') {
              Swal.fire({ icon: 'info', title: 'Export Cancelled', timer: 1000, showConfirmButton: false });
              // If export was cancelled, stop further modules
              break;
            } else {
              console.error('Export error for', moduleKey, err);
              Swal.fire({ icon: 'error', title: 'Export Failed', text: `Failed to export ${moduleKey}.`, timer: 2000, showConfirmButton: false });
            }
          }
      }
    } finally {
      // --- MODIFICATION START ---
      // Ensure the request is marked as inactive when the download process ends (success or fail)
      setIsRequestActive(false);
      if (exportAbortController.current) { exportAbortController.current = null; }
      // --- MODIFICATION END ---
    }
  };

  const reportRefs = {
    [BP]: useRef<HTMLDivElement>(null), [WP]: useRef<HTMLDivElement>(null),
    [BC]: useRef<HTMLDivElement>(null), [BLDG]: useRef<HTMLDivElement>(null),
    [CO]: useRef<HTMLDivElement>(null),
  };
  
  const scrollToReport = (moduleKey: string) => {
    reportRefs[moduleKey as keyof typeof reportRefs]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Compute counts for ProgressIndicator based on the current FilterSection (UI) filters
  const counts = useMemo(() => {
    const modulesList = [BP, WP, BC, BLDG, CO];
    const result: Record<string, number> = {};
    modulesList.forEach((moduleKey) => {
      let rawData: any = null;
      if (isSelectAll) {
        rawData = progressiveData[moduleKey];
      } else {
        if (moduleKey === BP) rawData = bpTableData;
        if (moduleKey === WP) rawData = wpTableData;
        if (moduleKey === BC) rawData = bcTableData;
        if (moduleKey === BLDG) rawData = bldgTableData;
        if (moduleKey === CO) rawData = coTableData;
      }
      const safeApiData = rawData || { results: [] };
      try {
        const filtered = filterTableResults({
          apiData: safeApiData,
          lguToRegion,
          dateRange: uiDateRange,
          selectedRegions: uiSelectedRegions,
          selectedProvinces,
          selectedCities,
          selectedIslands: uiSelectedIslands,
        });
        result[moduleKey] = Array.isArray(filtered) ? filtered.length : 0;
      } catch (e) {
        result[moduleKey] = 0;
      }
    });
    return result;
  }, [progressiveData, bpTableData, wpTableData, bcTableData, bldgTableData, coTableData, lguToRegion, uiDateRange, uiSelectedRegions, selectedProvinces, selectedCities, uiSelectedIslands, isSelectAll]);

  return (
    <div ref={tableContainerRef} style={{ position: "relative", marginTop: 24, height: "88vh", overflow: "auto" }}>
      <div className='p-6 max-w-[1200px] mx-auto bg-background flex flex-col gap-6'>
        <FilterSection
          onSearch={handleSearch}
          onDownload={handleDownload}
          onReset={handleReset}
          hasTableData={hasTableData}
          // --- MODIFICATION START ---
          // Pass the new, more stable state to the FilterSection
          loading={isRequestActive || lguRegionLoading}
          // --- MODIFICATION END ---
          onCancel={handleCancelSearch}
          hasSearched={hasSearched}
        />
        <div className="relative flex flex-col gap-6">
          {uiSelectedModules.includes(BP) && 
            <div ref={reportRefs[BP]}>
              <BusinessPermitReport 
              {...appliedFilter} 
              selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={isSelectAll ? progressiveData[BP] : bpTableData} 
              loading={(isSelectAll ? isProgressiveLoading : (moduleLoading[BP] || bpLoading))} 
              isProgressive={isProgressiveLoading} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[BP]}
              searchStartedAt={generatedAt}
              searchLoading={(isSelectAll ? isProgressiveLoading : (moduleLoading[BP] || bpLoading))}
              onTableDataChange={setHasTableData}/>
            </div>}
          {uiSelectedModules.includes(WP) && 
            <div ref={reportRefs[WP]}>
              <WorkingPermitReport 
              {...appliedFilter} 
              selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={isSelectAll ? progressiveData[WP] : wpTableData} 
              loading={(isSelectAll ? isProgressiveLoading : (moduleLoading[WP] || wpLoading))} 
              isProgressive={isProgressiveLoading} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[WP]}
              searchStartedAt={generatedAt}
              searchLoading={(isSelectAll ? isProgressiveLoading : (moduleLoading[WP] || wpLoading))}
              onTableDataChange={setHasTableData}/>
            </div>}
          {uiSelectedModules.includes(BC) && 
            <div ref={reportRefs[BC]}>
              <BrgyClearanceReport 
              {...appliedFilter} 
              selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={isSelectAll ? progressiveData[BC] : bcTableData} 
              loading={(isSelectAll ? isProgressiveLoading : (moduleLoading[BC] || bcLoading))} 
              isProgressive={isProgressiveLoading} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[BC]}
              searchStartedAt={generatedAt}
              searchLoading={(isSelectAll ? isProgressiveLoading : (moduleLoading[BC] || bcLoading))}
              onTableDataChange={setHasTableData}/>
            </div>}
          {uiSelectedModules.includes(BLDG) && 
            <div ref={reportRefs[BLDG]}>
              <BuildingPermitReport 
              {...appliedFilter} 
              selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={isSelectAll ? progressiveData[BLDG] : bldgTableData} 
              loading={(isSelectAll ? isProgressiveLoading : (moduleLoading[BLDG] || bldgLoading))} 
              isProgressive={isProgressiveLoading} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[BLDG]}
              searchStartedAt={generatedAt}
              searchLoading={(isSelectAll ? isProgressiveLoading : (moduleLoading[BLDG] || bldgLoading))}
              onTableDataChange={setHasTableData}/>
            </div>}
          {uiSelectedModules.includes(CO) && 
            <div ref={reportRefs[CO]}>
              <CertificateOfOccupancyReport 
              {...appliedFilter} selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={isSelectAll ? progressiveData[CO] : coTableData} 
              loading={(isSelectAll ? isProgressiveLoading : (moduleLoading[CO] || coLoading))} 
              isProgressive={isProgressiveLoading} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[CO]}
              searchStartedAt={generatedAt}
              searchLoading={(isSelectAll ? isProgressiveLoading : (moduleLoading[CO] || coLoading))}
              onTableDataChange={setHasTableData}/>
            </div>}
          {!loading && uiSelectedModules.length === 0 && (
            <div className="text-center bg-card p-8 rounded-lg border text-secondary-foreground border-border shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-muted-foreground"><path d="M20 7h-9" /><path d="M14 17H4" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg>
                <h3 className="text-2xl font-bold text-foreground">Start by Selecting Filters</h3>
                <p className="text-md text-muted-foreground max-w-md">Please select a <span className="font-semibold text-primary">Module</span>, <span className="font-semibold text-primary">Region</span>, and <span className="font-semibold text-primary">Date Range</span> to generate a report.</p>
              </div>
            </div>
          )}
        </div>
        <ScrollToTopButton scrollTargetRef={tableContainerRef} />
        <ProgressIndicator isLoading={isRequestActive || lguRegionLoading} progress={progressState} counts={counts} moduleLoading={moduleLoading} onModuleClick={scrollToReport}/>
      </div>
    </div>
  );
};

export default Reports;
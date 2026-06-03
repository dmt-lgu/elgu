import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import FilterSection from './components/FilterSection';
import axios from '../../../plugin/axios';
import { regionMapping } from '../../../screens/Admin/Report/utils/mockData';
import dictImage from '../../../assets/logo/dict.png';
import { exportReportToPdf, exportReportToExcel } from './utils/reportGenerator';
import { useSelector, useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '@/redux/store';
import { updateFilterField, type FilterState } from '../../../redux/reportFilterSlice';
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
import { filterTableResults, formatNumber, getDateRangeLabel } from './utils/reportUtils';
import BusinessPermitReport from './table/BusinessPermitReport';
import { Activity, Building2, ChevronDown, FileCheck, Filter, RefreshCw, Shield, TrendingUp } from 'lucide-react';


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
type ProgressiveCacheState = {
  key: string | null;
  loading: boolean;
  data: ProgressiveDataState;
  progress: ProgressState;
};

const BP = "Business Permit";
const WP = "Working Permit";
const BC = "Barangay Clearance";
const BLDG = "Building Permit";
const CO = "Certificate of Occupancy";

const SUMMARY_MODULES = [BP, WP, BC, BLDG, CO];
const NEW_LICENSE_KEYS = ['newLicenseIssued', 'newIssued', 'licenseIssuedNew', 'newLicense'];
const RENEW_LICENSE_KEYS = ['renewLicenseIssued', 'renewIssued', 'licenseIssuedRenewal', 'renewLicense'];
const MALE_LICENSE_KEYS = ['maleLicenseIssued', 'maleIssued'];
const FEMALE_LICENSE_KEYS = ['femaleLicenseIssued', 'femaleIssued'];

const moduleRequestState = new Map<string, { active: boolean; completed: boolean }>();
const progressiveRequestCache: ProgressiveCacheState = {
  key: null,
  loading: false,
  data: { [BP]: null, [WP]: null, [BC]: null, [BLDG]: null, [CO]: null },
  progress: {},
};
const progressiveSubscribers = new Set<(state: ProgressiveCacheState) => void>();
let reportSearchGeneration = 0;
let activeReportRequestGeneration = 0;

function notifyProgressiveSubscribers() {
  const snapshot: ProgressiveCacheState = {
    key: progressiveRequestCache.key,
    loading: progressiveRequestCache.loading,
    data: { ...progressiveRequestCache.data },
    progress: { ...progressiveRequestCache.progress },
  };
  progressiveSubscribers.forEach(listener => listener(snapshot));
}

// Other helper functions (ensureDate, etc.) remain the same...
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

function getExplicitNumber(item: any, keys: string[]): number | null {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== null && value !== undefined && value !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return null;
}

function getLicenseIssued(item: any, keys: string[], fallback: number): number {
  const explicit = getExplicitNumber(item, keys);
  return explicit === null ? fallback : explicit;
}

function sumMonthly(lgu: any, sumItem: (item: any) => number): number {
  if (!Array.isArray(lgu?.monthlyResults)) return 0;
  return lgu.monthlyResults.reduce((sum: number, item: any) => sum + sumItem(item), 0);
}

function normalizeSummaryResults(results: any[]): any[] {
  const byLgu = new Map<string, { lgu: any; monthsMap: Map<string, any>; hasError?: boolean }>();

  (results || []).forEach((entry: any) => {
    const key = entry?.lgu || '';
    if (!key) return;
    if (!byLgu.has(key)) {
      byLgu.set(key, { lgu: { ...entry, monthlyResults: [] }, monthsMap: new Map(), hasError: entry?.hasError });
    }

    const bucket = byLgu.get(key)!;
    if (entry?.hasError) bucket.hasError = true;

    const monthsArr = Array.isArray(entry?.monthlyResults) ? entry.monthlyResults : [];
    monthsArr.forEach((monthData: any) => {
      const monthKey = monthData?.month as string | undefined;
      if (!monthKey) return;
      const existing = bucket.monthsMap.get(monthKey) || { month: monthKey };
      Object.keys(monthData).forEach(field => {
        const value = monthData[field];
        if (typeof value === 'number') {
          existing[field] = Math.max(Number(existing[field] || 0), Number(value));
        } else if (existing[field] === undefined) {
          existing[field] = value;
        }
      });
      bucket.monthsMap.set(monthKey, existing);
    });
  });

  return Array.from(byLgu.values()).map(({ lgu, monthsMap, hasError }) => {
    const monthlyResults = Array.from(monthsMap.values()).sort((a, b) => String(a.month || '').localeCompare(String(b.month || '')));
    const months = monthlyResults.map(item => item.month).filter(Boolean);
    return { ...lgu, hasError: !!hasError, monthlyResults, months };
  });
}

function getSummaryCardTheme(moduleKey: string) {
  const themes = {
    [BP]: {
      icon: FileCheck,
      iconColor: 'bg-green-600',
      accentColor: 'text-green-600',
      borderAccent: 'border-l-green-500',
      loaderColor: '#16a34a',
    },
    [WP]: {
      icon: RefreshCw,
      iconColor: 'bg-yellow-500',
      accentColor: 'text-yellow-500',
      borderAccent: 'border-l-yellow-500',
      loaderColor: '#eab308',
    },
    [BC]: {
      icon: Shield,
      iconColor: 'bg-blue-600',
      accentColor: 'text-blue-600',
      borderAccent: 'border-l-blue-500',
      loaderColor: '#2563eb',
    },
    [BLDG]: {
      icon: Building2,
      iconColor: 'bg-[#2464e8]',
      accentColor: 'text-[#2464e8]',
      borderAccent: 'border-l-[#2464e8]',
      loaderColor: '#2464e8',
    },
    [CO]: {
      icon: Activity,
      iconColor: 'bg-purple-600',
      accentColor: 'text-purple-600',
      borderAccent: 'border-l-purple-500',
      loaderColor: '#9333ea',
    },
  };

  return themes[moduleKey as keyof typeof themes] || themes[BP];
}

function emptyReportData(): ReportData {
  return { results: [] };
}

function emptyProgressiveData(): ProgressiveDataState {
  return { [BP]: null, [WP]: null, [BC]: null, [BLDG]: null, [CO]: null };
}

function isLatestReportRequest(generation: number) {
  return generation === activeReportRequestGeneration;
}
function useReportData({
  moduleKey, apiUrl, appliedFilter, reduxTableData, reduxAppliedFilter,
  setReduxTableData, setReduxAppliedFilter, hasSearched, abortSignal,
  skipLoading, isSelectAll, refreshKey,
}: {
  moduleKey: string; apiUrl: string; appliedFilter: AppliedFilter & { skipLoading?: boolean };
  lguToRegion: Record<string, string>; reduxTableData: any; reduxAppliedFilter: any;
  setReduxTableData: (data: any) => void; setReduxAppliedFilter: (filter: any) => void;
  hasSearched: boolean; abortSignal: AbortSignal | undefined;
  skipLoading?: boolean; isSelectAll?: boolean; refreshKey: number;
}) {
  const [_data, setData] = useState<ReportData>(null);
  const [loading, setLoading] = useState(false);
  const activeRequestKey = useRef<string | null>(null);
  const completedRequestKey = useRef<string | null>(null);
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
  const currentFilterKey = JSON.stringify(currentFilter);
  const requestKey = `${refreshKey}:${currentFilterKey}`;
  useEffect(() => {
    const requestGeneration = refreshKey;
  // If we have persisted table data + a persisted applied filter that matches the
    // current UI filter, reuse that data so the tables remain after a page refresh.
    // This allows users to refresh the page and still see the results they previously
    // fetched without needing to click Search again.
    const globalRequestKey = `${moduleKey}:${requestKey}`;
    if (abortSignal?.aborted || !isLatestReportRequest(requestGeneration)) {
      moduleRequestState.set(globalRequestKey, { active: false, completed: false });
      setLoading(false);
      return;
    }
    const canUseCachedData = refreshKey === 0 || completedRequestKey.current === requestKey || moduleRequestState.get(globalRequestKey)?.completed;
    if (canUseCachedData && reduxTableData && reduxAppliedFilter && currentFilterKey === JSON.stringify(reduxAppliedFilter)) {
      setData(reduxTableData); setLoading(false); return;
    }

    // Otherwise, gate API calls behind an explicit search and required filter fields.
    if (!hasSearched || skipLoading || (!appliedFilter.selectedRegions.length && !appliedFilter.selectedIslands.length) || !appliedFilter.dateRange.start || !appliedFilter.dateRange.end) {
      setData(null); setLoading(false); return;
    }

    const globalRequest = moduleRequestState.get(globalRequestKey);
    if (activeRequestKey.current === requestKey || globalRequest?.active) {
      setLoading(true);
      return;
    }

    activeRequestKey.current = requestKey;
    moduleRequestState.set(globalRequestKey, { active: true, completed: false });
    setLoading(true);
    const expandNIR = (regions: string[]): string[] => {
      if (!regions.includes('NIR')) return regions;
      const expanded = regions.filter(r => r !== 'NIR');
      ['Negros Occidental', 'Negros Oriental', 'Siquijor'].forEach(p => { if (!expanded.includes(p)) expanded.push(p); });
      return expanded;
    };
    const expandedRegions = expandNIR(appliedFilter.selectedRegions || []);
    const payload: any = {
      locationName: expandedRegions,
      startDate: appliedFilter.dateRange.start ? formatLocalDate(ensureDate(appliedFilter.dateRange.start)) : null,
      endDate: appliedFilter.dateRange.end ? formatLocalDate(ensureDate(appliedFilter.dateRange.end)) : null,
    };
    Object.keys(payload).forEach(key => ((Array.isArray(payload[key]) && payload[key].length === 0) || payload[key] === null) ? delete payload[key] : {});
    // If multiple regions selected and not select-all, fetch sequentially per-region so progress is step-by-step.
    const doFetch = async () => {
      try {
        if (Array.isArray(expandedRegions) && expandedRegions.length > 1 && !isSelectAll) {
          const regions = expandedRegions.slice();
          const aggregated: any[] = [];
          for (let i = 0; i < regions.length; i++) {
            const region = regions[i];
            if (abortSignal?.aborted || !isLatestReportRequest(requestGeneration)) break;
            const regionPayload = { ...payload, locationName: [region] };
            try {
              // eslint-disable-next-line no-await-in-loop
              const res = await axios.post(apiUrl, regionPayload, { signal: abortSignal });
              if (!isLatestReportRequest(requestGeneration)) return;
              const rawData = res?.data;
              if (rawData && Array.isArray(rawData.results)) {
                rawData.results.forEach((r: any) => {
                  if (!aggregated.some(a => a.lgu === r.lgu)) aggregated.push(r);
                });
              }
            } catch (err: any) {
              if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') {
                moduleRequestState.set(globalRequestKey, { active: false, completed: false });
                return;
              }
              // otherwise continue to next region
            }
            if (abortSignal?.aborted || !isLatestReportRequest(requestGeneration)) {
              moduleRequestState.set(globalRequestKey, { active: false, completed: false });
              return;
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
              if (!isLatestReportRequest(requestGeneration)) return;
              setData(interim);
              setReduxTableData(interim);
              setReduxAppliedFilter(currentFilter);
            } catch (e) {
              // ignore
            }
            // Small delay to keep UI responsive
          }
          if (abortSignal?.aborted || !isLatestReportRequest(requestGeneration)) {
            moduleRequestState.set(globalRequestKey, { active: false, completed: false });
            return;
          }
          const final = { results: aggregated, lguCount: aggregated.length };
          if (!isLatestReportRequest(requestGeneration)) return;
          setData(final);
          setReduxTableData(final);
          setReduxAppliedFilter(currentFilter);
          completedRequestKey.current = requestKey;
          moduleRequestState.set(globalRequestKey, { active: false, completed: true });
        } else {
          const response = await axios.post(apiUrl, payload, { signal: abortSignal });
          if (abortSignal?.aborted || !isLatestReportRequest(requestGeneration)) {
            moduleRequestState.set(globalRequestKey, { active: false, completed: false });
            return;
          }
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
          if (isLatestReportRequest(requestGeneration)) {
            setData(cleanedData);
            setReduxTableData(cleanedData);
            setReduxAppliedFilter(currentFilter);
            completedRequestKey.current = requestKey;
            moduleRequestState.set(globalRequestKey, { active: false, completed: true });
          }
          // --- END OF FIX ---
        }
      } catch (err: any) {
        if (isLatestReportRequest(requestGeneration) && !(err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled')) {
          setData(null); setReduxTableData(null);
        }
      } finally {
        if (activeRequestKey.current === requestKey) activeRequestKey.current = null;
        const latestRequest = moduleRequestState.get(globalRequestKey);
        if (latestRequest?.active) moduleRequestState.set(globalRequestKey, { active: false, completed: false });
        if (isLatestReportRequest(requestGeneration)) setLoading(false);
      }
    };
    void doFetch();
  }, [ hasSearched, currentFilterKey, JSON.stringify(reduxAppliedFilter), reduxTableData, apiUrl, skipLoading, isSelectAll, setReduxTableData, setReduxAppliedFilter, abortSignal, refreshKey ]);
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
    // Prefer any persisted per-module applied filter (BP/WP/BC/BLDG/CO) so that
    // returning to the Reports page restores the last used filter and avoids
    // restarting network fetches when possible. We fall back to business permit
    // persisted filter for backward compatibility.
    const persisted = bpPersistedAppliedFilter || wpPersistedAppliedFilter || bcPersistedAppliedFilter || bldgPersistedAppliedFilter || coPersistedAppliedFilter || null;
    return { ...defaultFilter, ...(persisted || {}) };
  });

  // Do NOT auto-trigger search; require explicit user action.
  // However, if we already have persisted table data (from redux-persist), consider
  // the page as having been 'searched' so we reuse the stored results immediately
  // and avoid showing a loading spinner on refresh.
  const initialHasSearched = !!(bpTableData || wpTableData || bcTableData || bldgTableData || coTableData);
  const [hasSearched, setHasSearched] = useState<boolean>(initialHasSearched);
  const [cancelled, setCancelled] = useState(false);
  const [hasTableData, setHasTableData] = useState(false);
  const [lguToRegion, setLguToRegion] = useState<Record<string, string>>({});
  const [lguRegionLoading, setLguRegionLoading] = useState(true);
  const searchAbortController = useRef<AbortController | null>(null);
  const exportAbortController = useRef<AbortController | null>(null);
  const lguRegionAbortController = useRef<AbortController | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
  const [progressiveData, setProgressiveData] = useState<ProgressiveDataState>({ [BP]: null, [WP]: null, [BC]: null, [BLDG]: null, [CO]: null });
  const [progressState, setProgressState] = useState<ProgressState>({});
  const [searchRefreshKey, setSearchRefreshKey] = useState(reportSearchGeneration);
  
  // Track search vs export separately so UI doesn't show cancel/progress during export
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [isExportActive, setIsExportActive] = useState(false);
  const [summaryCardsOpen, setSummaryCardsOpen] = useState(true);

  useEffect(() => {
    const syncProgressiveState = (state: ProgressiveCacheState) => {
      setProgressiveData(state.data);
      setProgressState(state.progress);
      setIsProgressiveLoading(state.loading);
      if (state.loading) setIsSearchActive(true);
    };
    syncProgressiveState(progressiveRequestCache);
    progressiveSubscribers.add(syncProgressiveState);
    return () => {
      progressiveSubscribers.delete(syncProgressiveState);
    };
  }, []);

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
      if (lguRegionAbortController.current) lguRegionAbortController.current.abort();
      lguRegionAbortController.current = new AbortController();
      const signal = lguRegionAbortController.current.signal;
      setLguRegionLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_URL}/api/bp/lgu-list`, { signal });
        if (signal.aborted) return;
        const mapping: Record<string, string> = {};
        Object.entries(res.data).forEach(([regionKey, lguList]) => {
          (lguList as string[]).forEach(lguName => {
            mapping[lguName] = regionMapping[regionKey] || regionKey;
          });
        });
        setLguToRegion(mapping);
      } catch (err: any) {
        if (!(err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled')) {
          setLguToRegion({});
        }
      } finally {
        if (!signal.aborted) setLguRegionLoading(false);
      }
    };
    fetchLguToRegion();
    return () => {
      if (lguRegionAbortController.current) lguRegionAbortController.current.abort();
    };
  }, []);

  const isSelectAll = !!appliedFilter.allRegionsSelected;

  useEffect(() => {
    if (!hasSearched || !isSelectAll) return;
    const requestGeneration = searchRefreshKey;
    const progressiveKey = `${searchRefreshKey}:${JSON.stringify(appliedFilter)}`;
    const signal = searchAbortController.current?.signal;
    if (signal?.aborted || !isLatestReportRequest(requestGeneration)) return;
    if (progressiveRequestCache.key === progressiveKey) {
      setProgressiveData({ ...progressiveRequestCache.data });
      setProgressState({ ...progressiveRequestCache.progress });
      setIsProgressiveLoading(progressiveRequestCache.loading);
      return;
    }
    const getModuleUrl = (moduleKey: string) => {
      if (moduleKey === BP) return `${import.meta.env.VITE_URL}/api/bp/transaction-count`;
      if (moduleKey === WP) return `${import.meta.env.VITE_URL}/api/wp/transaction-count`;
      if (moduleKey === BC) return `${import.meta.env.VITE_URL}/api/bc/transaction-count`;
      if (moduleKey === BLDG) return `${import.meta.env.VITE_URL}/api/bpco/transaction-count-bp`;
      if (moduleKey === CO) return `${import.meta.env.VITE_URL}/api/bpco/transaction-count-co`;
      return '';
    };
    const fetchSequentially = async () => {
      if (signal?.aborted || !isLatestReportRequest(requestGeneration)) return;
      progressiveRequestCache.key = progressiveKey;
      progressiveRequestCache.loading = true;
      progressiveRequestCache.data = { [BP]: null, [WP]: null, [BC]: null, [BLDG]: null, [CO]: null };
      progressiveRequestCache.progress = {};
      setIsProgressiveLoading(true);
      const regionOrder = ["Region I", "Region II", "Region III", "IV-A", "IV-B", "Region V", "Region VI", "Region VII", "Region VIII", "Region IX", "Region X", "Region XI", "Region XII", "Region XIII", "CAR", "BARMM1", "BARMM2"];
      const expandedRegions = (() => {
        const raw: string[] = appliedFilter.selectedRegions || [];
        if (!raw.includes('NIR')) return raw;
        const expanded = raw.filter((r: string) => r !== 'NIR');
        ['Negros Occidental', 'Negros Oriental', 'Siquijor'].forEach((p: string) => { if (!expanded.includes(p)) expanded.push(p); });
        return expanded;
      })();
      const sortedRegions = expandedRegions.slice().sort((a, b) => regionOrder.indexOf(a) - regionOrder.indexOf(b));
      const selectedModules = appliedFilter.selectedModules || [];
      const initialProgress: ProgressState = {};
      selectedModules.forEach(moduleKey => { initialProgress[moduleKey] = { currentRegion: "Initializing...", currentIndex: 0, totalRegions: sortedRegions.length }; });
      progressiveRequestCache.progress = initialProgress;
      setProgressState(initialProgress);
      const initialState: ProgressiveDataState = {};
      selectedModules.forEach(moduleKey => { initialState[moduleKey] = { results: [] }; });
      progressiveRequestCache.data = initialState;
      setProgressiveData(initialState);
      notifyProgressiveSubscribers();

      await Promise.all(selectedModules.map(async moduleKey => {
        const url = getModuleUrl(moduleKey);
        if (!url || signal?.aborted || !isLatestReportRequest(requestGeneration)) return;
        for (let i = 0; i < sortedRegions.length; i++) {
          if (signal?.aborted || !isLatestReportRequest(requestGeneration)) return;
          const region = sortedRegions[i];
          const payload = { locationName: [region], startDate: formatLocalDate(ensureDate(appliedFilter.dateRange.start)), endDate: formatLocalDate(ensureDate(appliedFilter.dateRange.end)) };
          try {
            const res = await axios.post(url, payload, { signal });
            if (signal?.aborted || !isLatestReportRequest(requestGeneration)) return;
            if (res.data?.results) {
              const nextModuleData = { results: [...(progressiveRequestCache.data[moduleKey]?.results || []), ...res.data.results] };
              if (!isLatestReportRequest(requestGeneration)) return;
              progressiveRequestCache.data = { ...progressiveRequestCache.data, [moduleKey]: nextModuleData };
              setProgressiveData(prev => ({ ...prev, [moduleKey]: nextModuleData }));
              if (moduleKey === BP) dispatch(setTableData(nextModuleData));
              if (moduleKey === WP) dispatch(setWorkingPermitTableData(nextModuleData));
              if (moduleKey === BC) dispatch(setBrgyClearanceTableData(nextModuleData));
              if (moduleKey === BLDG) dispatch(setbuildingPermitData(nextModuleData));
              if (moduleKey === CO) dispatch(setcertificateOfOccupancy(nextModuleData));
            }
          } catch (err: any) {
            if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled' || signal?.aborted) {
              return;
            }
            if (err.name !== 'CanceledError') {
              console.error(`Failed to fetch ${moduleKey} for ${region}`);
            }
          } finally {
            if (signal?.aborted || !isLatestReportRequest(requestGeneration)) return;
            const nextProgress = { currentRegion: region, currentIndex: i + 1, totalRegions: sortedRegions.length };
            progressiveRequestCache.progress = { ...progressiveRequestCache.progress, [moduleKey]: nextProgress };
            setProgressState(prev => ({ ...prev, [moduleKey]: nextProgress }));
            notifyProgressiveSubscribers();
          }
        }
      }));
      if (signal?.aborted || !isLatestReportRequest(requestGeneration)) return;
      progressiveRequestCache.loading = false;
      setIsProgressiveLoading(false);
      notifyProgressiveSubscribers();
    };
    void fetchSequentially().finally(() => {
      if (signal?.aborted && isLatestReportRequest(requestGeneration)) {
        progressiveRequestCache.loading = false;
        setIsProgressiveLoading(false);
        notifyProgressiveSubscribers();
      }
    });
  }, [hasSearched, isSelectAll, JSON.stringify(appliedFilter), searchRefreshKey]);
  
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
  
  const { loading: bpLoading } = useReportData({ moduleKey: BP, apiUrl: `${import.meta.env.VITE_URL}/api/bp/transaction-count`, appliedFilter, lguToRegion, reduxTableData: bpTableData, reduxAppliedFilter: bpPersistedAppliedFilter, setReduxTableData: setBpTableData, setReduxAppliedFilter: setBpAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(BP), isSelectAll, refreshKey: searchRefreshKey });
  const { loading: wpLoading } = useReportData({ moduleKey: WP, apiUrl: `${import.meta.env.VITE_URL}/api/wp/transaction-count`, appliedFilter, lguToRegion, reduxTableData: wpTableData, reduxAppliedFilter: wpPersistedAppliedFilter, setReduxTableData: setWpTableData, setReduxAppliedFilter: setWpAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(WP), isSelectAll, refreshKey: searchRefreshKey });
  const { loading: bcLoading } = useReportData({ moduleKey: BC, apiUrl: `${import.meta.env.VITE_URL}/api/bc/transaction-count`, appliedFilter, lguToRegion, reduxTableData: bcTableData, reduxAppliedFilter: bcPersistedAppliedFilter, setReduxTableData: setBcTableData, setReduxAppliedFilter: setBcAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(BC), isSelectAll, refreshKey: searchRefreshKey });
  const { loading: bldgLoading } = useReportData({ moduleKey: BLDG, apiUrl: `${import.meta.env.VITE_URL}/api/bpco/transaction-count-bp`, appliedFilter, lguToRegion, reduxTableData: bldgTableData, reduxAppliedFilter: bldgPersistedAppliedFilter, setReduxTableData: setBldgTableData, setReduxAppliedFilter: setBldgAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(BLDG), isSelectAll, refreshKey: searchRefreshKey });
  const { loading: coLoading } = useReportData({ moduleKey: CO, apiUrl: `${import.meta.env.VITE_URL}/api/bpco/transaction-count-co`, appliedFilter, lguToRegion, reduxTableData: coTableData, reduxAppliedFilter: coPersistedAppliedFilter, setReduxTableData: setCoTableData, setReduxAppliedFilter: setCoAppliedFilter, hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !(appliedFilter.selectedModules || []).includes(CO), isSelectAll, refreshKey: searchRefreshKey });

  const searchedModules = appliedFilter.selectedModules || [];
  const loading = !cancelled && (isProgressiveLoading || (!isSelectAll && ((searchedModules.includes(BP) && bpLoading) || (searchedModules.includes(WP) && wpLoading) || (searchedModules.includes(BC) && bcLoading) || (searchedModules.includes(BLDG) && bldgLoading) || (searchedModules.includes(CO) && coLoading))));
  // More robust signal: any module still loading (including progress-mode modules)
  // or progressive mode active. Include progressState so progress-based loading
  // (when modules are fetched per-region) keeps the global loading flag true
  // — this ensures the cancel button in the FilterSection remains available
  // while, for example, Business Permit is still completing its per-region work.
  const anyModuleLoading = !cancelled && (
    bpLoading || wpLoading || bcLoading || bldgLoading || coLoading || isProgressiveLoading ||
    Object.values(progressState || {}).some(p => !!p && typeof p.currentIndex === 'number' && typeof p.totalRegions === 'number' && p.currentIndex < p.totalRegions)
  );

  // Keep search-active state in sync with module loading flags.
  useEffect(() => {
    if (!anyModuleLoading) {
      setIsSearchActive(false);
    }
  }, [anyModuleLoading]);
  
  // per-module loading map for ProgressIndicator
  // Use progress-based loading only for select-all or multi-region selections
  const useProgressMode = isSelectAll || ((appliedFilter.selectedRegions || []).length > 1);
  const moduleLoading: Record<string, boolean> = {
    [BP]: useProgressMode
      ? (progressState[BP] ? (progressState[BP]!.currentIndex < progressState[BP]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!bpLoading))
      : !!bpLoading,
    [WP]: useProgressMode
      ? (progressState[WP] ? (progressState[WP]!.currentIndex < progressState[WP]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!wpLoading))
      : !!wpLoading,
    [BC]: useProgressMode
      ? (progressState[BC] ? (progressState[BC]!.currentIndex < progressState[BC]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!bcLoading))
      : !!bcLoading,
    [BLDG]: useProgressMode
      ? (progressState[BLDG] ? (progressState[BLDG]!.currentIndex < progressState[BLDG]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!bldgLoading))
      : !!bldgLoading,
    [CO]: useProgressMode
      ? (progressState[CO] ? (progressState[CO]!.currentIndex < progressState[CO]!.totalRegions) : (isSelectAll ? isProgressiveLoading : !!coLoading))
      : !!coLoading,
  };

  const handleSearch = (filters: any) => {
    if (filters.skipApi) return;
    if (searchAbortController.current) searchAbortController.current.abort();
    searchAbortController.current = new AbortController();
    reportSearchGeneration += 1;
    activeReportRequestGeneration = reportSearchGeneration;
    // Mark search as active
    setIsSearchActive(true);
    setCancelled(false);
    setGeneratedAt(new Date());
    const normalizedDateRangeVal = { start: filters.dateRange?.start ? (typeof filters.dateRange.start === "string" ? filters.dateRange.start : filters.dateRange.start.toISOString().slice(0, 10)) : null, end: filters.dateRange?.end ? (typeof filters.dateRange.end === "string" ? filters.dateRange.end : filters.dateRange.end.toISOString().slice(0, 10)) : null };
    const normalizedFilters = { ...filters, dateRange: normalizedDateRangeVal, selectedModules: (filters.selectedModules || []).slice().sort(), selectedDateType: filters.selectedDateType || 'Month' };
    // Initialize progress entries so ProgressIndicator can show during normal (non-select-all) fetches
    try {
      const shouldTrackProgress = !!normalizedFilters.allRegionsSelected || ((normalizedFilters.selectedRegions?.length || 0) > 1);
      if (shouldTrackProgress) {
        const initialProgress: ProgressState = {};
        (normalizedFilters.selectedModules || []).forEach((moduleKey: string) => {
          initialProgress[moduleKey] = {
            currentRegion: 'Initializing...',
            currentIndex: 0,
            totalRegions: normalizedFilters.selectedRegions?.length || 0,
          };
        });
        setProgressState(initialProgress);
      } else {
        // Clear any previous progress to avoid stale loading indicators on single-region searches
        setProgressState({});
      }
    } catch (e) {
      // ignore
    }
    setAppliedFilterState(normalizedFilters);
    setHasSearched(true);
    setSearchRefreshKey(reportSearchGeneration);
    const selected = normalizedFilters.selectedModules || [];
    const blankData = emptyReportData();
    if (selected.includes(BP)) dispatch(setTableData(blankData));
    if (selected.includes(WP)) dispatch(setWorkingPermitTableData(blankData));
    if (selected.includes(BC)) dispatch(setBrgyClearanceTableData(blankData));
    if (selected.includes(BLDG)) dispatch(setbuildingPermitData(blankData));
    if (selected.includes(CO)) dispatch(setcertificateOfOccupancy(blankData));
    if (selected.includes(BP)) dispatch(setAppliedFilter(normalizedFilters));
    if (selected.includes(WP)) dispatch(setWorkingPermitAppliedFilter(normalizedFilters));
    if (selected.includes(BC)) dispatch(setBrgyClearanceAppliedFilter(normalizedFilters));
    if (selected.includes(BLDG)) dispatch(setbuildingPermiAppliedFilter(normalizedFilters));
    if (selected.includes(CO)) dispatch(setCertificateOfOccupancyAppliedFilter(normalizedFilters));
  };

  // Auto-run an initial search on mount when the FilterSection already contains
  // usable default filters (modules selected + date range + location). This
  // ensures each report table displays data according to the FilterSection
  // defaults without requiring the user to click Search.
  useEffect(() => {
    const modules = uiSelectedModules || [];
    const hasDateRange = uiDateRange && uiDateRange.start && uiDateRange.end;
    const hasLocations = (uiSelectedRegions && uiSelectedRegions.length > 0) || (uiSelectedIslands && uiSelectedIslands.length > 0);
    if (!hasSearched && modules.length > 0 && hasDateRange && hasLocations) {
      const initFilters = {
        selectedModules: (modules || []).slice().sort(),
        selectedRegions: uiSelectedRegions || [],
        selectedProvinces,
        selectedCities,
        dateRange: uiDateRange,
        selectedDateType: uiSelectedDateType,
        selectedIslands: uiSelectedIslands || [],
        allRegionsSelected: false,
      };
      // intentionally not added to deps to run once on mount
      // eslint-disable-next-line react-hooks/exhaustive-deps
      handleSearch(initFilters);
    }
  }, []);

  // No auto-search: users must explicitly click Search in the FilterSection to load table data.
  // Previously we cleared persisted table data here on mount to force users to search manually.
  // That behavior was removed so per-table data (persisted via redux-persist) remains after a page refresh.

  const handleReset = () => {
    // Ensure search state is inactive
    reportSearchGeneration += 1;
    activeReportRequestGeneration = reportSearchGeneration;
    setIsSearchActive(false);
    setProgressState({});
    if (searchAbortController.current) searchAbortController.current.abort();
    if (lguRegionAbortController.current) lguRegionAbortController.current.abort();
    searchAbortController.current = null;
    lguRegionAbortController.current = null;
    moduleRequestState.clear();
    progressiveRequestCache.loading = false;
    progressiveRequestCache.progress = {};
    progressiveRequestCache.data = emptyProgressiveData();
    progressiveRequestCache.key = null;
    setProgressiveData(emptyProgressiveData());
    setIsProgressiveLoading(false);
    setLguRegionLoading(false);
    notifyProgressiveSubscribers();
    const keys: (keyof FilterState)[] = ['selectedRegions', 'selectedProvinces', 'selectedCities', 'selectedIslands', 'selectedModules'];
    keys.forEach(key => dispatch(updateFilterField({ key, value: [] })));
  dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
  // Restore default date type to 'Month' in the filter UI
  dispatch(updateFilterField({ key: 'selectedDateType', value: 'Month' }));
    setHasSearched(false);
    setSearchRefreshKey(reportSearchGeneration);
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
    // Explicitly mark the search request as inactive
    reportSearchGeneration += 1;
    activeReportRequestGeneration = reportSearchGeneration;
    setIsSearchActive(false);
    setProgressState({});
    if (searchAbortController.current) searchAbortController.current.abort();
    if (lguRegionAbortController.current) lguRegionAbortController.current.abort();
    searchAbortController.current = null;
    lguRegionAbortController.current = null;
    moduleRequestState.clear();
    progressiveRequestCache.loading = false;
    progressiveRequestCache.progress = {};
    progressiveRequestCache.data = emptyProgressiveData();
    progressiveRequestCache.key = null;
    setProgressiveData(emptyProgressiveData());
    notifyProgressiveSubscribers();
    setHasSearched(false);
    setSearchRefreshKey(reportSearchGeneration);
    setCancelled(true);
    setLguRegionLoading(false);
    setIsProgressiveLoading(false);
    Swal.fire({ icon: "info", title: "Search Cancelled", timer: 1200, showConfirmButton: false });
  };

   const handleDownload = async (
    type: "pdf" | "excel",
    filters: FilterState, 
    permitTypes?: ("business" | "working" | "barangay" | "building" | "certificate")[]
) => {
    // Mark export as active; do not affect search UI
    setIsExportActive(true);
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
                isDayMode: filters.selectedDateType === 'Day',
                dateRangeLabel,
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
      // Export done
      setIsExportActive(false);
      if (exportAbortController.current) { exportAbortController.current = null; }
    }
  };

  const reportRefs = {
    [BP]: useRef<HTMLDivElement>(null), [WP]: useRef<HTMLDivElement>(null),
    [BC]: useRef<HTMLDivElement>(null), [BLDG]: useRef<HTMLDivElement>(null),
    [CO]: useRef<HTMLDivElement>(null),
  };
  const displayedModules = hasSearched ? uiSelectedModules || [] : [];
  const rawReportDataByModule = useMemo<ProgressiveDataState>(() => ({
    [BP]: isSelectAll ? progressiveData[BP] : bpTableData,
    [WP]: isSelectAll ? progressiveData[WP] : wpTableData,
    [BC]: isSelectAll ? progressiveData[BC] : bcTableData,
    [BLDG]: isSelectAll ? progressiveData[BLDG] : bldgTableData,
    [CO]: isSelectAll ? progressiveData[CO] : coTableData,
  }), [isSelectAll, progressiveData, bpTableData, wpTableData, bcTableData, bldgTableData, coTableData]);
  
  const scrollToReport = (moduleKey: string) => {
    reportRefs[moduleKey as keyof typeof reportRefs]?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Compute counts for ProgressIndicator based on the current FilterSection (UI) filters
  const counts = useMemo(() => {
    const result: Record<string, number> = {};
    SUMMARY_MODULES.forEach((moduleKey) => {
      const rawData = rawReportDataByModule[moduleKey];
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
  }, [rawReportDataByModule, lguToRegion, uiDateRange, uiSelectedRegions, selectedProvinces, selectedCities, uiSelectedIslands]);

  const reportSummaries = useMemo(() => {
    const selectedModules = displayedModules;
    const activeDateRange = appliedFilter.dateRange;
    const activeRegions = appliedFilter.selectedRegions;
    const activeIslands = appliedFilter.selectedIslands;
    const activeDateType = appliedFilter.selectedDateType;

    return selectedModules.map((moduleKey) => {
      const rawData = rawReportDataByModule[moduleKey];

      const filtered = filterTableResults({
        apiData: rawData || { results: [] },
        lguToRegion,
        dateRange: activeDateRange,
        selectedRegions: activeRegions,
        selectedProvinces,
        selectedCities,
        selectedIslands: activeIslands,
        selectedDateType: activeDateType,
      });
      const normalized = normalizeSummaryResults(filtered || []);

      const lguNames = new Set<string>();
      let primaryTotal = 0;
      let secondaryTotal = 0;
      let pendingTotal = 0;
      let maleTotal = 0;
      let femaleTotal = 0;

      (normalized || []).forEach((lgu: any) => {
        if (lgu?.hasError) {
          return;
        }
        if (lgu?.lgu) lguNames.add(lgu.lgu);

        if (moduleKey === BP || moduleKey === WP) {
          const newIssued = sumMonthly(lgu, item => getLicenseIssued(item, NEW_LICENSE_KEYS, Number(item.newPaid || 0)));
          const renewIssued = sumMonthly(lgu, item => getLicenseIssued(item, RENEW_LICENSE_KEYS, Number(item.renewPaid || 0)));
          const totalTransactions = sumMonthly(lgu, item => (
            Number(item.newPaid || 0) + Number(item.newPaidViaEgov || 0) + Number(item.newPending || 0) +
            Number(item.renewPaid || 0) + Number(item.renewPaidViaEgov || 0) + Number(item.renewPending || 0)
          ));
          const pending = sumMonthly(lgu, item => Number(item.newPending || 0) + Number(item.renewPending || 0));
          const maleCount = sumMonthly(lgu, item => getLicenseIssued(item, MALE_LICENSE_KEYS, Number(item.malePaid || 0)));
          const femaleCount = sumMonthly(lgu, item => getLicenseIssued(item, FEMALE_LICENSE_KEYS, Number(item.femalePaid || 0)));
          primaryTotal += newIssued + renewIssued;
          secondaryTotal += totalTransactions;
          pendingTotal += pending;
          maleTotal += maleCount;
          femaleTotal += femaleCount;
          return;
        }

        if (moduleKey === BC) {
          primaryTotal += sumMonthly(lgu, item => {
            const genderTotal = Number(item.malePaid || 0) + Number(item.malePending || 0) + Number(item.femalePaid || 0) + Number(item.femalePending || 0);
            return genderTotal || Number(item.totalCount || 0);
          });
          return;
        }

        if (moduleKey === BLDG || moduleKey === CO) {
          const pendingKey = moduleKey === BLDG ? 'buildingPending' : 'coPending';
          const licenseKey = moduleKey === BLDG ? 'buildingLicenseIssued' : 'coLicenseIssued';
          const forIssuanceKey = moduleKey === BLDG ? 'buildingForIssuance' : 'coForIssuance';
          primaryTotal += sumMonthly(lgu, item => Number(item[licenseKey] || 0));
          secondaryTotal += sumMonthly(lgu, item => {
            const licenseIssued = Number(item[licenseKey] || 0);
            const forIssuance = Number(item[forIssuanceKey] || 0);
            return forIssuance + licenseIssued;
          });
          pendingTotal += sumMonthly(lgu, item => Number(item[pendingKey] || 0));
        }
      });

      const primaryLabel = moduleKey === BC ? 'Total Issued' : 'License Issued';
      const secondaryLabel = moduleKey === BC ? 'LGUs with Data' : moduleKey === BP || moduleKey === WP ? 'Total Transactions' : 'PAID (For Issuance and License Issued)';
      const pendingLabel = 'Pending';

      return {
        moduleKey,
        lguCount: lguNames.size,
        primaryLabel,
        primaryTotal,
        secondaryLabel,
        secondaryTotal: moduleKey === BC ? lguNames.size : secondaryTotal,
        pendingTotal,
        pendingLabel,
        maleTotal,
        femaleTotal,
      };
    });
  }, [
    displayedModules, appliedFilter,
    rawReportDataByModule,
    lguToRegion, selectedProvinces, selectedCities,
  ]);

  return (
    <div ref={tableContainerRef} style={{ position: "relative", marginTop: 24, height: "88vh", overflow: "auto" }}>
      <div className='p-6  mx-auto bg-background flex flex-col gap-6'>
        <FilterSection
          onSearch={handleSearch}
          onDownload={handleDownload}
          onReset={handleReset}
          hasTableData={hasTableData}
          // === START OF FIX ===
          // Prevent showing the main loading state during an export.
          // This stops the `loading` prop from triggering the cancel button appearance.
          loading={!isExportActive && (isSearchActive || anyModuleLoading)}
          // Hide the cancel button during export operations by not providing onCancel when exporting
          onCancel={isExportActive ? undefined : handleCancelSearch}
          // === END OF FIX ===
          hasSearched={hasSearched}
        />
        {reportSummaries.length > 0 && (
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setSummaryCardsOpen(prev => !prev)}
              className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:shadow-md transition-shadow duration-200"
              aria-expanded={summaryCardsOpen}
            >
              <div>
                <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Summary Cards</h2>
                <p className="text-xs text-gray-500">{reportSummaries.length} selected module{reportSummaries.length > 1 ? 's' : ''}</p>
              </div>
              <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${summaryCardsOpen ? 'rotate-180' : ''}`} />
            </button>

            {summaryCardsOpen && (
              <div className="grid grid-cols-3 slg:grid-cols-2 md:grid-cols-1 gap-4">
                {reportSummaries.map(summary => {
                  const theme = getSummaryCardTheme(summary.moduleKey);
                  const IconComponent = theme.icon;
                  const isCardLoading = Boolean(moduleLoading[summary.moduleKey]);

                  return (
                    <button
                      key={summary.moduleKey}
                      type="button"
                      onClick={() => scrollToReport(summary.moduleKey)}
                      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 relative overflow-hidden border-l-4 ${isCardLoading ? 'border-l-transparent' : theme.borderAccent} text-left cursor-pointer`}
                    >
                      {isCardLoading && (
                        <div className="absolute left-0 top-0 h-full w-1 overflow-hidden">
                          <div
                            className="h-1/3 w-full animate-[summaryCardLine_1.3s_linear_infinite]"
                            style={{ backgroundColor: theme.loaderColor }}
                          />
                          <style>
                            {`
                              @keyframes summaryCardLine {
                                0% { transform: translateY(-120%); }
                                100% { transform: translateY(320%); }
                              }
                            `}
                          </style>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3 gap-3">
                          <div className="flex items-center space-x-2 min-w-0">
                            <div className={`p-2 rounded-md ${theme.iconColor} text-white shadow-sm shrink-0`}>
                              <IconComponent className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide truncate">{summary.moduleKey}</h3>
                              <p className="text-xs text-gray-500">{summary.primaryLabel}</p>
                            </div>
                          </div>
                          <span className="shrink-0 rounded-md bg-gray-50 px-2 py-1 text-xs font-semibold tabular-nums text-gray-600">
                            {formatNumber(summary.lguCount)} LGUs
                          </span>
                        </div>

                        <div className="flex items-baseline space-x-2">
                          <p className={`text-2xl font-bold tabular-nums ${theme.accentColor}`}>{formatNumber(summary.primaryTotal)}</p>
                          <TrendingUp className="w-3 h-3 text-green-500" />
                        </div>

                        <div className={`mt-3 grid gap-2 text-xs ${summary.moduleKey === BC ? 'grid-cols-1' : 'grid-cols-2'}`}>
                          <div className="rounded-md bg-gray-50 px-2 py-1.5">
                            <p className="font-semibold tabular-nums text-gray-800">{formatNumber(summary.secondaryTotal)}</p>
                            <p className="text-gray-500">{summary.secondaryLabel}</p>
                          </div>
                          {summary.moduleKey !== BC && (
                            <div className="rounded-md bg-gray-50 px-2 py-1.5">
                              <p className="font-semibold tabular-nums text-gray-800">{formatNumber(summary.pendingTotal)}</p>
                              <p className="text-gray-500">{summary.pendingLabel}</p>
                            </div>
                          )}
                        </div>

                        {(summary.moduleKey === BP || summary.moduleKey === WP) && (
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded-md bg-gray-50 px-2 py-1.5">
                              <p className="font-semibold tabular-nums text-gray-800">{formatNumber(summary.maleTotal)}</p>
                              <p className="text-gray-500">Male Count</p>
                            </div>
                            <div className="rounded-md bg-gray-50 px-2 py-1.5">
                              <p className="font-semibold tabular-nums text-gray-800">{formatNumber(summary.femaleTotal)}</p>
                              <p className="text-gray-500">Female Count</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
        <div className="relative flex flex-col gap-6">
          {displayedModules.includes(BP) && 
            <div ref={reportRefs[BP]}>
              <BusinessPermitReport 
              selectedRegions={hasSearched ? appliedFilter.selectedRegions : uiSelectedRegions}
              dateRange={hasSearched ? appliedFilter.dateRange : uiDateRange}
              selectedDateType={hasSearched ? appliedFilter.selectedDateType : uiSelectedDateType}
              selectedIslands={hasSearched ? appliedFilter.selectedIslands : uiSelectedIslands}
              selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={rawReportDataByModule[BP]} 
              loading={moduleLoading[BP] || bpLoading} 
              isProgressive={moduleLoading[BP]} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[BP]}
              searchStartedAt={generatedAt}
              searchLoading={moduleLoading[BP] || bpLoading}
              onTableDataChange={setHasTableData}/>
            </div>}
          {displayedModules.includes(WP) && 
            <div ref={reportRefs[WP]}>
              <WorkingPermitReport 
              selectedRegions={hasSearched ? appliedFilter.selectedRegions : uiSelectedRegions}
              dateRange={hasSearched ? appliedFilter.dateRange : uiDateRange}
              selectedDateType={hasSearched ? appliedFilter.selectedDateType : uiSelectedDateType}
              selectedIslands={hasSearched ? appliedFilter.selectedIslands : uiSelectedIslands}
              selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={rawReportDataByModule[WP]} 
              loading={moduleLoading[WP] || wpLoading} 
              isProgressive={moduleLoading[WP]} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[WP]}
              searchStartedAt={generatedAt}
              searchLoading={moduleLoading[WP] || wpLoading}
              onTableDataChange={setHasTableData}/>
            </div>}
          {displayedModules.includes(BC) && 
            <div ref={reportRefs[BC]}>
              <BrgyClearanceReport 
              selectedRegions={hasSearched ? appliedFilter.selectedRegions : uiSelectedRegions}
              dateRange={hasSearched ? appliedFilter.dateRange : uiDateRange}
              selectedDateType={hasSearched ? appliedFilter.selectedDateType : uiSelectedDateType}
              selectedIslands={hasSearched ? appliedFilter.selectedIslands : uiSelectedIslands}
              selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={rawReportDataByModule[BC]} 
              loading={moduleLoading[BC] || bcLoading} 
              isProgressive={moduleLoading[BC]} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[BC]}
              searchStartedAt={generatedAt}
              searchLoading={moduleLoading[BC] || bcLoading}
              onTableDataChange={setHasTableData}/>
            </div>}
          {displayedModules.includes(BLDG) && 
            <div ref={reportRefs[BLDG]}>
              <BuildingPermitReport 
              selectedRegions={hasSearched ? appliedFilter.selectedRegions : uiSelectedRegions}
              dateRange={hasSearched ? appliedFilter.dateRange : uiDateRange}
              selectedDateType={hasSearched ? appliedFilter.selectedDateType : uiSelectedDateType}
              selectedIslands={hasSearched ? appliedFilter.selectedIslands : uiSelectedIslands}
              selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={rawReportDataByModule[BLDG]} 
              loading={moduleLoading[BLDG] || bldgLoading} 
              isProgressive={moduleLoading[BLDG]} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[BLDG]}
              searchStartedAt={generatedAt}
              searchLoading={moduleLoading[BLDG] || bldgLoading}
              onTableDataChange={setHasTableData}/>
            </div>}
          {displayedModules.includes(CO) && 
            <div ref={reportRefs[CO]}>
              <CertificateOfOccupancyReport 
              selectedRegions={hasSearched ? appliedFilter.selectedRegions : uiSelectedRegions}
              dateRange={hasSearched ? appliedFilter.dateRange : uiDateRange}
              selectedDateType={hasSearched ? appliedFilter.selectedDateType : uiSelectedDateType}
              selectedIslands={hasSearched ? appliedFilter.selectedIslands : uiSelectedIslands}
              selectedProvinces={selectedProvinces} 
              selectedCities={selectedCities} 
              apiData={rawReportDataByModule[CO]} 
              loading={moduleLoading[CO] || coLoading} 
              isProgressive={moduleLoading[CO]} 
              lguToRegion={lguToRegion} 
              hasSearched={hasSearched} 
              moduleLoading={moduleLoading[CO]}
              searchStartedAt={generatedAt}
              searchLoading={moduleLoading[CO] || coLoading}
              onTableDataChange={setHasTableData}/>
            </div>}
          {!loading && !hasSearched && uiSelectedModules.length === 0 && (
            <div className="text-center bg-card p-8 rounded-lg border text-secondary-foreground border-border shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <Filter className="h-16 w-16 text-muted-foreground" />
                <h3 className="text-2xl font-bold text-foreground">Start by Selecting Filters</h3>
                <p className="text-md text-muted-foreground max-w-md">Please select a <span className="font-semibold text-primary">Module</span>, <span className="font-semibold text-primary">Region</span>, and <span className="font-semibold text-primary">Date Range</span> to generate a report.</p>
              </div>
            </div>
          )}
        </div>
        <ScrollToTopButton scrollTargetRef={tableContainerRef} />
        <ProgressIndicator isLoading={isSearchActive || lguRegionLoading} progress={progressState} counts={counts} moduleLoading={moduleLoading} onModuleClick={scrollToReport}/>
      </div>
    </div>
  );
};

export default Reports;

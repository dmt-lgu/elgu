import React, { useEffect, useMemo, useRef, useState } from 'react';
import BusinessPermitReport, { getDateRangeLabel } from './table/BusinessPermitReport';
import FilterSection from './components/FilterSection';
import axios from '../../../plugin/axios';
import { regionMapping } from '../../../screens/Admin/Report/utils/mockData';
import dictImage from '../../../assets/logo/dict.png';
import { exportTableReportToPDF } from './utils/reportToPDF';
import { exportTableReportToExcel } from './utils/reportToExcel';
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
import { getModuleFilteredResults } from './utils/reportFilterUtils';
import BuildingPermitReport from './table/BuildingPermitReport';
import { setbuildingPermiAppliedFilter, setbuildingPermitData } from '@/redux/buildingPermitSlice';
import CertificateOfOccupancyReport from './table/CertificateOfOccupancyReport';
import { setcertificateOfOccupancy, setCertificateOfOccupancyAppliedFilter } from '@/redux/CertificateOfOccupancySlice';
import ProgressIndicator from './components/ProgressIndicator';
import Loading from './utils/Loading';

type DateRange = { start: string | null; end: string | null };
type AppliedFilter = {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  dateRange: DateRange;
  selectedDateType: string;
  selectedIslands: string[];
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
  apiUrl, appliedFilter, reduxTableData, reduxAppliedFilter,
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
    if (isSelectAll) {
      setData(null);
      setLoading(false);
      return;
    }
    
    if (!hasSearched || skipLoading || (!appliedFilter.selectedRegions.length && !appliedFilter.selectedIslands.length) || !appliedFilter.dateRange.start || !appliedFilter.dateRange.end) {
      setData(null);
      setLoading(false);
      return;
    }

    if (reduxTableData && reduxAppliedFilter && JSON.stringify(currentFilter) === JSON.stringify(reduxAppliedFilter)) {
      setData(reduxTableData);
      setLoading(false);
      return;
    }

    setLoading(true);
    const payload: any = {
      locationName: appliedFilter.selectedRegions,
      startDate: appliedFilter.dateRange.start ? formatLocalDate(ensureDate(appliedFilter.dateRange.start)) : null,
      endDate: appliedFilter.dateRange.end ? formatLocalDate(ensureDate(appliedFilter.dateRange.end)) : null,
    };
    Object.keys(payload).forEach(key => ((Array.isArray(payload[key]) && payload[key].length === 0) || payload[key] === null) ? delete payload[key] : {});

    axios.post(apiUrl, payload, { signal: abortSignal })
      .then((response) => {
        setData(response.data);
        setReduxTableData(response.data);
        setReduxAppliedFilter(currentFilter);
      })
      .catch((err: any) => {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED" && err?.message !== "canceled") {
          setData(null);
          setReduxTableData(null);
        }
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    hasSearched, JSON.stringify(currentFilter), JSON.stringify(reduxAppliedFilter),
    reduxTableData, apiUrl, skipLoading, isSelectAll, setReduxTableData, setReduxAppliedFilter, abortSignal
  ]);

  return { loading };
}

const Reports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const { selectedModules, selectedProvinces, selectedCities } = useSelector((state: RootState) => state.reportFilter);
  const persistedAppliedFilter = useSelector((state: RootState) => state.businessPermitTable.appliedFilter);
  const { tableData: bpTableData } = useSelector((state: RootState) => state.businessPermitTable);
  const { tableData: wpTableData } = useSelector((state: RootState) => state.workingPermitTable);
  const { tableData: bcTableData } = useSelector((state: RootState) => state.brgyClearanceTable);
  const { tableData: bldgTableData } = useSelector((state: RootState) => state.buildingPermit);
  const { tableData: coTableData } = useSelector((state: RootState) => state.certificateOfOccupancy);
  
  const [appliedFilter, setAppliedFilterState] = useState<AppliedFilter>(() => persistedAppliedFilter || {
    selectedRegions: [], selectedProvinces: [], selectedCities: [],
    dateRange: { start: null, end: null }, selectedDateType: "",
    selectedIslands: [], allRegionsSelected: false,
  });
  
  const [hasSearched, setHasSearched] = useState<boolean>(() => !!persistedAppliedFilter);
  const [lastAppliedFilters, setLastAppliedFilters] = useState<any>(() => persistedAppliedFilter);
  const [cancelled, setCancelled] = useState(false);
  const [hasTableData, setHasTableData] = useState(false);
  const [lguToRegion, setLguToRegion] = useState<Record<string, string>>({});
  const [lguRegionLoading, setLguRegionLoading] = useState(true);
  const searchAbortController = useRef<AbortController | null>(null);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [isProgressiveLoading, setIsProgressiveLoading] = useState(false);
  const [progressiveData, setProgressiveData] = useState<ProgressiveDataState>({ [BP]: null, [WP]: null, [BC]: null, [BLDG]: null, [CO]: null });
  const [progressState, setProgressState] = useState<ProgressState>({});

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
      selectedModules.forEach(moduleKey => {
        initialProgress[moduleKey] = { currentRegion: "Initializing...", currentIndex: 0, totalRegions: sortedRegions.length };
      });
      setProgressState(initialProgress);

      const initialState: ProgressiveDataState = {};
      selectedModules.forEach(moduleKey => { initialState[moduleKey] = { results: [] }; });
      setProgressiveData(initialState);
      
      for (let i = 0; i < sortedRegions.length; i++) {
        const region = sortedRegions[i];
        
        setProgressState(prev => {
          const newState = { ...prev };
          selectedModules.forEach(moduleKey => {
            newState[moduleKey] = { currentRegion: region, currentIndex: i + 1, totalRegions: sortedRegions.length };
          });
          return newState;
        });
        
        if (signal.aborted) break;

        const payload = {
            locationName: [region],
            startDate: appliedFilter.dateRange.start ? formatLocalDate(ensureDate(appliedFilter.dateRange.start)) : null,
            endDate: appliedFilter.dateRange.end ? formatLocalDate(ensureDate(appliedFilter.dateRange.end)) : null,
        };
        const fetchAndUpdate = (moduleKey: string, url: string) => {
          return axios.post(url, payload, { signal })
            .then(res => {
              if (res.data?.results) {
                setProgressiveData(prev => ({ ...prev, [moduleKey]: { results: [...(prev[moduleKey]?.results || []), ...res.data.results] } }));
              }
            }).catch(err => { if (err.name !== 'CanceledError') console.error(`Failed to fetch ${moduleKey} for ${region}` )});
        };
        const promises = [];
        if (selectedModules.includes(BP)) promises.push(fetchAndUpdate(BP, `${import.meta.env.VITE_URL}/api/bp/transaction-count`));
        if (selectedModules.includes(WP)) promises.push(fetchAndUpdate(WP, `${import.meta.env.VITE_URL}/api/wp/transaction-count`));
        if (selectedModules.includes(BC)) promises.push(fetchAndUpdate(BC, `${import.meta.env.VITE_URL}/api/bc/transaction-count`));
        if (selectedModules.includes(BLDG)) promises.push(fetchAndUpdate(BLDG, `${import.meta.env.VITE_URL}/api/bpco/transaction-count-bp`));
        if (selectedModules.includes(CO)) promises.push(fetchAndUpdate(CO, `${import.meta.env.VITE_URL}/api/bpco/transaction-count-co`));
        await Promise.all(promises);
      }
      setIsProgressiveLoading(false);
      setProgressState({});
    };
    fetchSequentially();
    return () => abortController.abort();
  }, [hasSearched, isSelectAll, JSON.stringify(appliedFilter), JSON.stringify(selectedModules)]);

  const { loading: bpLoading } = useReportData({ moduleKey: BP, apiUrl: `${import.meta.env.VITE_URL}/api/bp/transaction-count`, appliedFilter, lguToRegion, reduxTableData: bpTableData, reduxAppliedFilter: persistedAppliedFilter, setReduxTableData: data => dispatch(setTableData(data)), setReduxAppliedFilter: filter => dispatch(setAppliedFilter(filter)), hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !selectedModules.includes(BP), isSelectAll });
  const { loading: wpLoading } = useReportData({ moduleKey: WP, apiUrl: `${import.meta.env.VITE_URL}/api/wp/transaction-count`, appliedFilter, lguToRegion, reduxTableData: wpTableData, reduxAppliedFilter: persistedAppliedFilter, setReduxTableData: data => dispatch(setWorkingPermitTableData(data)), setReduxAppliedFilter: filter => dispatch(setWorkingPermitAppliedFilter(filter)), hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !selectedModules.includes(WP), isSelectAll });
  const { loading: bcLoading } = useReportData({ moduleKey: BC, apiUrl: `${import.meta.env.VITE_URL}/api/bc/transaction-count`, appliedFilter, lguToRegion, reduxTableData: bcTableData, reduxAppliedFilter: persistedAppliedFilter, setReduxTableData: data => dispatch(setBrgyClearanceTableData(data)), setReduxAppliedFilter: filter => dispatch(setBrgyClearanceAppliedFilter(filter)), hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !selectedModules.includes(BC), isSelectAll });
  const { loading: bldgLoading } = useReportData({ moduleKey: BLDG, apiUrl: `${import.meta.env.VITE_URL}/api/bpco/transaction-count-bp`, appliedFilter, lguToRegion, reduxTableData: bldgTableData, reduxAppliedFilter: persistedAppliedFilter, setReduxTableData: data => dispatch(setbuildingPermitData(data)), setReduxAppliedFilter: filter => dispatch(setbuildingPermiAppliedFilter(filter)), hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !selectedModules.includes(BLDG), isSelectAll });
  const { loading: coLoading } = useReportData({ moduleKey: CO, apiUrl: `${import.meta.env.VITE_URL}/api/bpco/transaction-count-co`, appliedFilter, lguToRegion, reduxTableData: coTableData, reduxAppliedFilter: persistedAppliedFilter, setReduxTableData: data => dispatch(setcertificateOfOccupancy(data)), setReduxAppliedFilter: filter => dispatch(setCertificateOfOccupancyAppliedFilter(filter)), hasSearched, abortSignal: searchAbortController.current?.signal, skipLoading: !selectedModules.includes(CO), isSelectAll });
  
  const loading = !cancelled && (isProgressiveLoading || (!isSelectAll && ((selectedModules.includes(BP) && bpLoading) || (selectedModules.includes(WP) && wpLoading) || (selectedModules.includes(BC) && bcLoading) || (selectedModules.includes(BLDG) && bldgLoading) || (selectedModules.includes(CO) && coLoading))));
  
  const handleSearch = (filters: any) => {
    setCancelled(false);
    const normalizedDateRangeVal = {
      start: filters.dateRange?.start ? (typeof filters.dateRange.start === "string" ? filters.dateRange.start : filters.dateRange.start.toISOString().slice(0, 10)) : null,
      end: filters.dateRange?.end ? (typeof filters.dateRange.end === "string" ? filters.dateRange.end : filters.dateRange.end.toISOString().slice(0, 10)) : null,
    };
    const normalizedFilters = { ...filters, dateRange: normalizedDateRangeVal, selectedModules: (filters.selectedModules || []).slice().sort() };
    if (filters.skipApi) { return; }
    if (areFiltersEqual(normalizedFilters, lastAppliedFilters)) return;
    setAppliedFilterState(normalizedFilters);
    setHasSearched(true);
    setLastAppliedFilters(normalizedFilters);
    dispatch(setAppliedFilter(normalizedFilters));
    dispatch(setWorkingPermitAppliedFilter(normalizedFilters));
    dispatch(setBrgyClearanceAppliedFilter(normalizedFilters));
    dispatch(setbuildingPermiAppliedFilter(normalizedFilters));
    dispatch(setCertificateOfOccupancyAppliedFilter(normalizedFilters));
    if (searchAbortController.current) searchAbortController.current.abort();
    searchAbortController.current = new AbortController();
  };

  const handleReset = () => {
    setProgressState({});
    const keys: (keyof RootState['reportFilter'])[] = ['selectedRegions', 'selectedProvinces', 'selectedCities', 'selectedIslands', 'selectedModules'];
    keys.forEach(key => dispatch(updateFilterField({ key, value: [] })));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
    dispatch(updateFilterField({ key: 'selectedDateType', value: "" }));
    setHasSearched(false);
    setLastAppliedFilters(null);
    setAppliedFilterState({ selectedRegions: [], selectedProvinces: [], selectedCities: [], dateRange: { start: null, end: null }, selectedDateType: "", selectedIslands: [] });
    setHasTableData(false);
    dispatch(setTableData(null)); dispatch(setAppliedFilter(null));
    dispatch(setWorkingPermitTableData(null)); dispatch(setWorkingPermitAppliedFilter(null));
    dispatch(setBrgyClearanceTableData(null)); dispatch(setBrgyClearanceAppliedFilter(null));
    dispatch(setbuildingPermitData(null)); dispatch(setbuildingPermiAppliedFilter(null));
    dispatch(setcertificateOfOccupancy(null)); dispatch(setCertificateOfOccupancyAppliedFilter(null));
  };
  
  const handleCancelSearch = () => {
    setProgressState({});
    if (searchAbortController.current) searchAbortController.current.abort();
    setHasSearched(false);
    setCancelled(true);
    setIsProgressiveLoading(false);
    Swal.fire({ icon: "info", title: "Search Cancelled", timer: 1200, showConfirmButton: false });
  };

  const handleDownload = async (type: "pdf" | "excel", permitTypes?: ("business" | "working" | "barangay" | "building" | "certificate")[]) => {
    const normalizedDateRange = normalizeDateRange(appliedFilter.dateRange);
    const dateRangeLabel = getDateRangeLabel(normalizedDateRange.start, normalizedDateRange.end, appliedFilter.selectedDateType);
    const modulesToExport = permitTypes ? permitTypes.map(pt => {
        if (pt === "business") return BP; if (pt === "working") return WP;
        if (pt === "barangay") return BC; if (pt === "building") return BLDG;
        if (pt === "certificate") return CO;
        return "";
    }).filter(Boolean) : selectedModules;
    const downloadAction = async (moduleKey: string, fileLabel: string, moduleLabel: string) => {
        const rawData = moduleKey === BP ? bpTableData : moduleKey === WP ? wpTableData : moduleKey === BC ? bcTableData : moduleKey === BLDG ? bldgTableData : coTableData;
        const filteredResults = getModuleFilteredResults({
            moduleKey, apiData: rawData, lguToRegion, dateRange: appliedFilter.dateRange,
            selectedRegions: appliedFilter.selectedRegions, selectedProvinces: appliedFilter.selectedProvinces,
            selectedCities: appliedFilter.selectedCities, selectedIslands: appliedFilter.selectedIslands,
            selectedDates: appliedFilter.selectedDateType ? [appliedFilter.selectedDateType] : []
        });
        if (type === "pdf") {
            await exportTableReportToPDF({ filteredResults, lguToRegion, dateRangeLabel, logoUrl: dictImage, fileLabel, moduleLabel, selectedDateType: appliedFilter.selectedDateType });
        } else {
            exportTableReportToExcel({ filteredResults, lguToRegion, dateRangeLabel, fileLabel, moduleLabel, selectedDateType: appliedFilter.selectedDateType });
        }
    };
    if (modulesToExport.includes(BP)) await downloadAction(BP, "business-permit-report", "Business Permit");
    if (modulesToExport.includes(WP)) await downloadAction(WP, "working-permit-report", "Working Permit");
    if (modulesToExport.includes(BC)) await downloadAction(BC, "barangay-clearance-report", "Barangay Clearance");
    if (modulesToExport.includes(BLDG)) await downloadAction(BLDG, "building-permit-report", "Building Permit");
    if (modulesToExport.includes(CO)) await downloadAction(CO, "certificate-of-occupancy-report", "Certificate of Occupancy");
  };

  return (
    <div ref={tableContainerRef} style={{ position: "relative", marginTop: 24, height: "88vh", overflow: "auto" }}>
      <div className='p-6 max-w-[1200px] mx-auto bg-background flex flex-col gap-6'>
        <FilterSection
          onSearch={handleSearch} onDownload={handleDownload} onReset={handleReset}
          hasTableData={hasTableData} loading={!!loading || lguRegionLoading}
          onCancel={handleCancelSearch} hasSearched={hasSearched}
        />
        
        <div className="relative flex flex-col gap-6">
          {loading && !isProgressiveLoading && <Loading />}
          {isProgressiveLoading && <Loading />}

          {selectedModules.includes(BP) && (
            <BusinessPermitReport
              {...appliedFilter}
              selectedProvinces={selectedProvinces} selectedCities={selectedCities}
              apiData={isSelectAll ? progressiveData[BP] : bpTableData}
              loading={(isSelectAll ? isProgressiveLoading : bpLoading)}
              isProgressive={isProgressiveLoading}
              lguToRegion={lguToRegion} hasSearched={hasSearched} onTableDataChange={setHasTableData}
            />
          )}
          
          {selectedModules.includes(WP) && (
            <WorkingPermitReport
              {...appliedFilter}
              selectedProvinces={selectedProvinces} selectedCities={selectedCities}
              apiData={isSelectAll ? progressiveData[WP] : wpTableData}
              loading={(isSelectAll ? isProgressiveLoading : wpLoading)}
              isProgressive={isProgressiveLoading}
              lguToRegion={lguToRegion} hasSearched={hasSearched} onTableDataChange={setHasTableData}
            />
          )}
          
          {selectedModules.includes(BC) && (
            <BrgyClearanceReport
              {...appliedFilter}
              selectedProvinces={selectedProvinces} selectedCities={selectedCities}
              apiData={isSelectAll ? progressiveData[BC] : bcTableData}
              loading={(isSelectAll ? isProgressiveLoading : bcLoading)}
              isProgressive={isProgressiveLoading}
              lguToRegion={lguToRegion} hasSearched={hasSearched} onTableDataChange={setHasTableData}
            />
          )}

          {selectedModules.includes(BLDG) && (
            <BuildingPermitReport
              {...appliedFilter}
              selectedProvinces={selectedProvinces} selectedCities={selectedCities}
              apiData={isSelectAll ? progressiveData[BLDG] : bldgTableData}
              loading={(isSelectAll ? isProgressiveLoading : bldgLoading)}
              isProgressive={isProgressiveLoading}
              lguToRegion={lguToRegion} hasSearched={hasSearched} onTableDataChange={setHasTableData}
            />
          )}

          {selectedModules.includes(CO) && (
            <CertificateOfOccupancyReport
              {...appliedFilter}
              selectedProvinces={selectedProvinces} selectedCities={selectedCities}
              apiData={isSelectAll ? progressiveData[CO] : coTableData}
              loading={(isSelectAll ? isProgressiveLoading : coLoading)}
              isProgressive={isProgressiveLoading}
              lguToRegion={lguToRegion} hasSearched={hasSearched} onTableDataChange={setHasTableData}
            />
          )}

          {!hasSearched && !loading && selectedModules.length === 0 && (
            <div className="text-center bg-card p-8 rounded-lg border text-secondary-foreground border-border shadow-sm">
              <div className="flex flex-col items-center gap-4">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-16 w-16 text-muted-foreground"><path d="M20 7h-9" /><path d="M14 17H4" /><circle cx="17" cy="17" r="3" /><circle cx="7" cy="7" r="3" /></svg>
                <h3 className="text-2xl font-bold text-foreground">Start by Selecting Filters</h3>
                <p className="text-md text-muted-foreground max-w-md">
                  Please select a <span className="font-semibold text-primary">Module</span>,{' '}
                  <span className="font-semibold text-primary">Region</span>, and{' '}
                  <span className="font-semibold text-primary">Date Range</span> to generate a report.
                </p>
              </div>
            </div>
          )}
        </div>
        
        <ScrollToTopButton scrollTargetRef={tableContainerRef} />
        <ProgressIndicator isLoading={isProgressiveLoading} progress={progressState} />
      </div>
    </div>
  );
};

export default Reports;


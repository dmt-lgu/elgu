import React, { useEffect, useMemo, useRef, useState } from 'react';
import BusinessPermitReport, { filterTableResults, getDateRangeLabel } from './table/BusinessPermitReport';
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

// --- NEW: Working Permit Redux persistence imports ---
import {
  setWorkingPermitTableData,
  setWorkingPermitAppliedFilter,
} from '@/redux/workingPermitTableSlice';

// --- NEW: Barangay Clearance Redux persistence imports ---
import {
  setBrgyClearanceTableData,
  setBrgyClearanceAppliedFilter,
} from '@/redux/brgyClearanceTableSlice';
import { getModuleFilteredResults } from './utils/reportFilterUtils';

type DateRange = { start: string | null; end: string | null };

type AppliedFilter = {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  dateRange: DateRange;
  selectedDateType: string;
  selectedIslands: string[];
};

const BP = "Business Permit";
const WP = "Working Permit";
const BC = "Barangay Clearance";

// Helper: deep filter equality
function areFiltersEqual(a: any, b: any) {
  // If either is null/undefined, only equal if both are null/undefined
  if (!a && !b) return true;
  if (!a || !b) return false;
  // Make sure to include selectedModules and all other relevant fields
  return JSON.stringify({
    ...a,
    selectedModules: (a.selectedModules || []).slice().sort(),
  }) === JSON.stringify({
    ...b,
    selectedModules: (b.selectedModules || []).slice().sort(),
  });
}

function ensureDate(val: Date | string | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeDateRange(dateRange: { start: Date | string | null; end: Date | string | null }) {
  return {
    start: ensureDate(dateRange.start),
    end: ensureDate(dateRange.end),
  };
}

function formatLocalDate(date: Date | null): string | null {
  if (!date) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// --- Custom hook for fetching and persisting report data ---
function useReportData({
  moduleKey,
  apiUrl,
  appliedFilter,
  reduxTableData,
  reduxAppliedFilter,
  setReduxTableData,
  setReduxAppliedFilter,
  hasSearched,
  abortSignal,
  skipLoading, 
}: {
  moduleKey: string;
  apiUrl: string;
  appliedFilter: AppliedFilter & { skipLoading?: boolean };
  lguToRegion: Record<string, string>;
  reduxTableData: any;
  reduxAppliedFilter: any;
  setReduxTableData: (data: any) => void;
  setReduxAppliedFilter: (filter: any) => void;
  hasSearched: boolean;
  abortSignal: AbortSignal | undefined;
  skipLoading?: boolean; 
}) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Compose the current filter for this module
  const currentFilter = useMemo(() => ({
    selectedRegions: appliedFilter.selectedRegions,
    selectedProvinces: appliedFilter.selectedProvinces,
    selectedCities: appliedFilter.selectedCities,
    selectedIslands: appliedFilter.selectedIslands,
    dateRange: appliedFilter.dateRange,
    // Optionally add more fields if needed
  }), [
    appliedFilter.selectedRegions,
    appliedFilter.selectedProvinces,
    appliedFilter.selectedCities,
    appliedFilter.selectedIslands,
    appliedFilter.dateRange?.start,
    appliedFilter.dateRange?.end,
  ]);

  useEffect(() => {
    if (
      skipLoading ||
      !hasSearched ||
      (!appliedFilter.selectedRegions.length && !appliedFilter.selectedIslands.length) ||
      !appliedFilter.dateRange.start ||
      !appliedFilter.dateRange.end
    ) {
      setData(null);
      setLoading(false);
      return;
    }

    // Use persisted data if filter matches
    if (
      reduxTableData &&
      reduxAppliedFilter &&
      JSON.stringify(currentFilter) === JSON.stringify(reduxAppliedFilter)
    ) {
      setData(reduxTableData);
      setLoading(false);
      return;
    }

    // Else, fetch new data
    setLoading(true);

    const payload: any = {
      locationName: appliedFilter.selectedRegions,
      provinces: appliedFilter.selectedProvinces,
      cities: appliedFilter.selectedCities,
      startDate: appliedFilter.dateRange.start ? formatLocalDate(ensureDate(appliedFilter.dateRange.start)) : null,
      endDate: appliedFilter.dateRange.end ? formatLocalDate(ensureDate(appliedFilter.dateRange.end)) : null,
    };
    Object.keys(payload).forEach(
      (key) =>
        (Array.isArray(payload[key]) && payload[key].length === 0) ||
        payload[key] === null
          ? delete payload[key]
          : null
    );

    axios.post(apiUrl, payload, { signal: abortSignal })
      .then((response) => {
        setData(response.data);
        // Only persist for BP, WP, and BC (main Redux slices)
        if (moduleKey === BP) {
          setReduxTableData(response.data);
          setReduxAppliedFilter(currentFilter);
        }
        if (moduleKey === WP) {
          setReduxTableData(response.data);
          setReduxAppliedFilter(currentFilter);
        }
        if (moduleKey === BC) {
          setReduxTableData(response.data);
          setReduxAppliedFilter(currentFilter);
        }
      })
      .catch((err: any) => {
        if (err?.name === "CanceledError" || err?.code === "ERR_CANCELED" || err?.message === "canceled") {
          // Request was cancelled, do not show error
        } else {
          setData(null);
          if (moduleKey === BP) {
            setReduxTableData(null);
          }
          if (moduleKey === WP) {
            setReduxTableData(null);
          }
          if (moduleKey === BC) {
            setReduxTableData(null);
          }
        }
      })
      .finally(() => {
        setLoading(false);
      });
    // eslint-disable-next-line
  }, [
    hasSearched,
    JSON.stringify(currentFilter),
    JSON.stringify(reduxAppliedFilter),
    reduxTableData,
    apiUrl,
    abortSignal,
    moduleKey,
    skipLoading,
  ]);

  return { data, loading };
}

const Reports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const persistedTableData = useSelector((state: RootState) => state.businessPermitTable.tableData);
  const persistedAppliedFilter = useSelector((state: RootState) => state.businessPermitTable.appliedFilter);
  const selectedModules = useSelector((state: RootState) => state.reportFilter.selectedModules);

  // --- NEW: Working Permit Redux state ---
  const persistedWPTableData = useSelector((state: RootState) => state.workingPermitTable.tableData);
  const persistedWPAppliedFilter = useSelector((state: RootState) => state.workingPermitTable.appliedFilter);

  // --- NEW: Barangay Clearance Redux state ---
  const persistedBrgyTableData = useSelector((state: RootState) => state.brgyClearanceTable.tableData);
  const persistedBrgyAppliedFilter = useSelector((state: RootState) => state.brgyClearanceTable.appliedFilter);

  // Local state
  const [appliedFilter, setAppliedFilterState] = useState<AppliedFilter>({
    selectedRegions: [],
    selectedProvinces: [],
    selectedCities: [],
    dateRange: { start: null, end: null },
    selectedDateType: "",
    selectedIslands: [],
  });
  const [lastAppliedFilters, setLastAppliedFilters] = useState<any>(null);
  const [hasTableData, setHasTableData] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // LGU-to-region mapping
  const [lguToRegion, setLguToRegion] = useState<Record<string, string>>({});
  const [lguRegionLoading, setLguRegionLoading] = useState(true);

  // Abort controller for fetches
  const searchAbortController = useRef<AbortController | null>(null);

  // Table container ref for scroll-to-top
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // On mount, restore persisted filter/data if available
  useEffect(() => {
    if (persistedAppliedFilter) {
      setAppliedFilterState(persistedAppliedFilter);
      setHasSearched(true);
    }
  }, []);

  // Normalize date range for useMemo
  const normalizedDateRange = useMemo(
    () => normalizeDateRange(appliedFilter.dateRange),
    [appliedFilter.dateRange?.start, appliedFilter.dateRange?.end]
  );

  // Fetch LGU-to-region mapping on mount
  useEffect(() => {
    const fetchLguToRegion = async () => {
      setLguRegionLoading(true);
      try {
        const res = await axios.get(`${import.meta.env.VITE_URL}/api/bp/lgu-list`);
        const data = res.data;
        const mapping: Record<string, string> = {};
        Object.entries(data).forEach(([regionKey, lguList]) => {
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

  // --- Always call all hooks, use skipLoading to control fetching ---
  const bpReport = useReportData({
    moduleKey: BP,
    apiUrl: `${import.meta.env.VITE_URL}/api/bp/transaction-count`,
    appliedFilter,
    lguToRegion,
    reduxTableData: persistedTableData,
    reduxAppliedFilter: persistedAppliedFilter,
    setReduxTableData: (data) => dispatch(setTableData(data)),
    setReduxAppliedFilter: (filter) => dispatch(setAppliedFilter(filter)),
    hasSearched,
    abortSignal: searchAbortController.current?.signal,
    skipLoading: !selectedModules.includes(BP) || !hasSearched,
  });

  const wpReport = useReportData({
    moduleKey: WP,
    apiUrl: `${import.meta.env.VITE_URL}/api/wp/transaction-count`,
    appliedFilter,
    lguToRegion,
    reduxTableData: persistedWPTableData,
    reduxAppliedFilter: persistedWPAppliedFilter,
    setReduxTableData: (data) => dispatch(setWorkingPermitTableData(data)),
    setReduxAppliedFilter: (filter) => dispatch(setWorkingPermitAppliedFilter(filter)),
    hasSearched,
    abortSignal: searchAbortController.current?.signal,
    skipLoading: !selectedModules.includes(WP) || !hasSearched,
  });

  const bcReport = useReportData({
    moduleKey: BC,
    apiUrl: `${import.meta.env.VITE_URL}/api/bc/transaction-count`,
    appliedFilter,
    lguToRegion,
    reduxTableData: persistedBrgyTableData,
    reduxAppliedFilter: persistedBrgyAppliedFilter,
    setReduxTableData: (data) => dispatch(setBrgyClearanceTableData(data)),
    setReduxAppliedFilter: (filter) => dispatch(setBrgyClearanceAppliedFilter(filter)),
    hasSearched,
    abortSignal: searchAbortController.current?.signal,
    skipLoading: !selectedModules.includes(BC) || !hasSearched,
  });

  // For loading state, combine only those modules that are selected
  const loading =
    (selectedModules.includes(BP) && bpReport.loading) ||
    (selectedModules.includes(WP) && wpReport.loading) ||
    (selectedModules.includes(BC) && bcReport.loading);

  // For table data, use the conditional hook results
  const tableData = bpReport.data;
  const wpTableData = wpReport.data;
  const bcTableData = bcReport.data;

  const getFilteredResults = (moduleKey: string) => {
  let rawData: any[] = [];
  if (moduleKey === BP) {
    rawData = hasSearched ? tableData : persistedTableData;
  } else if (moduleKey === WP) {
    rawData = hasSearched ? wpTableData : persistedWPTableData;
  } else if (moduleKey === BC) {
    rawData = hasSearched ? bcTableData : persistedBrgyTableData;
  }
  // Use the new shared utility for correct filtering per module
  return getModuleFilteredResults({
    moduleKey,
    apiData: rawData,
    selectedRegions: appliedFilter.selectedRegions,
    selectedProvinces: appliedFilter.selectedProvinces,
    selectedCities: appliedFilter.selectedCities,
    selectedDates: appliedFilter.selectedDateType ? [appliedFilter.selectedDateType] : [],
    selectedIslands: appliedFilter.selectedIslands,
    lguToRegion,
    dateRange: appliedFilter.dateRange,
  });
};

  // --- PDF/Excel Export Handler ---
  const handleDownload = async (type: "pdf" | "excel", permitTypes?: ("business" | "working" | "barangay")[]) => {
    const modulesToExport = permitTypes
      ? permitTypes.map((type) => {
          if (type === "business") return BP;
          if (type === "working") return WP;
          if (type === "barangay") return BC;
          return "";
        }).filter(Boolean)
      : selectedModules;

    // Business Permit
    if (modulesToExport.includes(BP)) {
      const filteredResults = getFilteredResults(BP);
      const dateRangeLabel = getDateRangeLabel(
        normalizedDateRange.start,
        normalizedDateRange.end,
        appliedFilter.selectedDateType
      );
      if (type === "pdf") {
        await exportTableReportToPDF({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          logoUrl: dictImage,
          fileLabel: "business-permit-report",
          isDayMode: false,
          isBarangayClearance: false,
          moduleLabel: "Business Permit",
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "business-permit-report",
          isDayMode: false,
        });
      }
    }

    // Working Permit
    if (modulesToExport.includes(WP)) {
      const filteredResults = getFilteredResults(WP);
      const dateRangeLabel = getDateRangeLabel(
        normalizedDateRange.start,
        normalizedDateRange.end,
        appliedFilter.selectedDateType
      );
      if (type === "pdf") {
        await exportTableReportToPDF({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          logoUrl: dictImage,
          fileLabel: "working-permit-report",
          isDayMode: false,
          isBarangayClearance: false,
          moduleLabel: "Working Permit",
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "working-permit-report",
          isDayMode: false,
        });
      }
    }

    // Barangay Clearance
    if (modulesToExport.includes(BC)) {
      const filteredResults = getFilteredResults(BC);
      const dateRangeLabel = getDateRangeLabel(
        normalizedDateRange.start,
        normalizedDateRange.end,
        appliedFilter.selectedDateType
      );
      if (type === "pdf") {
        await exportTableReportToPDF({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          logoUrl: dictImage,
          fileLabel: "barangay-clearance-report",
          isDayMode: false,
          moduleLabel: "Barangay Clearance",
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "barangay-clearance-report",
          isDayMode: false,
        });
      }
    }
  };

  // Search handler
  const handleSearch = (filters: any) => {
    const normalizedDateRange = {
      start: filters.dateRange?.start
        ? typeof filters.dateRange.start === "string"
          ? filters.dateRange.start
          : filters.dateRange.start instanceof Date
            ? filters.dateRange.start.toISOString().slice(0, 10)
            : null
        : null,
      end: filters.dateRange?.end
        ? typeof filters.dateRange.end === "string"
          ? filters.dateRange.end
          : filters.dateRange.end instanceof Date
            ? filters.dateRange.end.toISOString().slice(0, 10)
            : null
        : null,
    };

    const normalizedFilters = {
      ...filters,
      dateRange: normalizedDateRange,
      selectedModules: (filters.selectedModules || []).slice().sort(),
    };

    // If skipApi is true, only update filter state (for local filtering)
    if (filters.skipApi) {
    setAppliedFilterState(normalizedFilters);
    dispatch(setAppliedFilter(normalizedFilters));
    setHasSearched(false);
    return;
  }

    if (areFiltersEqual(normalizedFilters, lastAppliedFilters)) {
    return;
  }

    setAppliedFilterState(normalizedFilters);
  setHasSearched(true);
  setLastAppliedFilters(normalizedFilters);
  dispatch(setAppliedFilter(normalizedFilters));
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
    searchAbortController.current = new AbortController();
  };

  // Reset handler
  const handleReset = () => {
    dispatch(updateFilterField({ key: 'selectedRegions', value: [] }));
    dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
    dispatch(updateFilterField({ key: 'selectedDateType', value: "" }));
    dispatch(updateFilterField({ key: 'selectedIslands', value: [] }));
    dispatch(updateFilterField({ key: 'selectedModules', value: [] }));
    setHasSearched(false);
    setLastAppliedFilters(null);
    setAppliedFilterState({
      selectedRegions: [],
      selectedProvinces: [],
      selectedCities: [],
      dateRange: { start: null, end: null },
      selectedDateType: "",
      selectedIslands: [],
    });
    setHasTableData(false);
    dispatch(setTableData(null));
    dispatch(setAppliedFilter(null));
    // --- NEW: Reset Working Permit Redux state ---
    dispatch(setWorkingPermitTableData(null));
    dispatch(setWorkingPermitAppliedFilter(null));
    // --- NEW: Reset Barangay Clearance Redux state ---
    dispatch(setBrgyClearanceTableData(null));
    dispatch(setBrgyClearanceAppliedFilter(null));
  };

  // Cancel search handler
  const handleCancelSearch = () => {
    if (searchAbortController.current) {
      searchAbortController.current.abort();
      searchAbortController.current = null;
    }
    Swal.fire({
      icon: "info",
      title: "Search Cancelled",
      text: "The search request was cancelled.",
      timer: 1200,
      showConfirmButton: false,
    });
  };

  return (
    <div
      ref={tableContainerRef}
      style={{
        position: "relative",
        marginTop: 24,
        marginBottom: 0,
        height: "88vh",
        overflow: "auto",
      }}
    >
      <div className='p-6 max-w-[1200px] mx-auto bg-background flex flex-col gap-6'>
        <FilterSection
          onSearch={handleSearch}
          onDownload={handleDownload}
          onReset={handleReset}
          hasTableData={hasTableData}
          loading={!!loading || lguRegionLoading}
          onCancel={handleCancelSearch}
          hasSearched={hasSearched}
        />

        {selectedModules.includes(BP) && (
          <BusinessPermitReport
            selectedRegions={appliedFilter.selectedRegions}
            dateRange={appliedFilter.dateRange}
            selectedProvinces={appliedFilter.selectedProvinces}
            selectedCities={appliedFilter.selectedCities}
            selectedDates={appliedFilter.selectedDateType ? [appliedFilter.selectedDateType] : []}
            selectedIslands={appliedFilter.selectedIslands}
            apiData={tableData}
            loading={!!loading || lguRegionLoading}
            lguToRegion={lguToRegion}
            hasSearched={hasSearched}
            onTableDataChange={setHasTableData}
          />
        )}

        {selectedModules.includes(WP) && (
          <WorkingPermitReport
            selectedRegions={appliedFilter.selectedRegions}
            dateRange={appliedFilter.dateRange}
            selectedProvinces={appliedFilter.selectedProvinces}
            selectedCities={appliedFilter.selectedCities}
            selectedDates={appliedFilter.selectedDateType ? [appliedFilter.selectedDateType] : []}
            selectedIslands={appliedFilter.selectedIslands}
            apiData={wpTableData}
            loading={!!loading || lguRegionLoading}
            lguToRegion={lguToRegion}
            hasSearched={hasSearched}
            onTableDataChange={setHasTableData}
          />
        )}

        {selectedModules.includes(BC) && (
          <BrgyClearanceReport
            selectedRegions={appliedFilter.selectedRegions}
            dateRange={appliedFilter.dateRange}
            selectedProvinces={appliedFilter.selectedProvinces}
            selectedCities={appliedFilter.selectedCities}
            selectedDates={appliedFilter.selectedDateType ? [appliedFilter.selectedDateType] : []}
            selectedIslands={appliedFilter.selectedIslands}
            apiData={bcTableData}
            loading={!!loading || lguRegionLoading}
            lguToRegion={lguToRegion}
            hasSearched={hasSearched}
            onTableDataChange={setHasTableData}
          />
        )}

        {selectedModules.length === 0 && (
          <div className="text-center bg-card p-6 rounded-md border text-secondary-foreground border-border shadow-sm">
            <span className="font-bold text-lg text-accent-foreground">
              Please select <span className="text-blue-700">Module</span>, <span className="text-blue-700">Region</span>, and <span className="text-blue-700">Date Range</span> for transaction.
            </span>
          </div>
        )}

        <ScrollToTopButton scrollTargetRef={tableContainerRef} />
      </div>
    </div>
  );
};

export default Reports;
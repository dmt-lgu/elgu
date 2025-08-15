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
import BuildingPermitReport from './table/BuildingPermitReport';
import { setbuildingPermiAppliedFilter, setbuildingPermitData } from '@/redux/buildingPermitSlice';
import CertificateOfOccupancyReport from './table/CertificateOfOccupancyReport';
import { setcertificateOfOccupancy, setCertificateOfOccupancyAppliedFilter } from '@/redux/CertificateOfOccupancySlice';

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
const BLDG = "Building Permit";
const CO = "Certificate of Occupancy";

// Helper: deep filter equality
function areFiltersEqual(a: any, b: any) {
  if (!a && !b) return true;
  if (!a || !b) return false;
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

  const currentFilter = useMemo(() => ({
    selectedRegions: appliedFilter.selectedRegions,
    selectedProvinces: appliedFilter.selectedProvinces,
    selectedCities: appliedFilter.selectedCities,
    selectedIslands: appliedFilter.selectedIslands,
    dateRange: appliedFilter.dateRange,
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

    if (
      reduxTableData &&
      reduxAppliedFilter &&
      JSON.stringify(currentFilter) === JSON.stringify(reduxAppliedFilter)
    ) {
      setData(reduxTableData);
      setLoading(false);
      return;
    }

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
        if (moduleKey === BLDG) {
          setReduxTableData(response.data);
          setReduxAppliedFilter(currentFilter);
        }
        if (moduleKey === CO) {
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
          if (moduleKey === BLDG) {
            setReduxTableData(null);
          }
          if (moduleKey === CO) {
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
  const [cancelled, setCancelled] = useState(false);
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

  // --- NEW: Building Permit Redux state ---
  const persistedBldgTableData = useSelector((state: any) => state.buildingPermit.tableData);
  const persistedBldgAppliedFilter = useSelector((state: any) => state.buildingPermit.appliedFilter);

  // --- NEW: Certificate of Occupancy Redux state ---
  const persistedCoTableData = useSelector((state: any) => state.certificateOfOccupancy.tableData);
  const persistedCoAppliedFilter = useSelector((state: any) => state.certificateOfOccupancy.appliedFilter);

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

  const bldgReport = useReportData({
    moduleKey: BLDG,
    apiUrl: `${import.meta.env.VITE_URL}/api/bpco/transaction-count-bp`,
    appliedFilter,
    lguToRegion,
    reduxTableData: persistedBldgTableData,
    reduxAppliedFilter: persistedBldgAppliedFilter,
    setReduxTableData: (data) => dispatch(setbuildingPermitData(data)),
    setReduxAppliedFilter: (filter) => dispatch(setbuildingPermiAppliedFilter(filter)),
    hasSearched,
    abortSignal: searchAbortController.current?.signal,
    skipLoading: !selectedModules.includes(BLDG) || !hasSearched,
  });

  const coReport = useReportData({
    moduleKey: CO,
    apiUrl: `${import.meta.env.VITE_URL}/api/bpco/transaction-count-co`,
    appliedFilter,
    lguToRegion,
    reduxTableData: persistedCoTableData,
    reduxAppliedFilter: persistedCoAppliedFilter,
    setReduxTableData: (data) => dispatch(setcertificateOfOccupancy(data)),
    setReduxAppliedFilter: (filter) => dispatch(setCertificateOfOccupancyAppliedFilter(filter)),
    hasSearched,
    abortSignal: searchAbortController.current?.signal,
    skipLoading: !selectedModules.includes(CO) || !hasSearched,
  });

  // Combined loading for top-level (FilterSection), but we'll pass per-module to each table
  const loading =
   !cancelled && (
      (selectedModules.includes(BP) && bpReport.loading) ||
      (selectedModules.includes(WP) && wpReport.loading) ||
      (selectedModules.includes(BC) && bcReport.loading) ||
      (selectedModules.includes(BLDG) && bldgReport.loading)
      || (selectedModules.includes(CO) && coReport.loading)
    );

  const bpTableData = bpReport.data;
  const wpTableData = wpReport.data;
  const bcTableData = bcReport.data;
  const bldgTableData = bldgReport.data;
  const coTableData = coReport.data;

  const getFilteredResults = (moduleKey: string) => {
    let rawData: any = null;
    if (moduleKey === BP) {
      rawData = bpTableData || persistedTableData;
    } else if (moduleKey === WP) {
      rawData = wpTableData || persistedWPTableData;
    } else if (moduleKey === BC) {
      rawData = bcTableData || persistedBrgyTableData;
    } else if (moduleKey === BLDG) {
      rawData = bldgTableData || persistedBldgTableData;
    } else if (moduleKey === CO) {
      rawData = coTableData || persistedCoTableData;
    }
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
  const handleDownload = async (
    type: "pdf" | "excel",
    permitTypes?: ("business" | "working" | "barangay" | "building" | "certificate")[]
  ) => {
    const modulesToExport = permitTypes
      ? permitTypes.map((type) => {
          if (type === "business") return BP;
          if (type === "working") return WP;
          if (type === "barangay") return BC;
          if (type === "building") return BLDG;
          if (type === "certificate") return CO;
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
          moduleLabel: "Business Permit",
          selectedDateType: appliedFilter.selectedDateType,
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "business-permit-report",
          moduleLabel: "Business Permit",
          selectedDateType: appliedFilter.selectedDateType,
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
          moduleLabel: "Working Permit",
          selectedDateType: appliedFilter.selectedDateType,
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "working-permit-report",
          moduleLabel: "Working Permit",
          selectedDateType: appliedFilter.selectedDateType,
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
          moduleLabel: "Barangay Clearance",
          selectedDateType: appliedFilter.selectedDateType,
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "barangay-clearance-report",
          moduleLabel: "Barangay Clearance",
          selectedDateType: appliedFilter.selectedDateType,
        });
      }
    }

    // Building Permit
    if (modulesToExport.includes(BLDG)) {
      const filteredResults = getFilteredResults(BLDG);
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
          fileLabel: "building-permit-report",
          moduleLabel: "Building Permit",
          selectedDateType: appliedFilter.selectedDateType,
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "building-permit-report",
          moduleLabel: "Building Permit",
          selectedDateType: appliedFilter.selectedDateType,
        });
      }
    }

    // Certificate of Occupancy
    if (modulesToExport.includes(CO)) {
      const filteredResults = getFilteredResults(CO);
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
          fileLabel: "certificate-of-occupancy-report",
          moduleLabel: "Certificate of Occupancy",
          selectedDateType: appliedFilter.selectedDateType,
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "certificate-of-occupancy-report",
          moduleLabel: "Certificate of Occupancy",
          selectedDateType: appliedFilter.selectedDateType,
        });
      }
    }
  };

  // Search handler
  const handleSearch = (filters: any) => {
    setCancelled(false);
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

    if (filters.skipApi) {
      setAppliedFilterState(normalizedFilters);
      setHasSearched(false);
      dispatch(setAppliedFilter(normalizedFilters)); // BP
      dispatch(setWorkingPermitAppliedFilter(normalizedFilters)); // WP
      dispatch(setBrgyClearanceAppliedFilter(normalizedFilters)); // BC
      dispatch(setbuildingPermiAppliedFilter(normalizedFilters)); // BLDG
      dispatch(setCertificateOfOccupancyAppliedFilter(normalizedFilters)); // CO
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
    // --- NEW: Reset Building Permit Redux state ---
    dispatch(setbuildingPermitData(null));
    dispatch(setbuildingPermiAppliedFilter(null));
    // --- NEW: Reset Certificate of Occupancy Redux state ---
    dispatch(setcertificateOfOccupancy(null));
    dispatch(setCertificateOfOccupancyAppliedFilter(null));
  };

  // Cancel search handler
  const handleCancelSearch = () => {
    if (searchAbortController.current) {
      searchAbortController.current.abort();
      searchAbortController.current = null;
    }
    setHasSearched(false);
    setCancelled(true);
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
          loading={!!loading || lguRegionLoading}  // keep combined loading for header/controls
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
            apiData={bpTableData}
            loading={!!bpReport.loading || lguRegionLoading}  // per-module loading
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
            apiData={wpTableData || persistedWPTableData}
            loading={!!wpReport.loading || lguRegionLoading}  // per-module loading
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
            apiData={bcTableData || persistedBrgyTableData}
            loading={!!bcReport.loading || lguRegionLoading}  // per-module loading
            lguToRegion={lguToRegion}
            hasSearched={hasSearched}
            onTableDataChange={setHasTableData}
          />
        )}

        {selectedModules.includes(BLDG) && (
          <BuildingPermitReport
            selectedRegions={appliedFilter.selectedRegions}
            dateRange={appliedFilter.dateRange}
            selectedProvinces={appliedFilter.selectedProvinces}
            selectedCities={appliedFilter.selectedCities}
            selectedDates={appliedFilter.selectedDateType ? [appliedFilter.selectedDateType] : []}
            selectedIslands={appliedFilter.selectedIslands}
            apiData={bldgTableData || persistedBldgTableData}
            loading={!!bldgReport.loading || lguRegionLoading}  // per-module loading
            lguToRegion={lguToRegion}
            hasSearched={hasSearched}
            onTableDataChange={setHasTableData}
          />
        )}

        {selectedModules.includes(CO) && (
          <CertificateOfOccupancyReport
            selectedRegions={appliedFilter.selectedRegions}
            dateRange={appliedFilter.dateRange}
            selectedProvinces={appliedFilter.selectedProvinces}
            selectedCities={appliedFilter.selectedCities}
            selectedDates={appliedFilter.selectedDateType ? [appliedFilter.selectedDateType] : []}
            selectedIslands={appliedFilter.selectedIslands}
            apiData={coTableData || persistedCoTableData}
            loading={!!coReport.loading || lguRegionLoading}  // per-module loading
            lguToRegion={lguToRegion}
            hasSearched={hasSearched}
            onTableDataChange={setHasTableData}
          />
        )}

       {selectedModules.length === 0 && (
  <div className="text-center bg-card p-8 rounded-lg border text-secondary-foreground border-border shadow-sm">
    <div className="flex flex-col items-center gap-4">
      {/* Filter Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-16 w-16 text-muted-foreground"
      >
        <path d="M20 7h-9" />
        <path d="M14 17H4" />
        <circle cx="17" cy="17" r="3" />
        <circle cx="7" cy="7" r="3" />
      </svg>
      
      {/* Main Message */}
      <h3 className="text-2xl font-bold text-foreground">
        Start by Selecting Filters
      </h3>

      {/* Additional Guidance */}
      <p className="text-md text-muted-foreground max-w-md">
        Please select a <span className="font-semibold text-primary">Module</span>,{' '}
        <span className="font-semibold text-primary">Region</span>, and{' '}
        <span className="font-semibold text-primary">Date Range</span> to generate a report.
      </p>
    </div>
  </div>
)}

        <ScrollToTopButton scrollTargetRef={tableContainerRef} />
      </div>
    </div>
  );
};

export default Reports;
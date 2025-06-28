import React, { useEffect, useMemo, useRef, useState } from 'react';
import TableReport, {
  filterTableResults,
  getDateRangeLabel,
} from './table/TableReport';
import FilterSection from './components/FilterSection';
import axios from '../../../plugin/axios';
import { regionMapping } from '../../../screens/Admin/Report/utils/mockData';
import dictImage from '../../../assets/logo/dict.png';
import { exportTableReportToPDF } from './utils/reportToPDF';
import { exportTableReportToExcel } from './utils/reportToExcel';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '@/redux/store';
import { updateFilterField } from './components/reportFilterSlice';
import { setTableData, setAppliedFilter } from './components/tableDataSlice';
// import ScrollToTopButton from './table/ScrollToTopButton';

// --- Utility: Normalize a date value to Date or null ---
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

type DateRange = { start: Date | string | null; end: Date | string | null };

type AppliedFilter = {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  dateRange: DateRange;
  selectedDateType: string;
  selectedIslands: string[];
};

const Reports: React.FC = () => {
  // Redux
  const dispatch = useDispatch<AppDispatch>();

  // Get persisted filter and table data from Redux (hydrated from localStorage)
  const persistedTableData = useSelector((state: RootState) => state.tableReport.tableData);
  const persistedAppliedFilter = useSelector((state: RootState) => state.tableReport.appliedFilter);

  const [hasSearched, setHasSearched] = useState(false);

  // --- Applied Filter State (typed!) ---
  // Only update this when Search is clicked!
  const [appliedFilter, setAppliedFilterState] = useState<AppliedFilter>({
    selectedRegions: [],
    selectedProvinces: [],
    selectedCities: [],
    dateRange: { start: null, end: null },
    selectedDateType: "",
    selectedIslands: [],
  });

  // Local state for table data and LGU mapping
  const [tableData, setTableDataState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lguToRegion, setLguToRegion] = useState<Record<string, string>>({});
  const [lguRegionLoading, setLguRegionLoading] = useState(true);

  // Track if table has data for enabling Download button
  const [hasTableData, setHasTableData] = useState(false);

  // --- Restore persisted filter and table data on mount ---
  useEffect(() => {
    if (persistedAppliedFilter) {
      setAppliedFilterState(persistedAppliedFilter);
      setHasSearched(true);
    }
    if (persistedTableData) {
      setTableDataState(persistedTableData);
    }
  // eslint-disable-next-line
  }, []);

  // --- Always normalize dateRange for all checks and usage ---
  const normalizedDateRange = useMemo(
    () => normalizeDateRange(appliedFilter.dateRange),
    [appliedFilter.dateRange?.start, appliedFilter.dateRange?.end]
  );

  // --- Fetch LGU to Region Mapping ---
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

  // --- Fetch Table Data on Filter Change (send all filters to API) ---
  useEffect(() => {
    // Only fetch if Search has been clicked and filters are complete
    if (
      !hasSearched ||
      (!appliedFilter.selectedRegions.length && !appliedFilter.selectedIslands.length) ||
      !normalizedDateRange.start ||
      !normalizedDateRange.end
    ) {
      setTableDataState(null);
      setHasTableData(false);
      return;
    }

    const fetchTableData = async () => {
      setLoading(true);
      try {
        const payload: any = {
          locationName: appliedFilter.selectedRegions,
          provinces: appliedFilter.selectedProvinces,
          cities: appliedFilter.selectedCities,
          startDate: normalizedDateRange.start
            ? normalizedDateRange.start.toISOString().slice(0, 10)
            : null,
          endDate: normalizedDateRange.end
            ? normalizedDateRange.end.toISOString().slice(0, 10)
            : null,
          // If your backend supports islands, add:
          // islands: appliedFilter.selectedIslands,
        };
        // Remove empty arrays/fields
        Object.keys(payload).forEach(
          (key) =>
            (Array.isArray(payload[key]) && payload[key].length === 0) ||
            payload[key] === null
              ? delete payload[key]
              : null
        );
        const response = await axios.post(`${import.meta.env.VITE_URL}/api/bp/transaction-count`, payload);
        setTableDataState(response.data);
        // Persist to Redux/localStorage
        dispatch(setTableData(response.data));
        dispatch(setAppliedFilter(appliedFilter));
      } catch {
        setTableDataState(null);
        dispatch(setTableData(null));
      } finally {
        setLoading(false);
      }
    };

    fetchTableData();
  }, [
    hasSearched,
    appliedFilter.selectedRegions,
    appliedFilter.selectedProvinces,
    appliedFilter.selectedCities,
    normalizedDateRange.start,
    normalizedDateRange.end,
    // appliedFilter.selectedIslands, // Uncomment if backend supports
  ]);

  // --- PDF/Excel Export Handler ---
  const handleDownload = async (type: "pdf" | "excel") => {
    // 1. Compute filteredResults using the same logic as TableReport
    const filteredResults = filterTableResults({
      apiData: tableData,
      selectedRegions: appliedFilter.selectedRegions,
      selectedProvinces: appliedFilter.selectedProvinces,
      selectedCities: appliedFilter.selectedCities,
      selectedDates: appliedFilter.selectedDateType ? [appliedFilter.selectedDateType] : [],
      selectedIslands: appliedFilter.selectedIslands,
      lguToRegion,
      dateRange: appliedFilter.dateRange,
    });

    // 2. Compute dateRangeLabel using the same logic as TableReport
    const dateRangeLabel = getDateRangeLabel(
      normalizedDateRange.start,
      normalizedDateRange.end,
      appliedFilter.selectedDateType
    );

    if (type === "pdf") {
      exportTableReportToPDF({
        filteredResults,
        lguToRegion,
        dateRangeLabel,
        logoUrl: dictImage,
        fileLabel: "report",
        isDayMode: appliedFilter.selectedDateType === "Day",
      });
    }

    if (type === "excel") {
      exportTableReportToExcel({
        filteredResults,
        lguToRegion,
        dateRangeLabel,
        fileLabel: "report",
        isDayMode: appliedFilter.selectedDateType === "Day",
      });
      return;
    }
  };

  // --- Filter Handlers ---
  const handleSearch = (filters: any) => {
    setAppliedFilterState(filters);
    setHasSearched(true); // Mark that search was clicked
    // Persist filter immediately
    dispatch(setAppliedFilter(filters));
  };

  // --- UPDATED RESET HANDLER: Exclude Module ---
  const handleReset = () => {
    // Only reset the fields you want, not modules
    dispatch(updateFilterField({ key: 'selectedRegions', value: [] }));
    dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
    dispatch(updateFilterField({ key: 'selectedDateType', value: "" }));
    dispatch(updateFilterField({ key: 'selectedIslands', value: [] }));
    setHasSearched(false);
    setAppliedFilterState({
      selectedRegions: [],
      selectedProvinces: [],
      selectedCities: [],
      dateRange: { start: null, end: null },
      selectedDateType: "",
      selectedIslands: [],
    });
    setTableDataState(null);
    setHasTableData(false);
    // Clear persisted data
    dispatch(setTableData(null));
    dispatch(setAppliedFilter(null));
  };

  // Ref for the scrollable table area
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // --- Render ---
  return (
    <div ref={tableContainerRef} className='p-6 max-w-[1200px] mx-auto bg-background'>
      <FilterSection
        onSearch={handleSearch}
        onDownload={handleDownload}
        onReset={handleReset}
        hasTableData={hasTableData}
        loading={loading}
      />
      <div
        
      >
        <TableReport
          selectedRegions={appliedFilter.selectedRegions}
          dateRange={appliedFilter.dateRange}
          selectedProvinces={appliedFilter.selectedProvinces}
          selectedCities={appliedFilter.selectedCities}
          selectedDates={appliedFilter.selectedDateType ? [appliedFilter.selectedDateType] : []}
          selectedIslands={appliedFilter.selectedIslands}
          apiData={tableData}
          loading={loading || lguRegionLoading}
          lguToRegion={lguToRegion}
          hasSearched={hasSearched}
          onTableDataChange={setHasTableData}
        />
      </div>
      {/* <ScrollToTopButton scrollTargetRef={tableContainerRef} /> */}
    </div>
  );
};

export default Reports;
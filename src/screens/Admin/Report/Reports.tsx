import React, { useEffect, useMemo, useState } from 'react';
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
import {updateFilterField } from './components/reportFilterSlice';

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
  const filterState = useSelector((state: RootState) => state.reportFilter);
  const [hasSearched, setHasSearched] = useState(false);

  // --- Applied Filter State (typed!) ---
  const [appliedFilter, setAppliedFilter] = useState<AppliedFilter>({
    selectedRegions: [],
    selectedProvinces: [],
    selectedCities: [],
    dateRange: { start: null, end: null },
    selectedDateType: "",
    selectedIslands: [],
  });

  // Local state for table data and LGU mapping
  const [tableData, setTableData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lguToRegion, setLguToRegion] = useState<Record<string, string>>({});
  const [lguRegionLoading, setLguRegionLoading] = useState(true);

  // --- Always normalize dateRange for all checks and usage ---
  const normalizedDateRange = useMemo(
    () => normalizeDateRange(appliedFilter.dateRange),
    [appliedFilter.dateRange?.start, appliedFilter.dateRange?.end]
  );

  // --- On mount or filterState change, initialize appliedFilter from Redux if empty (for persistence) ---
  useEffect(() => {
    if (
      appliedFilter.selectedRegions.length === 0 &&
      appliedFilter.selectedProvinces.length === 0 &&
      appliedFilter.selectedCities.length === 0 &&
      !normalizedDateRange.start &&
      !normalizedDateRange.end &&
      !appliedFilter.selectedDateType &&
      (appliedFilter.selectedIslands?.length ?? 0) === 0
    ) {
      setAppliedFilter({
        selectedRegions: filterState.selectedRegions,
        selectedProvinces: filterState.selectedProvinces,
        selectedCities: filterState.selectedCities,
        dateRange: {
          start: filterState.dateRange.start
            ? (typeof filterState.dateRange.start === 'string'
                ? new Date(filterState.dateRange.start)
                : filterState.dateRange.start)
            : null,
          end: filterState.dateRange.end
            ? (typeof filterState.dateRange.end === 'string'
                ? new Date(filterState.dateRange.end)
                : filterState.dateRange.end)
            : null,
        },
        selectedDateType: filterState.selectedDateType,
        selectedIslands: filterState.selectedIslands || [],
      });
    }
    // eslint-disable-next-line
  }, [filterState]);

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
    const fetchTableData = async () => {
      // Don't fetch if no filters
      if (
        !appliedFilter.selectedRegions.length &&
        !appliedFilter.selectedProvinces?.length &&
        !appliedFilter.selectedCities?.length &&
        !normalizedDateRange.start &&
        !normalizedDateRange.end
      ) {
        setTableData(null);
        return;
      }
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
        setTableData(response.data);
      } catch {
        setTableData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTableData();
  }, [
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
    setAppliedFilter(filters);
    setHasSearched(true); // Mark that search was clicked
  };

  // --- UPDATED RESET HANDLER: Exclude Module ---
 const handleReset = () => {
  // Only reset the fields you want, not modules
  dispatch(
    // You can create a new action, or just update fields individually:
    updateFilterField({ key: 'selectedRegions', value: [] })
  );
  dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
  dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
  dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
  dispatch(updateFilterField({ key: 'selectedDateType', value: "" }));
  dispatch(updateFilterField({ key: 'selectedIslands', value: [] }));
  setHasSearched(false); 

  setAppliedFilter({
    selectedRegions: [],
    selectedProvinces: [],
    selectedCities: [],
    dateRange: { start: null, end: null },
    selectedDateType: "",
    selectedIslands: [],
  });
  setTableData(null);
};

  // --- Render ---
  return (
    <div className='p-6 max-w-[1200px] mx-auto bg-background'>

     
      <FilterSection
        onSearch={handleSearch}
        onDownload={handleDownload}
        onReset={handleReset}
      />

      
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
      />
      
    </div>
  );
};

export default Reports;
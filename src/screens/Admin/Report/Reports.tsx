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
import { setTableData, setAppliedFilter } from '../../../redux/tableDataSlice';
import ScrollToTopButton from './components/ScrollToTopButton';
import Swal from 'sweetalert2';
import WorkingPermitReport from './table/WorkingPermitReport';
import { Bp } from './utils/types';
import BrgyClearanceReport from './table/BrgyClearanceReport';

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

function formatLocalDate(date: Date | null): string | null {
  if (!date) return null;
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

const WP = "Working Permit";
const BC = "Barangay Clearance";

const Reports: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();

  const persistedTableData = useSelector((state: RootState) => state.tableReport.tableData);
  const persistedAppliedFilter = useSelector((state: RootState) => state.tableReport.appliedFilter);
  const selectedModules = useSelector((state: RootState) => state.reportFilter.selectedModules);
  const [hasSearched, setHasSearched] = useState(false);

   const searchAbortController = useRef<AbortController | null>(null);

  const [appliedFilter, setAppliedFilterState] = useState<AppliedFilter>({
    selectedRegions: [],
    selectedProvinces: [],
    selectedCities: [],
    dateRange: { start: null, end: null },
    selectedDateType: "",
    selectedIslands: [],
  });

  const [tableData, setTableDataState] = useState<any>(null); // Business Permit data
  const [wpTableData, setWpTableDataState] = useState<any>(null); // Working Permit data
  const [bcTableData, setBcTableDataState] = useState<any>(null); // Barangay Clearance data
  const [loading, setLoading] = useState(false); // Business Permit loading
  const [wpLoading, setWpLoading] = useState(false); // Working Permit loading
  const [bcLoading, setBcLoading] = useState(false); // Barangay Clearance loading
  const [lguToRegion, setLguToRegion] = useState<Record<string, string>>({});
  const [lguRegionLoading, setLguRegionLoading] = useState(true);

  const [hasTableData, setHasTableData] = useState(false);

  useEffect(() => {
    if (persistedAppliedFilter) {
      setAppliedFilterState(persistedAppliedFilter);
      setHasSearched(true);
    }
    if (persistedTableData) {
      setTableDataState(persistedTableData);
    }
  }, []);

  const normalizedDateRange = useMemo(
    () => normalizeDateRange(appliedFilter.dateRange),
    [appliedFilter.dateRange?.start, appliedFilter.dateRange?.end]
  );

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

  useEffect(() => {
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
            ? formatLocalDate(normalizedDateRange.start)
            : null,
          endDate: normalizedDateRange.end
            ? formatLocalDate(normalizedDateRange.end)
            : null,
        };
        Object.keys(payload).forEach(
          (key) =>
            (Array.isArray(payload[key]) && payload[key].length === 0) ||
            payload[key] === null
              ? delete payload[key]
              : null
        );
        const response = await axios.post(`${import.meta.env.VITE_URL}/api/bp/transaction-count`, payload);
        setTableDataState(response.data);
        dispatch(setTableData(response.data));
        dispatch(setAppliedFilter(appliedFilter));
      } catch {
        setTableDataState(null);
        dispatch(setTableData(null));
        Swal.fire({
          icon: "error",
          title: "Request Failed",
          text: "Gateway Timeout: The server took too long to respond. Please try again later.",
          confirmButtonText: "OK",
          confirmButtonColor: "#3b82f6",
        });
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
  ]);

  useEffect(() => {
    if (
      !hasSearched ||
      (!appliedFilter.selectedRegions.length && !appliedFilter.selectedIslands.length) ||
      !normalizedDateRange.start ||
      !normalizedDateRange.end
    ) {
      setWpTableDataState(null);
      return;
    }

    const fetchWpTableData = async () => {
      setWpLoading(true);
      try {
        const payload: any = {
          locationName: appliedFilter.selectedRegions,
          provinces: appliedFilter.selectedProvinces,
          cities: appliedFilter.selectedCities,
          startDate: normalizedDateRange.start
            ? formatLocalDate(normalizedDateRange.start)
            : null,
          endDate: normalizedDateRange.end
            ? formatLocalDate(normalizedDateRange.end)
            : null,
        };
        Object.keys(payload).forEach(
          (key) =>
            (Array.isArray(payload[key]) && payload[key].length === 0) ||
            payload[key] === null
              ? delete payload[key]
              : null
        );
        const response = await axios.post(`${import.meta.env.VITE_URL}/api/wp/transaction-count`, payload);
        setWpTableDataState(response.data);
      } catch {
        setWpTableDataState(null);
      } finally {
        setWpLoading(false);
      }
    };

    fetchWpTableData();
  }, [
    hasSearched,
    appliedFilter.selectedRegions,
    appliedFilter.selectedProvinces,
    appliedFilter.selectedCities,
    normalizedDateRange.start,
    normalizedDateRange.end,
  ]);

  useEffect(() => {
    if (
      !hasSearched ||
      (!appliedFilter.selectedRegions.length && !appliedFilter.selectedIslands.length) ||
      !normalizedDateRange.start ||
      !normalizedDateRange.end
    ) {
      setBcTableDataState(null);
      return;
    }

    const fetchBcTableData = async () => {
      setBcLoading(true);
      try {
        const payload: any = {
          locationName: appliedFilter.selectedRegions,
          provinces: appliedFilter.selectedProvinces,
          cities: appliedFilter.selectedCities,
          startDate: normalizedDateRange.start
            ? formatLocalDate(normalizedDateRange.start)
            : null,
          endDate: normalizedDateRange.end
            ? formatLocalDate(normalizedDateRange.end)
            : null,
        };
        Object.keys(payload).forEach(
          (key) =>
            (Array.isArray(payload[key]) && payload[key].length === 0) ||
            payload[key] === null
              ? delete payload[key]
              : null
        );
        const response = await axios.post(`${import.meta.env.VITE_URL}/api/bc/transaction-count`, payload);
        setBcTableDataState(response.data);
      } catch {
        setBcTableDataState(null);
      } finally {
        setBcLoading(false);
      }
    };

    fetchBcTableData();
  }, [
    hasSearched,
    appliedFilter.selectedRegions,
    appliedFilter.selectedProvinces,
    appliedFilter.selectedCities,
    normalizedDateRange.start,
    normalizedDateRange.end,
  ]);

  // --- PDF/Excel Export Handler ---
  const handleDownload = async (type: "pdf" | "excel") => {
    const moduleLabels: string[] = [];
    if (selectedModules.includes(Bp)) moduleLabels.push("Business Permit");
    if (selectedModules.includes(WP)) moduleLabels.push("Working Permit");
    if (selectedModules.includes(BC)) moduleLabels.push("Barangay Clearance");
    const combinedModuleLabel = moduleLabels.join(", ");

    // Business Permit
    if (selectedModules.includes(Bp) && tableData) {
      const filteredResults = filterTableResults({
        apiData: tableData,
        selectedRegions: appliedFilter.selectedRegions,
        selectedProvinces: appliedFilter.selectedProvinces,
        selectedCities: appliedFilter.selectedCities,
        selectedDates: [], // <-- Always show all data, do not filter by date type
        selectedIslands: appliedFilter.selectedIslands,
        lguToRegion,
        dateRange: appliedFilter.dateRange,
      });

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
          isDayMode: false, // <-- Always false to show all data, not per-day
          isBarangayClearance: false,
          moduleLabel: combinedModuleLabel,
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "business-permit-report",
          isDayMode: false, // <-- Always false
        });
      }
    }

    // Working Permit
    if (selectedModules.includes(WP) && wpTableData) {
      const filteredResults = filterTableResults({
        apiData: wpTableData,
        selectedRegions: appliedFilter.selectedRegions,
        selectedProvinces: appliedFilter.selectedProvinces,
        selectedCities: appliedFilter.selectedCities,
        selectedDates: [], // <-- Always show all data
        selectedIslands: appliedFilter.selectedIslands,
        lguToRegion,
        dateRange: appliedFilter.dateRange,
      });

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
          isDayMode: false, // <-- Always false
          isBarangayClearance: false,
          moduleLabel: combinedModuleLabel,
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "working-permit-report",
          isDayMode: false, // <-- Always false
        });
      }
    }

    // Barangay Clearance
    if (selectedModules.includes(BC) && bcTableData) {
      const filteredResults = filterTableResults({
        apiData: bcTableData,
        selectedRegions: appliedFilter.selectedRegions,
        selectedProvinces: appliedFilter.selectedProvinces,
        selectedCities: appliedFilter.selectedCities,
        selectedDates: [], // <-- Always show all data
        selectedIslands: appliedFilter.selectedIslands,
        lguToRegion,
        dateRange: appliedFilter.dateRange,
      });

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
          isDayMode: false, // <-- Always false
          moduleLabel: combinedModuleLabel,
        });
      }
      if (type === "excel") {
        exportTableReportToExcel({
          filteredResults,
          lguToRegion,
          dateRangeLabel,
          fileLabel: "barangay-clearance-report",
          isDayMode: false, // <-- Always false
        });
      }
    }
  };

  const handleSearch = (filters: any) => {
    setAppliedFilterState(filters);
    setHasSearched(true);
    dispatch(setAppliedFilter(filters));
    // Reset abort controller for new search
    if (searchAbortController.current) {
      searchAbortController.current.abort();
    }
    searchAbortController.current = new AbortController();
  };

  const handleReset = () => {
    dispatch(updateFilterField({ key: 'selectedRegions', value: [] }));
    dispatch(updateFilterField({ key: 'selectedProvinces', value: [] }));
    dispatch(updateFilterField({ key: 'selectedCities', value: [] }));
    dispatch(updateFilterField({ key: 'dateRange', value: { start: null, end: null } }));
    dispatch(updateFilterField({ key: 'selectedDateType', value: "" }));
    dispatch(updateFilterField({ key: 'selectedIslands', value: [] }));
    dispatch(updateFilterField({ key: 'selectedModules', value: [] }));
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
    setWpTableDataState(null);
    setBcTableDataState(null);
    setHasTableData(false);
    dispatch(setTableData(null));
    dispatch(setAppliedFilter(null));
  };

  const tableContainerRef = useRef<HTMLDivElement>(null);

  const handleCancelSearch = () => {
    if (searchAbortController.current) {
      searchAbortController.current.abort();
      searchAbortController.current = null;
    }
    setLoading(false);
    setWpLoading(false);
    setBcLoading(false);
    // Optionally, show a toast or Swal to inform user
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
          loading={loading || wpLoading || bcLoading}
          onCancel={handleCancelSearch}
        />

        {selectedModules.includes(Bp) && (
          <BusinessPermitReport
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
            loading={wpLoading || lguRegionLoading}
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
            loading={bcLoading || lguRegionLoading}
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
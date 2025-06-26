import React, { useRef, useState, useEffect, useMemo } from 'react';
import TableReport from './table/TableReport';
import FilterSection from './components/FilterSection';
import axios from '../../../plugin/axios';
import { regionMapping } from '../../../screens/Admin/Report/utils/mockData';
import { FilterState } from './utils/types';
import dictImage from '../../../assets/logo/dict.png';
import { exportTableReportToPDF } from './utils/reportToPDF';
import { exportTableReportToExcel } from './utils/reportToExcel';

const INITIAL_FILTER_STATE: FilterState = {
  selectedModules: [],
  selectedRegions: [],
  selectedProvinces: [],
  selectedCities: [],
  dateRange: { start: null, end: null },
};

// Helper: Check if date range is a full month range
function isFullMonthRange(start: Date, end: Date) {
  const startOfMonth = new Date(start.getFullYear(), start.getMonth(), 1);
  const endOfMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0);
  return (
    start.getDate() === startOfMonth.getDate() &&
    end.getDate() === endOfMonth.getDate()
  );
}

// Helper: Check if a month is in the selected range
function isMonthInRange(monthStr: string, range: { start: Date | null; end: Date | null }) {
  if (!range.start && !range.end) return true;
  const monthDate = monthStr.length === 7
    ? new Date(monthStr + "-01")
    : new Date(monthStr);

  const start = range.start ? new Date(range.start.getFullYear(), range.start.getMonth(), 1) : null;
  const end = range.end ? new Date(range.end.getFullYear(), range.end.getMonth() + 1, 0) : null;

  if (start && end) {
    return monthDate >= start && monthDate <= end;
  } else if (start) {
    return monthDate >= start;
  } else if (end) {
    return monthDate <= end;
  }
  return true;
}

// Helper: Extract province from lgu.province or from lgu.lgu string
function extractProvince(lgu: any): string | undefined {
  if (lgu.province && typeof lgu.province === "string" && lgu.province.trim() !== "") {
    return lgu.province.trim();
  }
  if (lgu.lgu && typeof lgu.lgu === "string") {
    const parts = lgu.lgu.split(",");
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
  }
  return undefined;
}

// Helper: Extract city/municipality from lgu.lgu or lgu.city
function extractCity(lgu: any): string | undefined {
  if (lgu.city && typeof lgu.city === "string" && lgu.city.trim() !== "") {
    return lgu.city.trim();
  }
  if (lgu.lgu && typeof lgu.lgu === "string") {
    const parts = lgu.lgu.split(",");
    if (parts.length > 1) {
      return parts[0].trim();
    }
    return lgu.lgu.trim();
  }
  return undefined;
}

// Merge LGU+province and sum all months in range (for Month/Year selection)
function mergeLguProvinceSumAllMonths(
  results: any[],
  dateRange: { start: Date | null; end: Date | null }
) {
  const merged: Record<string, any> = {};

  results.forEach(lgu => {
    const province = extractProvince(lgu) || "";
    const key = `${lgu.lgu}||${province}`;
    if (!merged[key]) {
      merged[key] = {
        ...lgu,
        monthlyResults: [],
        sum: {},
        months: [],
      };
    }
    // Filter months in range
    const filteredMonths = lgu.monthlyResults.filter((month: any) =>
      isMonthInRange(month.month, dateRange)
    );
    filteredMonths.forEach((month: any) => {
      merged[key].months.push(month.month);
      Object.keys(month).forEach(k => {
        if (typeof month[k] === "number") {
          merged[key].sum[k] = (merged[key].sum[k] || 0) + month[k];
        }
      });
    });
  });

  // Clean up months (unique)
  Object.values(merged).forEach((item: any) => {
    item.months = Array.from(new Set(item.months));
  });

  return Object.values(merged);
}

const Reports: React.FC = () => {
  // --- State ---
  const [filterState, setFilterState] = useState<FilterState>(INITIAL_FILTER_STATE);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [appliedSelectedDates, setAppliedSelectedDates] = useState<string[]>([]);
  const [searchFilters, setSearchFilters] = useState<FilterState>(INITIAL_FILTER_STATE);
  const [tableData, setTableData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [lguToRegion, setLguToRegion] = useState<Record<string, string>>({});
  const [lguRegionLoading, setLguRegionLoading] = useState(true);

  const tableRef = useRef<HTMLDivElement>(null);

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

  // --- Fetch Table Data on Filter Change ---
  useEffect(() => {
    const fetchTableData = async () => {
      if (
        !searchFilters.selectedRegions.length &&
        !searchFilters.selectedProvinces?.length &&
        !searchFilters.dateRange.start &&
        !searchFilters.dateRange.end
      ) {
        setTableData(null);
        return;
      }
      setLoading(true);
      try {
        const payload: any = {
          locationName: searchFilters.selectedRegions,
          startDate: searchFilters.dateRange.start
            ? searchFilters.dateRange.start.toISOString().slice(0, 10)
            : null,
          endDate: searchFilters.dateRange.end
            ? searchFilters.dateRange.end.toISOString().slice(0, 10)
            : null,
        };
        if (searchFilters.selectedProvinces?.length) {
          payload.provinces = searchFilters.selectedProvinces;
        }
        const response = await axios.post(`${import.meta.env.VITE_URL}/api/bp/transaction-count`, payload);
        setTableData(response.data);
      } catch {
        setTableData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTableData();
  }, [searchFilters]);

  // --- Filtered Results (matches TableReport logic) ---
  const filteredResults = useMemo(() => {
    let filtered = Array.isArray(tableData?.results) ? tableData.results : [];

    if (searchFilters.selectedRegions.length > 0) {
      filtered = filtered.filter((lgu: any) =>
        searchFilters.selectedRegions.includes(lgu.region)
        || searchFilters.selectedRegions.includes(lgu.regionCode)
        || searchFilters.selectedRegions.includes(lguToRegion[lgu.lgu])
      );
    }

    if (searchFilters.selectedProvinces?.length > 0) {
      filtered = filtered.filter((lgu: any) => {
        const province = extractProvince(lgu);
        return (
          province &&
          searchFilters.selectedProvinces.some(
            prov =>
              prov.trim().toLowerCase() === province.trim().toLowerCase()
          )
        );
      });
    }

    if ((searchFilters.selectedCities ?? []).length > 0) {
      filtered = filtered.filter((lgu: any) => {
        const city = extractCity(lgu);
        return (
          city &&
          (searchFilters.selectedCities ?? []).some(
            c =>
              c.trim().toLowerCase() === city.trim().toLowerCase()
          )
        );
      });
    }

    // If "Day" is selected, DO NOT merge, just filter by date range
    if (appliedSelectedDates && appliedSelectedDates.includes("Day")) {
      return filtered.map((lgu: any) => ({
        ...lgu,
        monthlyResults: lgu.monthlyResults.filter((month: any) =>
          isMonthInRange(month.month, searchFilters.dateRange)
        ),
        months: lgu.monthlyResults
          .filter((month: any) => isMonthInRange(month.month, searchFilters.dateRange))
          .map((month: any) => month.month),
        sum: {}, // Not used in this mode
      }));
    }

    // Else, merge and sum duplicates here!
    return mergeLguProvinceSumAllMonths(filtered, searchFilters.dateRange);
  }, [
    tableData?.results,
    searchFilters.selectedRegions.join("-"),
    searchFilters.selectedProvinces?.join("-"),
    searchFilters.selectedCities?.join("-"),
    JSON.stringify(lguToRegion),
    searchFilters.dateRange?.start?.toISOString?.() ?? "",
    searchFilters.dateRange?.end?.toISOString?.() ?? "",
    appliedSelectedDates?.join("-") ?? "",
  ]);

  // --- Date Range Label (matches TableReport) ---
  const dateRangeLabel = useMemo(() => {
    const { start, end } = searchFilters.dateRange;
    if (start && end) {
      if (isFullMonthRange(start, end)) {
        return `${start.toLocaleString('default', { month: 'long', year: 'numeric' })} - ${end.toLocaleString('default', { month: 'long', year: 'numeric' })}`;
      } else {
        return `${start.toLocaleString('default', { month: 'short', day: '2-digit', year: 'numeric' })} - ${end.toLocaleString('default', { month: 'short', day: '2-digit', year: 'numeric' })}`;
      }
    } else if (start) {
      return `${start.toLocaleString('default', { month: 'short', day: '2-digit', year: 'numeric' })}`;
    } else if (end) {
      return `${end.toLocaleString('default', { month: 'short', day: '2-digit', year: 'numeric' })}`;
    }
    return "";
  }, [searchFilters.dateRange]);

  // --- PDF/Excel Export Handler ---
    const handleDownload = async (type: "pdf" | "excel") => {
    if (type === "pdf") {
    const isDayMode = appliedSelectedDates.includes("Day");
    exportTableReportToPDF({
      filteredResults,
      lguToRegion,
      dateRangeLabel,
      logoUrl: dictImage,
      fileLabel: "report",
      isDayMode,
    });
    return;
  }
    // Excel export logic (if needed)
    if (type === "excel") {
      const isDayMode = appliedSelectedDates.includes("Day");
      exportTableReportToExcel({
        filteredResults,
        lguToRegion,
        dateRangeLabel,
        fileLabel: "report",
        isDayMode,
      });
      return;
    }
  };

  // --- Filter Handlers ---
  const handleSearch = (filters: FilterState & { selectedRegions: string[], selectedCities?: string[] }) => {
    setSearchFilters({ ...filters });
    setAppliedSelectedDates(selectedDates);
  };

  // --- UPDATED RESET HANDLER: Exclude Module ---
  const handleReset = () => {
    // Preserve current selectedModules
    setFilterState(prev => ({
      ...INITIAL_FILTER_STATE,
      selectedModules: prev.selectedModules,
    }));
    setSearchFilters(prev => ({
      ...INITIAL_FILTER_STATE,
      selectedModules: prev.selectedModules,
    }));
    setTableData(null);
    setSelectedDates([]);
    setAppliedSelectedDates([]);
  };

  // --- Render ---
  return (
    <div className='p-6 max-w-[1200px] mx-auto bg-background'>
      <FilterSection
        filterState={filterState}
        setFilterState={setFilterState}
        onSearch={handleSearch}
        onDownload={handleDownload}
        onReset={handleReset}
        selectedDates={selectedDates}
        onSelectedDatesChange={setSelectedDates}
      />
      <TableReport
        ref={tableRef}
        selectedRegions={searchFilters.selectedRegions}
        dateRange={searchFilters.dateRange}
        apiData={tableData}
        loading={loading || lguRegionLoading}
        lguToRegion={lguToRegion}
        selectedProvinces={searchFilters.selectedProvinces}
        selectedCities={searchFilters.selectedCities}
        selectedDates={appliedSelectedDates}
      />
    </div>
  );
};

export default Reports;
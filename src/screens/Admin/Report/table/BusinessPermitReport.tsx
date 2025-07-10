import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parse, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { getRegionCode, islandRegionMap, regionMapping } from "../utils/mockData";
import dictImage from "./../../../../assets/logo/dict.png"
import '../utils/loader.css';
import { RootState } from '@/redux/store';
import { useSelector } from 'react-redux';
import LoaderTable from '../utils/LoaderTable';
import Loading from '../utils/Loading';

interface TableReportProps {
  selectedRegions: string[];
  dateRange: { start: Date | string | null; end: Date | string | null };
  apiData: any;
  loading: boolean;
  lguToRegion: Record<string, string>;
  selectedProvinces?: string[];
  selectedCities?: string[];
  selectedDates?: string[];
  selectedIslands?: string[];
  lguProvinceFilter?: { lgu: string; province: string };
  hasSearched?: boolean;
  onTableDataChange?: (hasData: boolean) => void;
}

// --- Utility: Normalize a date value to Date or null ---
function ensureDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d === 'string') {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

// --- Utility: Normalize a DateRange object ---
function normalizeDateRange(dr: { start: Date | string | null; end: Date | string | null }) {
  return {
    start: ensureDate(dr?.start),
    end: ensureDate(dr?.end),
  };
}

// Helper: Format month string to "Month YYYY"
function formatMonthYear(monthStr: string): string {
  if (!monthStr) return "";
  let date;
  if (monthStr.length === 7) {
    date = parse(monthStr, "yyyy-MM", new Date());
  } else if (monthStr.length === 10) {
    date = parse(monthStr, "yyyy-MM-dd", new Date());
  } else {
    return monthStr;
  }
  return format(date, "MMMM yyyy");
}

// Helper: Group results by region (always use internal key)
function groupResultsByRegion(results: any[], lguToRegion: Record<string, string>) {
  const grouped: Record<string, any[]> = {};
  results.forEach(lgu => {
    const regionInternal =
      regionMapping[lgu.region] ||
      regionMapping[lgu.regionCode] ||
      lguToRegion[lgu.lgu];
    if (!regionInternal) return;
    if (!grouped[regionInternal]) grouped[regionInternal] = [];
    grouped[regionInternal].push(lgu);
  });
  return grouped;
}

// Helper: Check if date range is a full month range
function isFullMonthRange(start: Date, end: Date) {
  return (
    isSameDay(start, startOfMonth(start)) &&
    isSameDay(end, endOfMonth(end))
  );
}

// Helper: Check if a month is in the selected range
function isMonthInRange(monthStr: string, range: { start: Date | null; end: Date | null }) {
  if (!range.start && !range.end) return true;
  const monthDate = monthStr.length === 7
    ? new Date(monthStr + "-01")
    : new Date(monthStr);

  const start = range.start ? startOfMonth(range.start) : null;
  const end = range.end ? endOfMonth(range.end) : null;

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

// --- Exported filterTableResults helper for PDF/Excel export ---
export function filterTableResults({
  apiData,
  selectedRegions = [],
  selectedProvinces = [],
  selectedCities = [],
  selectedDates = [],
  selectedIslands = [],
  lguToRegion = {},
  dateRange = { start: null, end: null },
}: {
  apiData: any;
  selectedRegions?: string[];
  selectedProvinces?: string[];
  selectedCities?: string[];
  selectedDates?: string[];
  selectedIslands?: string[];
  lguToRegion?: Record<string, string>;
  dateRange?: { start: Date | string | null; end: Date | string | null };
}) {
  // Helper: Normalize a date value to Date or null
  function ensureDate(d: Date | string | null | undefined): Date | null {
    if (!d) return null;
    if (d instanceof Date) return d;
    if (typeof d === 'string') {
      const dt = new Date(d);
      return isNaN(dt.getTime()) ? null : dt;
    }
    return null;
  }

  // Helper: Normalize a DateRange object
  function normalizeDateRange(dr: { start: Date | string | null; end: Date | string | null }) {
    return {
      start: ensureDate(dr?.start),
      end: ensureDate(dr?.end),
    };
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

  // --- Begin filter logic ---
  const normalizedDateRange = normalizeDateRange(dateRange);
  let filtered = Array.isArray(apiData?.results) ? apiData.results : [];

  // Helper: get all regions from selected islands
  // You must import or define islandRegionMap and regionMapping in this file or import from your utils
  const getRegionsFromIslands = (islands: string[]) => {
    const regions = islands.flatMap(island => islandRegionMap[island] || []);
    return Array.from(new Set(regions));
  };

  if (selectedIslands && selectedIslands.length > 0) {
    const regionsFromIslands = getRegionsFromIslands(selectedIslands);
    const regionsInternal = regionsFromIslands.map(code => regionMapping[code] || code);
    filtered = filtered.filter((lgu: any) => {
      const regionInternal =
        regionMapping[lgu.region] ||
        regionMapping[lgu.regionCode] ||
        lguToRegion[lgu.lgu];
      return regionsInternal.includes(regionInternal);
    });
  } else if (selectedRegions && selectedRegions.length > 0) {
    filtered = filtered.filter((lgu: any) => {
      const regionInternal =
        regionMapping[lgu.region] ||
        regionMapping[lgu.regionCode] ||
        lguToRegion[lgu.lgu];
      return selectedRegions.includes(regionInternal);
    });
  }

  if (selectedProvinces && selectedProvinces.length > 0) {
    filtered = filtered.filter((lgu: any) => {
      const province = extractProvince(lgu);
      return (
        province &&
        selectedProvinces.some(
          prov =>
            prov.trim().toLowerCase() === province.trim().toLowerCase()
        )
      );
    });
  }

  if (selectedCities && selectedCities.length > 0) {
    filtered = filtered.filter((lgu: any) => {
      const city = extractCity(lgu);
      return (
        city &&
        selectedCities.some(
          c =>
            c.trim().toLowerCase() === city.trim().toLowerCase()
        )
      );
    });
  }

  // If "Day" is selected, DO NOT merge, just filter by date range
  if (selectedDates && selectedDates.includes("Day")) {
    return filtered.map((lgu: any) => ({
      ...lgu,
      monthlyResults: lgu.monthlyResults.filter((month: any) =>
        isMonthInRange(month.month, normalizedDateRange)
      ),
      months: lgu.monthlyResults
        .filter((month: any) => isMonthInRange(month.month, normalizedDateRange))
        .map((month: any) => month.month),
      sum: {}, // Not used in this mode
    }));
  }

  // Else, merge and sum duplicates here!
  return mergeLguProvinceSumAllMonths(filtered, normalizedDateRange);
}

// --- Exported getDateRangeLabel helper for PDF/Excel export ---
export function getDateRangeLabel(
  start: Date | null,
  end: Date | null,
  selectedDateType: string
) {
  if (!start && !end) return "";
  if (selectedDateType === "Month" && start && end) {
    return `${format(start, "MMMM yyyy")} - ${format(end, "MMMM yyyy")}`;
  }
  if (selectedDateType === "Year" && start && end) {
    return `${format(start, "MMMM yyyy")} - ${format(end, "MMMM yyyy")}`;
  }
  if (selectedDateType === "Day" && start && end) {
    if (isSameDay(start, end)) {
      return format(start, "MMM dd, yyyy");
    }
    return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
  }
  if (start && end) {
    return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
  }
  if (start) return format(start, "MMM dd, yyyy");
  if (end) return format(end, "MMM dd, yyyy");
  return "";
}

// --- Loader Persistence Logic using Redux-persisted table data/filter ---
const BusinessPermitReport = forwardRef<HTMLDivElement, TableReportProps>(({
  selectedRegions,
  dateRange,
  apiData,
  loading,
  lguToRegion,
  selectedProvinces = [],
  selectedCities = [],
  selectedDates = [],
  selectedIslands,
  hasSearched = false,
  onTableDataChange,
}, ref) => {
  const normalizedDateRange = useMemo(
    () => normalizeDateRange(dateRange),
    [dateRange?.start, dateRange?.end]
  );

  // Redux persisted data/filter
  const persistedTableData = useSelector((state: any) => state.businessPermitTable.tableData);
  const persistedAppliedFilter = useSelector((state: any) => state.businessPermitTable.appliedFilter);
  const reduxSelectedIslands = useSelector((state: RootState) => state.reportFilter.selectedIslands || []);
  const islandsToUse = selectedIslands && selectedIslands.length > 0 ? selectedIslands : reduxSelectedIslands;

  
  // Helper to compare filters shallowly
  function isSameFilter(a: any, b: any) {
    if (!a || !b) return false;
    return (
      JSON.stringify(a.selectedRegions) === JSON.stringify(b.selectedRegions) &&
      JSON.stringify(a.selectedProvinces) === JSON.stringify(b.selectedProvinces) &&
      JSON.stringify(a.selectedCities) === JSON.stringify(b.selectedCities) &&
      JSON.stringify(a.selectedIslands) === JSON.stringify(b.selectedIslands) &&
      JSON.stringify(a.dateRange) === JSON.stringify(b.dateRange)
    );
  }

  // --- Loader logic: initialize based on persisted data/filter match ---
  const [showLoader, setShowLoader] = useState(() => {
    if (
      persistedTableData &&
      persistedAppliedFilter &&
      isSameFilter(
        {
          selectedRegions,
          selectedProvinces,
          selectedCities,
          selectedIslands: islandsToUse,
          dateRange,
        },
        {
          selectedRegions: persistedAppliedFilter.selectedRegions,
          selectedProvinces: persistedAppliedFilter.selectedProvinces,
          selectedCities: persistedAppliedFilter.selectedCities,
          selectedIslands: persistedAppliedFilter.selectedIslands,
          dateRange: persistedAppliedFilter.dateRange,
        }
      )
    ) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (
      persistedTableData &&
      persistedAppliedFilter &&
      isSameFilter(
        {
          selectedRegions,
          selectedProvinces,
          selectedCities,
          selectedIslands: islandsToUse,
          dateRange,
        },
        {
          selectedRegions: persistedAppliedFilter.selectedRegions,
          selectedProvinces: persistedAppliedFilter.selectedProvinces,
          selectedCities: persistedAppliedFilter.selectedCities,
          selectedIslands: persistedAppliedFilter.selectedIslands,
          dateRange: persistedAppliedFilter.dateRange,
        }
      )
    ) {
      setShowLoader(false);
    } else {
      setShowLoader(true);
    }
  }, [
    persistedTableData,
    persistedAppliedFilter,
    selectedRegions,
    selectedProvinces,
    selectedCities,
    islandsToUse,
    dateRange,
  ]);

  // Use persistedTableData if available and filter matches, else use apiData
  const effectiveApiData =
    persistedTableData &&
    persistedAppliedFilter &&
    isSameFilter(
      {
        selectedRegions,
        selectedProvinces,
        selectedCities,
        selectedIslands: islandsToUse,
        dateRange,
      },
      {
        selectedRegions: persistedAppliedFilter.selectedRegions,
        selectedProvinces: persistedAppliedFilter.selectedProvinces,
        selectedCities: persistedAppliedFilter.selectedCities,
        selectedIslands: persistedAppliedFilter.selectedIslands,
        dateRange: persistedAppliedFilter.dateRange,
      }
    )
      ? persistedTableData
      : apiData;

  const filteredResults = useMemo(() => {
    let filtered = Array.isArray(effectiveApiData?.results) ? effectiveApiData.results : [];

    if (islandsToUse.length > 0) {
      const regionsFromIslands = islandsToUse.flatMap(island => islandRegionMap[island] || []);
      const regionsInternal = regionsFromIslands.map(code => regionMapping[code] || code);
      filtered = filtered.filter((lgu: any) => {
        const regionInternal =
          regionMapping[lgu.region] ||
          regionMapping[lgu.regionCode] ||
          lguToRegion[lgu.lgu];
        return regionsInternal.includes(regionInternal);
      });
    } else if (selectedRegions.length > 0) {
      filtered = filtered.filter((lgu: any) => {
        const regionInternal =
          regionMapping[lgu.region] ||
          regionMapping[lgu.regionCode] ||
          lguToRegion[lgu.lgu];
        return selectedRegions.includes(regionInternal);
      });
    }

    if (selectedProvinces.length > 0) {
      filtered = filtered.filter((lgu: any) => {
        const province = extractProvince(lgu);
        return (
          province &&
          selectedProvinces.some(
            prov =>
              prov.trim().toLowerCase() === province.trim().toLowerCase()
          )
        );
      });
    }

    if (selectedCities.length > 0) {
      filtered = filtered.filter((lgu: any) => {
        const city = extractCity(lgu);
        return (
          city &&
          selectedCities.some(
            c =>
              c.trim().toLowerCase() === city.trim().toLowerCase()
          )
        );
      });
    }

    if (selectedDates && selectedDates.includes("Day")) {
      return filtered.map((lgu: any) => ({
        ...lgu,
        monthlyResults: lgu.monthlyResults.filter((month: any) =>
          isMonthInRange(month.month, normalizedDateRange)
        ),
        months: lgu.monthlyResults
          .filter((month: any) => isMonthInRange(month.month, normalizedDateRange))
          .map((month: any) => month.month),
        sum: {},
      }));
    }

    return mergeLguProvinceSumAllMonths(filtered, normalizedDateRange);
  }, [
    effectiveApiData?.results,
    selectedRegions.join("-"),
    selectedProvinces.join("-"),
    selectedCities.join("-"),
    JSON.stringify(lguToRegion),
    normalizedDateRange?.start?.toISOString?.() ?? "",
    normalizedDateRange?.end?.toISOString?.() ?? "",
    selectedDates?.join("-") ?? "",
    islandsToUse.join("-"),
  ]);

  // Notify parent if table has data (for enabling Download button)
  useEffect(() => {
    if (onTableDataChange) {
      onTableDataChange(filteredResults.length > 0);
    }
  }, [filteredResults.length, onTableDataChange]);

  // Format date range label
  let dateRangeLabel = "";
  if (normalizedDateRange?.start && normalizedDateRange?.end) {
    if (isFullMonthRange(normalizedDateRange.start, normalizedDateRange.end)) {
      dateRangeLabel = `${format(normalizedDateRange.start, "MMMM yyyy")} - ${format(normalizedDateRange.end, "MMMM yyyy")}`;
    } else {
      dateRangeLabel = `${format(normalizedDateRange.start, "MMM dd, yyyy")} - ${format(normalizedDateRange.end, "MMM dd, yyyy")}`;
    }
  } else if (normalizedDateRange?.start) {
    dateRangeLabel = `${format(normalizedDateRange.start, "MMM dd, yyyy")}`;
  } else if (normalizedDateRange?.end) {
    dateRangeLabel = `${format(normalizedDateRange.end, "MMM dd, yyyy")}`;
  }

  const regionMappingGrouped = useMemo(() => groupResultsByRegion(filteredResults, lguToRegion), [filteredResults, JSON.stringify(lguToRegion)]);
  const tableRowsReport = useMemo(() => {
    const rows: React.ReactNode[] = [];
    Object.entries(regionMappingGrouped).forEach(([region, lguList]) => {
      lguList.forEach((lgu: any, idx: number) => {
        if (lgu.sum && Object.keys(lgu.sum).length > 0) {
          const sum = lgu.sum;
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}`}>
              {idx === 0 && (
                <TableCell
                  className="border px-2 py-1 text-center font-bold bg-card left-0 z-10 align-middle"
                  rowSpan={lguList.length}
                >
                  {getRegionCode(region)}
                </TableCell>
              )}
              <TableCell className="border px-2 py-1 text-start font-bold">
                {lgu.lgu}
                <span className="text-xs font-normal ">
                  {lgu.province ? `(${lgu.province})` : ""}
                </span>
                <br />
                <span className="text-[10px] font-normal text-blue-700">
                  {lgu.months && lgu.months.length > 0 && (
                    lgu.months.length === 1
                      ? `(${formatMonthYear(lgu.months[0])})`
                      : `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`
                  )}
                </span>
              </TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.newPaid || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.newPaidViaEgov || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.newPending || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(sum.newPaid || 0) + (sum.newPaidViaEgov || 0) + (sum.newPending || 0)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.renewPaid || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.renewPaidViaEgov || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.renewPending || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(sum.renewPaid || 0) + (sum.renewPaidViaEgov || 0) + (sum.renewPending || 0)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.malePaid || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.malePending || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(sum.malePaid || 0) + (sum.malePending || 0)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.femalePaid || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.femalePending || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(sum.femalePaid || 0) + (sum.femalePending || 0)}</TableCell>
            </TableRow>
          );
        } else {
          lgu.monthlyResults.forEach((month: any, mIdx: number) => {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${month.month}-${mIdx}`}>
                {idx === 0 && mIdx === 0 && (
                  <TableCell
                    className="border px-2 py-1 text-center font-bold bg-card left-0 z-10 align-middle"
                    rowSpan={lguList.reduce((acc, lgu) => acc + (lgu.monthlyResults?.length || 1), 0)}
                  >
                    {getRegionCode(region)}
                  </TableCell>
                )}
                <TableCell className="border px-2 py-1 text-start font-bold">
                  {lgu.lgu}
                  <span className="text-xs font-normal text-accent">
                    {lgu.province ? `(${lgu.province})` : ""}
                  </span>
                  <br />
                  <span className="text-[10px] font-normal text-blue-800">
                    ({formatMonthYear(month.month)})
                  </span>
                </TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.newPaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.newPaidViaEgov || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.newPending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{(month.newPaid || 0) + (month.newPaidViaEgov || 0) + (month.newPending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.renewPaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.renewPaidViaEgov || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.renewPending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{(month.renewPaid || 0) + (month.renewPaidViaEgov || 0) + (month.renewPending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.malePaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.malePending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{(month.malePaid || 0) + (month.malePending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.femalePaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.femalePending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{(month.femalePaid || 0) + (month.femalePending || 0)}</TableCell>
              </TableRow>
            );
          });
        }
      });
    });
    return rows;
  }, [regionMappingGrouped]);

  // Calculate grand totals for the table footer
  const grandTotals = useMemo(() => {
    let totals = {
      newPaid: 0,
      newGeoPay: 0,
      newPending: 0,
      renewalPaid: 0,
      renewalGeoPay: 0,
      renewalPending: 0,
      malePaid: 0,
      malePending: 0,
      femalePaid: 0,
      femalePending: 0,
    };

    filteredResults.forEach((lgu: any) => {
      if (lgu.sum && Object.keys(lgu.sum).length > 0) {
        totals.newPaid += lgu.sum.newPaid || 0;
        totals.newGeoPay += lgu.sum.newPaidViaEgov || 0;
        totals.newPending += lgu.sum.newPending || 0;
        totals.renewalPaid += lgu.sum.renewPaid || 0;
        totals.renewalGeoPay += lgu.sum.renewPaidViaEgov || 0;
        totals.renewalPending += lgu.sum.renewPending || 0;
        totals.malePaid += lgu.sum.malePaid || 0;
        totals.malePending += lgu.sum.malePending || 0;
        totals.femalePaid += lgu.sum.femalePaid || 0;
        totals.femalePending += lgu.sum.femalePending || 0;
      } else if (Array.isArray(lgu.monthlyResults)) {
        lgu.monthlyResults.forEach((month: any) => {
          totals.newPaid += month.newPaid || 0;
          totals.newGeoPay += month.newPaidViaEgov || 0;
          totals.newPending += month.newPending || 0;
          totals.renewalPaid += month.renewPaid || 0;
          totals.renewalGeoPay += month.renewPaidViaEgov || 0;
          totals.renewalPending += month.renewPending || 0;
          totals.malePaid += month.malePaid || 0;
          totals.malePending += month.malePending || 0;
          totals.femalePaid += month.femalePaid || 0;
          totals.femalePending += month.femalePending || 0;
        });
      }
    });

    return totals;
  }, [filteredResults]);

  return (
    <div ref={ref} className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm">
      {/* Only show the Loading overlay, not the loader TableRow/TableBody, if persisted data/filter match */}
    {hasSearched && (showLoader || loading) && 
      <Loading 
    />}

      <div ref={ref}>
        <div className='flex justify-center mb-4 p-5'>
          <img src={dictImage} alt="dict logo" className='w-80 h-full'/>
        </div>
        <Table className="w-full border-collapse text-[10px]">
          <TableHeader>
            <TableRow>
              <TableHead colSpan={16} className="bg-[#9ec6f7] text-black text-center font-bold text-base border top-0">
                Business Permit
                {dateRangeLabel && (
                  <div className="text-xs text-gray-700 mt-1 font-bold">
                    {dateRangeLabel}
                  </div>
                )}
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center align-middle top-[40px]">Region</TableHead>
              <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center align-middle top-[40px]">LGU</TableHead>
              <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center top-[40px]">NEW</TableHead>
              <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center top-[40px]">RENEWAL</TableHead>
              <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center top-[40px]">MALE</TableHead>
              <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center top-[40px]">FEMALE</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px] text-center">PAID <br />
                <span className='text-[10px]'>(Per OR Paid with eGOVPay)</span>
              </TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px] text-center">PAID <br />
                <span className='text-[10px]'>(Per OR Paid with eGOVPay)</span>
              </TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
            </TableRow>
          </TableHeader>
         
           <TableBody className="[&>tr:nth-child(odd)]:bg-accent">
            {/* Only show loader TableRow if not using persisted data/filter */}
            {hasSearched && (showLoader || loading) ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-4 border">
                    <LoaderTable />
                  </TableCell>
                </TableRow>
              ) : (
              filteredResults.length === 0 ? (
                hasSearched ? ( 
                  (selectedRegions.length > 0 || (normalizedDateRange?.start && normalizedDateRange?.end)) ? (
                    <TableRow>
                      <TableCell colSpan={16} className="text-center py-4 border">
                        <span className='font-bold text-lg text-muted-foreground'>
                          No results found, Please try again!
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={16} className="text-center py-4 border">
                        <span className='font-bold text-sm text-muted-foreground'>
                          Please select regions and date range you want to view.
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-4 border">
                      <span className='font-bold text-sm text-muted-foreground'>
                        Please select regions and date range you want to view.
                      </span>
                    </TableCell>
                  </TableRow>
                )
              ) : (
                tableRowsReport
              )
            )}
            <TableRow className="!bg-[#3a4554] hover:!bg-[#3a4554] font-bold text-white border">
              <TableCell className="border px-2 py-1" colSpan={2}>
                GRAND TOTAL FOR <br />
                <span className='text-[8px] font-normal text-gray-300'>
                  ({dateRangeLabel})
                </span>
              </TableCell>
              {/* Show 0s if loading or showLoader is true */}
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.newPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.newGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.newPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : (grandTotals.newPaid + grandTotals.newGeoPay + grandTotals.newPending)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.renewalPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.renewalGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.renewalPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : (grandTotals.renewalPaid + grandTotals.renewalGeoPay + grandTotals.renewalPending)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.malePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.malePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : (grandTotals.malePaid + grandTotals.malePending)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.femalePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : grandTotals.femalePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(showLoader || loading) ? 0 : (grandTotals.femalePaid + grandTotals.femalePending)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default BusinessPermitReport;
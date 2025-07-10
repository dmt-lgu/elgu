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
import { useSelector } from 'react-redux';
import LoaderTable from '../utils/LoaderTable';
import Loading from '../utils/Loading';

interface BrgyCleranceProps {
  selectedRegions: string[];
  dateRange: { start: Date | string | null; end: Date | string | null };
  apiData: any;
  loading: boolean;
  lguToRegion: Record<string, string>;
  selectedProvinces?: string[];
  selectedCities?: string[];
  selectedDates?: string[];
  selectedIslands?: string[];
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
  }
  if (start) {
    return monthDate >= start;
  }
  if (end) {
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
      // For totalCount, sum it up for merged row
      if (typeof month.totalCount === "number") {
        merged[key].totalCount = (merged[key].totalCount || 0) + month.totalCount;
      }
    });
  });

  // Clean up months (unique)
  Object.values(merged).forEach((item: any) => {
    item.months = Array.from(new Set(item.months));
  });

  return Object.values(merged);
}

// --- Loader persistence logic ---
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

const BrgyClearanceReport = forwardRef<HTMLDivElement, BrgyCleranceProps>(({
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
  // Normalize dateRange at the top of the component
  const normalizedDateRange = useMemo(
    () => normalizeDateRange(dateRange),
    [dateRange?.start, dateRange?.end]
  );

  // Loader persistence logic
  const persistedBrgyTableData = useSelector((state: any) => state.brgyClearanceTable.tableData);
  const persistedBrgyAppliedFilter = useSelector((state: any) => state.brgyClearanceTable.appliedFilter);
  const reduxSelectedIslands = useSelector((state: any) => state.reportFilter.selectedIslands || []);
  const islandsToUse = selectedIslands && selectedIslands.length > 0 ? selectedIslands : reduxSelectedIslands;

  const [showLoader, setShowLoader] = useState(true);

  useEffect(() => {
    if (
      persistedBrgyTableData &&
      persistedBrgyAppliedFilter &&
      isSameFilter(
        {
          selectedRegions,
          selectedProvinces,
          selectedCities,
          selectedIslands: islandsToUse,
          dateRange,
        },
        {
          selectedRegions: persistedBrgyAppliedFilter.selectedRegions,
          selectedProvinces: persistedBrgyAppliedFilter.selectedProvinces,
          selectedCities: persistedBrgyAppliedFilter.selectedCities,
          selectedIslands: persistedBrgyAppliedFilter.selectedIslands,
          dateRange: persistedBrgyAppliedFilter.dateRange,
        }
      )
    ) {
      setShowLoader(false);
    } else {
      setShowLoader(true);
    }
  }, [
    persistedBrgyTableData,
    persistedBrgyAppliedFilter,
    selectedRegions,
    selectedProvinces,
    selectedCities,
    islandsToUse,
    dateRange,
  ]);

  // Get filtered results (table data logic unchanged)
  const filteredResults = useMemo(() => {
    let filtered = Array.isArray(apiData?.results) ? apiData.results : [];

    // Filter by islands if any are selected
    if (islandsToUse.length > 0) {
      const regionsFromIslands = islandsToUse.flatMap((island:any) => islandRegionMap[island] || []);
      // Convert region codes to internal keys
      const regionsInternal = regionsFromIslands.map((code:any )=> regionMapping[code] || code);
      filtered = filtered.filter((lgu: any) => {
        const regionInternal =
          regionMapping[lgu.region] ||
          regionMapping[lgu.regionCode] ||
          lguToRegion[lgu.lgu];
        return regionsInternal.includes(regionInternal);
      });
    } else if (selectedRegions.length > 0) {
      filtered = filtered.filter((lgu: any) => {
        // Map region code to internal key if possible
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

    // Default: merge and sum duplicates here!
    return mergeLguProvinceSumAllMonths(filtered, normalizedDateRange);
  }, [
    apiData?.results,
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
        // Month/Year mode: merged row, sum totalCount for all months in range
        if (lgu.sum && Object.keys(lgu.sum).length > 0) {
          // Sum totalCount from all months in the range (already computed in mergeLguProvinceSumAllMonths)
          const totalCount = typeof lgu.totalCount === "number"
            ? lgu.totalCount
            : (Array.isArray(lgu.monthlyResults)
                ? lgu.monthlyResults.reduce(
                    (sum: number, month: any) =>
                      typeof month.totalCount === "number" ? sum + month.totalCount : sum,
                    0
                  )
                : 0);
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}`}>
              {idx === 0 && (
                <TableCell
                  className="border px-2 py-1 text-center text-sm font-bold bg-card left-0 z-10 align-middle"
                  rowSpan={lguList.length}
                >
                  {getRegionCode(region)}
                </TableCell>
              )}
             <TableCell className="border px-2 py-1 text-center font-bold">
              {lgu.lgu}
              <span className="text-base font-normal text-gray-500">
                {lgu.province ? `(${lgu.province})` : ""}
              </span>
              <br />
              <span className="text-[10px] font-normal text-blue-800">
                {lgu.months && lgu.months.length > 0 && (
                  lgu.months.length === 1
                    ? `(${formatMonthYear(lgu.months[0])})`
                    : `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`
                )}
              </span>
            </TableCell>
              <TableCell className="border px-2 py-1 text-center text-[10px]">
                {totalCount}
              </TableCell>
            </TableRow>
          );
          return; // Early return, skip to next lgu
        }
        // Day mode: render per monthlyResults
        lgu.monthlyResults.forEach((month: any, mIdx: number) => {
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}-${month.month}-${mIdx}`}>
              {idx === 0 && mIdx === 0 && (
                <TableCell className="text-base border px-2 py-1 text-center font-bold bg-card left-0 z-10 align-middle"
                  rowSpan={lguList.reduce((acc, lgu) => acc + (lgu.monthlyResults?.length || 1), 0)}>
                  {getRegionCode(region)}
                </TableCell>
              )}
              <TableCell className="border px-2 py-1 text-center font-bold">
                {lgu.lgu}
                <span className="text-base font-normal text-gray-500">
                  {lgu.province ? `(${lgu.province})` : ""}
                </span>
                <br />
                <span className="text-[10px] font-normal text-blue-800">
                  ({formatMonthYear(month.month)})
                </span>
              </TableCell>
              <TableCell className="border px-2 py-1 text-center">
                {typeof month.totalCount !== "undefined"
                  ? month.totalCount
                  : ""}
              </TableCell>
            </TableRow>
          );
        });
      });
    });
    return rows;
  }, [regionMappingGrouped]);

  return (
    <div ref={ref} className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm">
     {(hasSearched && (showLoader || loading)) && (
        <Loading />
      )}
      <div>
        <div className='flex justify-center mb-4 p-5'>
          <img src={dictImage} alt="dict logo" className='w-80 h-full'/>
        </div>
        <Table className="w-full border-collapse text-[10px]">
          <TableHeader>
            <TableRow>
              <TableHead colSpan={3} className="bg-[#9ec6f7] text-black text-center font-bold text-base border top-0">
                Barangay Clearance
                {dateRangeLabel && (
                  <div className="text-xs text-gray-700 mt-1 font-bold">
                    {dateRangeLabel}
                  </div>
                )}
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center align-middle text-base">Region</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center align-middle text-base">LGU</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center align-middle text-base">Total Results</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&>tr:nth-child(odd)]:bg-accent">
            {hasSearched && (showLoader || loading) ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-4 border">
                  <LoaderTable />
                </TableCell>
              </TableRow>
            ) : (
              filteredResults.length === 0 ? (
                hasSearched ? (
                  (selectedRegions.length > 0 || (normalizedDateRange?.start && normalizedDateRange?.end)) ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 border">
                        <span className='font-bold text-lg text-muted-foreground'>
                          No results found, Please try again!
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-4 border">
                        <span className='font-bold text-sm text-muted-foreground'>
                          Please select regions and date range you want to view.
                        </span>
                      </TableCell>
                    </TableRow>
                  )
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-4 border">
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
              <TableCell className="border px-2 py-1 text-center">
                {(loading || showLoader)
                  ? 0
                  : filteredResults.reduce((sum: number, lgu: any) => {
                      if (typeof lgu.totalCount === "number") {
                        return sum + lgu.totalCount;
                      }
                      if (Array.isArray(lgu.monthlyResults)) {
                        return sum + lgu.monthlyResults.reduce(
                          (mSum: number, month: any) => mSum + (typeof month.totalCount === "number" ? month.totalCount : 0),
                          0
                        );
                      }
                      return sum;
                    }, 0)
                }
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default BrgyClearanceReport;
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
import { RootState } from '@/redux/store'; // Assuming RootState is defined for your store
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

// --- Utility Functions (Keep as is) ---
function ensureDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d === 'string') {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function normalizeDateRange(dr: { start: Date | string | null; end: Date | string | null }) {
  return {
    start: ensureDate(dr?.start),
    end: ensureDate(dr?.end),
  };
}

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

function isFullMonthRange(start: Date, end: Date) {
  return (
    isSameDay(start, startOfMonth(start)) &&
    isSameDay(end, endOfMonth(end))
  );
}

function isMonthInRange(monthStr: string, range: { start: Date | null; end: Date | null }) {
  if (!range.start && !range.end) return true;
  const monthDate = monthStr.length === 7 ? new Date(monthStr + "-01") : new Date(monthStr);
  const start = range.start ? startOfMonth(range.start) : null;
  const end = range.end ? endOfMonth(range.end) : null;
  if (start && end) return monthDate >= start && monthDate <= end;
  if (start) return monthDate >= start;
  if (end) return monthDate <= end;
  return true;
}

function extractProvince(lgu: any): string | undefined {
  if (lgu.province && typeof lgu.province === "string" && lgu.province.trim() !== "") {
    return lgu.province.trim();
  }
  if (lgu.lgu && typeof lgu.lgu === "string") {
    const parts = lgu.lgu.split(",");
    if (parts.length > 1) return parts[parts.length - 1].trim();
  }
  return undefined;
}

function extractCity(lgu: any): string | undefined {
  if (lgu.city && typeof lgu.city === "string" && lgu.city.trim() !== "") {
    return lgu.city.trim();
  }
  if (lgu.lgu && typeof lgu.lgu === "string") {
    const parts = lgu.lgu.split(",");
    if (parts.length > 1) return parts[0].trim();
    return lgu.lgu.trim();
  }
  return undefined;
}

function mergeLguProvinceSumAllMonths(
  results: any[],
  dateRange: { start: Date | null; end: Date | null }
) {
  const merged: Record<string, any> = {};

  results.forEach(lgu => {
    const province = extractProvince(lgu) || "";
    const key = `${lgu.lgu}||${province}`;
    if (!merged[key]) {
      merged[key] = { ...lgu, monthlyResults: [], sum: {}, months: [], totalCount: 0 };
    }
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
      if (typeof month.totalCount === "number") {
        merged[key].totalCount += month.totalCount;
      }
    });
  });

  Object.values(merged).forEach((item: any) => {
    item.months = Array.from(new Set(item.months));
  });

  return Object.values(merged);
}

// --- Exported Helper for Filtering ---
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
  const normalizedDateRange = normalizeDateRange(dateRange);
  let filtered = Array.isArray(apiData?.results) ? [...apiData.results] : [];

  const getRegionsFromIslands = (islands: string[]) => {
      return islands.flatMap(island => islandRegionMap[island] || []);
  };

  if (selectedIslands && selectedIslands.length > 0) {
    const regionsFromIslands = getRegionsFromIslands(selectedIslands);
    const regionsInternal = regionsFromIslands.map(code => regionMapping[code] || code);
    filtered = filtered.filter(lgu => {
      const regionInternal = regionMapping[lgu.region] || regionMapping[lgu.regionCode] || lguToRegion[lgu.lgu];
      return regionsInternal.includes(regionInternal);
    });
  } else if (selectedRegions && selectedRegions.length > 0) {
    filtered = filtered.filter(lgu => {
      const regionInternal = regionMapping[lgu.region] || regionMapping[lgu.regionCode] || lguToRegion[lgu.lgu];
      return selectedRegions.includes(regionInternal);
    });
  }

  if (selectedProvinces && selectedProvinces.length > 0) {
    filtered = filtered.filter(lgu => {
      const province = extractProvince(lgu);
      return province && selectedProvinces.some(p => p.trim().toLowerCase() === province.trim().toLowerCase());
    });
  }

  if (selectedCities && selectedCities.length > 0) {
    filtered = filtered.filter(lgu => {
      const city = extractCity(lgu);
      return city && selectedCities.some(c => c.trim().toLowerCase() === city.trim().toLowerCase());
    });
  }

  if (selectedDates && selectedDates.includes("Day")) {
    return filtered.map(lgu => ({
      ...lgu,
      monthlyResults: lgu.monthlyResults.filter((month: any) => isMonthInRange(month.month, normalizedDateRange)),
      months: lgu.monthlyResults.filter((month: any) => isMonthInRange(month.month, normalizedDateRange)).map((month: any ) => month.month),
      sum: {},
    }));
  }

  return mergeLguProvinceSumAllMonths(filtered, normalizedDateRange);
}

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
  const normalizedDateRange = useMemo(() => normalizeDateRange(dateRange), [dateRange]);

  const persistedBrgyTableData = useSelector((state: RootState) => state.brgyClearanceTable.tableData);
  const persistedBrgyAppliedFilter = useSelector((state: RootState) => state.brgyClearanceTable.appliedFilter);
  const reduxSelectedIslands = useSelector((state: RootState) => state.reportFilter.selectedIslands || []);
  const islandsToUse = selectedIslands && selectedIslands.length > 0 ? selectedIslands : reduxSelectedIslands;

  const [showLoader, setShowLoader] = useState(true);
  const [generatedAt, setGeneratedAt] = useState(new Date());

  useEffect(() => {
    const currentFilter = { selectedRegions, selectedProvinces, selectedCities, selectedIslands: islandsToUse, dateRange };
    if (persistedBrgyTableData && isSameFilter(currentFilter, persistedBrgyAppliedFilter)) {
      setShowLoader(false);
    } else {
      setShowLoader(true);
    }
  }, [persistedBrgyTableData, persistedBrgyAppliedFilter, selectedRegions, selectedProvinces, selectedCities, islandsToUse, dateRange]);

  useEffect(() => {
    setGeneratedAt(new Date());
  }, [apiData]);

  const filteredResults = useMemo(() => {
    return filterTableResults({
      apiData,
      selectedRegions,
      selectedProvinces,
      selectedCities,
      selectedDates,
      selectedIslands: islandsToUse,
      lguToRegion,
      dateRange,
    });
  }, [apiData, selectedRegions, selectedProvinces, selectedCities, selectedDates, islandsToUse, lguToRegion, dateRange]);

  useEffect(() => {
    onTableDataChange?.(filteredResults.length > 0);
  }, [filteredResults.length, onTableDataChange]);

  const dateRangeLabel = useMemo(() => {
    // Re-using getDateRangeLabel from WorkingPermit for consistency if it's external,
    // otherwise ensuring the logic is identical to previous Business/Working Permit
    if (!normalizedDateRange.start && !normalizedDateRange.end) return "";
    
    // Check for full month range specifically for "Month" or "Year" selectedDates
    if ((selectedDates?.[0] === "Month" || selectedDates?.[0] === "Year") && normalizedDateRange.start && normalizedDateRange.end && isFullMonthRange(normalizedDateRange.start, normalizedDateRange.end)) {
        return `${format(normalizedDateRange.start, "MMMM yyyy")} - ${format(normalizedDateRange.end, "MMMM yyyy")}`;
    }
    // Default date range format
    if (normalizedDateRange.start && normalizedDateRange.end) {
        if (isSameDay(normalizedDateRange.start, normalizedDateRange.end)) return format(normalizedDateRange.start, "MMM dd, yyyy");
        return `${format(normalizedDateRange.start, "MMM dd, yyyy")} - ${format(normalizedDateRange.end, "MMM dd, yyyy")}`;
    }
    if (normalizedDateRange.start) return format(normalizedDateRange.start, "MMM dd, yyyy");
    if (normalizedDateRange.end) return format(normalizedDateRange.end, "MMM dd, yyyy");
    return "";
  }, [normalizedDateRange, selectedDates]);


  const regionMappingGrouped = useMemo(() => groupResultsByRegion(filteredResults, lguToRegion), [filteredResults, lguToRegion]);

  const tableRowsReport = useMemo(() => {
    const rows: React.ReactNode[] = [];
    Object.entries(regionMappingGrouped).forEach(([region, lguList]) => {
      lguList.forEach((lgu: any, idx: number) => {
        if (lgu.sum && Object.keys(lgu.sum).length > 0) {
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}`} className="hover:bg-blue-50/50">
              {idx === 0 && (
                <TableCell className="border px-2 py-1.5 text-center font-medium left-0 z-10 align-middle" rowSpan={lguList.length}>
                  {getRegionCode(region)}
                </TableCell>
              )}
              <TableCell className="border px-2 py-1.5 text-center font-medium">
                {lgu.lgu}
                <span className="text-[10px] font-normal text-gray-500 ml-1">
                  {lgu.province ? `(${lgu.province})` : ""}
                </span>
                <br />
                <span className="text-[10px] font-normal text-blue-600">
                  {lgu.months?.length > 1
                    ? `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`
                    : lgu.months?.length === 1
                    ? `(${formatMonthYear(lgu.months[0])})`
                    : ""}
                </span>
              </TableCell>

              <TableCell className="border px-2 py-1.5 text-center font-semibold">{lgu.totalCount || 0}</TableCell>
            </TableRow>
          );
        } else {
          lgu.monthlyResults.forEach((month: any, mIdx: number) => {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${month.month}-${mIdx}`} className="hover:bg-blue-50/50">
                {idx === 0 && mIdx === 0 && (
                  <TableCell className="border px-2 py-1.5 text-center font-medium left-0 z-10 align-middle" rowSpan={lguList.reduce((acc, lguItem) => acc + (lguItem.monthlyResults?.length || 1), 0)}>
                    {getRegionCode(region)}
                  </TableCell>
                )}
                <TableCell className="border px-2 py-1.5 text-center font-medium">
                  {lgu.lgu}
                  <span className="text-[10px] font-normal text-gray-500 ml-1">
                    {lgu.province ? `(${lgu.province})` : ""}
                  </span>
                  <br />
                  <span className="text-[10px] font-normal text-blue-600">
                    ({formatMonthYear(month.month)})
                  </span>
                </TableCell>

                <TableCell className="border px-2 py-1.5 text-center font-semibold">{month.totalCount ?? ""}</TableCell>
              </TableRow>
            );
          });
        }
      });
    });
    return rows;
  }, [regionMappingGrouped]);

  const grandTotal = useMemo(() => {
    return filteredResults.reduce((sum: number, lgu: any) => {
        if (lgu.sum && Object.keys(lgu.sum).length > 0) {
            return sum + (lgu.totalCount || 0);
        }
        if (Array.isArray(lgu.monthlyResults)) {
            return sum + lgu.monthlyResults.reduce((mSum: number, month: any) => mSum + (month.totalCount || 0), 0);
        }
        return sum;
    }, 0);
  }, [filteredResults]);

  const renderTableBody = () => {
    if (hasSearched && (showLoader || loading)) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center py-6 border">
            <LoaderTable />
          </TableCell>
        </TableRow>
      );
    }
    if (filteredResults.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={3} className="text-center py-6 border">
            <span className='font-semibold text-base text-gray-500'>
              {hasSearched ? 'No results found. Please try different filters.' : 'Please select filters to generate a report.'}
            </span>
          </TableCell>
        </TableRow>
      );
    }
    return tableRowsReport;
  };

  return (
    <div ref={ref} className="bg-white p-4 rounded-xl border border-gray-200 shadow-lg">
     {(hasSearched && (showLoader || loading)) && <Loading />}
      
      <div>
        <div className='flex justify-between items-center mb-4 pb-4 border-b border-gray-200'>
            <img src={dictImage} alt="dict logo" className='w-52 h-auto'/>
            <div className='text-right'>
                <h2 className="text-xl font-bold text-gray-800">
                    Barangay Clearance
                </h2>
                {dateRangeLabel && (
                    <p className="text-base text-gray-600">
                        {dateRangeLabel}
                    </p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                    Generated on: {format(generatedAt, "MMM dd, yyyy, h:mm:ss a")}
                </p>
            </div>
        </div>

        <Table className="w-full border-collapse text-xs"> {/* Adjusted to text-xs */}
          <TableHeader>
            <TableRow>
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-2 py-2 text-center align-middle sticky top-0 z-10 uppercase">Region</TableHead> {/* Adjusted padding and font size */}
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-2 py-2 text-center align-middle sticky top-0 z-10 uppercase">LGU</TableHead> {/* Adjusted padding and font size */}
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-2 py-2 text-center align-middle sticky top-0 z-10 uppercase">Total Results</TableHead> {/* Adjusted padding and font size */}
            </TableRow>
          </TableHeader>
          <TableBody className="[&>tr:nth-child(odd)]:bg-gray-100">
            {renderTableBody()}
            <TableRow className="bg-[#3a4554] font-bold text-white border-t-4 border-gray-400">
              <TableCell className="bg-[#3a4554] border px-2 py-2" colSpan={2}> {/* Adjusted padding */}
                GRAND TOTAL
                <br />
                <span className='text-[10px] font-normal text-gray-300'> {/* Consistent with WorkingPermit */}
                  ({dateRangeLabel})
                </span>
              </TableCell>
              <TableCell className="bg-[#3a4554] border px-2 py-2 text-center"> {/* Adjusted padding */}
                {(loading || showLoader) ? 0 : grandTotal}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default BrgyClearanceReport;
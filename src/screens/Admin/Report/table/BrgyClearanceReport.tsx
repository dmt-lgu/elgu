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

  const dateRangeLabel = getDateRangeLabel(
      normalizedDateRange.start,
      normalizedDateRange.end,
      selectedDates?.[0] || 'Day'
    );

    
 function getDateRangeLabel(
  start: Date | null,
  end: Date | null,
  selectedDateType: string
) {
  if (!start && !end) return "No date range selected";
  if ((selectedDateType === "Month" || selectedDateType === "Year") && start && end) {
    if (isFullMonthRange(start, end)) {
        return `${format(start, "MMMM yyyy")} - ${format(end, "MMMM yyyy")}`;
    }
  }
  if (start && end) {
    if (isSameDay(start, end)) {
      return format(start, "MMMM dd, yyyy");
    }
    return `${format(start, "MMMM dd, yyyy")} - ${format(end, "MMMM dd, yyyy")}`;
  }
  if (start) return `From ${format(start, "MMMM dd, yyyy")}`;
  if (end) return `Until ${format(end, "MMMM dd, yyyy")}`;
  return "Date range not specified";
}

  const regionMappingGrouped = useMemo(() => groupResultsByRegion(filteredResults, lguToRegion), [filteredResults, lguToRegion]);

  const tableRowsReport = useMemo(() => {
    const rows: React.ReactNode[] = [];
    Object.entries(regionMappingGrouped).forEach(([region, lguList]) => {
      lguList.forEach((lgu: any, idx: number) => {
        if (lgu.sum && Object.keys(lgu.sum).length > 0) {
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}`} className="hover:bg-blue-50/50 transition-colors duration-200 text-xs">
              {idx === 0 && (
                <TableCell className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs" rowSpan={lguList.length}>
                  {getRegionCode(region)}
                </TableCell>
              )}
              <TableCell className="p-2 text-center font-semibold text-slate-800 text-xs">
                {lgu.lgu}
                <span className="text-[11px] font-medium text-slate-500 ml-1.5">
                  {lgu.province ? `(${lgu.province})` : ""}
                </span>
                <br />
                <span className="text-[10px] font-semibold text-blue-700 mt-0.5">
                  {lgu.months?.length > 1
                    ? `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`
                    : lgu.months?.length === 1
                    ? `(${formatMonthYear(lgu.months[0])})`
                    : ""}
                </span>
              </TableCell>
              <TableCell className="p-2 text-center font-bold tabular-nums text-slate-800">{lgu.totalCount || 0}</TableCell>
            </TableRow>
          );
        } else {
          lgu.monthlyResults.forEach((month: any, mIdx: number) => {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${month.month}-${mIdx}`} className="hover:bg-blue-50/50 transition-colors duration-200 text-xs">
                {idx === 0 && mIdx === 0 && (
                  <TableCell className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs" rowSpan={lguList.reduce((acc, lguItem) => acc + (lguItem.monthlyResults?.length || 1), 0)}>
                    {getRegionCode(region)}
                  </TableCell>
                )}
                <TableCell className="p-2 text-center font-semibold text-slate-800 text-xs">
                  {lgu.lgu}
                  <span className="text-[11px] font-medium text-slate-500 ml-1.5">
                    {lgu.province ? `(${lgu.province})` : ""}
                  </span>
                  <br />
                  <span className="text-[10px] font-semibold text-blue-700 mt-0.5">
                    ({formatMonthYear(month.month)})
                  </span>
                </TableCell>
                <TableCell className="p-2 text-center font-bold tabular-nums text-slate-800">{month.totalCount ?? 0}</TableCell>
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

  

  return (
    <div ref={ref} className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-lg shadow-slate-200/60">
      {(hasSearched && (showLoader || loading)) && <Loading />}
      
      <div>
        <div className='flex justify-between items-center mb-5 pb-5 border-b border-slate-200'>
            <div className="flex items-center gap-4">
              <img src={dictImage} alt="dict logo" className='w-44 h-auto'/>
              <div className="border-l border-slate-300 pl-4">
                  <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                      Barangay Clearance Report
                  </h1>
                  <p className="text-xs font-medium text-slate-500 mt-1">
                      Generated for the period: <span className="font-semibold text-slate-600">{dateRangeLabel}</span>
                  </p>
              </div>
            </div>
            <div className='text-right'>
                <p className="text-[11px] font-semibold text-slate-600">
                    Generated On
                </p>
                <p className="text-xs font-mono text-slate-500">
                    {format(generatedAt, "MMM dd, yyyy, h:mm a")}
                </p>
            </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-300">
          <Table className="w-full border-collapse">
            <TableHeader>
              <TableRow>
                <TableHead className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-10 uppercase text-[11px] border-b border-r border-slate-300">Region</TableHead>
                <TableHead className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-10 uppercase text-[11px] border-b border-r border-slate-300">LGU</TableHead>
                <TableHead className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-10 uppercase text-[11px] border-b border-slate-300">Total Results</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-slate-50/50">
                {hasSearched && (showLoader || loading) ? (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center py-12">
                            <LoaderTable />
                        </TableCell>
                    </TableRow>
                ) : filteredResults.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={3} className="text-center py-16 bg-white">
                            <div className='flex flex-col items-center justify-center'>
                                <div className="rounded-full bg-slate-100 p-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" />
                                    </svg>
                                </div>
                                <p className='font-bold text-sm text-slate-600 mt-4'>
                                    {hasSearched ? 'No Results Found' : 'Generate a Report'}
                                </p>
                                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                                    {hasSearched ? 'There is no data matching your selected filters. Please try adjusting your criteria.' : 'Use the filters above to generate your barangay clearance report.'}
                                </p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    tableRowsReport
                )}
            </TableBody>
            <tfoot>
              <TableRow className="bg-slate-800 font-bold text-white border-t-2 border-slate-400">
                <TableCell className="bg-slate-800 p-2" colSpan={2}>
                  <div className="font-extrabold tracking-wider text-sm">GRAND TOTAL</div>
                  <div className='text-[10px] font-medium text-slate-300'>
                    ({dateRangeLabel})
                  </div>
                </TableCell>
                <TableCell className="bg-slate-800 p-2 text-center text-sm tabular-nums">
                  {(loading || showLoader) ? '-' : grandTotal}
                </TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </div>
      </div>
    </div>
  );
});

export default BrgyClearanceReport;
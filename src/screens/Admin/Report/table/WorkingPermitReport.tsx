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

interface WorkingPermitProps {
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

  Object.values(merged).forEach((item: any) => {
    item.months = Array.from(new Set(item.months));
  });

  return Object.values(merged);
}

// --- Exported Helpers (Can be in the same file or moved to utils) ---
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
    let filtered = Array.isArray(apiData?.results) ? apiData.results : [];

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
            return province && selectedProvinces.some(prov => prov.trim().toLowerCase() === province.trim().toLowerCase());
        });
    }

    if (selectedCities && selectedCities.length > 0) {
        filtered = filtered.filter((lgu: any) => {
            const city = extractCity(lgu);
            return city && selectedCities.some(c => c.trim().toLowerCase() === city.trim().toLowerCase());
        });
    }

    if (selectedDates && selectedDates.includes("Day")) {
        return filtered.map((lgu: any) => ({
            ...lgu,
            monthlyResults: lgu.monthlyResults.filter((month: any) => isMonthInRange(month.month, normalizedDateRange)),
            months: lgu.monthlyResults
                .filter((month: any) => isMonthInRange(month.month, normalizedDateRange))
                .map((month: any) => month.month),
            sum: {},
        }));
    }

    return mergeLguProvinceSumAllMonths(filtered, normalizedDateRange);
}

export function getDateRangeLabel(
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

const WorkingPermitReport = forwardRef<HTMLDivElement, WorkingPermitProps>(({
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

  const persistedWPTableData = useSelector((state: RootState) => state.workingPermitTable.tableData);
  const persistedWPAppliedFilter = useSelector((state: RootState) => state.workingPermitTable.appliedFilter);
  const reduxSelectedIslands = useSelector((state: RootState) => state.reportFilter.selectedIslands || []);
  const islandsToUse = selectedIslands && selectedIslands.length > 0 ? selectedIslands : reduxSelectedIslands;

  const [generatedAt, setGeneratedAt] = useState(new Date());

  const effectiveApiData = useMemo(() => {
    const currentFilter = { selectedRegions, selectedProvinces, selectedCities, selectedIslands: islandsToUse, dateRange };
    return isSameFilter(currentFilter, persistedWPAppliedFilter) ? persistedWPTableData : apiData;
  }, [apiData, persistedWPTableData, persistedWPAppliedFilter, selectedRegions, selectedProvinces, selectedCities, islandsToUse, dateRange]);

  useEffect(() => {
    setGeneratedAt(new Date());
  }, [apiData]);

  const filteredResults = useMemo(() => {
    return filterTableResults({
      apiData: effectiveApiData,
      selectedRegions,
      selectedProvinces,
      selectedCities,
      selectedDates,
      selectedIslands: islandsToUse,
      lguToRegion,
      dateRange: normalizedDateRange
    });
  }, [effectiveApiData, selectedRegions, selectedProvinces, selectedCities, selectedDates, islandsToUse, lguToRegion, normalizedDateRange]);

  useEffect(() => {
    onTableDataChange?.(filteredResults.length > 0);
  }, [filteredResults.length, onTableDataChange]);

 const dateRangeLabel = getDateRangeLabel(
    normalizedDateRange.start,
    normalizedDateRange.end,
    selectedDates?.[0] || 'Day'
  );

  const regionMappingGrouped = useMemo(() => groupResultsByRegion(filteredResults, lguToRegion), [filteredResults, lguToRegion]);
  
  const tableRowsReport = useMemo(() => {
    const rows: React.ReactNode[] = [];
    Object.entries(regionMappingGrouped).forEach(([region, lguList]) => {
      lguList.forEach((lgu: any, idx: number) => {
        if (lgu.sum && Object.keys(lgu.sum).length > 0) {
          const sum = lgu.sum;
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}`} className="hover:bg-blue-50/50 transition-colors duration-200 text-xs">
              {idx === 0 && (
                <TableCell
                  className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs"
                  rowSpan={lguList.length}
                >
                  {getRegionCode(region)}
                </TableCell>
              )}
              <TableCell className="p-2 text-start font-semibold text-slate-800 text-xs">
                <div>
                  {lgu.lgu}
                  <span className="text-[11px] font-medium text-slate-500 ml-1.5">
                    {lgu.province ? `(${lgu.province})` : ""}
                  </span>
                </div>
                <div className="text-[10px] font-semibold text-blue-700 mt-0.5">
                  {lgu.months && lgu.months.length > 0 && (
                    lgu.months.length === 1
                      ? `(${formatMonthYear(lgu.months[0])})`
                      : `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`
                  )}
                </div>
              </TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{sum.newPaid || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{sum.newPaidViaEgov || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{sum.newPending || 0}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{(sum.newPaid || 0) + (sum.newPaidViaEgov || 0) + (sum.newPending || 0)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{sum.renewPaid || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{sum.renewPaidViaEgov || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{sum.renewPending || 0}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{(sum.renewPaid || 0) + (sum.renewPaidViaEgov || 0) + (sum.renewPending || 0)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{sum.malePaid || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{sum.malePending || 0}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{(sum.malePaid || 0) + (sum.malePending || 0)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{sum.femalePaid || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{sum.femalePending || 0}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{(sum.femalePaid || 0) + (sum.femalePending || 0)}</TableCell>
            </TableRow>
          );
        } else {
          lgu.monthlyResults.forEach((month: any, mIdx: number) => {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${month.month}-${mIdx}`} className="hover:bg-blue-50/50 transition-colors duration-200 text-xs">
                {idx === 0 && mIdx === 0 && (
                  <TableCell
                    className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs"
                    rowSpan={lguList.reduce((acc, lgu) => acc + (lgu.monthlyResults?.length || 1), 0)}
                  >
                    {getRegionCode(region)}
                  </TableCell>
                )}
                <TableCell className="p-2 text-start font-semibold text-slate-800 text-xs">
                  <div>
                    {lgu.lgu}
                    <span className="text-[11px] font-medium text-slate-500 ml-1.5">
                      {lgu.province ? `(${lgu.province})` : ""}
                    </span>
                  </div>
                  <div className="text-[10px] font-semibold text-blue-700 mt-0.5">
                    ({formatMonthYear(month.month)})
                  </div>
                </TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{month.newPaid || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{month.newPaidViaEgov || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{month.newPending || 0}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{(month.newPaid || 0) + (month.newPaidViaEgov || 0) + (month.newPending || 0)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{month.renewPaid || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{month.renewPaidViaEgov || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{month.renewPending || 0}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{(month.renewPaid || 0) + (month.renewPaidViaEgov || 0) + (month.renewPending || 0)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{month.malePaid || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{month.malePending || 0}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{(month.malePaid || 0) + (month.malePending || 0)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{month.femalePaid || 0}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{month.femalePending || 0}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{(month.femalePaid || 0) + (month.femalePending || 0)}</TableCell>
              </TableRow>
            );
          });
        }
      });
    });
    return rows;
  }, [regionMappingGrouped]);
  
  const grandTotals = useMemo(() => {
    let totals = { newPaid: 0, newGeoPay: 0, newPending: 0, renewalPaid: 0, renewalGeoPay: 0, renewalPending: 0, malePaid: 0, malePending: 0, femalePaid: 0, femalePending: 0 };
    filteredResults.forEach((lgu: any) => {
        const sourceData = (lgu.sum && Object.keys(lgu.sum).length > 0) ? [lgu.sum] : (lgu.monthlyResults || []);
        sourceData.forEach((data: any) => {
            totals.newPaid += data.newPaid || 0;
            totals.newGeoPay += data.newPaidViaEgov || 0;
            totals.newPending += data.newPending || 0;
            totals.renewalPaid += data.renewPaid || 0;
            totals.renewalGeoPay += data.renewPaidViaEgov || 0;
            totals.renewalPending += data.renewPending || 0;
            totals.malePaid += data.malePaid || 0;
            totals.malePending += data.malePending || 0;
            totals.femalePaid += data.femalePaid || 0;
            totals.femalePending += data.femalePending || 0;
        });
    });
    return totals;
  }, [filteredResults]);

  return (
    <div ref={ref} className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-lg shadow-slate-200/60">
      {loading && <Loading />}
      <div>
        <div className='flex justify-between items-center mb-5 pb-5 border-b border-slate-200'>
            <div className="flex items-center gap-4">
              <img src={dictImage} alt="dict logo" className='w-44 h-auto'/>
              <div className="border-l border-slate-300 pl-4">
                  <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">
                      Working Permit Report
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
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow>
                <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-20 text-[11px] border-b border-r border-slate-300">Region</TableHead>
                <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-20 text-[11px] border-b border-r border-slate-300">LGU</TableHead>
                <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold p-2 text-center sticky top-0 z-20 uppercase tracking-wider text-[11px] border-b border-r border-slate-300">New</TableHead>
                <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold p-2 text-center sticky top-0 z-20 uppercase tracking-wider text-[11px] border-b border-r border-slate-300">Renewal</TableHead>
                <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold p-2 text-center sticky top-0 z-20 uppercase tracking-wider text-[11px] border-b border-r border-slate-300">Male</TableHead>
                <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold p-2 text-center sticky top-0 z-20 uppercase tracking-wider text-[11px] border-b border-slate-300">Female</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID <br /><span className='font-medium'>(eGOVPay)</span></TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">ONGOING</TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[45px] z-20 text-center font-bold uppercase text-[10px] border-b border-r border-slate-300">Total</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID <br /><span className='font-medium'>(eGOVPay)</span></TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">ONGOING</TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[45px] z-20 text-center font-bold uppercase text-[10px] border-b border-r border-slate-300">Total</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">ONGOING</TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[45px] z-20 text-center font-bold uppercase text-[10px] border-b border-r border-slate-300">Total</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">ONGOING</TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[45px] z-20 text-center font-bold uppercase text-[10px] border-b border-slate-300">Total</TableHead>
              </TableRow>
            </TableHeader>
         
            <TableBody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-slate-50/50">
                {loading ? (
                    <TableRow>
                        <TableCell colSpan={16} className="text-center py-12">
                            <LoaderTable />
                        </TableCell>
                    </TableRow>
                ) : filteredResults.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={16} className="text-center py-16 bg-white">
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
                                    {hasSearched ? 'There is no data matching your selected filters. Please try adjusting your criteria.' : 'Use the filters above to generate your working permit report.'}
                                </p>
                            </div>
                        </TableCell>
                    </TableRow>
                ) : (
                    tableRowsReport
                )}

                <TableRow className="bg-slate-800 text-white font-bold border-t-2 border-slate-400">
                    <TableCell className="bg-slate-800 p-2 text-left" colSpan={2}>
                        <div className="font-extrabold tracking-wider text-sm">GRAND TOTAL</div>
                        <div className='text-[10px] font-medium text-slate-300'>({dateRangeLabel})</div>
                    </TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.newPaid}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.newGeoPay}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.newPending}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : (grandTotals.newPaid + grandTotals.newGeoPay + grandTotals.newPending)}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.renewalPaid}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.renewalGeoPay}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.renewalPending}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : (grandTotals.renewalPaid + grandTotals.renewalGeoPay + grandTotals.renewalPending)}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.malePaid}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.malePending}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : (grandTotals.malePaid + grandTotals.malePending)}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.femalePaid}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : grandTotals.femalePending}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading ? '-' : (grandTotals.femalePaid + grandTotals.femalePending)}</TableCell>
                </TableRow>
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
});

export default WorkingPermitReport;
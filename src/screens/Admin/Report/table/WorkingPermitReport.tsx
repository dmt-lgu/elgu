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
    if (!start && !end) return "";
    const isFullMonth = start && end && isFullMonthRange(start, end);

    if ((selectedDateType === "Month" || selectedDateType === "Year") && isFullMonth) {
        return `${format(start, "MMMM yyyy")} - ${format(end, "MMMM yyyy")}`;
    }
    if (start && end) {
        if (isSameDay(start, end)) return format(start, "MMM dd, yyyy");
        return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
    }
    if (start) return format(start, "MMM dd, yyyy");
    if (end) return format(end, "MMM dd, yyyy");
    return "";
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
            <TableRow key={`${region}-${lgu.lgu}`} className="hover:bg-blue-50/50">
              {idx === 0 && (
                <TableCell
                  className="border px-2 py-1 text-center font-medium left-0 z-10 align-middle"
                  rowSpan={lguList.length}
                >
                  {getRegionCode(region)}
                </TableCell>
              )}
              <TableCell className="border px-2 py-1 text-start font-medium">
                {lgu.lgu}
                <span className="text-[10px] font-normal text-gray-500 ml-1">
                  {lgu.province ? `(${lgu.province})` : ""}
                </span>
                <br />
                <span className="text-[10px] font-normal text-blue-600">
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
                <TableCell className="border px-2 py-1 text-center font-semibold bg-slate-100">{(sum.newPaid || 0) + (sum.newPaidViaEgov || 0) + (sum.newPending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{sum.renewPaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{sum.renewPaidViaEgov || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{sum.renewPending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center font-semibold bg-slate-100">{(sum.renewPaid || 0) + (sum.renewPaidViaEgov || 0) + (sum.renewPending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{sum.malePaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{sum.malePending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center font-semibold bg-slate-100">{(sum.malePaid || 0) + (sum.malePending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{sum.femalePaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{sum.femalePending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center font-semibold bg-slate-100">{(sum.femalePaid || 0) + (sum.femalePending || 0)}</TableCell>
            </TableRow>
          );
        } else {
          lgu.monthlyResults.forEach((month: any, mIdx: number) => {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${month.month}-${mIdx}`} className="hover:bg-blue-50/50">
                {idx === 0 && mIdx === 0 && (
                  <TableCell
                    className="border px-2 py-1 text-center font-medium left-0 z-10 align-middle"
                    rowSpan={lguList.reduce((acc, lgu) => acc + (lgu.monthlyResults?.length || 1), 0)}
                  >
                    {getRegionCode(region)}
                  </TableCell>
                )}
                <TableCell className="border px-2 py-1 text-start font-medium">
                  {lgu.lgu}
                  <span className="text-[10px] font-normal text-gray-500 ml-1">
                    {lgu.province ? `(${lgu.province})` : ""}
                  </span>
                  <br />
                  <span className="text-[10px] font-normal text-blue-600">
                    ({formatMonthYear(month.month)})
                  </span>
                </TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.newPaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.newPaidViaEgov || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.newPending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center font-semibold bg-slate-100">{(month.newPaid || 0) + (month.newPaidViaEgov || 0) + (month.newPending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.renewPaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.renewPaidViaEgov || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.renewPending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center font-semibold bg-slate-100">{(month.renewPaid || 0) + (month.renewPaidViaEgov || 0) + (month.renewPending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.malePaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.malePending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center font-semibold bg-slate-100">{(month.malePaid || 0) + (month.malePending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.femalePaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.femalePending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center font-semibold bg-slate-100">{(month.femalePaid || 0) + (month.femalePending || 0)}</TableCell>
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

  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={16} className="text-center py-6 border">
            <LoaderTable />
          </TableCell>
        </TableRow>
      );
    }
    if (filteredResults.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={16} className="text-center py-6 border">
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
      {loading && <Loading />}
      <div ref={ref}>
        <div className='flex justify-between items-center mb-4 pb-4 border-b border-gray-200'>
            <img src={dictImage} alt="dict logo" className='w-52 h-auto'/>
            <div className='text-right'>
                <h2 className="text-xl font-bold text-gray-800">
                    Working Permit
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
        
        <Table className="w-full border-collapse text-xs">
          <TableHeader>
            <TableRow>
              <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold border-x border-gray-300 px-2 py-2 text-center align-middle sticky top-0 z-10">Region</TableHead>
              <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold border-r border-gray-300 px-2 py-2 text-center align-middle sticky top-0 z-10">LGU</TableHead>
              <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold border-r border-gray-300 px-2 py-2 text-center sticky top-0 z-10 uppercase tracking-wider">New</TableHead>
              <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold border-r border-gray-300 px-2 py-2 text-center sticky top-0 z-10 uppercase tracking-wider">Renewal</TableHead>
              <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold border-r border-gray-300 px-2 py-2 text-center sticky top-0 z-10 uppercase tracking-wider">Male</TableHead>
              <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold border-r border-gray-300 px-2 py-2 text-center sticky top-0 z-10 uppercase tracking-wider">Female</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">PAID</TableHead>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">PAID <br /><span className='text-[10px] font-normal'>(eGOVPay)</span></TableHead>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">ONGOING</TableHead>
              <TableHead className="bg-[#cce1ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-bold uppercase">total</TableHead>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">PAID</TableHead>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">PAID <br /><span className='text-[10px] font-normal'>(eGOVPay)</span></TableHead>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">ONGOING</TableHead>
              <TableHead className="bg-[#cce1ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-bold uppercase">total</TableHead>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">PAID</TableHead>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">ONGOING</TableHead>
              <TableHead className="bg-[#cce1ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-bold uppercase">total</TableHead>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">PAID</TableHead>
              <TableHead className="bg-[#e3f0ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-semibold">ONGOING</TableHead>
              <TableHead className="bg-[#cce1ff] text-black border-r border-gray-300 px-2 py-1 sticky top-[42px] z-10 text-center font-bold uppercase">total</TableHead>
            </TableRow>
          </TableHeader>
         
          <TableBody className="[&>tr:nth-child(odd)]:bg-gray-100">
            {renderTableBody()}
            <TableRow className="bg-[#3a4554] font-bold text-white border-t-4 border-gray-400">
              <TableCell className="bg-[#3a4554] border-x border-gray-300 px-2 py-2" colSpan={2}>
                GRAND TOTAL
                <br />
                <span className='text-[10px] font-normal text-gray-300'>({dateRangeLabel})</span>
              </TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.newPaid}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.newGeoPay}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.newPending}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : (grandTotals.newPaid + grandTotals.newGeoPay + grandTotals.newPending)}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.renewalPaid}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.renewalGeoPay}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.renewalPending}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : (grandTotals.renewalPaid + grandTotals.renewalGeoPay + grandTotals.renewalPending)}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.malePaid}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.malePending}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : (grandTotals.malePaid + grandTotals.malePending)}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.femalePaid}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : grandTotals.femalePending}</TableCell>
              <TableCell className="border-r border-gray-300 px-2 py-2 text-center bg-[#3a4554]">{loading ? 0 : (grandTotals.femalePaid + grandTotals.femalePending)}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default WorkingPermitReport;
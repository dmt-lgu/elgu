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
import dictImage from "./../../../../assets/logo/dict.png";
import '../utils/loader.css';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import LoaderTable from '../utils/LoaderTable';
import Loading from '../utils/Loading';


// --- PROPS INTERFACE ---
interface BuildingPermitProps {
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

// --- UTILITY FUNCTIONS ---
function ensureDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

function normalizeDateRange(dr: { start: Date | string | null; end: Date | string | null }) {
  return {
    start: ensureDate(dr?.start),
    end: ensureDate(dr?.end),
  };
}

function formatMonthYear(monthStr: string): string {
  if (!monthStr) return "";
  const date = parse(monthStr, monthStr.length === 7 ? "yyyy-MM" : "yyyy-MM-dd", new Date());
  return format(date, "MMMM yyyy");
}

function groupResultsByRegion(results: any[], lguToRegion: Record<string, string>) {
  const grouped: Record<string, any[]> = {};
  results.forEach(lgu => {
    const regionInternal = regionMapping[lgu.region] || regionMapping[lgu.regionCode] || lguToRegion[lgu.lgu];
    if (regionInternal) {
      if (!grouped[regionInternal]) grouped[regionInternal] = [];
      grouped[regionInternal].push(lgu);
    }
  });
  return grouped;
}

function isMonthInRange(monthStr: string, range: { start: Date | null; end: Date | null }) {
  if (!range.start && !range.end) return true;
  const monthDate = new Date(monthStr.length === 7 ? `${monthStr}-01` : monthStr);
  const start = range.start ? startOfMonth(range.start) : null;
  const end = range.end ? endOfMonth(range.end) : null;
  if (start && end) return monthDate >= start && monthDate <= end;
  if (start) return monthDate >= start;
  if (end) return monthDate <= end;
  return true;
}

function extractProvince(lgu: any): string {
  if (lgu.province && typeof lgu.province === "string") return lgu.province.trim();
  const parts = (lgu.lgu || "").split(",");
  return parts.length > 1 ? parts[parts.length - 1].trim() : "";
}

function extractCity(lgu: any): string {
  if (lgu.city && typeof lgu.city === "string") return lgu.city.trim();
  const parts = (lgu.lgu || "").split(",");
  return parts.length > 0 ? parts[0].trim() : "";
}

function mergeLguProvinceSumAllMonths(results: any[], dateRange: { start: Date | null; end: Date | null }) {
  const merged: Record<string, any> = {};
  results.forEach(lgu => {
    const key = `${lgu.lgu}|${extractProvince(lgu)}`;
    if (!merged[key]) {
      merged[key] = { ...lgu, sum: {}, months: [] };
    }
    const filteredMonths = (lgu.monthlyResults || []).filter((month: any) => isMonthInRange(month.month, dateRange));
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
    item.months = [...new Set(item.months)];
  });
  return Object.values(merged);
}

export function filterTableResults(params: any) {
  const { apiData, selectedRegions = [], selectedProvinces = [], selectedCities = [], selectedDates = [], selectedIslands = [], lguToRegion = {}, dateRange = { start: null, end: null } } = params;
  const normalizedDateRange = normalizeDateRange(dateRange);
  let filtered = Array.isArray(apiData?.results) ? apiData.results : [];

  const getRegionsFromIslands = (islands: string[]) => islands.flatMap(island => islandRegionMap[island] || []);
  
  if (selectedIslands.length > 0) {
    const regionsFromIslands = getRegionsFromIslands(selectedIslands).map(code => regionMapping[code] || code);
    filtered = filtered.filter((lgu:any) => regionsFromIslands.includes(regionMapping[lgu.region] || regionMapping[lgu.regionCode] || lguToRegion[lgu.lgu]));
  } else if (selectedRegions.length > 0) {
    filtered = filtered.filter((lgu:any) => selectedRegions.includes(regionMapping[lgu.region] || regionMapping[lgu.regionCode] || lguToRegion[lgu.lgu]));
  }

  if (selectedProvinces.length > 0) {
    filtered = filtered.filter((lgu:any) => selectedProvinces.some((prov: any) => prov.trim().toLowerCase() === extractProvince(lgu).toLowerCase()));
  }

  if (selectedCities.length > 0) {
    filtered = filtered.filter((lgu:any) => selectedCities.some((city: any) => city.trim().toLowerCase() === extractCity(lgu).toLowerCase()));
  }

  if (selectedDates.includes("Day")) {
    return filtered.map((lgu:any) => ({
      ...lgu,
      monthlyResults: (lgu.monthlyResults || []).filter((month: any) => isMonthInRange(month.month, normalizedDateRange)),
      sum: {},
    }));
  }
  return mergeLguProvinceSumAllMonths(filtered, normalizedDateRange);
}

export function getDateRangeLabel(start: Date | null, end: Date | null) {
  if (!start || !end) return "";
  if (isSameDay(start, end)) return format(start, "MMM dd, yyyy");
  return `${format(start, "MMM dd, yyyy")} - ${format(end, "MMM dd, yyyy")}`;
}

function isSameFilter(a: any, b: any) {
  if (!a || !b) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

// --- COMPONENT ---
const BuildingPermitReport = forwardRef<HTMLDivElement, BuildingPermitProps>(({
  selectedRegions, dateRange, apiData, loading, lguToRegion,
  selectedProvinces, selectedCities, selectedDates, selectedIslands,
  hasSearched, onTableDataChange,
}, ref) => {

  const [generatedAt, setGeneratedAt] = useState(new Date());
  useEffect(() => { setGeneratedAt(new Date()); }, [apiData]);

  const [showLoader, setShowLoader] = useState(false);

  // --- Redux State ---
  const persistedBldgTableData = useSelector((state: RootState) => state.buildingPermit.tableData);
  const persistedBldgAppliedFilter = useSelector((state: RootState) => state.buildingPermit.appliedFilter);

  const currentFilter = useMemo(
    () => ({ selectedRegions, selectedProvinces, selectedCities, selectedIslands, dateRange }),
    [selectedRegions, selectedProvinces, selectedCities, selectedIslands, dateRange]
  );

  const usingPersisted = useMemo(
    () => isSameFilter(currentFilter, persistedBldgAppliedFilter),
    [currentFilter, persistedBldgAppliedFilter]
  );

  const effectiveApiData = useMemo(() => {
    return usingPersisted ? persistedBldgTableData : apiData;
  }, [usingPersisted, persistedBldgTableData, apiData]);

  useEffect(() => {
    if (!hasSearched) {
      setShowLoader(false);
      return;
    }
    if (!usingPersisted && loading) {
      setShowLoader(true);
    } else {
      setShowLoader(false);
    }
  }, [hasSearched, usingPersisted, loading]);

  useEffect(() => {
    if (!hasSearched) return;
    if (effectiveApiData && !loading) {
      setShowLoader(false);
    }
  }, [effectiveApiData, loading, hasSearched]);

  const filteredResults = useMemo(() => {
    return filterTableResults({
      apiData: effectiveApiData, selectedRegions, selectedProvinces, selectedCities,
      selectedDates, selectedIslands, lguToRegion, dateRange,
    });
  }, [effectiveApiData, selectedRegions, selectedProvinces, selectedCities, selectedDates, selectedIslands, lguToRegion, dateRange]);

  useEffect(() => { onTableDataChange?.(filteredResults.length > 0); }, [filteredResults, onTableDataChange]);
  
  const normalizedDateRange = useMemo(() => normalizeDateRange(dateRange), [dateRange]);
 
  const regionMappingGrouped = useMemo(() => groupResultsByRegion(filteredResults, lguToRegion), [filteredResults, lguToRegion]);

  function isFullMonthRange(start: Date, end: Date) {
  return (
    isSameDay(start, startOfMonth(start)) &&
    isSameDay(end, endOfMonth(end))
  );
}
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

    
  const grandTotals = useMemo(() => {
    const totals = { pending: 0, paid: 0 };
    filteredResults.forEach((lgu:any) => {
      const dataSet = (selectedDates?.includes("Day")) ? lgu.monthlyResults : [lgu.sum];
      dataSet.forEach((item: any) => {
        totals.pending += item?.buildingPending || 0;
        totals.paid += item?.buildingPaid || 0;
      });
    });
    return totals;
  }, [filteredResults, selectedDates]);

  const tableRowsReport = useMemo(() => {
    const rows: React.ReactNode[] = [];
    Object.entries(regionMappingGrouped).forEach(([region, lguList]) => {
      lguList.forEach((lgu: any, idx: number) => {
        const isDayMode = selectedDates?.includes("Day");
        if (!isDayMode && lgu.sum) { // Month/Year summary view
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}`} className="hover:bg-blue-50/50 transition-colors duration-200 text-xs">
              {idx === 0 && <TableCell rowSpan={lguList.length} className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs">{getRegionCode(region)}</TableCell>}
              <TableCell className="p-2 text-center font-semibold text-slate-800 text-xs">
                {lgu.lgu}
                <span className="ml-1.5 text-[11px] font-medium text-slate-500">
                  {lgu.province ? `(${lgu.province})` : ""}
                </span>
                <br />
                <span className="text-[10px] font-semibold text-blue-700 mt-0.5">
                  {lgu.months?.length > 0
                    ? lgu.months.length === 1
                      ? `(${formatMonthYear(lgu.months[0])})`
                      : `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`
                    : ""}
                </span>
              </TableCell>
              <TableCell className="p-2 text-center font-bold tabular-nums text-green-700">{lgu.sum.buildingPaid || 0}</TableCell>
              <TableCell className="p-2 text-center font-bold tabular-nums text-blue-700">{lgu.sum.buildingPending || 0}</TableCell>
            </TableRow>
          );
        } else { // Day view
          (lgu.monthlyResults || []).forEach((month: any, mIdx: number) => {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${month.month}-${mIdx}`} className="hover:bg-blue-50/50 transition-colors duration-200 text-xs">
                {idx === 0 && mIdx === 0 && <TableCell rowSpan={lguList.reduce((acc, l) => acc + (l.monthlyResults?.length || 0), 0)} className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs">{getRegionCode(region)}</TableCell>}
                <TableCell className="p-2 text-center font-semibold text-slate-800 text-xs">
                  {lgu.lgu}
                  <span className="ml-1.5 text-[11px] font-medium text-slate-500">
                    {lgu.province ? `(${lgu.province})` : ""}
                  </span>
                  <br />
                  <span className="text-[10px] font-semibold text-blue-700 mt-0.5">({formatMonthYear(month.month)})</span>
                </TableCell>
                <TableCell className="p-2 text-center font-bold tabular-nums text-green-700">{month.buildingPaid || 0}</TableCell>
                <TableCell className="p-2 text-center font-bold tabular-nums text-blue-700">{month.buildingPending || 0}</TableCell>
              </TableRow>
            );
          });
        }
      });
    });
    return rows;
  }, [regionMappingGrouped, selectedDates]);

  return (
    <div ref={ref} className="bg-slate-50 p-4 sm:p-5 rounded-xl border border-slate-200/80 shadow-lg shadow-slate-200/60">
      {(hasSearched && (showLoader || loading)) && <Loading />}
      <div>
        <div className='flex justify-between items-center mb-5 pb-5 border-b border-slate-200'>
          <div className="flex items-center gap-4">
            <img src={dictImage} alt="dict logo" className='w-44 h-auto' />
            <div className="border-l border-slate-300 pl-4">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Building Permit Report</h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Generated for the period: <span className="font-semibold text-slate-600">{dateRangeLabel}</span>
              </p>
            </div>
          </div>
          <div className='text-right'>
            <p className="text-[11px] font-semibold text-slate-600">Generated On</p>
            <p className="text-xs font-mono text-slate-500">{format(generatedAt, "MMM dd, yyyy, h:mm a")}</p>
          </div>
        </div>
        <div className="overflow-x-auto rounded-md border border-slate-300">
          <Table className="w-full border-collapse">
            <TableHeader>
              <TableRow>
                <TableHead className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-10 uppercase text-[11px] border-b border-r border-slate-300">Region</TableHead>
                <TableHead className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-10 uppercase text-[11px] border-b border-r border-slate-300">LGU</TableHead>
                <TableHead className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-10 uppercase text-[11px] border-b border-r border-slate-300">Paid</TableHead>
                <TableHead className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-10 uppercase text-[11px] border-b border-slate-300">Ongoing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="[&>tr:nth-child(odd)]:bg-white [&>tr:nth-child(even)]:bg-slate-50/50">
              {(hasSearched && (showLoader || loading)) ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12"><LoaderTable /></TableCell>
                </TableRow>
              ) : filteredResults.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-16 bg-white">
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
                        {hasSearched ? 'There is no data matching your selected filters. Please try adjusting your criteria.' : 'Use the filters above to generate your building permit report.'}
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
                <TableCell className="bg-slate-800 p-2 text-center text-sm tabular-nums">{loading || showLoader ? '-' : grandTotals.paid}</TableCell>
                <TableCell className="bg-slate-800 p-2 text-center text-sm tabular-nums">{loading || showLoader ? '-' : grandTotals.pending}</TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </div>
      </div>
    </div>
  );
});

export default BuildingPermitReport;
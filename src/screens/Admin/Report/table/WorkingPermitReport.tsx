import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parse, startOfMonth, endOfMonth } from "date-fns";
import { getRegionCode, islandRegionMap, regionMapping } from "../utils/mockData";
import dictImage from "./../../../../assets/logo/dict.png"
import '../utils/loader.css';
import LoaderTable from '../utils/LoaderTable';
import Loading from '../utils/Loading';
import { getDateRangeLabel } from './BusinessPermitReport';

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
  isProgressive?: boolean;
}

// --- Utility Functions (Wala gi-usab) ---
function ensureDate(d: Date | string | null | undefined): Date | null {
    if (!d) return null;
    if (d instanceof Date) return d;
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
}

function normalizeDateRange(dr: { start: Date | string | null; end: Date | string | null }) {
  return { start: ensureDate(dr?.start), end: ensureDate(dr?.end) };
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

function extractProvince(lgu: any): string | undefined {
    if (lgu.province?.trim()) return lgu.province.trim();
    const parts = lgu.lgu?.split(',');
    return parts?.length > 1 ? parts[parts.length - 1].trim() : undefined;
}

function extractCity(lgu: any): string | undefined {
    if (lgu.city?.trim()) return lgu.city.trim();
    const parts = lgu.lgu?.split(',');
    return parts?.length > 1 ? parts[0].trim() : lgu.lgu?.trim();
}

function mergeLguProvinceSumAllMonths(results: any[], dateRange: { start: Date | null; end: Date | null }) {
  const merged: Record<string, any> = {};
  results.forEach(lgu => {
    const province = extractProvince(lgu) || "";
    const key = `${lgu.lgu}||${province}`;
    if (!merged[key]) {
      merged[key] = { ...lgu, monthlyResults: [], sum: {}, months: [] };
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
  Object.values(merged).forEach((item: any) => { item.months = [...new Set(item.months)]; });
  return Object.values(merged);
}

export function filterTableResults(params: any) {
  const { apiData, selectedRegions = [], selectedProvinces = [], selectedCities = [], selectedDates = [], selectedIslands = [], lguToRegion = {}, dateRange = { start: null, end: null } } = params;
  const normalizedDateRange = normalizeDateRange(dateRange);
  let filtered = Array.isArray(apiData?.results) ? apiData.results : [];
  const getRegionsFromIslands = (islands: string[]) => islands.flatMap(island => islandRegionMap[island] || []);

  if (selectedIslands.length > 0) {
    const regionsInternal = getRegionsFromIslands(selectedIslands).map(code => regionMapping[code] || code);
    filtered = filtered.filter((lgu:any) => regionsInternal.includes(regionMapping[lgu.region] || regionMapping[lgu.regionCode] || lguToRegion[lgu.lgu]));
  } else if (selectedRegions.length > 0) {
    filtered = filtered.filter((lgu:any) => selectedRegions.includes(regionMapping[lgu.region] || regionMapping[lgu.regionCode] || lguToRegion[lgu.lgu]));
  }

  if (selectedProvinces.length > 0) {
    filtered = filtered.filter((lgu:any) => selectedProvinces.some((p:any) => p.trim().toLowerCase() === extractProvince(lgu)?.toLowerCase()));
  }

  if (selectedCities.length > 0) {
    filtered = filtered.filter((lgu:any) => selectedCities.some((c:any) => c.trim().toLowerCase() === extractCity(lgu)?.toLowerCase()));
  }

  if (selectedDates?.includes("Day")) {
    return filtered.map((lgu:any) => ({
      ...lgu,
      monthlyResults: (lgu.monthlyResults || []).filter((month: any) => isMonthInRange(month.month, normalizedDateRange)),
      sum: {},
    }));
  }
  return mergeLguProvinceSumAllMonths(filtered, normalizedDateRange);
}

const WorkingPermitReport = forwardRef<HTMLDivElement, WorkingPermitProps>(({
  selectedRegions, dateRange, apiData, loading, lguToRegion,
  selectedProvinces, selectedCities, selectedDates, selectedIslands,
  hasSearched, onTableDataChange,
  isProgressive = false,
}, ref) => {
  const [generatedAt, setGeneratedAt] = useState(new Date());

  useEffect(() => {
    if (apiData) {
      setGeneratedAt(new Date());
    }
  }, [apiData]);

  const filteredResults = useMemo(() => {
    return filterTableResults({
      apiData, selectedRegions, selectedProvinces, selectedCities,
      selectedDates, selectedIslands, lguToRegion, dateRange,
    });
  }, [apiData, selectedRegions, selectedProvinces, selectedCities, selectedDates, selectedIslands, lguToRegion, dateRange]);

  useEffect(() => {
    onTableDataChange?.(filteredResults.length > 0);
  }, [filteredResults.length, onTableDataChange]);

  const normalizedDateRange = useMemo(() => normalizeDateRange(dateRange), [dateRange]);
  const dateRangeLabel = getDateRangeLabel(normalizedDateRange.start, normalizedDateRange.end, selectedDates?.[0] || 'Day');
  const regionMappingGrouped = useMemo(() => groupResultsByRegion(filteredResults, lguToRegion), [filteredResults, lguToRegion]);
  
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

  const tableRowsReport = useMemo(() => {
    const rows: React.ReactNode[] = [];
    Object.entries(regionMappingGrouped).forEach(([region, lguList]) => {
      lguList.forEach((lgu: any, idx: number) => {
        if (lgu.sum && Object.keys(lgu.sum).length > 0) {
          const sum = lgu.sum;
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}`} className="hover:bg-blue-50/50 transition-colors duration-200 text-xs">
              {idx === 0 && <TableCell className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs" rowSpan={lguList.length}>{getRegionCode(region)}</TableCell>}
              <TableCell className="p-2 text-start font-semibold text-slate-800 text-xs">
                <div>{lgu.lgu}<span className="text-[11px] font-medium text-slate-500 ml-1.5">{lgu.province ? `(${lgu.province})` : ""}</span></div>
                <div className="text-[10px] font-semibold text-blue-700 mt-0.5">{lgu.months?.length > 0 && (lgu.months.length === 1 ? `(${formatMonthYear(lgu.months[0])})` : `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`)}</div>
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
                {idx === 0 && mIdx === 0 && <TableCell className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs" rowSpan={lguList.reduce((acc, lgu) => acc + (lgu.monthlyResults?.length || 1), 0)}>{getRegionCode(region)}</TableCell>}
                <TableCell className="p-2 text-start font-semibold text-slate-800 text-xs">
                  <div>{lgu.lgu}<span className="text-[11px] font-medium text-slate-500 ml-1.5">{lgu.province ? `(${lgu.province})` : ""}</span></div>
                  <div className="text-[10px] font-semibold text-blue-700 mt-0.5">({formatMonthYear(month.month)})</div>
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

  return (
    <div ref={ref} className="bg-slate-50 p-4 sm:p-5 rounded-md border border-slate-200/80 shadow-lg shadow-slate-200/60">
      {(loading || isProgressive) && filteredResults.length === 0 && <Loading />}
      <div>
        <div className='flex justify-between items-center mb-5 pb-5 border-b border-slate-200'>
            <div className="flex items-center gap-4">
              <img src={dictImage} alt="dict logo" className='w-44 h-auto'/>
              <div className="border-l border-slate-300 pl-4">
                  <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Working Permit</h1>
                  <p className="text-xs font-medium text-slate-500 mt-1">Generated for the period: <span className="font-semibold text-slate-600">{dateRangeLabel}</span></p>
              </div>
            </div>
            <div className='text-right'>
                <p className="text-[11px] font-semibold text-slate-600">Generated On</p>
                <p className="text-xs font-mono text-slate-500">{format(generatedAt, "MMM dd, yyyy, h:mm a")}</p>
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
              {filteredResults.length > 0 ? (
                <>
                  {tableRowsReport}
                  {isProgressive && (
                    <TableRow>
                      <TableCell colSpan={16} className="p-0">
                        <LoaderTable message="Please wait for other regions..." />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ) : loading ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-12"><LoaderTable /></TableCell>
                </TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-16 bg-white">
                    <div className='flex flex-col items-center justify-center'>
                      <div className="rounded-full bg-slate-100 p-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 10.5a.5.5 0 01.5-.5h3a.5.5 0 010 1h-3a.5.5 0 01-.5-.5z" /></svg>
                      </div>
                      <p className='font-bold text-sm text-slate-600 mt-4'>{hasSearched ? 'No Results Found' : 'Generate a Report'}</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{hasSearched ? 'There is no data matching your selected filters...' : 'Use the filters above to generate your working permit report.'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <tfoot>
                <TableRow className="bg-slate-800 text-white font-bold border-t-2 border-slate-400">
                    <TableCell className="bg-slate-800 p-2 text-left" colSpan={2}>
                        <div className="font-extrabold tracking-wider text-sm">GRAND TOTAL</div>
                        <div className='text-[10px] font-medium text-slate-300'>({dateRangeLabel})</div>
                    </TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.newPaid}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.newGeoPay}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.newPending}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : (grandTotals.newPaid + grandTotals.newGeoPay + grandTotals.newPending)}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.renewalPaid}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.renewalGeoPay}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.renewalPending}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : (grandTotals.renewalPaid + grandTotals.renewalGeoPay + grandTotals.renewalPending)}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.malePaid}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.malePending}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : (grandTotals.malePaid + grandTotals.malePending)}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.femalePaid}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : grandTotals.femalePending}</TableCell>
                    <TableCell className="p-2 text-center tabular-nums text-sm bg-slate-800">{loading && filteredResults.length === 0 ? '-' : (grandTotals.femalePaid + grandTotals.femalePending)}</TableCell>
                </TableRow>
            </tfoot>
          </Table>
        </div>
      </div>
    </div>
  );
});

export default WorkingPermitReport;
import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { getRegionCode, regionMapping } from "../utils/mockData";
import dictImage from "./../../../../assets/logo/dict.png";
import '../utils/loader.css';
import LoaderTable from '../utils/LoaderTable';
import { Loading } from '../utils/Loading';
import { Search } from 'lucide-react';
import { filterTableResults, formatMonthYear, formatNumber, groupResultsByRegion, getDateRangeLabel } from '../utils/reportUtils';

export { filterTableResults };

interface WorkingPermitProps {
  selectedRegions: string[];
  dateRange: { start: Date | string | null; end: Date | string | null };
  apiData: any;
  loading: boolean;
  lguToRegion: Record<string, string>;
  selectedProvinces?: string[];
  selectedCities?: string[];
  selectedIslands?: string[];
  selectedDateType?: string;
  hasSearched?: boolean;
  onTableDataChange?: (hasData: boolean) => void;
  isProgressive?: boolean;
  searchStartedAt?: Date;
  moduleLoading?: boolean;
  searchLoading?: boolean;
}

/**
 * Enforce custom region display order:
 * R1, R2, R3, R4-A, R4-B, R5, R6, R7, R8, R9, R10, R11, R12, R13, CAR, BARMM1, BARMM2
 * Canonical keys used for sorting: region1, region2, ..., region4a, region4b, ..., car, barmm1, barmm2
 */
const DESIRED_REGION_ORDER: string[] = [
  'region1',
  'region2',
  'region3',
  'region4a',
  'region4b',
  'region5',
  'region6',
  'region7',
  'region8',
  'region9',
  'region10',
  'region11',
  'region12',
  'region13',
  'car',
  'barmm1',
  'barmm2',
];

function normalizeRegionKeyForSort(input: string): string {
  const key = (input || '').trim().toLowerCase();
  if (!key) return key;

  // Already canonical
  if (key.startsWith('region')) return key;
  if (key === 'car' || key === 'barmm1' || key === 'barmm2') return key;

  // R forms: r1, r4-a, r4b, r 10, etc.
  const rMatch = key.match(/^r\s*([0-9]{1,2})(?:\s*[-]?\s*([ab]))?$/i);
  if (rMatch) {
    const num = rMatch[1];
    const suffix = rMatch[2] ? rMatch[2].toLowerCase() : '';
    return `region${num}${suffix}`;
  }

  // Roman numerals (including IV-A / IV-B)
  const romanMap: Record<string, string> = {
    'i': '1', 'ii': '2', 'iii': '3',
    'iv-a': '4a', 'iv-b': '4b', 'iv': '4',
    'v': '5', 'vi': '6', 'vii': '7', 'viii': '8',
    'ix': '9', 'x': '10', 'xi': '11', 'xii': '12', 'xiii': '13',
  };
  if (romanMap[key]) {
    return `region${romanMap[key]}`;
  }

  // Any other key (e.g., "Region Not Specified") unchanged
  return key;
}

function getRegionSortIndex(regionKey: string): number {
  const normalized = normalizeRegionKeyForSort(regionKey);
  const idx = DESIRED_REGION_ORDER.indexOf(normalized);
  if (idx !== -1) return idx;

  // Ensure "Region Not Specified" appears last
  if (normalized === 'region not specified') {
    return DESIRED_REGION_ORDER.length + 1;
  }

  // Unknown keys: after known, before "Region Not Specified"
  return DESIRED_REGION_ORDER.length;
}

const WorkingPermitReport = forwardRef<HTMLDivElement, WorkingPermitProps>(({
  selectedRegions, dateRange, apiData, loading, lguToRegion,
  selectedProvinces, selectedCities, selectedDateType, selectedIslands,
  hasSearched, onTableDataChange, isProgressive = false, searchStartedAt, moduleLoading, searchLoading,
}, ref) => {
  const [generatedAt, setGeneratedAt] = useState<Date>(() => new Date());
  const [openRegions, setOpenRegions] = useState<Set<string>>(new Set<string>());
  const [nowTime, setNowTime] = useState<Date>(() => new Date());

  useEffect(() => {
    if (!searchStartedAt) return;
    setGeneratedAt(searchStartedAt);
    setNowTime(new Date());
    let id: number | undefined;
    const shouldRun = Boolean(loading || moduleLoading || searchLoading);
    if (shouldRun) {
      id = window.setInterval(() => setNowTime(new Date()), 1000);
    }
    return () => { if (id !== undefined) window.clearInterval(id); };
  }, [searchStartedAt, loading, moduleLoading, searchLoading]);

  // Optional: augment lguToRegion using apiData (normalize region variants if present)
  const completeLguToRegion = useMemo(() => {
    const combinedMap = { ...lguToRegion };
    if (apiData?.results && Array.isArray(apiData.results)) {
      apiData.results.forEach((lgu: any) => {
        if (lgu?.lgu && lgu?.region) {
          const normalized = regionMapping[lgu.region as keyof typeof regionMapping] || lgu.region;
          combinedMap[lgu.lgu] = normalized;
        }
      });
    }
    return combinedMap;
  }, [apiData, lguToRegion]);
  
  // 1) Filter using existing business rules
  const filteredResults = useMemo(() => {
    return filterTableResults({
      apiData, selectedRegions, selectedProvinces, selectedCities,
      selectedDateType, selectedIslands, lguToRegion: completeLguToRegion, dateRange,
    });
  }, [apiData, selectedRegions, selectedProvinces, selectedCities, selectedDateType, selectedIslands, completeLguToRegion, dateRange]);

  // 2) Normalize/dedupe by LGU+month to avoid duplicate rows and overcounting
  //    Keep MAX per numeric field per month (latest snapshot), not SUM across duplicates.
  const normalizedResults = useMemo(() => {
    type MonthRec = {
      month: string;
      newPaid?: number;
      newPaidViaEgov?: number;
      newPending?: number;
      renewPaid?: number;
      renewPaidViaEgov?: number;
      renewPending?: number;
      malePaid?: number;
      malePending?: number;
      femalePaid?: number;
      femalePending?: number;
      // allow any other numeric fields safely
      [k: string]: any;
    };

    const byLgu = new Map<string, { base: any; monthsMap: Map<string, MonthRec>; hasError?: boolean }>();

    for (const entry of filteredResults as any[]) {
      const key = entry?.lgu || '';
      if (!key) continue;

      if (!byLgu.has(key)) {
        byLgu.set(key, {
          base: { ...entry, monthlyResults: [] },
          monthsMap: new Map(),
          hasError: entry?.hasError,
        });
      }

      const bucket = byLgu.get(key)!;
      if (entry?.hasError) bucket.hasError = true;

      const monthsArr = Array.isArray(entry?.monthlyResults) ? entry.monthlyResults : [];
      for (const m of monthsArr) {
        const mKey: string | undefined = m?.month;
        if (!mKey) continue;

        const existing = bucket.monthsMap.get(mKey) || { month: mKey };
        Object.keys(m).forEach(field => {
          const val = m[field];
          if (field === 'month') return;
          if (typeof val === 'number') {
            existing[field] = Math.max(Number(existing[field] || 0), Number(val));
          } else if (existing[field] === undefined) {
            existing[field] = val;
          }
        });
        bucket.monthsMap.set(mKey, existing);
      }
    }

    const out: any[] = [];
    byLgu.forEach(({ base, monthsMap, hasError }) => {
      const monthlyResults = Array.from(monthsMap.values()).sort((a, b) => String(a.month).localeCompare(String(b.month)));
      const months = monthlyResults.map(m => m.month);
      out.push({ ...base, hasError: !!hasError, monthlyResults, months });
    });

    return out;
  }, [filteredResults]);

  // 3) Group by region using normalized results (prevents dupes on toggle)
  const regionMappingGrouped = useMemo(
    () => groupResultsByRegion(normalizedResults, completeLguToRegion),
    [normalizedResults, completeLguToRegion]
  );

  // Reflect data presence to parent
  useEffect(() => { onTableDataChange?.(normalizedResults.length > 0); }, [normalizedResults.length, onTableDataChange]);

  const toggleRegion = (region: string) => {
    setOpenRegions(prev => {
      const newSet = new Set(prev);
      newSet.has(region) ? newSet.delete(region) : newSet.add(region);
      return newSet;
    });
  };

  const toggleAllRegions = () => {
    const allRegionKeys = Object.keys(regionMappingGrouped);
    if (openRegions.size === allRegionKeys.length) setOpenRegions(new Set());
    else setOpenRegions(new Set(allRegionKeys));
  };

  const dateRangeLabel = getDateRangeLabel(dateRange.start, dateRange.end, selectedDateType);

  const elapsedString = React.useMemo(() => {
    if (!searchStartedAt || !generatedAt) return null;
    const diff = Math.max(0, Math.floor((nowTime.getTime() - new Date(generatedAt).getTime()) / 1000));
    const hh = Math.floor(diff / 3600);
    const mm = Math.floor((diff % 3600) / 60);
    const ss = diff % 60;
    if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${mm}:${String(ss).padStart(2, '0')}`;
  }, [nowTime, generatedAt, searchStartedAt]);

  // 4) Grand totals computed from normalized results to avoid double counting
  const grandTotals = useMemo(() => {
    const totals = {
      newPaid: 0, newGeoPay: 0, newPending: 0,
      renewalPaid: 0, renewalGeoPay: 0, renewalPending: 0,
      malePaid: 0, malePending: 0, femalePaid: 0, femalePending: 0
    };
    normalizedResults.forEach((lgu: any) => {
      if (!lgu.hasError && Array.isArray(lgu.monthlyResults)) {
        lgu.monthlyResults.forEach((item: any) => {
          totals.newPaid += Number(item.newPaid || 0);
          totals.newGeoPay += Number(item.newPaidViaEgov || 0);
          totals.newPending += Number(item.newPending || 0);
          totals.renewalPaid += Number(item.renewPaid || 0);
          totals.renewalGeoPay += Number(item.renewPaidViaEgov || 0);
          totals.renewalPending += Number(item.renewPending || 0);
          totals.malePaid += Number(item.malePaid || 0);
          totals.malePending += Number(item.malePending || 0);
          totals.femalePaid += Number(item.femalePaid || 0);
          totals.femalePending += Number(item.femalePending || 0);
        });
      }
    });
    return totals;
  }, [normalizedResults]);

  const renderTableRows = () => {
    const allRows: React.ReactNode[] = [];
    // Use custom region ordering instead of simple alphabetical
    const sortedRegionKeys = Object.keys(regionMappingGrouped).sort((a, b) => {
      const diff = getRegionSortIndex(a) - getRegionSortIndex(b);
      return diff !== 0 ? diff : a.localeCompare(b);
    });

    sortedRegionKeys.forEach(region => {
      const lguList = regionMappingGrouped[region];
      const isRegionOpen = openRegions.has(region);

      // Always render a trigger row so single-region cases still allow expanding.
      allRows.push(
        <TableRow key={`${region}-trigger`}>
          <TableCell
            colSpan={16}
            className="text-center p-2 cursor-pointer bg-slate-100 hover:bg-slate-200 font-semibold text-blue-600 text-xs"
            onClick={() => toggleRegion(region)}
          >
            {isRegionOpen ? `Hide ${getRegionCode(region) || region} Data` : `View ${getRegionCode(region) || region} Data`}
          </TableCell>
        </TableRow>
      );

      if (isRegionOpen) {
        const rows: React.ReactNode[] = [];
        const isDayMode = selectedDateType === "Day";

        let totalRowsForRegion = 0;
        for (const lgu of lguList) {
          if (lgu.hasError) {
            totalRowsForRegion += 1;
          } else {
            if (isDayMode) {
              const monthCount = lgu.monthlyResults?.length || 0;
              totalRowsForRegion += monthCount > 0 ? monthCount : 1;
            } else {
              totalRowsForRegion += 1;
            }
          }
        }

        let isFirstRowOfRegion = true;
        lguList.forEach((lgu: any) => {
          if (lgu.hasError) {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-error`} className="bg-orange-50/70">
                {isFirstRowOfRegion && <TableCell className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs" rowSpan={totalRowsForRegion}>{getRegionCode(region) || region}</TableCell>}
                <TableCell className="p-2 text-center font-semibold text-slate-800 text-xs">
                  {lgu.lgu}<br/>
                  <span className="text-[10px] font-bold text-orange-600 mt-0.5 uppercase">{lgu.error || 'NO DATA AVAILABLE'}</span>
                </TableCell>
                <TableCell colSpan={14} className="p-2 text-center text-slate-500">-</TableCell>
              </TableRow>
            );
            isFirstRowOfRegion = false;
            return;
          }
          
          const dataToRender = isDayMode
            ? (lgu.monthlyResults?.length > 0 ? lgu.monthlyResults : [{}])
            : [ (lgu.monthlyResults || []).reduce((acc:any, current:any) => {
                Object.keys(current).forEach(key => {
                  if (typeof current[key] === 'number') acc[key] = (acc[key] || 0) + Number(current[key]);
                });
                return acc;
              }, {}) ];

          dataToRender.forEach((item: any, itemIdx: number) => {
            const uniqueKey = `${region}-${lgu.lgu}-${isDayMode ? item.month : 'sum'}-${itemIdx}`;
            const periodLabel = isDayMode
              ? (item.month ? `(${formatMonthYear(item.month)})` : '')
              : (lgu.months?.length > 1
                  ? `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`
                  : lgu.months?.length === 1
                    ? `(${formatMonthYear(lgu.months[0])})`
                    : "");

            rows.push(
              <TableRow key={uniqueKey} className="hover:bg-blue-50/50 transition-colors duration-200 text-xs">
                {isFirstRowOfRegion && <TableCell className="p-2 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-xs" rowSpan={totalRowsForRegion}>{getRegionCode(region) || region}</TableCell>}
                <TableCell className="p-2 text-start font-semibold text-slate-800 text-xs">
                  <div>{lgu.lgu}<span className="text-[11px] font-medium text-slate-500 ml-1.5">{lgu.province ? `(${lgu.province})` : ""}</span></div>
                  <div className="text-[10px] font-semibold text-blue-700 mt-0.5">{periodLabel}</div>
                </TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{formatNumber(item.newPaid)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{formatNumber(item.newPaidViaEgov)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{formatNumber(item.newPending)}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{formatNumber((Number(item.newPaid || 0)) + (Number(item.newPaidViaEgov || 0)) + (Number(item.newPending || 0)))}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{formatNumber(item.renewPaid)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{formatNumber(item.renewPaidViaEgov)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{formatNumber(item.renewPending)}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{formatNumber((Number(item.renewPaid || 0)) + (Number(item.renewPaidViaEgov || 0)) + (Number(item.renewPending || 0)))}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{formatNumber(item.malePaid)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{formatNumber(item.malePending)}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{formatNumber((Number(item.malePaid || 0)) + (Number(item.malePending || 0)))}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-green-700">{formatNumber(item.femalePaid)}</TableCell>
                <TableCell className="p-2 text-center tabular-nums text-blue-700">{formatNumber(item.femalePending)}</TableCell>
                <TableCell className="p-2 text-center font-bold text-slate-900 bg-slate-100 tabular-nums">{formatNumber((Number(item.femalePaid || 0)) + (Number(item.femalePending || 0)))}</TableCell>
              </TableRow>
            );
            isFirstRowOfRegion = false;
          });
        });
        allRows.push(...rows);

        const regionTotals = lguList.reduce((totals, lgu) => {
          if (!lgu.hasError && lgu.monthlyResults) {
            lgu.monthlyResults.forEach((item: any) => {
              totals.newPaid += Number(item.newPaid || 0);
              totals.newGeoPay += Number(item.newPaidViaEgov || 0);
              totals.newPending += Number(item.newPending || 0);
              totals.renewalPaid += Number(item.renewPaid || 0);
              totals.renewalGeoPay += Number(item.renewPaidViaEgov || 0);
              totals.renewalPending += Number(item.renewPending || 0);
              totals.malePaid += Number(item.malePaid || 0);
              totals.malePending += Number(item.malePending || 0);
              totals.femalePaid += Number(item.femalePaid || 0);
              totals.femalePending += Number(item.femalePending || 0);
            });
          }
          return totals;
        }, { newPaid: 0, newGeoPay: 0, newPending: 0, renewalPaid: 0, renewalGeoPay: 0, renewalPending: 0, malePaid: 0, malePending: 0, femalePaid: 0, femalePending: 0 });

        allRows.push(
          <TableRow key={`${region}-subtotal`} className="font-bold text-white">
            <TableCell className="bg-slate-500 p-2" colSpan={2}>
              <div className="font-extrabold tracking-wider text-xs">SUB-TOTAL</div>
              <div className='text-[10px] font-medium text-slate-300'>({getRegionCode(region) || region})</div>
            </TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.newPaid)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.newGeoPay)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.newPending)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.newPaid + regionTotals.newGeoPay + regionTotals.newPending)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.renewalPaid)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.renewalGeoPay)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.renewalPending)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.renewalPaid + regionTotals.renewalGeoPay + regionTotals.renewalPending)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.malePaid)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.malePending)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.malePaid + regionTotals.malePending)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.femalePaid)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.femalePending)}</TableCell>
            <TableCell className="bg-slate-500 p-2 text-center tabular-nums text-sm">{formatNumber(regionTotals.femalePaid + regionTotals.femalePending)}</TableCell>
          </TableRow>
        );
      }
    });

    return allRows;
  };

  return (
    <div ref={ref} className="bg-slate-50 p-4 sm:p-5 rounded-md border border-slate-200/80 shadow-lg shadow-slate-200/60">
      {loading && <Loading />}
      <div>
        <div className='flex justify-between items-center mb-5 pb-5 border-b border-slate-200'>
          <div className="flex items-center gap-4">
            <img src={dictImage} alt="dict logo" className='w-44 h-auto'/>
            <div className="border-l border-slate-300 pl-4">
              <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">Working Permit</h1>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Generated for the period: <span className="font-semibold text-slate-600">{getDateRangeLabel(dateRange.start, dateRange.end, selectedDateType)}</span>
              </p>
            </div>
          </div>
          <div className='text-right'>
            <p className="text-[11px] font-semibold text-slate-600">Generated On</p>
            <p className="text-xs font-mono text-slate-500">{format(generatedAt, "MMM dd, yyyy, h:mm:ss a")}</p>
            {elapsedString && <p className="text-[11px] text-slate-500 mt-1">Elapsed: <span className="font-mono text-xs">{elapsedString}</span></p>}
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border border-slate-300">
          {/* Constrain height so header (top) and footer (bottom) stick inside the scroll container */}
          <Table className="w-full border-collapse" containerClassName="max-h-[70vh]">
            <TableHeader className="[&>tr]:border-b-0">
              <TableRow>
                <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-20 text-[11px] border-b border-r border-slate-300">Region</TableHead>
                <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-2 text-center align-middle sticky top-0 z-20 text-[11px] border-b border-r border-slate-300">LGU</TableHead>
                <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold p-2 text-center sticky top-0 z-20 uppercase tracking-wider text-[11px] border-b border-r border-slate-300">New</TableHead>
                <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold p-2 text-center sticky top-0 z-20 uppercase tracking-wider text-[11px] border-b border-r border-slate-300">Renewal</TableHead>
                <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold p-2 text-center sticky top-0 z-20 uppercase tracking-wider text-[11px] border-b border-r border-slate-300">Male</TableHead>
                <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold p-2 text-center sticky top-0 z-20 uppercase tracking-wider text-[11px] border-b border-slate-300">Female</TableHead>
              </TableRow>
              <TableRow>
                {/* Note: top offset for second header row. Adjust if header height changes. */}
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
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-slate-300">PAID</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[45px] z-20 text-center font-semibold text-[10px] border-b border-slate-300">ONGOING</TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[45px] z-20 text-center font-bold uppercase text-[10px] border-b border-slate-300">Total</TableHead>
              </TableRow>
            </TableHeader>
            {/* Add bottom padding so sticky footer doesn't overlap the last rows */}
            <TableBody className="pb-12 [&>tr:nth-child(even)]:bg-white [&>tr:nth-child(odd)]:bg-slate-50/50">
              {normalizedResults.length > 0 ? (
                <>
                  {renderTableRows()}
                  {Object.keys(regionMappingGrouped).length > 1 && (
                    <TableRow>
                      <TableCell colSpan={16} className="text-center p-2 cursor-pointer bg-slate-200 hover:bg-slate-300 font-bold text-slate-700 text-xs" onClick={toggleAllRegions}>
                        {openRegions.size === Object.keys(regionMappingGrouped).length ? 'Hide All Regions' : 'View All Regions'}
                      </TableCell>
                    </TableRow>
                  )}
                  {(loading || isProgressive) && (
                    <TableRow><TableCell colSpan={16} className="p-0"><LoaderTable message={isProgressive ? "Please wait for other regions..." : "Updating data..."} /></TableCell></TableRow>
                  )}
                </>
              ) : loading ? (
                <TableRow><TableCell colSpan={16} className="text-center py-12"><LoaderTable /></TableCell></TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-16 bg-white">
                    <div className='flex flex-col items-center justify-center'>
                      <div className="rounded-full bg-slate-100 p-3"><Search className="h-8 w-8 text-slate-400" /></div>
                      <p className='font-bold text-sm text-slate-600 mt-4'>{hasSearched ? 'No Results Found' : 'Generate a Report'}</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">{hasSearched ? 'There is no data matching your selected filters. Please try adjusting your criteria.' : 'Use the filters above to generate your working permit report.'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <tfoot>
              <TableRow className="bg-slate-800 text-white font-bold border-t-2 border-slate-400">
                {/* Make grand total sticky at the bottom of the scroll container */}
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-left" colSpan={2}>
                  <div className="font-extrabold tracking-wider text-sm">GRAND TOTAL</div>
                  <div className='text-[10px] font-medium text-slate-300'>({dateRangeLabel})</div>
                </TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.newPaid)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.newGeoPay)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.newPending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.newPaid + grandTotals.newGeoPay + grandTotals.newPending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.renewalPaid)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.renewalGeoPay)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.renewalPending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.renewalPaid + grandTotals.renewalGeoPay + grandTotals.renewalPending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.malePaid)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.malePending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.malePaid + grandTotals.malePending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.femalePaid)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.femalePending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 p-2 text-center tabular-nums text-sm">{formatNumber(grandTotals.femalePaid + grandTotals.femalePending)}</TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </div>
      </div>
    </div>
  );
});

export default WorkingPermitReport;
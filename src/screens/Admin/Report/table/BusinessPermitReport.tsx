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
import { getRegionCode } from "../utils/mockData";
import dictImage from "./../../../../assets/logo/dict.png"
import '../utils/loader.css';
import LoaderTable from '../utils/LoaderTable';
import Loading from '../utils/Loading';
import { Search } from 'lucide-react';
import { filterTableResults, formatMonthYear, formatNumber, groupResultsByRegion, getDateRangeLabel } from '../utils/reportUtils';

export { filterTableResults };

// --- Region Sorting Helpers (Walay kausaban dinhi) ---
const DESIRED_REGION_ORDER: string[] = [
  'region1', 'region2', 'region3', 'region4a', 'region4b', 'region5', 'region6', 'region7',
  'region8', 'region9', 'region10', 'region11', 'region12', 'region13', 'car', 'barmm1', 'barmm2',
];

function normalizeRegionKeyForSort(input: string): string {
  const key = (input || '').trim().toLowerCase();
  if (!key) return key;
  if (key.startsWith('region')) return key;
  if (key === 'car' || key === 'barmm1' || key === 'barmm2') return key;

  const rMatch = key.match(/^r\s*([0-9]{1,2})(?:\s*[-]?\s*([ab]))?$/i);
  if (rMatch) {
    const num = rMatch[1];
    const suffix = rMatch[2] ? rMatch[2].toLowerCase() : '';
    return `region${num}${suffix}`;
  }

  const romanMap: Record<string, string> = {
    'i': '1', 'ii': '2', 'iii': '3', 'iv-a': '4a', 'iv-b': '4b', 'iv': '4', 'v': '5', 'vi': '6',
    'vii': '7', 'viii': '8', 'ix': '9', 'x': '10', 'xi': '11', 'xii': '12', 'xiii': '13',
  };
  if (romanMap[key]) return `region${romanMap[key]}`;
  return key;
}

function getRegionSortIndex(regionKey: string): number {
  const normalized = normalizeRegionKeyForSort(regionKey);
  const idx = DESIRED_REGION_ORDER.indexOf(normalized);
  if (idx !== -1) return idx;
  if (normalized === 'region not specified') return DESIRED_REGION_ORDER.length + 1;
  return DESIRED_REGION_ORDER.length;
}
// --- End Region Sorting Helpers ---

interface BusinessPermitProps {
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

const BusinessPermitReport = forwardRef<HTMLDivElement, BusinessPermitProps>(({ 
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
  
  const filteredResults = useMemo(() => filterTableResults({ apiData, selectedRegions, selectedProvinces, selectedCities, selectedDateType, selectedIslands, lguToRegion, dateRange }), [apiData, selectedRegions, selectedProvinces, selectedCities, selectedDateType, selectedIslands, lguToRegion, dateRange]);
  const normalizedResults = useMemo(() => {
    type MonthRec = Record<string, any> & { month?: string };
    const byLgu = new Map<string, { lgu: any; monthsMap: Map<string, MonthRec>; hasError?: boolean }>();
    for (const entry of filteredResults as any[]) {
      const key = entry?.lgu || '';
      if (!key) continue;
      if (!byLgu.has(key)) byLgu.set(key, { lgu: { ...entry, monthlyResults: [] }, monthsMap: new Map(), hasError: entry?.hasError });
      const bucket = byLgu.get(key)!;
      if (entry?.hasError) bucket.hasError = true;
      const monthsArr = Array.isArray(entry?.monthlyResults) ? entry.monthlyResults : [];
      for (const m of monthsArr) {
        const mKey = m?.month as string | undefined;
        if (!mKey) continue;
        const existing = bucket.monthsMap.get(mKey) || { month: mKey };
        Object.keys(m).forEach(field => {
          const val = m[field];
          if (typeof val === 'number') existing[field] = Math.max(Number(existing[field] || 0), Number(val));
          else if (existing[field] === undefined) existing[field] = val;
        });
        bucket.monthsMap.set(mKey, existing);
      }
    }
    const deduped: any[] = [];
    byLgu.forEach(({ lgu, monthsMap, hasError }) => {
      const monthlyResults = Array.from(monthsMap.values()).sort((a, b) => String(a.month || '').localeCompare(String(b.month || '')));
      const months = monthlyResults.map(m => m.month).filter(Boolean);
      deduped.push({ ...lgu, hasError: !!hasError, monthlyResults, months });
    });
    return deduped;
  }, [filteredResults]);
  const regionMappingGrouped = useMemo(() => groupResultsByRegion(normalizedResults, lguToRegion), [normalizedResults, lguToRegion]);
  const grandTotals = useMemo(() => {
    const totals: any = { newPaid: 0, newGeoPay: 0, newPending: 0, newLicenseIssued: 0, renewalPaid: 0, renewalGeoPay: 0, renewalPending: 0, renewalLicenseIssued: 0, malePaid: 0, malePending: 0, femalePaid: 0, femalePending: 0, totalCitizensServed: 0 };
    normalizedResults.forEach((lgu: any) => {
      // Sum per-LGU totalCitizensServed if provided (skip errored LGUs)
      if (!lgu.hasError) totals.totalCitizensServed += Number(lgu.totalCitizensServed || 0);

      if (!lgu.hasError && Array.isArray(lgu.monthlyResults)) {
        lgu.monthlyResults.forEach((item: any) => {
          const itemNewPaid = Number(item.newPaid || 0);
          const itemNewGeo = Number(item.newPaidViaEgov || 0);
          const itemNewPending = Number(item.newPending || 0);
          // Prefer explicit license-issued field when available; otherwise fallback to newPaid (assumed to represent license-issued if API doesn't provide separate field)
          const itemNewLicenseIssued = Number(item.newLicenseIssued ?? item.newIssued ?? itemNewPaid ?? 0);

          totals.newPaid += itemNewPaid;
          totals.newGeoPay += itemNewGeo;
          totals.newPending += itemNewPending;
          totals.newLicenseIssued += itemNewLicenseIssued;

          const itemRenewPaid = Number(item.renewPaid || 0);
          const itemRenewGeo = Number(item.renewPaidViaEgov || 0);
          const itemRenewPending = Number(item.renewPending || 0);
          const itemRenewLicenseIssued = Number(item.renewLicenseIssued ?? item.renewIssued ?? itemRenewPaid ?? 0);

          totals.renewalPaid += itemRenewPaid;
          totals.renewalGeoPay += itemRenewGeo;
          totals.renewalPending += itemRenewPending;
          totals.renewalLicenseIssued += itemRenewLicenseIssued;

          totals.malePaid += Number(item.malePaid || 0);
          totals.malePending += Number(item.malePending || 0);
          totals.femalePaid += Number(item.femalePaid || 0);
          totals.femalePending += Number(item.femalePending || 0);
        });
      }
    });
    return totals;
  }, [normalizedResults]);

  useEffect(() => { onTableDataChange?.(normalizedResults.length > 0); }, [normalizedResults.length, onTableDataChange]);

  const toggleRegion = (region: string) => setOpenRegions(prev => { const newSet = new Set(prev); newSet.has(region) ? newSet.delete(region) : newSet.add(region); return newSet; });
  const toggleAllRegions = () => { const allRegionKeys = Object.keys(regionMappingGrouped); if (openRegions.size === allRegionKeys.length) setOpenRegions(new Set()); else setOpenRegions(new Set(allRegionKeys)); };

  const dateRangeLabel = getDateRangeLabel(dateRange.start, dateRange.end, selectedDateType);
  const elapsedString = useMemo(() => {
    if (!searchStartedAt || !generatedAt) return null;
    const diff = Math.max(0, Math.floor((nowTime.getTime() - new Date(generatedAt).getTime()) / 1000));
    const hh = Math.floor(diff / 3600);
    const mm = Math.floor((diff % 3600) / 60);
    const ss = diff % 60;
    if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
    return `${mm}:${String(ss).padStart(2, '0')}`;
  }, [nowTime, generatedAt, searchStartedAt]);

  const renderTableRows = () => {
    const allRows: React.ReactNode[] = [];
    const sortedRegionKeys = Object.keys(regionMappingGrouped).sort((a, b) => getRegionSortIndex(a) - getRegionSortIndex(b) || a.localeCompare(b));

    sortedRegionKeys.forEach(region => {
      const lguList = regionMappingGrouped[region];
      const isRegionOpen = openRegions.has(region);
      // Compute region-level citizens served up-front so we can render it as a single, row-spanning cell
      const regionCitizensServed = lguList.reduce((acc: number, lgu: any) => acc + (!lgu.hasError ? Number(lgu.totalCitizensServed || 0) : 0), 0);
      allRows.push(<TableRow key={`${region}-trigger`}><TableCell colSpan={22} className="text-center p-2 cursor-pointer bg-slate-50 hover:bg-slate-100 font-semibold text-blue-600 text-xs" onClick={() => toggleRegion(region)}>{isRegionOpen ? `▲ Hide ${getRegionCode(region) || region} Data` : `▼ View ${getRegionCode(region) || region} Data`}</TableCell></TableRow>);
      if (isRegionOpen) {
        const rows: React.ReactNode[] = [];
        const isDayMode = selectedDateType === "Day";
        let totalRowsForRegion = lguList.reduce((acc, lgu) => acc + (lgu.hasError ? 1 : (isDayMode ? Math.max(1, lgu.monthlyResults?.length || 0) : 1)), 0);
        let isFirstRowOfRegion = true;
        lguList.forEach((lgu: any) => {
          // Number of table rows this LGU will occupy (used for per-LGU rowSpan)
          const rowsForThisLgu = lgu.hasError ? 1 : (isDayMode ? Math.max(1, lgu.monthlyResults?.length || 0) : 1);
          let isFirstRowOfLgu = true;
          if (lgu.hasError) {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-error`} className="bg-red-50/50">
                {isFirstRowOfRegion && <TableCell className="p-3 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-sm" rowSpan={totalRowsForRegion}>{getRegionCode(region) || region}</TableCell>}
                <TableCell className="p-3 text-left font-semibold text-slate-800 text-sm">{lgu.lgu}<br/><span className="text-[11px] font-bold text-red-600 mt-0.5 uppercase">{lgu.error || 'NO DATA AVAILABLE'}</span></TableCell>
                {isFirstRowOfLgu && <TableCell className="p-3 text-right tabular-nums text-slate-800" rowSpan={rowsForThisLgu}>{formatNumber(Number(lgu.totalCitizensServed || 0))}</TableCell>}
                {!isFirstRowOfLgu && null}
                <TableCell colSpan={19} className="p-3 text-center text-slate-500">-</TableCell>
              </TableRow>
            );
            isFirstRowOfRegion = false; isFirstRowOfLgu = false; return;
          }
          const dataToRender = isDayMode ? (lgu.monthlyResults?.length > 0 ? lgu.monthlyResults : [{}]) : [ (lgu.monthlyResults || []).reduce((acc: any, current: any) => { Object.keys(current).forEach(key => { if (typeof current[key] === 'number') acc[key] = (acc[key] || 0) + Number(current[key]); }); return acc; }, {}) ];
          dataToRender.forEach((item: any, itemIdx: number) => {
            const periodLabel = isDayMode ? (item.month ? `(${formatMonthYear(item.month)})` : '') : (lgu.months?.length > 1 ? `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})` : lgu.months?.length === 1 ? `(${formatMonthYear(lgu.months[0])})` : "");

            // Computed values:
            // PAID should represent For Issuance + eGOV only (License Issued displayed separately)
            const newPaid = Number(item.newPaid || 0);
            const newGeo = Number(item.newPaidViaEgov || 0);
            const newPending = Number(item.newPending || 0);
            const newLicenseIssued = Number(item.newLicenseIssued ?? item.newIssued ?? newPaid ?? 0);
            const newPaidOnly = newPaid + newGeo; // exclude licenseIssued
            const newTotal = newPaidOnly + newPending;

            const renewPaid = Number(item.renewPaid || 0);
            const renewGeo = Number(item.renewPaidViaEgov || 0);
            const renewPending = Number(item.renewPending || 0);
            const renewLicenseIssued = Number(item.renewLicenseIssued ?? item.renewIssued ?? renewPaid ?? 0);
            const renewPaidOnly = renewPaid + renewGeo; // exclude licenseIssued
            const renewTotal = renewPaidOnly + renewPending;

            const malePaid = Number(item.malePaid || 0);
            const malePending = Number(item.malePending || 0);
            const maleLicenseIssued = Number(item.maleLicenseIssued ?? malePaid ?? 0);
            const malePaidOnly = malePaid; // no separate eGOV breakdown for male
            const maleTotal = malePaidOnly + malePending;

            const femalePaid = Number(item.femalePaid || 0);
            const femalePending = Number(item.femalePending || 0);
            const femaleLicenseIssued = Number(item.femaleLicenseIssued ?? femalePaid ?? 0);
            const femalePaidOnly = femalePaid; // no separate eGOV breakdown for female
            const femaleTotal = femalePaidOnly + femalePending;

            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${isDayMode ? item.month : 'sum'}-${itemIdx}`} className="hover:bg-blue-50/70 transition-colors duration-200 text-sm">
                {isFirstRowOfRegion && <TableCell className="p-3 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-sm" rowSpan={totalRowsForRegion}>{getRegionCode(region) || region}</TableCell>}
                <TableCell className="p-3 text-left font-semibold text-slate-800">
                  <div>{lgu.lgu}<span className="text-xs font-medium text-slate-500 ml-1.5">{lgu.province ? `(${lgu.province})` : ""}</span></div>
                  <div className="text-[11px] font-semibold text-blue-700 mt-0.5">{periodLabel}</div>
                </TableCell>
                {isFirstRowOfLgu && <TableCell className="p-3 text-right tabular-nums text-slate-800" rowSpan={rowsForThisLgu}>{formatNumber(Number(lgu.totalCitizensServed || 0))}</TableCell>}
                {!isFirstRowOfLgu && null}

                {/* New */}
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(newLicenseIssued)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(newPaidOnly)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(newGeo)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(newPending)}</TableCell>
                <TableCell className="p-3 text-right font-bold text-slate-900 bg-slate-100 tabular-nums">{formatNumber(newTotal)}</TableCell>

                {/* Renewal */}
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(renewLicenseIssued)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(renewPaidOnly)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(renewGeo)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(renewPending)}</TableCell>
                <TableCell className="p-3 text-right font-bold text-slate-900 bg-slate-100 tabular-nums">{formatNumber(renewTotal)}</TableCell>

                {/* (moved) Total Licensed Issued cell will be rendered after Female columns */}

                {/* Male */}
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(maleLicenseIssued)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(malePaidOnly)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(malePending)}</TableCell>
                <TableCell className="p-3 text-right font-bold text-slate-900 bg-slate-100 tabular-nums">{formatNumber(maleTotal)}</TableCell>

                {/* Female */}
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(femaleLicenseIssued)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(femalePaidOnly)}</TableCell>
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(femalePending)}</TableCell>
                <TableCell className="p-3 text-right font-bold text-slate-900 bg-slate-100 tabular-nums">{formatNumber(femaleTotal)}</TableCell>
                {/* Total Licensed Issued (New + Renewal) - moved to end of row */}
                <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(newLicenseIssued + renewLicenseIssued)}</TableCell>
              </TableRow>
            );

            isFirstRowOfRegion = false; isFirstRowOfLgu = false;
          });
        });
          allRows.push(...rows);
        const regionTotals = lguList.reduce((totals, lgu) => {
    if (!lgu.hasError && lgu.monthlyResults) {
      lgu.monthlyResults.forEach((item: any) => {
        const itemNewPaid = Number(item.newPaid || 0);
        const itemNewGeo = Number(item.newPaidViaEgov || 0);
        const itemNewPending = Number(item.newPending || 0);
        const itemNewLicenseIssued = Number(item.newLicenseIssued ?? item.newIssued ?? itemNewPaid ?? 0);

        totals.newPaid += itemNewPaid;
        totals.newGeoPay += itemNewGeo;
        totals.newPending += itemNewPending;
        totals.newLicenseIssued += itemNewLicenseIssued;

        const itemRenewPaid = Number(item.renewPaid || 0);
        const itemRenewGeo = Number(item.renewPaidViaEgov || 0);
        const itemRenewPending = Number(item.renewPending || 0);
        const itemRenewLicenseIssued = Number(item.renewLicenseIssued ?? item.renewIssued ?? itemRenewPaid ?? 0);

        totals.renewalPaid += itemRenewPaid;
        totals.renewalGeoPay += itemRenewGeo;
        totals.renewalPending += itemRenewPending;
        totals.renewalLicenseIssued += itemRenewLicenseIssued;

        totals.malePaid += Number(item.malePaid || 0);
        totals.malePending += Number(item.malePending || 0);
        totals.femalePaid += Number(item.femalePaid || 0);
        totals.femalePending += Number(item.femalePending || 0);
      });
    }
    return totals;
  }, { newPaid: 0, newGeoPay: 0, newPending: 0, newLicenseIssued: 0, renewalPaid: 0, renewalGeoPay: 0, renewalPending: 0, renewalLicenseIssued: 0, malePaid: 0, malePending: 0, femalePaid: 0, femalePending: 0 });
  // Region-level computed values
  const regionLicenseIssued = (regionTotals.newLicenseIssued || 0);
  // PAID column at region level should reflect For Issuance + eGOV (don't add License Issued again)
  const regionNewPaid = (regionTotals.newPaid || 0) + (regionTotals.newGeoPay || 0);
  const regionNewTotal = regionNewPaid + (regionTotals.newPending || 0);
  const regionRenewLicenseIssued = (regionTotals.renewalLicenseIssued || 0);
  const regionRenewPaid = (regionTotals.renewalPaid || 0) + (regionTotals.renewalGeoPay || 0);
  const regionRenewTotal = regionRenewPaid + (regionTotals.renewalPending || 0);
  const regionTotalLicenseIssued = (regionLicenseIssued || 0) + (regionRenewLicenseIssued || 0);
  const regionMaleTotal = (regionTotals.malePaid || 0) + (regionTotals.malePending || 0);
  const regionFemaleTotal = (regionTotals.femalePaid || 0) + (regionTotals.femalePending || 0);

  allRows.push(
    <TableRow key={`${region}-subtotal`} className="font-bold text-slate-900">
      <TableCell className="bg-slate-200 p-3 text-left" colSpan={2}>
        <div className="font-extrabold tracking-wider text-xs">SUB-TOTAL ({getRegionCode(region) || region})</div>
      </TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionCitizensServed)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionLicenseIssued)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionNewPaid)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.newGeoPay)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.newPending)}</TableCell>
      <TableCell className="bg-slate-300 p-3 text-right tabular-nums text-sm">{formatNumber(regionNewTotal)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionRenewLicenseIssued)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionRenewPaid)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.renewalGeoPay)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.renewalPending)}</TableCell>
      <TableCell className="bg-slate-300 p-3 text-right tabular-nums text-sm">{formatNumber(regionRenewTotal)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.malePaid)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.malePaid)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.malePending)}</TableCell>
      <TableCell className="bg-slate-300 p-3 text-right tabular-nums text-sm">{formatNumber(regionMaleTotal)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.femalePaid)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.femalePaid)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotals.femalePending)}</TableCell>
      <TableCell className="bg-slate-300 p-3 text-right tabular-nums text-sm">{formatNumber(regionFemaleTotal)}</TableCell>
      <TableCell className="bg-slate-300 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotalLicenseIssued)}</TableCell>
    </TableRow>
  );
      }
    });
    return allRows;
  };

  return (
    <div ref={ref} className="bg-white p-4 sm:p-6 rounded-lg border border-slate-200 shadow-sm">
      {loading && <Loading />}
      <div>
        <div className='flex justify-between items-center mb-6 pb-6 border-b border-slate-200'>
          <div className="flex items-center gap-4"><img src={dictImage} alt="dict logo" className='w-40 h-auto'/><div className="border-l border-slate-300 pl-4"><h1 className="text-2xl font-bold text-slate-800 tracking-tight">Business Permit Report</h1><p className="text-sm font-medium text-slate-500 mt-1">Period Covered: <span className="font-semibold text-slate-700">{dateRangeLabel}</span></p></div></div>
          <div className='text-right'><p className="text-xs font-semibold text-slate-600">Generated On</p><p className="text-sm font-mono text-slate-500">{format(generatedAt, "MMM dd, yyyy, h:mm:ss a")}</p>{elapsedString && <p className="text-xs text-slate-500 mt-1">Elapsed: <span className="font-mono">{elapsedString}</span></p>}</div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-slate-300">
          <Table className="w-full border-collapse" containerClassName="max-h-[70vh]">
            <TableHeader className="[&_tr]:border-b-0">
              <TableRow>
                <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-3 text-center align-middle sticky top-0 z-20 text-xs border-b border-r border-slate-300">Region</TableHead>
                <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-3 text-left align-middle sticky top-0 z-20 text-xs border-b border-r border-slate-300">LGU</TableHead>
                <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-3 text-center align-middle sticky top-0 z-20 text-xs border-b border-r border-slate-300">Citizens Served</TableHead>
                <TableHead colSpan={5} className="bg-[#9ec6f7] text-black font-bold p-3 text-center sticky top-0 z-20 uppercase tracking-wider text-xs border-b border-r border-slate-300">New</TableHead>
                <TableHead colSpan={5} className="bg-[#9ec6f7] text-black font-bold p-3 text-center sticky top-0 z-20 uppercase tracking-wider text-xs border-b border-r border-slate-300">Renewal</TableHead>
                <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold p-3 text-center sticky top-0 z-20 uppercase tracking-wider text-xs border-b border-r border-slate-300">Male</TableHead>
                 <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold p-3 text-center sticky top-0 z-20 uppercase tracking-wider text-xs border-b border-r border-slate-300">Female</TableHead>
                  <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-3 text-center align-middle sticky top-0 z-20 uppercase tracking-wider text-xs border-b border-r border-slate-300">Total Licensed Issued <br /> <span className='text-[10px]'>(New & Renew)</span></TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">License Issued</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID <br /><span className='font-normal'>(For Issuance and License Issued)</span></TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID <br /><span className='font-normal'>(eGOVPay)</span></TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">ONGOING <br /><span className='font-normal'>(For Payment)</span></TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[49px] z-20 text-center font-bold uppercase text-[10px] border-b border-r border-slate-300">Total</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">License Issued</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID <br /><span className='font-normal'>(For Issuance and License Issued)</span></TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID <br /><span className='font-normal'>(eGOVPay)</span></TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">ONGOING <br /><span className='font-normal'>(For Payment)</span></TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[49px] z-20 text-center font-bold uppercase text-[10px] border-b border-r border-slate-300">Total</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">License Issued</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID <br /><span className='font-normal'>(For Issuance and License Issued)</span></TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">ONGOING <br /><span className='font-normal'>(For Payment)</span></TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[49px] z-20 text-center font-bold uppercase text-[10px] border-b border-r border-slate-300">Total</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">License Issued</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID <br /><span className='font-normal'>(For Issuance and License Issued)</span></TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">ONGOING <br /><span className='font-normal'>(For Payment)</span></TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[49px] z-20 text-center font-bold uppercase text-[10px] border-b border-slate-300">Total</TableHead>
              </TableRow>
            </TableHeader>
            
            <TableBody className="[&>tr:nth-child(even)]:bg-white [&>tr:nth-child(odd)]:bg-slate-50/50">
              {normalizedResults.length > 0 ? (
                <>
                  {renderTableRows()}
                  {Object.keys(regionMappingGrouped).length > 1 && <TableRow><TableCell colSpan={22} className="text-center p-2 cursor-pointer bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs" onClick={toggleAllRegions}>{openRegions.size === Object.keys(regionMappingGrouped).length ? 'Collapse All Regions' : 'Expand All Regions'}</TableCell></TableRow>}
                  {(loading || isProgressive) && <TableRow><TableCell colSpan={22} className="p-0"><LoaderTable message={isProgressive ? "Please wait for other regions..." : "Updating data..."} /></TableCell></TableRow>}
                </>
              ) : loading ? (
                <TableRow><TableCell colSpan={22} className="text-center py-12"><LoaderTable /></TableCell></TableRow>
              ) : (
                <TableRow><TableCell colSpan={22} className="text-center py-20 bg-white"><div className='flex flex-col items-center justify-center'><div className="rounded-full bg-slate-100 p-4"><Search className="h-10 w-10 text-slate-400" /></div><p className='font-bold text-lg text-slate-600 mt-5'>{hasSearched ? 'No Results Found' : 'Generate a Report'}</p><p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{hasSearched ? 'There is no data matching your selected filters. Please try adjusting your criteria.' : 'Use the filters above to generate your business permit report.'}</p></div></TableCell></TableRow>
              )}
            </TableBody>
            
            <tfoot>
              {/* ===== START OF FINAL CHANGE ===== */}
              {/* Ang mga 'Total' columns (nga naay bg-slate-700 kaniadto) gi-usab na sa bg-slate-800 */}
              <TableRow className="font-bold border-t-4 border-slate-500">
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-left" colSpan={2}><div className="font-extrabold tracking-wider text-base">GRAND TOTAL</div><div className='text-xs font-medium text-slate-300'>({dateRangeLabel})</div></TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.totalCitizensServed)}</TableCell>
                {/* New */}
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.newLicenseIssued)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber((grandTotals.newPaid || 0) + (grandTotals.newGeoPay || 0))}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.newGeoPay)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.newPending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base font-bold">{formatNumber((grandTotals.newPaid || 0) + (grandTotals.newGeoPay || 0) + (grandTotals.newPending || 0))}</TableCell>
                {/* Renewal */}
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.renewalLicenseIssued)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber((grandTotals.renewalPaid || 0) + (grandTotals.renewalGeoPay || 0))}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.renewalGeoPay)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.renewalPending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base font-bold">{formatNumber((grandTotals.renewalPaid || 0) + (grandTotals.renewalGeoPay || 0) + (grandTotals.renewalPending || 0))}</TableCell>
                {/* Male */}
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.malePaid)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.malePaid)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.malePending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base font-bold">{formatNumber(grandTotals.malePaid + grandTotals.malePending)}</TableCell>
                {/* Female */}
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.femalePaid)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.femalePaid)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber(grandTotals.femalePending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base font-bold">{formatNumber(grandTotals.femalePaid + grandTotals.femalePending)}</TableCell>
                {/* Grand Total Licensed Issued (New + Renewal) - moved to end */}
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{formatNumber((grandTotals.newLicenseIssued || 0) + (grandTotals.renewalLicenseIssued || 0))}</TableCell>
              </TableRow>
              {/* ===== END OF FINAL CHANGE ===== */}
            </tfoot>
          </Table>
        </div>
      </div>
    </div>
  );
});

export default BusinessPermitReport;
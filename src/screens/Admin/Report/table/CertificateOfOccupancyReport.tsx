import React, { forwardRef, useEffect, useMemo, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { getRegionCode, regionMapping } from "../utils/mockData";
import dictImage from "./../../../../assets/logo/dict.png";
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
  if (rMatch) { const num = rMatch[1]; const suffix = rMatch[2] ? rMatch[2].toLowerCase() : ''; return `region${num}${suffix}`; }
  const romanMap: Record<string, string> = { 'i': '1', 'ii': '2', 'iii': '3', 'iv-a': '4a', 'iv-b': '4b', 'iv': '4', 'v': '5', 'vi': '6', 'vii': '7', 'viii': '8', 'ix': '9', 'x': '10', 'xi': '11', 'xii': '12', 'xiii': '13' };
  if (romanMap[key]) { return `region${romanMap[key]}`; }
  return key;
}

function getRegionSortIndex(regionKey: string): number {
  const normalized = normalizeRegionKeyForSort(regionKey);
  const idx = DESIRED_REGION_ORDER.indexOf(normalized);
  if (idx !== -1) return idx;
  if (normalized === 'region not specified') { return DESIRED_REGION_ORDER.length + 1; }
  return DESIRED_REGION_ORDER.length;
}
// --- End Region Sorting Helpers ---

interface CertificateOfOccupancyProps {
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
  selectedDateType?: string;
  searchStartedAt?: Date;
  moduleLoading?: boolean;
  searchLoading?: boolean;
}

const CertificateOfOccupancyReport = forwardRef<HTMLDivElement, CertificateOfOccupancyProps>(({
  selectedRegions, dateRange, apiData, loading, lguToRegion,
  selectedProvinces, selectedCities, selectedIslands, selectedDateType,
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

  // Data processing logic (Walay kausaban dinhi)
  const normalizedSelectedRegions = useMemo(() => (selectedRegions || []).map(normalizeRegionKeyForSort), [selectedRegions]);
  const completeLguToRegion = useMemo(() => { const combinedMap = { ...lguToRegion }; if (apiData?.results && Array.isArray(apiData.results)) { apiData.results.forEach((lgu: any) => { if (lgu?.lgu && lgu?.region) { const normalized = normalizeRegionKeyForSort(lgu.region); combinedMap[lgu.lgu] = regionMapping[lgu.region as keyof typeof regionMapping] || normalized || lgu.region; } }); } return combinedMap; }, [apiData, lguToRegion]);
  const filteredResults = useMemo(() => { return filterTableResults({ apiData, selectedRegions: normalizedSelectedRegions, selectedProvinces, selectedCities, selectedDateType, selectedIslands, lguToRegion: completeLguToRegion, dateRange, }); }, [ apiData, normalizedSelectedRegions, selectedProvinces, selectedCities, selectedDateType, selectedIslands, completeLguToRegion, dateRange ]);
  const normalizedResults = useMemo(() => { type MonthEntry = { month: string; coPaid: number; coPending: number }; const byLgu = new Map<string, { lgu: any; monthsMap: Map<string, MonthEntry>; hasError?: boolean }>(); for (const entry of filteredResults as any[]) { const key = entry?.lgu || ''; if (!key) continue; if (!byLgu.has(key)) { byLgu.set(key, { lgu: { ...entry, monthlyResults: [] }, monthsMap: new Map<string, MonthEntry>(), hasError: entry?.hasError, }); } const bucket = byLgu.get(key)!; if (entry?.hasError) bucket.hasError = true; const monthsArr = Array.isArray(entry?.monthlyResults) ? entry.monthlyResults : []; for (const m of monthsArr) { const mKey = m?.month; if (!mKey) continue; bucket.monthsMap.set(mKey, { month: mKey, coPaid: Number(m?.coPaid || 0), coPending: Number(m?.coPending || 0), }); } } const deduped: any[] = []; byLgu.forEach(({ lgu, monthsMap, hasError }) => { const monthlyResults = Array.from(monthsMap.values()).sort((a, b) => a.month.localeCompare(b.month)); const months = monthlyResults.map(m => m.month); deduped.push({ ...lgu, hasError: !!hasError, monthlyResults, months, }); }); return deduped; }, [filteredResults]);
  const regionMappingGrouped = useMemo(() => groupResultsByRegion(normalizedResults, completeLguToRegion), [normalizedResults, completeLguToRegion]);
  const grandTotals = useMemo(() => {
    const totals: { licenseIssued: number; paid: number; geoPay: number; pending: number; total: number; totalCitizensServed: number } = { licenseIssued: 0, paid: 0, geoPay: 0, pending: 0, total: 0, totalCitizensServed: 0 };
    normalizedResults.forEach((lgu: any) => {
      if (!lgu.hasError && Array.isArray(lgu.monthlyResults)) {
        lgu.monthlyResults.forEach((item: any) => {
          const paid = Number(item.coPaid || 0);
          const geo = Number(item.coPaidViaEgov || 0);
          const pending = Number(item.coPending || 0);
          const licenseIssued = Number(item.coLicenseIssued ?? item.coIssued ?? paid ?? 0);
          totals.paid += paid;
          totals.geoPay += geo;
          totals.pending += pending;
          totals.licenseIssued += licenseIssued;
          totals.total += licenseIssued + pending;
        });
      }
      // Sum per-LGU totalCitizensServed once per LGU (skip errored LGUs)
      if (!lgu.hasError) {
        totals.totalCitizensServed += Number(lgu.totalCitizensServed || 0);
      }
    });
    return totals;
  }, [normalizedResults]);

  useEffect(() => { onTableDataChange?.(normalizedResults.length > 0); }, [normalizedResults.length, onTableDataChange]);

  const toggleRegion = (region: string) => setOpenRegions(prev => { const next = new Set(prev); next.has(region) ? next.delete(region) : next.add(region); return next; });
  const toggleAllRegions = () => { const allRegionKeys = Object.keys(regionMappingGrouped); if (openRegions.size === allRegionKeys.length) setOpenRegions(new Set()); else setOpenRegions(new Set(allRegionKeys)); };

  const dateRangeLabel = getDateRangeLabel(dateRange.start, dateRange.end, selectedDateType);
  const elapsedString = useMemo(() => { if (!searchStartedAt || !generatedAt) return null; const diff = Math.max(0, Math.floor((nowTime.getTime() - new Date(generatedAt).getTime()) / 1000)); const hh = Math.floor(diff / 3600); const mm = Math.floor((diff % 3600) / 60); const ss = diff % 60; if (hh > 0) return `${hh}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`; return `${mm}:${String(ss).padStart(2, '0')}`; }, [nowTime, generatedAt, searchStartedAt]);

  const renderTableRows = () => {
    const allRows: React.ReactNode[] = [];
    const sortedRegionKeys = Object.keys(regionMappingGrouped).sort((a, b) => getRegionSortIndex(a) - getRegionSortIndex(b) || a.localeCompare(b));
    sortedRegionKeys.forEach(region => {
      const lguList = regionMappingGrouped[region];
      const isRegionOpen = openRegions.has(region);
        allRows.push(<TableRow key={`${region}-trigger`}><TableCell colSpan={7} className="text-center p-2 cursor-pointer bg-slate-50 hover:bg-slate-100 font-semibold text-blue-600 text-xs" onClick={() => toggleRegion(region)}>{isRegionOpen ? `▲ Hide ${getRegionCode(region) || region} Data` : `▼ View ${getRegionCode(region) || region} Data`}</TableCell></TableRow>);
      if (isRegionOpen) {
        const rows: React.ReactNode[] = [];
        const isDayMode = selectedDateType === "Day";
        let totalRowsForRegion = lguList.reduce((acc, lgu) => acc + (lgu.hasError ? 1 : (isDayMode ? Math.max(1, lgu.monthlyResults?.length || 0) : 1)), 0);
        let isFirstRowOfRegion = true;
        
        lguList.forEach((lgu: any) => {
          if (lgu.hasError) {
            rows.push(<TableRow key={`${region}-${lgu.lgu}-error`} className="bg-red-50/50">{isFirstRowOfRegion && <TableCell className="p-3 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-sm" rowSpan={totalRowsForRegion}>{getRegionCode(region) || region}</TableCell>}<TableCell className="p-3 text-left font-semibold text-slate-800 text-sm">{lgu.lgu}<br/><span className="text-[11px] font-bold text-red-600 mt-0.5 uppercase">{lgu.error || 'NO DATA AVAILABLE'}</span></TableCell><TableCell colSpan={4} className="p-3 text-center text-slate-500">-</TableCell></TableRow>);
            isFirstRowOfRegion = false; return; 
          }
          const rowsForThisLgu = lgu.hasError ? 1 : (isDayMode ? Math.max(1, lgu.monthlyResults?.length || 0) : 1);
          let isFirstRowOfLgu = true;
          const dataToRender = isDayMode ? (lgu.monthlyResults?.length > 0 ? lgu.monthlyResults : [{ coPaid: 0, coPending: 0 }]) : [ (lgu.monthlyResults || []).reduce((acc: any, current: any) => { acc.coPaid += Number(current.coPaid || 0); acc.coPending += Number(current.coPending || 0); return acc; }, { coPaid: 0, coPending: 0 })];
          dataToRender.forEach((item: any, itemIdx: number) => {
            const periodLabel = isDayMode ? (item.month ? `(${formatMonthYear(item.month)})` : '') : (lgu.months?.length > 1 ? `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})` : lgu.months?.length === 1 ? `(${formatMonthYear(lgu.months[0])})` : "");
            
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${item.month || itemIdx}`} className="hover:bg-blue-50/70 transition-colors duration-200 text-sm">
                {isFirstRowOfRegion && <TableCell className="p-3 text-center font-bold text-slate-700 align-middle bg-slate-50 border-r text-sm" rowSpan={totalRowsForRegion}>{getRegionCode(region) || region}</TableCell>}
                <TableCell className="p-3 text-left font-semibold text-slate-800"><div>{lgu.lgu}<span className="ml-1.5 text-xs font-medium text-slate-500">{lgu.province ? `(${lgu.province})` : ""}</span></div><div className="text-[11px] font-semibold text-blue-700 mt-0.5">{periodLabel}</div></TableCell>
                {isFirstRowOfLgu && <TableCell className="p-3 text-right tabular-nums text-slate-800" rowSpan={rowsForThisLgu}>{formatNumber(Number(lgu.totalCitizensServed || 0))}</TableCell>}
                {/* Prefer explicit License Issued field; PAID shows For Issuance + eGOV */}
                {(() => {
                  const paid = Number(item.coPaid || 0);
                  const geo = Number(item.coPaidViaEgov || 0);
                  const pending = Number(item.coPending || 0);
                  const licenseIssued = Number(item.coLicenseIssued ?? item.coIssued ?? paid ?? 0);
                  const paidTotal = paid + geo; // For Issuance + eGOV
                  const total = licenseIssued + pending;
                  return (
                    <>
                      <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(licenseIssued)}</TableCell>
                      <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(paidTotal)}</TableCell>
                      <TableCell className="p-3 text-right tabular-nums text-slate-800">{formatNumber(pending)}</TableCell>
                      <TableCell className="p-3 text-right font-bold tabular-nums text-slate-900 bg-slate-100">{formatNumber(total)}</TableCell>
                    </>
                  );
                })()}
              </TableRow>
            );
            isFirstRowOfRegion = false;
          });
        });
        allRows.push(...rows);
  const regionTotal = { licenseIssued: 0, paid: 0, geoPay: 0, pending: 0, total: 0 };
  lguList.forEach((lgu: any) => {
    if (!lgu.hasError && lgu.monthlyResults && Array.isArray(lgu.monthlyResults)) {
      lgu.monthlyResults.forEach((item: any) => {
        const paid = Number(item.coPaid || 0);
        const geo = Number(item.coPaidViaEgov || 0);
        const pending = Number(item.coPending || 0);
        const licenseIssued = Number(item.coLicenseIssued ?? item.coIssued ?? paid ?? 0);
        regionTotal.paid += paid;
        regionTotal.geoPay += geo;
        regionTotal.pending += pending;
        regionTotal.licenseIssued += licenseIssued;
        regionTotal.total += licenseIssued + pending;
      });
    }
  });

  const regionLicenseIssued = regionTotal.licenseIssued;
  const regionTotalSum = regionLicenseIssued + (regionTotal.pending || 0);
  const regionCitizensServed = lguList.reduce((acc: number, lgu: any) => acc + (lgu.hasError ? 0 : Number(lgu.totalCitizensServed || 0)), 0);

  allRows.push(
    <TableRow key={`${region}-subtotal`} className="font-bold text-slate-900">
      <TableCell className="bg-slate-200 p-3 text-left" colSpan={2}>
        <div className="font-extrabold tracking-wider text-xs">SUB-TOTAL ({getRegionCode(region) || region})</div>
      </TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionCitizensServed)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionLicenseIssued)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotal.paid)}</TableCell>
      <TableCell className="bg-slate-200 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotal.pending)}</TableCell>
      <TableCell className="bg-slate-300 p-3 text-right tabular-nums text-sm">{formatNumber(regionTotalSum)}</TableCell>
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
          <div className="flex items-center gap-4"><img src={dictImage} alt="dict logo" className='w-40 h-auto'/><div className="border-l border-slate-300 pl-4"><h1 className="text-2xl font-bold text-slate-800 tracking-tight">Certificate of Occupancy Report</h1><p className="text-sm font-medium text-slate-500 mt-1">Period Covered: <span className="font-semibold text-slate-700">{dateRangeLabel}</span></p></div></div>
          <div className='text-right'><p className="text-xs font-semibold text-slate-600">Generated On</p><p className="text-sm font-mono text-slate-500">{format(generatedAt, "MMM dd, yyyy, h:mm:ss a")}</p>{elapsedString && <p className="text-xs text-slate-500 mt-1">Elapsed: <span className="font-mono">{elapsedString}</span></p>}</div>
        </div>
        
        <div className="overflow-x-auto rounded-lg border border-slate-300">
          <Table className="w-full border-collapse" containerClassName="max-h-[70vh]">
            {/* ===== START OF DESIGN CHANGE ===== */}
            <TableHeader className="[&>tr]:border-b-0">
              <TableRow>
                  <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-3 text-center align-middle sticky top-0 z-20 text-xs border-b border-r border-slate-300">Region</TableHead>
                  <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-3 text-left align-middle sticky top-0 z-20 text-xs border-b border-r border-slate-300">LGU</TableHead>
                  <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold p-3 text-right align-middle sticky top-0 z-20 text-xs border-b border-r border-slate-300">Total Citizens Served</TableHead>
                  <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold p-3 text-center sticky top-0 z-20 uppercase tracking-wider text-xs border-b border-r border-slate-300">Certificate of Occupancy</TableHead>
                </TableRow>
              <TableRow>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">License Issued</TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">PAID <br /><span className='font-normal'>(For Issuance and License Issued)</span></TableHead>
                <TableHead className="bg-blue-100 text-black p-2 sticky top-[49px] z-20 text-center font-semibold text-[10px] border-b border-r border-slate-300">ONGOING <br /><span className='font-normal'>(For Payment)</span></TableHead>
                <TableHead className="bg-blue-200 text-black p-2 sticky top-[49px] z-20 text-center font-bold uppercase text-[10px] border-b border-slate-300">Total</TableHead>
              </TableRow>
            </TableHeader>
            {/* ===== END OF DESIGN CHANGE ===== */}
            
            <TableBody className="[&>tr:nth-child(even)]:bg-white [&>tr:nth-child(odd)]:bg-slate-50/50">
              {normalizedResults.length > 0 ? (
                <>
                  {renderTableRows()}
                  {Object.keys(regionMappingGrouped).length > 1 && <TableRow><TableCell colSpan={7} className="text-center p-2 cursor-pointer bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-xs" onClick={toggleAllRegions}>{openRegions.size === Object.keys(regionMappingGrouped).length ? 'Collapse All Regions' : 'Expand All Regions'}</TableCell></TableRow>}
                  {(loading || isProgressive) && <TableRow><TableCell colSpan={7} className="p-0"><LoaderTable message={isProgressive ? "Please wait for other regions..." : "Updating data..."} /></TableCell></TableRow>}
                </>
              ) : loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-12"><LoaderTable /></TableCell></TableRow>
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20 bg-white">
                    <div className='flex flex-col items-center justify-center'>
                      <div className="rounded-full bg-slate-100 p-4"><Search className="h-10 w-10 text-slate-400" /></div>
                      <p className='font-bold text-lg text-slate-600 mt-5'>{hasSearched ? 'No Results Found' : 'Generate a Report'}</p>
                      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">{hasSearched ? 'There is no data matching your selected filters...' : 'Use the filters above to generate your certificate of occupancy report.'}</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <tfoot>
              <TableRow className="font-bold border-t-4 border-slate-500">
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-left" colSpan={2}><div className="font-extrabold tracking-wider text-base">GRAND TOTAL</div><div className='text-xs font-medium text-slate-300'>({dateRangeLabel})</div></TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{loading && !grandTotals.totalCitizensServed ? '-' : formatNumber(grandTotals.totalCitizensServed)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{loading && !grandTotals.licenseIssued ? '-' : formatNumber(grandTotals.licenseIssued)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{loading && !(grandTotals.paid + grandTotals.geoPay) ? '-' : formatNumber(grandTotals.paid + grandTotals.geoPay)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base">{loading && !grandTotals.pending ? '-' : formatNumber(grandTotals.pending)}</TableCell>
                <TableCell className="sticky bottom-0 z-20 bg-slate-800 text-white p-3 text-right tabular-nums text-base font-bold">{loading && !(grandTotals.licenseIssued + grandTotals.pending) ? '-' : formatNumber(grandTotals.licenseIssued + grandTotals.pending)}</TableCell>
              </TableRow>
            </tfoot>
          </Table>
        </div>
      </div>
    </div>
  );
});

export default CertificateOfOccupancyReport;
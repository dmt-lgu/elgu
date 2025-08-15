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

  // Control the visual loader separate from the API loading flag
  const [showLoader, setShowLoader] = useState(false);

  // --- Redux State ---
  const persistedBldgTableData = useSelector((state: RootState) => state.buildingPermit.tableData);
  const persistedBldgAppliedFilter = useSelector((state: RootState) => state.buildingPermit.appliedFilter);

  // Stable current filter for comparisons
  const currentFilter = useMemo(
    () => ({ selectedRegions, selectedProvinces, selectedCities, selectedIslands, dateRange }),
    [selectedRegions, selectedProvinces, selectedCities, selectedIslands, dateRange]
  );

  // If current filters match persisted applied filters, prefer persisted data
  const usingPersisted = useMemo(
    () => isSameFilter(currentFilter, persistedBldgAppliedFilter),
    [currentFilter, persistedBldgAppliedFilter]
  );

  // Keep memo pure: decide data source based on usingPersisted
  const effectiveApiData = useMemo(() => {
    return usingPersisted ? persistedBldgTableData : apiData;
  }, [usingPersisted, persistedBldgTableData, apiData]);

  // Toggle loader based on whether we're fetching fresh data or using persisted
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

  // Hide loader when data arrives/updates
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
  const dateRangeLabel = getDateRangeLabel(normalizedDateRange.start, normalizedDateRange.end);
  const regionMappingGrouped = useMemo(() => groupResultsByRegion(filteredResults, lguToRegion), [filteredResults, lguToRegion]);

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

  const renderTableBody = () => {
    if (loading || showLoader) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-6 border"><LoaderTable /></TableCell>
        </TableRow>
      );
    }
    if (filteredResults.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={4} className="text-center py-6 border">
            <span className='font-semibold text-base text-gray-500'>
              {hasSearched ? 'No results found. Please try again.' : 'Please select filters to view a report.'}
            </span>
          </TableCell>
        </TableRow>
      );
    }

    const rows: React.ReactNode[] = [];
    Object.entries(regionMappingGrouped).forEach(([region, lguList]) => {
      lguList.forEach((lgu: any, idx: number) => {
        const isDayMode = selectedDates?.includes("Day");
        if (!isDayMode && lgu.sum) { // Month/Year summary view
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}`} className="hover:bg-blue-50/50">
              {idx === 0 && <TableCell rowSpan={lguList.length} className="border px-2 py-1 text-center font-medium align-middle">{getRegionCode(region)}</TableCell>}
              <TableCell className="border px-2 py-1 text-center">
                <span className="font-medium">{lgu.lgu}</span>
                <span className="ml-1 text-[10px] font-normal text-gray-500">
                  {lgu.province ? `(${lgu.province})` : ""}
                </span>
                <br />
                <span className="text-[10px] font-normal text-blue-600">
                  {lgu.months?.length > 0
                    ? lgu.months.length === 1
                      ? `(${formatMonthYear(lgu.months[0])})`
                      : `(${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`
                    : ""}
                </span>
              </TableCell>
              <TableCell className="border px-2 py-1 text-center font-medium">{lgu.sum.buildingPaid || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center font-medium">{lgu.sum.buildingPending || 0}</TableCell>
            </TableRow>
          );
        } else { // Day view
          (lgu.monthlyResults || []).forEach((month: any, mIdx: number) => {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${month.month}-${mIdx}`} className="hover:bg-blue-50/50">
                {idx === 0 && mIdx === 0 && <TableCell rowSpan={lguList.reduce((acc, l) => acc + (l.monthlyResults?.length || 0), 0)} className="border px-2 py-1 text-center font-medium align-middle">{getRegionCode(region)}</TableCell>}
                <TableCell className="border px-2 py-1 text-center">
                  <span className="font-medium">{lgu.lgu}</span>
                  <span className="ml-1 text-[10px] font-normal text-gray-500">
                    {lgu.province ? `(${lgu.province})` : ""}
                  </span>
                  <br />
                  <span className="text-[10px] font-normal text-blue-600">({formatMonthYear(month.month)})</span>
                </TableCell>
                <TableCell className="border px-2 py-1 text-center font-medium">{month.buildingPaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center font-medium">{month.buildingPending || 0}</TableCell>
              </TableRow>
            );
          });
        }
      });
    });
    return rows;
  };

  return (
    <div ref={ref} className="bg-white p-4 rounded-xl border border-gray-200 shadow-lg">
      {(hasSearched && (showLoader || loading)) && <Loading />}
      <div>
        <div className='flex justify-between items-center mb-4 pb-4 border-b border-gray-200'>
          <img src={dictImage} alt="dict logo" className='w-52 h-auto' />
          <div className='text-right'>
            <h2 className="text-xl font-bold text-gray-800">Building Permit</h2>
            {dateRangeLabel && <p className="text-base text-gray-600">{dateRangeLabel}</p>}
            <p className="text-xs text-gray-400 mt-1">Generated on: {format(generatedAt, "MMM dd, yyyy, h:mm:ss a")}</p>
          </div>
        </div>
        <Table className="w-full border-collapse text-xs">
          <TableHeader>
            <TableRow>
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-4 py-3 text-center uppercase">Region</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-4 py-3 text-center uppercase">LGU</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-4 py-3 text-center uppercase">Paid</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black font-bold border px-4 py-3 text-center uppercase">Pending</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="[&>tr:nth-child(odd)]:bg-gray-100">
            {renderTableBody()}
            <TableRow className="!bg-[#3a4554] font-bold text-white border-t-4 border-gray-400">
              <TableCell className="border px-4 py-2" colSpan={2}>
                GRAND TOTAL
                <br />
                <span className='text-[10px] font-normal text-gray-300'>
                  ({dateRangeLabel})
                </span>
              </TableCell>
              <TableCell className="border px-4 py-2 text-center">{loading || showLoader ? 0 : grandTotals.paid}</TableCell>
              <TableCell className="border px-4 py-2 text-center">{loading || showLoader ? 0 : grandTotals.pending}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default BuildingPermitReport;
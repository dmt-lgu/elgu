import React, { forwardRef, useEffect, useRef, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parse, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import Swal from "sweetalert2";
import { getRegionCode } from "../utils/mockData";
import dictImage from "./../../../../assets/logo/dict.png"
import '../utils/loader.css'; // Ensure loader styles are global
import { tableLoaderHTML } from '../utils/loader';

interface TableReportProps {
  selectedRegions: string[];
  dateRange: { start: Date | null; end: Date | null };
  apiData: any;
  loading: boolean;
  lguToRegion: Record<string, string>;
  selectedProvinces?: string[];
  selectedCities?: string[];
  selectedDates?: string[];
  lguProvinceFilter?: { lgu: string; province: string };
}

// Helper: Format month string to "Month YYYY"
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

// Helper: Group results by region
function groupResultsByRegion(results: any[], lguToRegion: Record<string, string>) {
  const regionGroups: Record<string, any[]> = {};
  results.forEach(lgu => {
    const region = lguToRegion[lgu.lgu] || lgu.region || "Unknown";
    if (!regionGroups[region]) regionGroups[region] = [];
    regionGroups[region].push(lgu);
  });
  return regionGroups;
}

// Helper: Check if date range is a full month range
function isFullMonthRange(start: Date, end: Date) {
  return (
    isSameDay(start, startOfMonth(start)) &&
    isSameDay(end, endOfMonth(end))
  );
}

// Helper: Check if a month is in the selected range
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

// Helper: Extract province from lgu.province or from lgu.lgu string
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

// Helper: Extract city/municipality from lgu.lgu or lgu.city
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

// Merge LGU+province and sum all months in range (for Month/Year selection)
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
    // Filter months in range
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

  // Clean up months (unique)
  Object.values(merged).forEach((item: any) => {
    item.months = Array.from(new Set(item.months));
  });

  return Object.values(merged);
}

// Loader SVG as HTML string for Swal


const TableReport = forwardRef<HTMLDivElement, TableReportProps>(({
  selectedRegions,
  dateRange,
  apiData,
  loading,
  lguToRegion,
  selectedProvinces = [],
  selectedCities = [],
  selectedDates = [],
}, ref) => {
  const filteredResults = useMemo(() => {
    let filtered = Array.isArray(apiData?.results) ? apiData.results : [];

    if (selectedRegions.length > 0) {
      filtered = filtered.filter((lgu: any) =>
        selectedRegions.includes(lgu.region)
        || selectedRegions.includes(lgu.regionCode)
        || selectedRegions.includes(lguToRegion[lgu.lgu])
      );
    }

    if (selectedProvinces.length > 0) {
      filtered = filtered.filter((lgu: any) => {
        const province = extractProvince(lgu);
        return (
          province &&
          selectedProvinces.some(
            prov =>
              prov.trim().toLowerCase() === province.trim().toLowerCase()
          )
        );
      });
    }

    if (selectedCities.length > 0) {
      filtered = filtered.filter((lgu: any) => {
        const city = extractCity(lgu);
        return (
          city &&
          selectedCities.some(
            c =>
              c.trim().toLowerCase() === city.trim().toLowerCase()
          )
        );
      });
    }

    // If "Day" is selected, DO NOT merge, just filter by date range
    if (selectedDates && selectedDates.includes("Day")) {
      return filtered.map((lgu: any) => ({
        ...lgu,
        monthlyResults: lgu.monthlyResults.filter((month: any) =>
          isMonthInRange(month.month, dateRange)
        ),
        months: lgu.monthlyResults
          .filter((month: any) => isMonthInRange(month.month, dateRange))
          .map((month: any) => month.month),
        sum: {}, // Not used in this mode
      }));
    }

    // Else, merge and sum duplicates here!
    return mergeLguProvinceSumAllMonths(filtered, dateRange);
  }, [
    apiData?.results,
    selectedRegions.join("-"),
    selectedProvinces.join("-"),
    selectedCities.join("-"),
    JSON.stringify(lguToRegion),
    dateRange?.start?.toISOString?.() ?? "",
    dateRange?.end?.toISOString?.() ?? "",
    selectedDates?.join("-") ?? "",
  ]);

  // Format date range label
  let dateRangeLabel = "";
  if (dateRange?.start && dateRange?.end) {
    if (isFullMonthRange(dateRange.start, dateRange.end)) {
      dateRangeLabel = `${format(dateRange.start, "MMMM yyyy")} - ${format(dateRange.end, "MMMM yyyy")}`;
    } else {
      dateRangeLabel = `${format(dateRange.start, "MMM dd, yyyy")} - ${format(dateRange.end, "MMM dd, yyyy")}`;
    }
  } else if (dateRange?.start) {
    dateRangeLabel = `${format(dateRange.start, "MMM dd, yyyy")}`;
  } else if (dateRange?.end) {
    dateRangeLabel = `${format(dateRange.end, "MMM dd, yyyy")}`;
  }

  const grandTotals = useMemo(() => filteredResults.reduce(
    (totals: any, lgu: any) => {
      if (lgu.sum && Object.keys(lgu.sum).length > 0) {
        const sum = lgu.sum;
        totals.newPaid += sum.newPaid || 0;
        totals.newGeoPay += sum.newPaidViaEgov || 0;
        totals.newPending += sum.newPending || 0;
        totals.renewalPaid += sum.renewPaid || 0;
        totals.renewalGeoPay += sum.renewPaidViaEgov || 0;
        totals.renewalPending += sum.renewPending || 0;
        totals.malePaid += sum.malePaid || 0;
        totals.malePending += sum.malePending || 0;
        totals.femalePaid += sum.femalePaid || 0;
        totals.femalePending += sum.femalePending || 0;
      } else {
        // Day mode: sum per monthlyResults
        lgu.monthlyResults.forEach((month: any) => {
          totals.newPaid += month.newPaid || 0;
          totals.newGeoPay += month.newPaidViaEgov || 0;
          totals.newPending += month.newPending || 0;
          totals.renewalPaid += month.renewPaid || 0;
          totals.renewalGeoPay += month.renewPaidViaEgov || 0;
          totals.renewalPending += month.renewPending || 0;
          totals.malePaid += month.malePaid || 0;
          totals.malePending += month.malePending || 0;
          totals.femalePaid += month.femalePaid || 0;
          totals.femalePending += month.femalePending || 0;
        });
      }
      return totals;
    },
    {
      newPaid: 0,
      newGeoPay: 0,
      newPending: 0,
      renewalPaid: 0,
      renewalGeoPay: 0,
      renewalPending: 0,
      malePaid: 0,
      malePending: 0,
      femalePaid: 0,
      femalePending: 0,
    }
  ), [filteredResults, dateRange?.start?.toISOString?.() ?? "", dateRange?.end?.toISOString?.() ?? ""]);

  const regionGroups = useMemo(() => groupResultsByRegion(filteredResults, lguToRegion), [filteredResults, JSON.stringify(lguToRegion)]);
  const tableRowsReport = useMemo(() => {
    const rows: React.ReactNode[] = [];
    Object.entries(regionGroups).forEach(([region, lguList]) => {
      let regionCellRendered = false;
      lguList.forEach((lgu: any) => {
        // If sum exists, render one row (Month/Year mode)
        if (lgu.sum && Object.keys(lgu.sum).length > 0) {
          const sum = lgu.sum;
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}`}>
              {!regionCellRendered && (
                <TableCell
                  className="border px-2 py-1 text-center font-bold align-middle border-b-2"
                  rowSpan={lguList.length}
                >
                  {getRegionCode(region)}
                </TableCell>
              )}
              <TableCell className="border px-2 py-1 text-start font-bold">
                {lgu.lgu}
                <span className="text-xs font-normal text-gray-500">
                  {lgu.province ? `(${lgu.province})` : ""}
                </span>
                <br />
                <span className="text-[10px] font-normal text-blue-700">
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
              <TableCell className="border px-2 py-1 text-center">{(sum.newPaid || 0) + (sum.newPaidViaEgov || 0) + (sum.newPending || 0)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.renewPaid || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.renewPaidViaEgov || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.renewPending || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(sum.renewPaid || 0) + (sum.renewPaidViaEgov || 0) + (sum.renewPending || 0)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.malePaid || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.malePending || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(sum.malePaid || 0) + (sum.malePending || 0)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.femalePaid || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{sum.femalePending || 0}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{(sum.femalePaid || 0) + (sum.femalePending || 0)}</TableCell>
            </TableRow>
          );
          if (!regionCellRendered) regionCellRendered = true;
        } else {
          // Day mode: render per monthlyResults
          lgu.monthlyResults.forEach((month: any, idx: number) => {
            rows.push(
              <TableRow key={`${region}-${lgu.lgu}-${month.month}-${idx}`}>
                {!regionCellRendered && (
                  <TableCell
                    className="border px-2 py-1 text-center font-bold align-middle border-b-2"
                    rowSpan={lguList.reduce((sum, l) => sum + l.monthlyResults.length, 0)}
                  >
                    {getRegionCode(region)}
                  </TableCell>
                )}
                <TableCell className="border px-2 py-1 text-start font-bold">
                  {lgu.lgu}
                  <span className="text-xs font-normal text-gray-500">
                    {lgu.province ? `(${lgu.province})` : ""}
                  </span>
                  <br />
                  <span className="text-[10px] font-normal text-blue-800">
                    ({formatMonthYear(month.month)})
                  </span>
                </TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.newPaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.newPaidViaEgov || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.newPending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{(month.newPaid || 0) + (month.newPaidViaEgov || 0) + (month.newPending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.renewPaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.renewPaidViaEgov || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.renewPending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{(month.renewPaid || 0) + (month.renewPaidViaEgov || 0) + (month.renewPending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.malePaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.malePending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{(month.malePaid || 0) + (month.malePending || 0)}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.femalePaid || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{month.femalePending || 0}</TableCell>
                <TableCell className="border px-2 py-1 text-center">{(month.femalePaid || 0) + (month.femalePending || 0)}</TableCell>
              </TableRow>
            );
            if (!regionCellRendered) regionCellRendered = true;
          });
        }
      });
    });
    return rows;
  }, [regionGroups]);

  // Swal no results effect only (loading modal removed)
  const noResultsAlertShown = useRef<boolean>(false);

  // Show TableLoader inside Swal when loading
  useEffect(() => {
  if (loading) {
    Swal.fire({
      html: tableLoaderHTML,
      showConfirmButton: false,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {},
      // No title property here!
    });
    noResultsAlertShown.current = false;
  } else {
    Swal.close();
  }
  // eslint-disable-next-line
}, [loading]);

  useEffect(() => {
    if (
      !loading &&
      filteredResults.length === 0 &&
      (selectedRegions.length > 0 || (dateRange?.start && dateRange?.end))
    ) {
      if (!noResultsAlertShown.current) {
        Swal.fire({
          title: "Location not found!",
          text: "Please try again...",
          icon: "warning",
          confirmButtonText: "OK",
          confirmButtonColor: "#007bff",
        });
        noResultsAlertShown.current = true;
      }
    } else if (!loading && filteredResults.length > 0) {
      noResultsAlertShown.current = false;
    }
  }, [
    loading,
    filteredResults.length,
    selectedRegions.join(","),
    dateRange?.start?.toISOString?.() ?? "",
    dateRange?.end?.toISOString?.() ?? ""
  ]);

  return (
    <div ref={ref} className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
      <div className="overflow-auto" ref={ref}>
        <div className='flex justify-center mb-4 p-5'>
          <img src={dictImage} alt="dict logo" className='w-96 h-full'/>
        </div>
        
        <Table className="w-full border-collapse text-[10px]">
          <TableHeader>
            <TableRow>
              <TableHead
                colSpan={16}
                className="bg-[#9ec6f7] text-black text-center font-bold text-base border sticky top-0"
              >
                {dateRangeLabel || "Report"}
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center align-middle sticky top-[40px]">Region</TableHead>
              <TableHead rowSpan={2} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center align-middle sticky top-[40px]">LGU</TableHead>
              <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center sticky top-[40px]">NEW</TableHead>
              <TableHead colSpan={4} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center sticky top-[40px]">RENEWAL</TableHead>
              <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center sticky top-[40px]">MALE</TableHead>
              <TableHead colSpan={3} className="bg-[#9ec6f7] text-black font-bold border px-2 py-1 text-center sticky top-[40px]">FEMALE</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px] text-center">PAID <br />
                <span className='text-[10px]'>(Per OR Paid with eGOVPay)</span>
              </TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px] text-center">PAID <br />
                <span className='text-[10px]'>(Per OR Paid with eGOVPay)</span>
              </TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#9ec6f7] text-black border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
            </TableRow>
          </TableHeader>
         
          <TableBody className="[&>tr:nth-child(even)]:bg-zinc-200">
            {/* No TableLoader here, it's now inside Swal */}
            {loading ? null : (
              filteredResults.length === 0 ? (
                (selectedRegions.length > 0 || (dateRange?.start && dateRange?.end)) ? (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-4 border">
                      <span className='font-bold text-lg text-muted-foreground'>
                        No results found, Please try again!
                      </span>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={16} className="text-center py-4 border">
                      <span className='font-bold text-sm text-muted-foreground'>
                        Please select regions and date range you want to view.
                      </span>
                    </TableCell>
                  </TableRow>
                )
              ) : (
                tableRowsReport
              )
            )}
            <TableRow className="!bg-[#3a4554] hover:!bg-[#3a4554] font-bold text-white border">
              <TableCell className="border px-2 py-1" colSpan={2}>
                GRAND TOTAL FOR <br />
                <span className='text-[8px] font-normal text-gray-300'>
                  ({dateRangeLabel})
                </span>
              </TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.newPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.newGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.newPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : (grandTotals.newPaid + grandTotals.newGeoPay + grandTotals.newPending)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.renewalPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.renewalGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.renewalPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : (grandTotals.renewalPaid + grandTotals.renewalGeoPay + grandTotals.renewalPending)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.malePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.malePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : (grandTotals.malePaid + grandTotals.malePending)}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.femalePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : grandTotals.femalePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{loading ? 0 : (grandTotals.femalePaid + grandTotals.femalePending)}</TableCell>
            </TableRow>
          </TableBody>
          
        </Table>
        
      </div>
    </div>
  );
});

export default TableReport;
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

interface TableReportProps {
  selectedRegions: string[];
  dateRange: { start: Date | null; end: Date | null };
  apiData: any;
  loading: boolean;
  lguToRegion: Record<string, string>;
  selectedProvinces?: string[];
  selectedCities?: string[];
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
  // monthStr is usually "YYYY-MM" or "YYYY-MM-DD"
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
    // Try to extract after the last comma
    const parts = lgu.lgu.split(",");
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
  }
  return undefined;
}

// Helper: Extract city/municipality from lgu.lgu or lgu.city
function extractCity(lgu: any): string | undefined {
  // If city property exists, use it
  if (lgu.city && typeof lgu.city === "string" && lgu.city.trim() !== "") {
    return lgu.city.trim();
  }
  // Try to extract from lgu.lgu if format is "City, Province" or "City"
  if (lgu.lgu && typeof lgu.lgu === "string") {
    const parts = lgu.lgu.split(",");
    if (parts.length > 1) {
      return parts[0].trim();
    }
    return lgu.lgu.trim();
  }
  return undefined;
}

// Helper: Merge duplicate LGU+province entries by summing their monthlyResults
// function mergeDuplicateLguProvince(results: any[]) {
//   const mergedMap: Record<string, any> = {};

//   results.forEach(lgu => {
//     const province = extractProvince(lgu) || "";
//     const lguKey = `${lgu.lgu}||${province}`; // Unique key for LGU+province

//     if (!mergedMap[lguKey]) {
//       // Deep clone to avoid mutating original
//       mergedMap[lguKey] = {
//         ...lgu,
//         monthlyResults: [],
//       };
//     }
//     // Merge monthlyResults by month
//     lgu.monthlyResults.forEach((month: any) => {
//       const idx = mergedMap[lguKey].monthlyResults.findIndex((m: any) => m.month === month.month);
//       if (idx > -1) {
//         // Sum all numeric fields
//         Object.keys(month).forEach(key => {
//           if (typeof month[key] === "number") {
//             mergedMap[lguKey].monthlyResults[idx][key] =
//               (mergedMap[lguKey].monthlyResults[idx][key] || 0) + month[key];
//           }
//         });
//       } else {
//         mergedMap[lguKey].monthlyResults.push({ ...month });
//       }
//     });
//   });

//   // Return as array
//   return Object.values(mergedMap);
// }

const TableReport = forwardRef<HTMLDivElement, TableReportProps>(({
  selectedRegions,
  dateRange,
  apiData,
  loading,
  lguToRegion,
  selectedProvinces = [],
  selectedCities = [],
}, ref) => {
  // Always work with apiData?.results (array)
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

    // Merge duplicates here!
    return mergeDuplicateLguProvince(filtered);
  }, [
    apiData?.results,
    selectedRegions.join(","),
    selectedProvinces.join(","),
    selectedCities.join(","),
    JSON.stringify(lguToRegion),
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

  // Calculate grand totals (only for filtered months)
  const grandTotals = useMemo(() => filteredResults.reduce(
    (totals: any, lgu: any) => {
      const filteredMonthlyResults = lgu.monthlyResults.filter((month: any) =>
        isMonthInRange(month.month, dateRange || { start: null, end: null })
      );
      filteredMonthlyResults.forEach((month: any) => {
        totals.newPaid += month.newPaid;
        totals.newGeoPay += month.newPaidViaEgov;
        totals.newPending += month.newPending;
        totals.renewalPaid += month.renewPaid;
        totals.renewalGeoPay += month.renewPaidViaEgov;
        totals.renewalPending += month.renewPending;
        totals.malePaid += month.malePaid;
        totals.malePending += month.malePending;
        totals.femalePaid += month.femalePaid;
        totals.femalePending += month.femalePending;
      });
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

  // Group results by region for rowSpan logic
  const regionGroups = useMemo(() => groupResultsByRegion(filteredResults, lguToRegion), [filteredResults, JSON.stringify(lguToRegion)]);
  const tableRows = useMemo(() => {
    const rows: React.ReactNode[] = [];
    Object.entries(regionGroups).forEach(([region, lguList]) => {
      const regionRowCount = lguList.reduce(
        (sum, lgu) =>
          sum +
          lgu.monthlyResults.filter((month: any) =>
            isMonthInRange(month.month, dateRange || { start: null, end: null })
          ).length,
        0
      );
      let regionCellRendered = false;
      lguList.forEach((lgu: any) => {
        const filteredMonthlyResults = lgu.monthlyResults.filter((month: any) =>
          isMonthInRange(month.month, dateRange || { start: null, end: null })

        
        );
        filteredMonthlyResults.forEach((month: any) => {
          rows.push(
            <TableRow key={`${region}-${lgu.lgu}-${month.month}`}>
              {!regionCellRendered && (
                <TableCell
                  className="border px-2 py-1 text-center font-bold align-middle border-b-2"
                  rowSpan={regionRowCount}
                >
                  {getRegionCode(region)}
                </TableCell>
              )}
              <TableCell className="border px-2 py-1 text-start font-bold">
                {lgu.lgu}
                <span className="text-xs font-normal text-gray-500">
                  {lgu.province ? `(${lgu.province})` : ""}
                </span> <br />
                <span className="text-[10px] font-normal">
                  ({formatMonthYear(month.month)})
                </span>
              </TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.newPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.newPaidViaEgov}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.newPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.newPaid + month.newPaidViaEgov + month.newPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.renewPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.renewPaidViaEgov}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.renewPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.renewPaid + month.renewPaidViaEgov + month.renewPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.malePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.malePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.malePaid + month.malePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.femalePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.femalePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{month.femalePaid + month.femalePending}</TableCell>
            </TableRow>
          );
          if (!regionCellRendered) regionCellRendered = true;
        });
      });
    });
    return rows;
  }, [regionGroups, dateRange?.start?.toISOString?.() ?? "", dateRange?.end?.toISOString?.() ?? ""]);

  // Swal loading and no results effect
  const noResultsAlertShown = useRef<boolean>(false);

  useEffect(() => {
    if (loading) {
      Swal.fire({
        title: 'Please wait...',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      noResultsAlertShown.current = false;
    } else {
      Swal.close();
    }
  }, [loading]);
  

  useEffect(() => {
    if (
      !loading &&
      filteredResults.length === 0 &&
      (selectedRegions.length > 0 || (dateRange?.start && dateRange?.end))
    ) {
      if (!noResultsAlertShown.current) {
        Swal.fire({
          title: "No results found!",
          text: "Please try again.",
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

  console.log("Table filtered results:", filteredResults);

  function mergeDuplicateLguProvince(results: any[]) {
  const mergedMap: Record<string, any> = {};

  results.forEach(lgu => {
    const province = extractProvince(lgu) || "";
    const lguKey = `${lgu.lgu}||${province}`; // Unique key for LGU+province

    if (!mergedMap[lguKey]) {
      // Deep clone to avoid mutating original
      mergedMap[lguKey] = {
        ...lgu,
        monthlyResults: [],
      };
    }
    // Merge monthlyResults by month
    lgu.monthlyResults.forEach((month: any) => {
      const idx = mergedMap[lguKey].monthlyResults.findIndex((m: any) => m.month === month.month);
      if (idx > -1) {
        // Sum all numeric fields
        Object.keys(month).forEach(key => {
          if (typeof month[key] === "number") {
            mergedMap[lguKey].monthlyResults[idx][key] =
              (mergedMap[lguKey].monthlyResults[idx][key] || 0) + month[key];
          }
        });
      } else {
        mergedMap[lguKey].monthlyResults.push({ ...month });
      }
    });
  });

  // Return as array
  return Object.values(mergedMap);
}

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
                className="bg-[#cbd5e1] text-black text-center font-bold text-base border sticky top-0"
              >
                {dateRangeLabel || "Report"}
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead rowSpan={2} className="bg-[#cbd5e1] text-black font-bold border px-2 py-1 text-center align-middle sticky top-[40px]">Region</TableHead>
              <TableHead rowSpan={2} className="bg-[#cbd5e1] text-black font-bold border px-2 py-1 text-center align-middle sticky top-[40px]">LGU</TableHead>
              <TableHead colSpan={4} className="bg-[#cbd5e1] text-black font-bold border px-2 py-1 text-center sticky top-[40px]">NEW</TableHead>
              <TableHead colSpan={4} className="bg-[#cbd5e1] text-black font-bold border px-2 py-1 text-center sticky top-[40px]">RENEWAL</TableHead>
              <TableHead colSpan={3} className="bg-[#cbd5e1] text-black font-bold border px-2 py-1 text-center sticky top-[40px]">MALE</TableHead>
              <TableHead colSpan={3} className="bg-[#cbd5e1] text-black font-bold border px-2 py-1 text-center sticky top-[40px]">FEMALE</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px] text-center">PAID <br />
                <span className='text-[10px]'>(Per OR Paid with eGOVPay)</span>
              </TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px] text-center">PAID <br />
                <span className='text-[10px]'>(Per OR Paid with eGOVPay)</span>
              </TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-[#cbd5e1] text-black border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER LGU</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredResults.length === 0 ? (
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
                      Please select the category, regions and date range you want to view.
                    </span>
                  </TableCell>
                </TableRow>
              )
            ) : (
              tableRows
            )}
            <TableRow className="bg-[#4b5563] hover:bg-[#4b5563] font-bold text-white border">
              <TableCell className="border px-2 py-1" colSpan={2}>
                GRAND TOTAL FOR <br />
                <span className='text-[8px] font-normal text-gray-300'>
                  ({dateRangeLabel})
                </span>
              </TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.newPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.newGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.newPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.newPaid + grandTotals.newGeoPay + grandTotals.newPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.renewalPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.renewalGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.renewalPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.renewalPaid + grandTotals.renewalGeoPay + grandTotals.renewalPending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.malePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.malePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.malePaid + grandTotals.malePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.femalePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.femalePending}</TableCell>
              <TableCell className="border px-2 py-1 text-center">{grandTotals.femalePaid + grandTotals.femalePending}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default TableReport;
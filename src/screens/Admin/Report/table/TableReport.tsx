import { forwardRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parse } from "date-fns";
import TableLoader from '../utils/TableLoder';
// Import the region key to code utility
import { getRegionCode } from "../utils/mockData";

interface TableReportProps {
  selectedRegions: string[];
  dateRange?: { start: Date | null; end: Date | null };
  apiData?: any;
  loading?: boolean;
  lguToRegion: Record<string, string>;
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

const TableReport = forwardRef<HTMLDivElement, TableReportProps>(
  ({ selectedRegions, dateRange, apiData, loading, lguToRegion }, ref) => {
    // Format date range label
    let dateRangeLabel = "";
    if (dateRange?.start && dateRange?.end) {
      dateRangeLabel = `${format(dateRange.start, "MMM dd, yyyy")} - ${format(dateRange.end, "MMM dd, yyyy")}`;
    } else if (dateRange?.start) {
      dateRangeLabel = `${format(dateRange.start, "MMM dd, yyyy")}`;
    } else if (dateRange?.end) {
      dateRangeLabel = `${format(dateRange.end, "MMM dd, yyyy")}`;
    }

    const results = apiData?.results || [];

    // Calculate grand totals
    const grandTotals = results.reduce(
      (totals: any, lgu: any) => {
        lgu.monthlyResults.forEach((month: any) => {
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
    );

    // Group results by region for rowSpan logic
    const regionGroups = groupResultsByRegion(results, lguToRegion);

    // Prepare rows with region rowSpan
    const tableRows: React.ReactNode[] = [];
    Object.entries(regionGroups).forEach(([region, lguList]) => {
      // Count total rows for this region (sum of all monthlyResults for all LGUs in this region)
      const regionRowCount = lguList.reduce((sum, lgu) => sum + lgu.monthlyResults.length, 0);
      let regionCellRendered = false;
      lguList.forEach((lgu: any) => {
        lgu.monthlyResults.forEach((month: any) => {
          tableRows.push(
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
                {lgu.lgu}{" "} <br />
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

    return (
      <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
        <div className="overflow-auto" ref={ref}>
          <Table className="w-full border-collapse text-[10px]">
            <TableHeader>
              <TableRow>
                <TableHead
                  colSpan={16}
                  className="bg-muted text-center font-bold text-base border sticky top-0"
                >
                  {dateRangeLabel || "Report"}
                </TableHead>
              </TableRow>
              <TableRow>
                <TableHead rowSpan={2} className="bg-muted font-bold border px-2 py-1 text-center align-middle sticky top-[40px]">Region</TableHead>
                <TableHead rowSpan={2} className="bg-muted font-bold border px-2 py-1 text-center align-middle sticky top-[40px]">LGU</TableHead>
                <TableHead colSpan={4} className="bg-muted font-bold border px-2 py-1 text-center sticky top-[40px]">NEW</TableHead>
                <TableHead colSpan={4} className="bg-muted font-bold border px-2 py-1 text-center sticky top-[40px]">RENEWAL</TableHead>
                <TableHead colSpan={3} className="bg-muted font-bold border px-2 py-1 text-center sticky top-[40px]">MALE</TableHead>
                <TableHead colSpan={3} className="bg-muted font-bold border px-2 py-1 text-center sticky top-[40px]">FEMALE</TableHead>
              </TableRow>
              <TableRow>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">PAID <br />
                  <span className='text-[10px]'>(Per OR Paid with eGOVPay)</span>
                </TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">GRANDTOTAL PER REGION</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">PAID <br />
                  <span className='text-[10px]'>(Per OR Paid with eGOVPay)</span>
                </TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">GRANDTOTAL PER REGION</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">GRANDTOTAL PER REGION</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
                <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">GRANDTOTAL PER REGION</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={16} className="text-center py-4 border">
                    <TableLoader />
                  </TableCell>
                </TableRow>
              ) : results.length === 0 ? (
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
  }
);

export default TableReport;
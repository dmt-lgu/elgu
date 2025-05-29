import { forwardRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { regions } from "../utils/mockData";
import { RegionData } from "../utils/types";
import { format } from "date-fns";

// Helper to get current month and year in "Month YYYY" format
function getCurrentMonthYear() {
  const now = new Date();
  return now.toLocaleString("default", { month: "long", year: "numeric" });
}

const monthlyData: Record<string, RegionData[]> = {};

regions.forEach(region => {
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setMonth(i);
    const key = `${date.getFullYear()}-${String(i + 1).padStart(2, "0")}`;
    if (!monthlyData[key]) monthlyData[key] = [];
    monthlyData[key].push({
      region,
      newPaid: Math.floor(Math.random() * 1000),
      newGeoPay: Math.floor(Math.random() * 10),
      newPending: Math.floor(Math.random() * 200),
      newTotal: Math.floor(Math.random() * 1200),
      renewalPaid: Math.floor(Math.random() * 1000),
      renewalGeoPay: Math.floor(Math.random() * 10),
      renewalPending: Math.floor(Math.random() * 200),
      renewalTotal: Math.floor(Math.random() * 1200),
      malePaid: Math.floor(Math.random() * 1000),
      malePending: Math.floor(Math.random() * 200),
      maleTotal: Math.floor(Math.random() * 1200),
      femalePaid: Math.floor(Math.random() * 1000),
      femalePending: Math.floor(Math.random() * 200),
      femaleTotal: Math.floor(Math.random() * 1200),
    });
  }
});

const now = new Date();
const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

interface TableReportProps {
  selectedRegions: string[];
  selectedModules?: string[];
  dateRange?: { start: Date | null; end: Date | null };
}

const TableReport = forwardRef<HTMLDivElement, TableReportProps>(
  ({ selectedRegions, dateRange }, ref) => {
  // Use current month data
  const regionData = monthlyData[currentMonthKey] || [];

  let filteredData = regionData;
  if (selectedRegions.length > 0) {
    filteredData = filteredData.filter(data => selectedRegions.includes(data.region));
  }

  let dateRangeLabel = getCurrentMonthYear();
  if (dateRange?.start && dateRange?.end) {
    dateRangeLabel = `${format(dateRange.start, "MMM dd, yyyy")} - ${format(dateRange.end, "MMM dd, yyyy")}`;
  } else if (dateRange?.start) {
    dateRangeLabel = `${format(dateRange.start, "MMM dd, yyyy")}`;
  } else if (dateRange?.end) {
    dateRangeLabel = `${format(dateRange.end, "MMM dd, yyyy")}`;
  }

  // Calculate grand totals
  const grandTotals = filteredData.reduce(
    (totals, data) => {
      totals.newPaid += data.newPaid;
      totals.newGeoPay += data.newGeoPay;
      totals.newPending += data.newPending;
      totals.renewalPaid += data.renewalPaid;
      totals.renewalGeoPay += data.renewalGeoPay;
      totals.renewalPending += data.renewalPending;
      totals.malePaid += data.malePaid;
      totals.malePending += data.malePending;
      totals.femalePaid += data.femalePaid;
      totals.femalePending += data.femalePending;
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

  return (
    <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
      <div className="flex items-center justify-start mb-4">
        <h2 className="text-sm font-bold uppercase mb-4">Report Table</h2>
      </div>
      <div className="overflow-x-auto" ref={ref}>
        <Table className="w-full border-collapse text-xs">
          <TableHeader>
            <TableRow>
              <TableHead
                colSpan={15}
                className="bg-muted text-center font-bold text-base border sticky top-0"
              >
                {dateRangeLabel}
              </TableHead>
            </TableRow>
            <TableRow>
              <TableHead
                rowSpan={2}
                className="bg-muted font-bold border px-2 py-1 text-center align-middle sticky top-[40px]"
              >
                REGIONS
              </TableHead>
              <TableHead colSpan={4} className="bg-muted font-bold border px-2 py-1 text-center sticky top-[40px]">NEW</TableHead>
              <TableHead colSpan={4} className="bg-muted font-bold border px-2 py-1 text-center sticky top-[40px]">RENEWAL</TableHead>
              <TableHead colSpan={3} className="bg-muted font-bold border px-2 py-1 text-center sticky top-[40px]">MALE</TableHead>
              <TableHead colSpan={3} className="bg-muted font-bold border px-2 py-1 text-center sticky top-[40px]">FEMALE</TableHead>
            </TableRow>
            <TableRow>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">PAID <br />(Per OR Paid with eGOVPay)</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER REGION</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">PAID <br />(Per OR Paid with eGOVPay)</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER REGION</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER REGION</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER REGION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((data) => (
              <TableRow key={data.region}>
                <TableCell className="border px-2 py-1 font-semibold">{data.region}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.newPaid}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.newGeoPay}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.newPending}</TableCell>
                <TableCell className="border px-2 py-1 text-right font-bold">{data.newTotal}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.renewalPaid}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.renewalGeoPay}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.renewalPending}</TableCell>
                <TableCell className="border px-2 py-1 text-right font-bold">{data.renewalTotal}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.malePaid}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.malePending}</TableCell>
                <TableCell className="border px-2 py-1 text-right font-bold">{data.maleTotal}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.femalePaid}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.femalePending}</TableCell>
                <TableCell className="border px-2 py-1 text-right font-bold">{data.femaleTotal}</TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-[#4b5563] hover:bg-[#4b5563] font-bold text-white border">
              <TableCell className="border px-2 py-1">GRAND TOTAL</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.newPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.newGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.newPending}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.newPaid + grandTotals.newGeoPay + grandTotals.newPending}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.renewalPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.renewalGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.renewalPending}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.renewalPaid + grandTotals.renewalGeoPay + grandTotals.renewalPending}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.malePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.malePending}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.malePaid + grandTotals.malePending}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.femalePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.femalePending}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.femalePaid + grandTotals.femalePending}</TableCell>
            </TableRow>
            <TableRow className="font-bold bg-[#075985] hover:bg-[#075985] text-white border">
              <TableCell className="border px-2 py-1"> GRANDTOTAL FOR {dateRangeLabel.toUpperCase()}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.newPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.newGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.newPending}</TableCell>
              <TableCell className="border px-2 py-1 text-right"></TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.renewalPaid}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.renewalGeoPay}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.renewalPending}</TableCell>
              <TableCell className="border px-2 py-1 text-right"></TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.malePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.malePending}</TableCell>
              <TableCell className="border px-2 py-1 text-right"></TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.femalePaid}</TableCell>
              <TableCell className="border px-2 py-1 text-right">{grandTotals.femalePending}</TableCell>
              <TableCell className="border px-2 py-1 text-right"></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
});

export default TableReport;
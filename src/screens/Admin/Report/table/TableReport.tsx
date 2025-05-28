import React from 'react';
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
import { format } from "date-fns"; // <-- Add this import

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

const TableReport: React.FC<TableReportProps> = ({
  selectedRegions,
  dateRange,
}) => {
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

   
  return (
    <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
      <div className="flex items-center justify-start mb-4">
        <h2 className="text-sm font-bold uppercase mb-4">Report Table</h2>
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[1200px] w-full border-collapse text-xs">
          <TableHeader>
            {/* Date Header */}
            <TableRow>
              <TableHead
  colSpan={15}
  className="bg-muted text-center font-bold text-base border-b-2 border-border sticky top-0"
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
              {/* NEW */}
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">PAID <br />(Per OR Paid with eGOVPay)</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER REGION</TableHead>
              {/* RENEWAL */}
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">PAID <br />(Per OR Paid with eGOVPay)</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER REGION</TableHead>
              {/* MALE */}
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER REGION</TableHead>
              {/* FEMALE */}
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PAID</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px]">PENDING</TableHead>
              <TableHead className="bg-muted border px-2 py-1 sticky top-[74px] text-center">GRANDTOTAL PER REGION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((data) => (
              <TableRow key={data.region}>
                <TableCell className="border px-2 py-1 font-semibold">{data.region}</TableCell>
                {/* NEW */}
                <TableCell className="border px-2 py-1 text-right">{data.newPaid}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.newGeoPay}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.newPending}</TableCell>
                <TableCell className="border px-2 py-1 text-right font-bold">{data.newTotal}</TableCell>
                {/* RENEWAL */}
                <TableCell className="border px-2 py-1 text-right">{data.renewalPaid}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.renewalGeoPay}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.renewalPending}</TableCell>
                <TableCell className="border px-2 py-1 text-right font-bold">{data.renewalTotal}</TableCell>
                {/* MALE */}
                <TableCell className="border px-2 py-1 text-right">{data.malePaid}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.malePending}</TableCell>
                <TableCell className="border px-2 py-1 text-right font-bold">{data.maleTotal}</TableCell>
                {/* FEMALE */}
                <TableCell className="border px-2 py-1 text-right">{data.femalePaid}</TableCell>
                <TableCell className="border px-2 py-1 text-right">{data.femalePending}</TableCell>
                <TableCell className="border px-2 py-1 text-right font-bold">{data.femaleTotal}</TableCell>
              </TableRow>
            ))}
            {/* Example Grand Total row, update as needed */}
            <TableRow className="bg-[#4b5563] hover:bg-[#4b5563] font-bold text-white border">
              <TableCell className="border px-2 py-1">GRAND TOTAL</TableCell>
              <TableCell className="border px-2 py-1 text-right">8,496</TableCell>
              <TableCell className="border px-2 py-1 text-right">15</TableCell>
              <TableCell className="border px-2 py-1 text-right">1,770</TableCell>
              <TableCell className="border px-2 py-1 text-right">10,281</TableCell>
              <TableCell className="border px-2 py-1 text-right">9,173</TableCell>
              <TableCell className="border px-2 py-1 text-right">8</TableCell>
              <TableCell className="border px-2 py-1 text-right">1,710</TableCell>
              <TableCell className="border px-2 py-1 text-right">10,891</TableCell>
              <TableCell className="border px-2 py-1 text-right">7,027</TableCell>
              <TableCell className="border px-2 py-1 text-right">1,328</TableCell>
              <TableCell className="border px-2 py-1 text-right">8,266</TableCell>
              <TableCell className="border px-2 py-1 text-right">1,015</TableCell>
              <TableCell className="border px-2 py-1 text-right">11,111</TableCell>
              <TableCell className="border px-2 py-1 text-right">12,222</TableCell>
            </TableRow>
            <TableRow className="font-bold bg-[#075985] hover:bg-[#075985] text-white">
              <TableCell className="border px-2 py-1">
                GRANDTOTAL FOR {getCurrentMonthYear().toUpperCase()}
              </TableCell>
              <TableCell colSpan={12}></TableCell>
              <TableCell className="border px-2 py-1 text-right">20,242</TableCell>
              <TableCell colSpan={2}></TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default TableReport;
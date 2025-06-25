import * as XLSX from "xlsx";
import { regionKeyToCode } from "./mockData";

export function exportTableReportToExcel({
  filteredResults,
  lguToRegion,
  dateRangeLabel,
  fileLabel = "report",
  isDayMode = false,
}: {
  filteredResults: any[];
  lguToRegion: Record<string, string>;
  dateRangeLabel: string;
  fileLabel?: string;
  isDayMode?: boolean;
}) {
  function formatMonthYear(monthStr: string): string {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    if (!year || !month) return monthStr;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  const columns = [
    "Region",
    "LGU",
    "NEW PAID",
    "NEW PAID (Per OR Paid with eGOVPay)",
    "NEW PENDING",
    "NEW GRANDTOTAL",
    "RENEWAL PAID",
    "RENEWAL PAID (Per OR Paid with eGOVPay)",
    "RENEWAL PENDING",
    "RENEWAL GRANDTOTAL",
    "MALE PAID",
    "MALE PENDING",
    "MALE GRANDTOTAL",
    "FEMALE PAID",
    "FEMALE PENDING",
    "FEMALE GRANDTOTAL",
  ];

  const rows: any[] = [];
  const merges: XLSX.Range[] = [];

  type RowData = any[];
  type RegionGroup = { region: string; rows: RowData[] };
  const regionGroups: RegionGroup[] = [];

  if (isDayMode) {
    const regionMap: Record<string, RegionGroup> = {};
    filteredResults.forEach(lgu => {
      lgu.monthlyResults.forEach((month: any) => {
        const regionKey = lgu.region || lgu.regionCode || lguToRegion[lgu.lgu] || "Unknown";
        const regionCode = regionKeyToCode[regionKey] || regionKey;
        const lguLabel = `${lgu.lgu}${lgu.province ? ` (${lgu.province})` : ""} (${formatMonthYear(month.month)})`;
        const row = [
          regionCode,
          lguLabel,
          month.newPaid || 0,
          month.newPaidViaEgov || 0,
          month.newPending || 0,
          (month.newPaid || 0) + (month.newPaidViaEgov || 0) + (month.newPending || 0),
          month.renewPaid || 0,
          month.renewPaidViaEgov || 0,
          month.renewPending || 0,
          (month.renewPaid || 0) + (month.renewPaidViaEgov || 0) + (month.renewPending || 0),
          month.malePaid || 0,
          month.malePending || 0,
          (month.malePaid || 0) + (month.malePending || 0),
          month.femalePaid || 0,
          month.femalePending || 0,
          (month.femalePaid || 0) + (month.femalePending || 0),
        ];
        if (!regionMap[regionCode]) {
          regionMap[regionCode] = { region: regionCode, rows: [] };
        }
        regionMap[regionCode].rows.push(row);
      });
    });
    regionGroups.push(...Object.values(regionMap));
  } else {
    const regionMap: Record<string, RegionGroup> = {};
    filteredResults.forEach(lgu => {
      const sum = lgu.sum || {};
      let lguLabel = lgu.lgu || "";
      if (lgu.province) lguLabel += ` (${lgu.province})`;
      if (lgu.months && lgu.months.length > 0) {
        lguLabel += lgu.months.length === 1
          ? ` (${formatMonthYear(lgu.months[0])})`
          : ` (${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])})`;
      }
      const regionKey = lgu.region || lgu.regionCode || lguToRegion[lgu.lgu] || "Unknown";
      const regionCode = regionKeyToCode[regionKey] || regionKey;
      const row = [
        regionCode,
        lguLabel,
        sum.newPaid || 0,
        sum.newPaidViaEgov || 0,
        sum.newPending || 0,
        (sum.newPaid || 0) + (sum.newPaidViaEgov || 0) + (sum.newPending || 0),
        sum.renewPaid || 0,
        sum.renewPaidViaEgov || 0,
        sum.renewPending || 0,
        (sum.renewPaid || 0) + (sum.renewPaidViaEgov || 0) + (sum.renewPending || 0),
        sum.malePaid || 0,
        sum.malePending || 0,
        (sum.malePaid || 0) + (sum.malePending || 0),
        sum.femalePaid || 0,
        sum.femalePending || 0,
        (sum.femalePaid || 0) + (sum.femalePending || 0),
      ];
      if (!regionMap[regionCode]) {
        regionMap[regionCode] = { region: regionCode, rows: [] };
      }
      regionMap[regionCode].rows.push(row);
    });
    regionGroups.push(...Object.values(regionMap));
  }

  // Build rows and merges
  let currentRow = 2; // 0 is date row, 1 is header
  regionGroups.forEach(group => {
    const startRow = currentRow;
    group.rows.forEach((row, idx) => {
      if (idx > 0) row[0] = "";
      rows.push(row);
      currentRow++;
    });
    if (group.rows.length > 1) {
      merges.push({
        s: { r: startRow, c: 0 },
        e: { r: startRow + group.rows.length - 1, c: 0 }
      });
    }
  });

  // Grand total row
  const grandTotals = rows.reduce(
    (totals, row) => {
      for (let i = 2; i < row.length; i++) {
        totals[i] += Number(row[i]) || 0;
      }
      return totals;
    },
    Array(columns.length).fill(0)
  );
  grandTotals[0] = "";
  grandTotals[1] = `GRAND TOTAL FOR (${dateRangeLabel})`;

  rows.push(grandTotals);

  // Add date range row above header
  const dateRow = [dateRangeLabel];
  while (dateRow.length < columns.length) dateRow.push("");
  const data = [dateRow, columns, ...rows];

  // Merge the date range row across all columns
  const dateMerge = { s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } };
  merges.unshift(dateMerge);

  // SheetJS: create worksheet and workbook
  const ws = XLSX.utils.aoa_to_sheet(data);
  if (merges.length > 0) ws["!merges"] = merges;

  // Center the merged region cells and date range row
  // (SheetJS free version: only works in Excel that supports cell styles)
  for (let merge of merges) {
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellAddress]) continue;
        if (!ws[cellAddress].s) ws[cellAddress].s = {};
        ws[cellAddress].s.alignment = { vertical: "center", horizontal: "center" };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");

  XLSX.writeFile(wb, `${fileLabel}.xlsx`);
}
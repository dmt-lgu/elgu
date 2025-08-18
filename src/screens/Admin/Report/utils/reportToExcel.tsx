import * as XLSX from "xlsx";
import { regionKeyToCode, regionMapping } from "./mockData";

type ExcelParams = {
  filteredResults: any[];
  lguToRegion: Record<string, string>;
  dateRangeLabel: string;
  fileLabel?: string;
  isDayMode?: boolean; 
  moduleLabel?: string;
  selectedDateType?: string;
};

function formatMonthYear(monthStr: string): string {
  if (!monthStr) return "";
  const parts = monthStr.split("-");
  if (parts.length < 2) return monthStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  if (isNaN(year) || isNaN(month)) return monthStr;
  const date = new Date(year, month, 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
}

function resolveRegionKey(lgu: any, lguToRegion: Record<string, string>): string {
  return (
    regionMapping[lgu?.region] ||
    regionMapping[lgu?.regionCode] ||
    (lguToRegion?.[lgu?.lgu] as string) ||
    lgu?.region ||
    lgu?.regionCode ||
    "Unknown"
  );
}

function resolveRegionCode(regionKey: string): string {
  const key = typeof regionKey === "string" ? regionKey.toLowerCase() : "";
  return (regionKeyToCode as Record<string, string>)[key] || regionKey || "Unknown";
}

function lguLabelBase(lgu: any): string {
  let label = lgu?.lgu || "";
  if (lgu?.province) label += ` (${lgu.province})`;
  return label;
}

function lguLabelWithMonths(lgu: any): string {
  let label = lguLabelBase(lgu);
  if (Array.isArray(lgu?.months) && lgu.months.length > 0) {
    label +=
      lgu.months.length === 1
        ? ` (${formatMonthYear(lgu.months[0])})`
        : ` (${formatMonthYear(lgu.months[0])} - ${formatMonthYear(
            lgu.months[lgu.months.length - 1]
          )})`;
  }
  return label;
}

export function exportTableReportToExcel({
  filteredResults,
  lguToRegion,
  dateRangeLabel,
  fileLabel = "report",
  isDayMode = false,
  moduleLabel,
  selectedDateType,
}: ExcelParams) {
  const results = Array.isArray(filteredResults) ? filteredResults : [];
  const detailMode = isDayMode || selectedDateType === "Day";
  const isBC = moduleLabel === "Barangay Clearance";
  const isCO = moduleLabel === "Certificate of Occupancy";
  const isBldg = moduleLabel === "Building Permit";

  const columnsBP_WP = [
    "Region", "LGU", "NEW PAID", "NEW PAID (Per OR Paid with eGOVPay)", "NEW PENDING", "NEW GRANDTOTAL",
    "RENEWAL PAID", "RENEWAL PAID (Per OR Paid with eGOVPay)", "RENEWAL PENDING", "RENEWAL GRANDTOTAL",
    "MALE PAID", "MALE PENDING", "MALE GRANDTOTAL", "FEMALE PAID", "FEMALE PENDING", "FEMALE GRANDTOTAL",
  ];

  const columnsBC = ["Region", "LGU", "Total Results"];

  // GI-UPDATE: Gibaylo ang Paid ug Ongoing, ug gi-ilisdan ang ngalan sa Pending
  const columnsSimple = ["Region", "LGU", "Paid", "Ongoing"];

  let columns: string[] = columnsBP_WP;
  if (isBC) columns = columnsBC;
  if (isCO || isBldg) columns = columnsSimple;

  type RowData = any[];
  type RegionGroup = { region: string; rows: RowData[] };
  const regionGroups: RegionGroup[] = [];

  if (isBC) {
    const regionMap: Record<string, RegionGroup> = {};
    if (detailMode) {
      results.forEach((lgu) => {
        const regionKey = resolveRegionKey(lgu, lguToRegion);
        const regionCode = resolveRegionCode(regionKey);
        const months = Array.isArray(lgu?.monthlyResults) ? lgu.monthlyResults : [];
        months.forEach((month: any) => {
          const lguLbl = `${lguLabelBase(lgu)} (${formatMonthYear(month?.month)})`;
          const total = month?.totalCount ?? 0;
          const row: RowData = [regionCode, lguLbl, total];
          if (!regionMap[regionCode]) regionMap[regionCode] = { region: regionCode, rows: [] };
          regionMap[regionCode].rows.push(row);
        });
      });
    } else {
      results.forEach((lgu) => {
        const regionKey = resolveRegionKey(lgu, lguToRegion);
        const regionCode = resolveRegionCode(regionKey);
        const total = lgu?.sum?.totalCount ?? lgu?.totalCount ?? 0;
        const lguLbl = lguLabelWithMonths(lgu);
        const row: RowData = [regionCode, lguLbl, total];
        if (!regionMap[regionCode]) regionMap[regionCode] = { region: regionCode, rows: [] };
        regionMap[regionCode].rows.push(row);
      });
    }
    regionGroups.push(...Object.values(regionMap));
  } else if (isCO || isBldg) {
    const regionMap: Record<string, RegionGroup> = {};
    const pendingKey = isCO ? "coPending" : "buildingPending";
    const paidKey = isCO ? "coPaid" : "buildingPaid";

    if (detailMode) {
      results.forEach((lgu) => {
        const regionKey = resolveRegionKey(lgu, lguToRegion);
        const regionCode = resolveRegionCode(regionKey);
        const months = Array.isArray(lgu?.monthlyResults) ? lgu.monthlyResults : [];
        months.forEach((month: any) => {
          const lguLbl = `${lguLabelBase(lgu)} (${formatMonthYear(month?.month)})`;
          const src = month || {};
          const pending = src?.[pendingKey] ?? 0;
          const paid = src?.[paidKey] ?? 0;
          // GI-UPDATE: Gibaylo ang paid ug pending sa row array para motakdo sa bag-ong columns
          const row: RowData = [regionCode, lguLbl, paid, pending];
          if (!regionMap[regionCode]) regionMap[regionCode] = { region: regionCode, rows: [] };
          regionMap[regionCode].rows.push(row);
        });
      });
    } else {
      results.forEach((lgu) => {
        const regionKey = resolveRegionKey(lgu, lguToRegion);
        const regionCode = resolveRegionCode(regionKey);
        const src = lgu?.sum ?? lgu ?? {};
        const pending = src?.[pendingKey] ?? 0;
        const paid = src?.[paidKey] ?? 0;
        const lguLbl = lguLabelWithMonths(lgu);
        // GI-UPDATE: Gibaylo ang paid ug pending sa row array para motakdo sa bag-ong columns
        const row: RowData = [regionCode, lguLbl, paid, pending];
        if (!regionMap[regionCode]) regionMap[regionCode] = { region: regionCode, rows: [] };
        regionMap[regionCode].rows.push(row);
      });
    }
    regionGroups.push(...Object.values(regionMap));
  } else {
    const regionMap: Record<string, RegionGroup> = {};
    if (detailMode) {
      results.forEach((lgu) => {
        const regionKey = resolveRegionKey(lgu, lguToRegion);
        const regionCode = resolveRegionCode(regionKey);
        const months = Array.isArray(lgu?.monthlyResults) ? lgu.monthlyResults : [];
        months.forEach((month: any) => {
          const lguLbl = `${lguLabelBase(lgu)} (${formatMonthYear(month?.month)})`;
          const row: RowData = [
            regionCode, lguLbl,
            month?.newPaid || 0, month?.newPaidViaEgov || 0, month?.newPending || 0,
            (month?.newPaid || 0) + (month?.newPaidViaEgov || 0) + (month?.newPending || 0),
            month?.renewPaid || 0, month?.renewPaidViaEgov || 0, month?.renewPending || 0,
            (month?.renewPaid || 0) + (month?.renewPaidViaEgov || 0) + (month?.renewPending || 0),
            month?.malePaid || 0, month?.malePending || 0,
            (month?.malePaid || 0) + (month?.malePending || 0),
            month?.femalePaid || 0, month?.femalePending || 0,
            (month?.femalePaid || 0) + (month?.femalePending || 0),
          ];
          if (!regionMap[regionCode]) regionMap[regionCode] = { region: regionCode, rows: [] };
          regionMap[regionCode].rows.push(row);
        });
      });
    } else {
      results.forEach((lgu) => {
        const sum = lgu?.sum || {};
        const regionKey = resolveRegionKey(lgu, lguToRegion);
        const regionCode = resolveRegionCode(regionKey);
        const lguLbl = lguLabelWithMonths(lgu);
        const row: RowData = [
          regionCode, lguLbl,
          sum.newPaid || 0, sum.newPaidViaEgov || 0, sum.newPending || 0,
          (sum.newPaid || 0) + (sum.newPaidViaEgov || 0) + (sum.newPending || 0),
          sum.renewPaid || 0, sum.renewPaidViaEgov || 0, sum.renewPending || 0,
          (sum.renewPaid || 0) + (sum.renewPaidViaEgov || 0) + (sum.renewPending || 0),
          sum.malePaid || 0, sum.malePending || 0,
          (sum.malePaid || 0) + (sum.malePending || 0),
          sum.femalePaid || 0, sum.femalePending || 0,
          (sum.femalePaid || 0) + (sum.femalePending || 0),
        ];
        if (!regionMap[regionCode]) regionMap[regionCode] = { region: regionCode, rows: [] };
        regionMap[regionCode].rows.push(row);
      });
    }
    regionGroups.push(...Object.values(regionMap));
  }

  const rows: any[][] = [];
  const merges: XLSX.Range[] = [];
  const moduleRow = moduleLabel ? [moduleLabel] as string[] : undefined;

  if (moduleRow) {
    while (moduleRow.length < columns.length) moduleRow.push("");
  }
  const dateRow: string[] = [dateRangeLabel];
  while (dateRow.length < columns.length) dateRow.push("");

  const dataMatrix: any[][] = [];
  if (moduleRow) dataMatrix.push(moduleRow);
  dataMatrix.push(dateRow, columns);

  let currentRow = dataMatrix.length;

  regionGroups.forEach((group) => {
    const startRow = currentRow;
    group.rows.forEach((row, idx) => {
      if (idx > 0) row[0] = "";
      rows.push(row);
      currentRow++;
    });
    if (group.rows.length > 1) {
      merges.push({ s: { r: startRow, c: 0 }, e: { r: currentRow - 1, c: 0 } });
    }
  });

  const grandTotals = rows.reduce((totals: number[], row: any[]) => {
    if (isBC) {
      totals[2] = (totals[2] || 0) + (Number(row[2]) || 0);
    } else if (isCO || isBldg) {
      // GI-UPDATE: Ang `row[2]` karon kay "Paid", ang `row[3]` kay "Ongoing"
      totals[2] = (totals[2] || 0) + (Number(row[2]) || 0); // Sum Paid
      totals[3] = (totals[3] || 0) + (Number(row[3]) || 0); // Sum Ongoing
    } else {
      for (let i = 2; i < row.length; i++) {
        totals[i] = (totals[i] || 0) + (Number(row[i]) || 0);
      }
    }
    return totals;
  }, Array(columns.length).fill(0));

  grandTotals[0] = "";
  grandTotals[1] = `GRAND TOTAL FOR (${dateRangeLabel})`;
  rows.push(grandTotals);

  const sheetData: any[][] = [...dataMatrix, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  if (moduleRow) {
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } });
    merges.push({ s: { r: 1, c: 0 }, e: { r: 1, c: columns.length - 1 } });
  } else {
    merges.push({ s: { r: 0, c: 0 }, e: { r: 0, c: columns.length - 1 } });
  }

  if (merges.length > 0) (ws as any)["!merges"] = merges;

  for (const merge of merges) {
    for (let r = merge.s.r; r <= merge.e.r; r++) {
      for (let c = merge.s.c; c <= merge.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        if (!(ws as any)[addr]) continue;
        if (!(ws as any)[addr].s) (ws as any)[addr].s = {};
        (ws as any)[addr].s.alignment = { vertical: "center", horizontal: "center" };
      }
    }
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${fileLabel}.xlsx`);
}
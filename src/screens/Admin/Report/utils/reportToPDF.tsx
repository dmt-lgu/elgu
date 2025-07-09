import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { regionKeyToCode, regionMapping } from "./mockData";
import Swal from "sweetalert2";

/**
 * Format a month string (yyyy-MM or yyyy-MM-dd) to "Month YYYY"
 */
const formatMonthYear = (monthStr: string): string => {
  if (!monthStr) return "";
  const parts = monthStr.split("-");
  if (parts.length < 2) return monthStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  if (isNaN(year) || isNaN(month)) return monthStr;
  const date = new Date(year, month, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
};

/**
 * Get a month range label for an array of months
 */
const getMonthRangeLabel = (months?: string[]): string => {
  if (!months || months.length === 0) return "";
  if (months.length === 1) {
    return `(${formatMonthYear(months[0])})`;
  }
  return `(${formatMonthYear(months[0])} - ${formatMonthYear(months[months.length - 1])})`;
};

type RowData = {
  regionKey: string;
  lgu: any;
  month?: string; // for day mode
  monthData?: any; // for day mode
};

interface ExportTableReportToPDFParams {
  filteredResults: any[];
  lguToRegion: Record<string, string>;
  dateRangeLabel: string;
  logoUrl: string;
  fileLabel?: string;
  isDayMode?: boolean;
  isBarangayClearance?: boolean;
  moduleLabel?: string;
}

/**
 * Export tabular report data to PDF with progress feedback.
 */
export async function exportTableReportToPDF({
  filteredResults,
  lguToRegion,
  dateRangeLabel,
  logoUrl,
  fileLabel = "report",
  isDayMode = false,
  isBarangayClearance = true,
  moduleLabel,
}: ExportTableReportToPDFParams): Promise<void> {
  // --- 1. Prepare rows for PDF ---
  let allRows: RowData[] = [];

  if (isDayMode) {
    // For day mode, use filteredResults directly, each row is a day entry as in the UI
    allRows = filteredResults.map((row: any) => ({
      regionKey:
        regionMapping[row.region] ||
        regionMapping[row.regionCode] ||
        lguToRegion[row.lgu] ||
        row.regionKey ||
        row.region ||
        row.regionCode ||
        "",
      lgu: row.lgu,
      month: row.month,
      monthData: row.monthData,
    }));
  } else {
    // --- 1. Group by region (internal key) ---
    const regionGroups: Record<string, any[]> = {};
    filteredResults.forEach(lgu => {
      const regionInternal =
        regionMapping[lgu.region] ||
        regionMapping[lgu.regionCode] ||
        lguToRegion[lgu.lgu];
      if (!regionInternal) return;
      if (!regionGroups[regionInternal]) regionGroups[regionInternal] = [];
      regionGroups[regionInternal].push(lgu);
    });

    // --- 2. Flatten to rows for pagination ---
    Object.entries(regionGroups).forEach(([regionKey, lguList]) => {
      lguList.forEach((lgu: any) => {
        allRows.push({
          regionKey,
          lgu,
        });
      });
    });
  }

  // --- 3. Paginate rows ---
  let rowChunks: RowData[][] = [];
  if (isBarangayClearance) {
    const ROWS_FIRST_PAGE = 15;
    const ROWS_PER_PAGE = 18;
    let idx = 0;
    if (allRows.length > 0) {
      const firstChunkSize = Math.min(ROWS_FIRST_PAGE, allRows.length);
      rowChunks.push(allRows.slice(0, firstChunkSize));
      idx = firstChunkSize;
      while (idx < allRows.length) {
        rowChunks.push(allRows.slice(idx, idx + ROWS_PER_PAGE));
        idx += ROWS_PER_PAGE;
      }
    } else {
      rowChunks.push([]);
    }
  } else {
    const ROWS_FIRST_PAGE = 8;
    const ROWS_PER_PAGE = 10;
    const MAX_ROWS_PER_PAGE = 15;
    let idx = 0;
    if (allRows.length > 0) {
      const firstChunkSize = Math.min(ROWS_FIRST_PAGE, MAX_ROWS_PER_PAGE);
      rowChunks.push(allRows.slice(0, firstChunkSize));
      idx = firstChunkSize;
      while (idx < allRows.length) {
        rowChunks.push(allRows.slice(idx, idx + ROWS_PER_PAGE));
        idx += ROWS_PER_PAGE;
      }
    } else {
      rowChunks.push([]);
    }
  }

  // --- 4. Define column widths ---
  const columnWidths = isBarangayClearance
    ? [120, 320, 120] // Region, LGU, Results
    : [
        80,   // Region
        180,  // LGU
        60,   // NEW PAID
        80,   // NEW PAID (eGOVPay)
        60,   // NEW PENDING
        80,   // NEW GRANDTOTAL
        60,   // RENEWAL PAID
        80,   // RENEWAL PAID (eGOVPay)
        60,   // RENEWAL PENDING
        80,   // RENEWAL GRANDTOTAL
        60,   // MALE PAID
        60,   // MALE PENDING
        80,   // MALE GRANDTOTAL
        60,   // FEMALE PAID
        60,   // FEMALE PENDING
        80,   // FEMALE GRANDTOTAL
      ];

  // --- 5. Helper: <td> with styling ---
  const makeTd = (
    val: any,
    opts: { bold?: boolean; align?: string; color?: string; bg?: string; fontSize?: string; width?: string; striped?: boolean } = {}
  ): HTMLTableCellElement => {
    const td = document.createElement('td');
    td.textContent = val != null && val !== "" ? val : "0";
    td.style.border = '#e5e5e5 0.5px solid';
    td.style.textAlign = opts.align || 'center';
    td.style.fontFamily = "'Rubik', sans-serif";
    if (opts.bold) td.style.fontWeight = 'bold';
    if (opts.color) td.style.color = opts.color;
    if (opts.bg) td.style.background = opts.bg;
    if (opts.fontSize) td.style.fontSize = opts.fontSize;
    if (opts.width) td.style.width = opts.width;
    if (opts.striped) td.style.background = "#e4e4e7";
    return td;
  };

  // --- 6. Grand total calculators ---
  const calculateGrandTotalBarangay = (results: any[]): number => {
    let total = 0;
    results.forEach(lgu => {
      if (typeof lgu.totalCount === "number") {
        total += lgu.totalCount;
      } else if (lgu.sum && typeof lgu.sum.totalCount === "number") {
        total += lgu.sum.totalCount;
      } else if (Array.isArray(lgu.monthlyResults)) {
        lgu.monthlyResults.forEach((month: any) => {
          if (typeof month.totalCount === "number") total += month.totalCount;
          else if (month.sum && typeof month.sum.totalCount === "number") total += month.sum.totalCount;
        });
      }
    });
    return total;
  };

  const calculateGrandTotals = (results: any[]) => {
    let totals = {
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
    };
    results.forEach(lgu => {
      const sum = lgu.sum || {};
      totals.newPaid += Number(sum.newPaid) || 0;
      totals.newGeoPay += Number(sum.newPaidViaEgov) || 0;
      totals.newPending += Number(sum.newPending) || 0;
      totals.renewalPaid += Number(sum.renewPaid) || 0;
      totals.renewalGeoPay += Number(sum.renewPaidViaEgov) || 0;
      totals.renewalPending += Number(sum.renewPending) || 0;
      totals.malePaid += Number(sum.malePaid) || 0;
      totals.malePending += Number(sum.malePending) || 0;
      totals.femalePaid += Number(sum.femalePaid) || 0;
      totals.femalePending += Number(sum.femalePending) || 0;
    });
    return totals;
  };

  // --- 7. Create table chunk for a page ---
  const createTableChunk = (
  rows: RowData[],
  isLastPage: boolean
): HTMLDivElement => {
  const minTableWidth = 1200;
  const wrapperDiv = document.createElement('div');
  wrapperDiv.style.width = minTableWidth + 'px';
  wrapperDiv.style.background = '#fff';
  wrapperDiv.style.fontFamily = "'Rubik', sans-serif";

    const tableChunk = document.createElement('table');
  tableChunk.setAttribute('style', `width: 100%; font-size: 10px; font-family: Rubik, sans-serif; min-width: ${minTableWidth}px;`);


    // Header
    const thead = document.createElement('thead');
    // First header row (title)
    const moduleLabelRow = document.createElement('tr');
    const moduleLabelTh = document.createElement('th');
    moduleLabelTh.colSpan = isBarangayClearance ? 3 : 16;
    moduleLabelTh.innerHTML = `
      <div style="text-align:center;">
        <div style="font-weight:bold; font-size:15px; color:#111; font-family:'Rubik',sans-serif;">
          ${moduleLabel || "Report"}
        </div>
        <div style="font-weight:400; font-size:10px; color:#222; margin-top:2px; font-family:'Rubik',sans-serif;">
          ${dateRangeLabel || ""}
        </div>
      </div>
    `;
    moduleLabelTh.style.background = '#b5d3fa';
    moduleLabelTh.style.textAlign = 'center';
    moduleLabelTh.style.padding = "10px";
    moduleLabelTh.style.border = '#e5e5e5 0.5px solid';
    moduleLabelRow.appendChild(moduleLabelTh);
    thead.appendChild(moduleLabelRow);

    // --- Table column headers ---
    if (isBarangayClearance) {
      const headerRow = document.createElement('tr');
      ["Region", "LGU", "RESULTS"].forEach((label, idx) => {
        const th = document.createElement('th');
        th.textContent = label;
        th.style.background = '#9ec6f7';
        th.style.fontWeight = 'bold';
        th.style.border = '#e5e5e5 0.5px solid';
        th.style.textAlign = 'center';
        th.style.fontFamily = "'Rubik', sans-serif";
        th.style.padding = "12px 12px";
        th.style.width = columnWidths[idx] + "px";
        headerRow.appendChild(th);
      });
      thead.appendChild(headerRow);
    } else {
      const headerRow2 = document.createElement('tr');
      [
        { label: "Region", rowSpan: 2 },
        { label: "LGU", rowSpan: 2 },
        { label: "NEW", colSpan: 4 },
        { label: "RENEWAL", colSpan: 4 },
        { label: "MALE", colSpan: 3 },
        { label: "FEMALE", colSpan: 3 },
      ].forEach((col, idx) => {
        const th = document.createElement('th');
        th.textContent = col.label;
        th.style.background = '#9ec6f7';
        th.style.fontWeight = 'bold';
        th.style.border = '#e5e5e5 0.5px solid';
        th.style.textAlign = 'center';
        th.style.fontFamily = "'Rubik', sans-serif";
        th.style.padding = "12px 12px";
        if (col.rowSpan) th.rowSpan = col.rowSpan;
        if (col.colSpan) th.colSpan = col.colSpan;
        if (idx === 0) th.style.width = columnWidths[0] + "px";
        if (idx === 1) th.style.width = columnWidths[1] + "px";
        headerRow2.appendChild(th);
      });
      thead.appendChild(headerRow2);

      const headerRow3 = document.createElement('tr');
      [
        "PAID", "PAID (Per OR Paid with eGOVPay)", "PENDING", "GRANDTOTAL PER LGU",
        "PAID", "PAID (Per OR Paid with eGOVPay)", "PENDING", "GRANDTOTAL PER LGU",
        "PAID", "PENDING", "GRANDTOTAL PER LGU",
        "PAID", "PENDING", "GRANDTOTAL PER LGU"
      ].forEach((label, idx) => {
        const th = document.createElement('th');
        th.innerHTML = label.includes("eGOVPay")
          ? `PAID <br /><span style="font-size:10px; display:block; text-align:center;">(Per OR Paid with eGOVPay)</span>`
          : label;
        th.style.background = '#9ec6f7';
        th.style.fontWeight = 'bold';
        th.style.border = '#e5e5e5 0.5px solid';
        th.style.textAlign = 'center';
        th.style.fontFamily = "'Rubik', sans-serif";
        th.style.padding = "12px 12px";
        th.style.width = columnWidths[idx + 2] + "px";
        headerRow3.appendChild(th);
      });
      thead.appendChild(headerRow3);
    }

    tableChunk.appendChild(thead);

    // Body
    const tbodyChunk = document.createElement('tbody');

    if (isDayMode) {
    // For DAY mode: do NOT group/merge Region column, show Region for every row
    rows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      const isStriped = idx % 2 === 0;

      // Region cell (always present, no rowspan)
      const tdRegion = document.createElement('td');
      tdRegion.textContent = regionKeyToCode[row.regionKey] || row.regionKey;
      tdRegion.style.border = '#e5e5e5 1px solid';
      tdRegion.style.textAlign = 'center';
      tdRegion.style.fontWeight = "bold";
      tdRegion.style.fontFamily = "'Rubik', sans-serif";
      tdRegion.style.padding = "12px 12px";
      tdRegion.style.width = columnWidths[0] + "px";
      tr.appendChild(tdRegion);

      // LGU cell (unchanged)
      const lguTd = document.createElement('td');
      lguTd.style.border = '#e5e5e5 0.5px solid';
      lguTd.style.textAlign = isBarangayClearance ? 'center' : 'start';
      lguTd.style.fontFamily = "'Rubik', sans-serif";
      lguTd.style.width = columnWidths[1] + "px";
      lguTd.style.padding = "4px 2px";
      if (isStriped) lguTd.style.background = "#e4e4e7";

      let lguText = row.lgu.lgu || "";
      if (row.lgu.province) lguText += ` (${row.lgu.province})`;

      let monthInfo = "";
      if (row.month) {
        monthInfo = ` (${formatMonthYear(row.month)})`;
      }

      lguTd.innerHTML = `
        <span style="font-weight:bold; font-size:10px; font-family:'Rubik', sans-serif;">${lguText}</span>
        <span style="font-weight:normal; color: #1d4ed8; font-size:7px; font-family:'Rubik', sans-serif;">
            <br />
            ${monthInfo}
        </span>
        `;
      tr.appendChild(lguTd);

      // Results/data columns (unchanged)
      if (isBarangayClearance) {
        let resultVal = "";
        if (row.monthData && typeof row.monthData.totalCount === "number") {
          resultVal = row.monthData.totalCount;
        } else if (typeof row.lgu.totalCount === "number") {
          resultVal = row.lgu.totalCount;
        } else {
          resultVal = "";
        }
        tr.appendChild(makeTd(resultVal, { width: columnWidths[2] + "px", fontSize: "10px", striped: isStriped }));
      } else {
        // Data columns for BP/WP
        let data = row.monthData || row.lgu.sum || {};
        // NEW
        tr.appendChild(makeTd(data.newPaid, { width: columnWidths[2] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd(data.newPaidViaEgov, { width: columnWidths[3] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd(data.newPending, { width: columnWidths[4] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd((data.newPaid || 0) + (data.newPaidViaEgov || 0) + (data.newPending || 0), { width: columnWidths[5] + "px", fontSize: "10px", striped: isStriped }));
        // RENEWAL
        tr.appendChild(makeTd(data.renewPaid, { width: columnWidths[6] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd(data.renewPaidViaEgov, { width: columnWidths[7] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd(data.renewPending, { width: columnWidths[8] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd((data.renewPaid || 0) + (data.renewPaidViaEgov || 0) + (data.renewPending || 0), { width: columnWidths[9] + "px", fontSize: "10px", striped: isStriped }));
        // MALE
        tr.appendChild(makeTd(data.malePaid, { width: columnWidths[10] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd(data.malePending, { width: columnWidths[11] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd((data.malePaid || 0) + (data.malePending || 0), { width: columnWidths[12] + "px", fontSize: "10px", striped: isStriped }));
        // FEMALE
        tr.appendChild(makeTd(data.femalePaid, { width: columnWidths[13] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd(data.femalePending, { width: columnWidths[14] + "px", fontSize: "10px", striped: isStriped }));
        tr.appendChild(makeTd((data.femalePaid || 0) + (data.femalePending || 0), { width: columnWidths[15] + "px", fontSize: "10px", striped: isStriped }));
      }

      tbodyChunk.appendChild(tr);
    });
  } else {
    // Original grouping logic for non-day mode (unchanged)
    let prevRegionKey: string | null = null;
    let regionRowsLeft = 0;

    // Count how many rows for each region on this page
    const regionCounts: Record<string, number> = {};
    rows.forEach(r => {
      regionCounts[r.regionKey] = (regionCounts[r.regionKey] || 0) + 1;
    });

    rows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      const isStriped = idx % 2 === 0;

      // Region cell (grouped/merged)
      if (idx === 0 || row.regionKey !== prevRegionKey) {
        const td = document.createElement('td');
        td.textContent = regionKeyToCode[row.regionKey] || row.regionKey;
        td.style.border = '#e5e5e5 1px solid';
        td.style.textAlign = 'center';
        td.style.fontWeight = "bold";
        td.style.fontFamily = "'Rubik', sans-serif";
        td.style.padding = "12px 12px";
        td.style.width = columnWidths[0] + "px";
        td.rowSpan = regionCounts[row.regionKey];
        tr.appendChild(td);
        regionRowsLeft = regionCounts[row.regionKey] - 1;
        prevRegionKey = row.regionKey;
      } else if (regionRowsLeft > 0) {
        regionRowsLeft--;
      }

        // LGU cell
        const lguTd = document.createElement('td');
        lguTd.style.border = '#e5e5e5 0.5px solid';
        lguTd.style.textAlign = isBarangayClearance ? 'center' : 'start';
        lguTd.style.fontFamily = "'Rubik', sans-serif";
        lguTd.style.width = columnWidths[1] + "px";
        lguTd.style.padding = "4px 2px";
        if (isStriped) lguTd.style.background = "#e4e4e7";

        let lguText = row.lgu.lgu || "";
        if (row.lgu.province) lguText += ` (${row.lgu.province})`;

        let monthInfo = "";
        if (!isDayMode && row.lgu.months && row.lgu.months.length > 0) {
          monthInfo = ` ${getMonthRangeLabel(row.lgu.months)}`;
        }

        lguTd.innerHTML = `
          <span style="font-weight:bold; font-size:10px; font-family:'Rubik', sans-serif;">${lguText}</span>
          <span style="font-weight:normal; color: #1d4ed8; font-size:7px; font-family:'Rubik', sans-serif;">
              <br />
              ${monthInfo}
          </span>
          `;
        tr.appendChild(lguTd);

        if (isBarangayClearance) {
          // Results column for Barangay Clearance
          let resultVal = "";
          if (
            typeof row.lgu.totalCount === "number"
          ) {
            resultVal = row.lgu.totalCount;
          } else if (
            Array.isArray(row.lgu.monthlyResults) && row.lgu.monthlyResults.length > 0
          ) {
            resultVal = row.lgu.monthlyResults.reduce(
              (sum: number, month: any) =>
                typeof month.totalCount === "number" ? sum + month.totalCount : sum,
              0
            );
          } else if (
            row.lgu.sum && typeof row.lgu.sum.totalCount === "number"
          ) {
            resultVal = row.lgu.sum.totalCount;
          } else {
            resultVal = "";
          }
          tr.appendChild(makeTd(resultVal, { width: columnWidths[2] + "px", fontSize: "10px", striped: isStriped }));
        } else {
          // Data columns for BP/WP
          let data = row.lgu.sum || {};
          // NEW
          tr.appendChild(makeTd(data.newPaid, { width: columnWidths[2] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd(data.newPaidViaEgov, { width: columnWidths[3] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd(data.newPending, { width: columnWidths[4] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd((data.newPaid || 0) + (data.newPaidViaEgov || 0) + (data.newPending || 0), { width: columnWidths[5] + "px", fontSize: "10px", striped: isStriped }));
          // RENEWAL
          tr.appendChild(makeTd(data.renewPaid, { width: columnWidths[6] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd(data.renewPaidViaEgov, { width: columnWidths[7] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd(data.renewPending, { width: columnWidths[8] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd((data.renewPaid || 0) + (data.renewPaidViaEgov || 0) + (data.renewPending || 0), { width: columnWidths[9] + "px", fontSize: "10px", striped: isStriped }));
          // MALE
          tr.appendChild(makeTd(data.malePaid, { width: columnWidths[10] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd(data.malePending, { width: columnWidths[11] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd((data.malePaid || 0) + (data.malePending || 0), { width: columnWidths[12] + "px", fontSize: "10px", striped: isStriped }));
          // FEMALE
          tr.appendChild(makeTd(data.femalePaid, { width: columnWidths[13] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd(data.femalePending, { width: columnWidths[14] + "px", fontSize: "10px", striped: isStriped }));
          tr.appendChild(makeTd((data.femalePaid || 0) + (data.femalePending || 0), { width: columnWidths[15] + "px", fontSize: "10px", striped: isStriped }));
        }

        tbodyChunk.appendChild(tr);
      });
    }

    // --- GRAND TOTAL Row (always show, even if no data) ---
    if (isLastPage) {
      if (isBarangayClearance) {
        const grandTotal = calculateGrandTotalBarangay(filteredResults);
        const totalTr = document.createElement('tr');
        totalTr.style.background = "#4b5563";
        totalTr.style.color = "white";
        totalTr.style.fontWeight = "bold";
        totalTr.style.fontFamily = "'Rubik', sans-serif";
        const grandTotalCell = document.createElement('td');
        grandTotalCell.colSpan = 2;
        grandTotalCell.innerHTML = `
          <div style="font-weight:bold; font-size:12px; color:#fff; text-align:start; font-family:'Rubik', sans-serif;">
              GRAND TOTAL FOR
              <br>
              <span style="font-size:10px; font-weight:bold; color:#d1d5db; display:inline-block; margin-top:2px; font-family:'Rubik', sans-serif;">
              (${dateRangeLabel})
              </span>
          </div>
          `;
        grandTotalCell.style.background = "#4b5563";
        grandTotalCell.style.fontWeight = "bold";
        grandTotalCell.style.fontSize = "12px";
        grandTotalCell.style.color = "#fff";
        grandTotalCell.style.textAlign = "center";
        grandTotalCell.style.padding = "12px 8px";
        grandTotalCell.style.fontFamily = "'Rubik', sans-serif";
        grandTotalCell.style.width = (columnWidths[0] + columnWidths[1]) + "px";
        grandTotalCell.style.border = '#e5e5e5 0.5px solid';
        totalTr.appendChild(grandTotalCell);
        totalTr.appendChild(makeTd(grandTotal, { color: "#fff", bg: "#4b5563", width: columnWidths[2] + "px" }));
        tbodyChunk.appendChild(totalTr);
      } else {
        const totals = calculateGrandTotals(filteredResults);
        const totalTr = document.createElement('tr');
        totalTr.style.background = "#4b5563";
        totalTr.style.color = "white";
        totalTr.style.fontWeight = "bold";
        totalTr.style.fontFamily = "'Rubik', sans-serif";
        const grandTotalCell = document.createElement('td');
        grandTotalCell.colSpan = 2;
        grandTotalCell.innerHTML = `
          <div style="font-weight:bold; font-size:12px; color:#fff; text-align:start; font-family:'Rubik', sans-serif;">
              GRAND TOTAL FOR
              <br>
              <span style="font-size:10px; font-weight:bold; color:#d1d5db; display:inline-block; margin-top:2px; font-family:'Rubik', sans-serif;">
              (${dateRangeLabel})
              </span>
          </div>
          `;
        grandTotalCell.style.background = "#4b5563";
        grandTotalCell.style.fontWeight = "bold";
        grandTotalCell.style.fontSize = "12px";
        grandTotalCell.style.color = "#fff";
        grandTotalCell.style.textAlign = "center";
        grandTotalCell.style.padding = "12px 8px";
        grandTotalCell.style.fontFamily = "'Rubik', sans-serif";
        grandTotalCell.style.width = (columnWidths[0] + columnWidths[1]) + "px";
        grandTotalCell.style.border = '#e5e5e5 0.5px solid';
        totalTr.appendChild(grandTotalCell);

        // Data columns (order must match table columns)
        totalTr.appendChild(makeTd(totals.newPaid, { color: "#fff", bg: "#4b5563", width: columnWidths[2] + "px" }));
        totalTr.appendChild(makeTd(totals.newGeoPay, { color: "#fff", bg: "#4b5563", width: columnWidths[3] + "px" }));
        totalTr.appendChild(makeTd(totals.newPending, { color: "#fff", bg: "#4b5563", width: columnWidths[4] + "px" }));
        totalTr.appendChild(makeTd(totals.newPaid + totals.newGeoPay + totals.newPending, { color: "#fff", bg: "#4b5563", width: columnWidths[5] + "px" }));

        totalTr.appendChild(makeTd(totals.renewalPaid, { color: "#fff", bg: "#4b5563", width: columnWidths[6] + "px" }));
        totalTr.appendChild(makeTd(totals.renewalGeoPay, { color: "#fff", bg: "#4b5563", width: columnWidths[7] + "px" }));
        totalTr.appendChild(makeTd(totals.renewalPending, { color: "#fff", bg: "#4b5563", width: columnWidths[8] + "px" }));
        totalTr.appendChild(makeTd(totals.renewalPaid + totals.renewalGeoPay + totals.renewalPending, { color: "#fff", bg: "#4b5563", width: columnWidths[9] + "px" }));

        totalTr.appendChild(makeTd(totals.malePaid, { color: "#fff", bg: "#4b5563", width: columnWidths[10] + "px" }));
        totalTr.appendChild(makeTd(totals.malePending, { color: "#fff", bg: "#4b5563", width: columnWidths[11] + "px" }));
        totalTr.appendChild(makeTd(totals.malePaid + totals.malePending, { color: "#fff", bg: "#4b5563", width: columnWidths[12] + "px" }));

        totalTr.appendChild(makeTd(totals.femalePaid, { color: "#fff", bg: "#4b5563", width: columnWidths[13] + "px" }));
        totalTr.appendChild(makeTd(totals.femalePending, { color: "#fff", bg: "#4b5563", width: columnWidths[14] + "px" }));
        totalTr.appendChild(makeTd(totals.femalePaid + totals.femalePending, { color: "#fff", bg: "#4b5563", width: columnWidths[15] + "px" }));

        tbodyChunk.appendChild(totalTr);
      }
    }

    tableChunk.appendChild(tbodyChunk);
  wrapperDiv.appendChild(tableChunk);
  return wrapperDiv;
  };

  // --- 8. SweetAlert2 Progress Bar and PDF Generation ---
  await Swal.fire({
    title: "Generating PDF...",
    html: `
      <style>
        .RadialProgress {
          --hue: 220;
          --holesize: 65%;
          --track-bg: hsl(233 34% 92%);
          --progress: 0%;
          block-size: 120px;
          inline-size: 120px;
          min-inline-size: 100px;
          min-block-size: 100px;
          display: grid;
          place-items: center;
          position: relative;
          font-weight: 700;
          font-size: 1.4rem;
          margin: 0 auto 10px auto;
        }
        .RadialProgress::before {
          content: '';
          position: absolute;
          top: 0;
          bottom: 0;
          left: 0;
          right: 0;
          border-radius: 50%;
          z-index: -1;
          background: conic-gradient(
            hsl(var(--hue) 100% 70%),
            hsl(var(--hue) 100% 40%),
            hsl(var(--hue) 100% 70%) var(--progress, 0%),
            var(--track-bg) var(--progress, 0%) 100%
          );
          mask-image: radial-gradient(
            transparent var(--holesize),
            black calc(var(--holesize) + 0.5px)
          );
        }
        .RadialProgress-value {
          z-index: 1;
        }
      </style>
      <div class="RadialProgress" id="swal-radial-progress" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
        <span class="RadialProgress-value" id="swal-radial-label">0%</span>
      </div>
    `,
    allowOutsideClick: false,
    allowEscapeKey: false,
    showConfirmButton: false,
    didOpen: () => {
      setTimeout(async () => {
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
        let yOffset = 20;
        // Add logo (only on first page)
        const img = new window.Image();
        img.src = logoUrl;
        await new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
        let logoHeight = 0;
        if (img.complete) {
          const pageWidth = pdf.internal.pageSize.getWidth();
          const logoWidth = 250;
          logoHeight = 55;
          const logoMarginBottom = 30;
          const x = (pageWidth - logoWidth) / 2;
          pdf.addImage(img, "PNG", x, 20, logoWidth, logoHeight);
          yOffset = 20 + logoHeight + logoMarginBottom;
        } else {
          yOffset = 20;
        }

        for (let page = 0; page < rowChunks.length; page++) {
          if (page > 0) {
            pdf.addPage();
            yOffset = 20;
          }
          const isLastPage = page === rowChunks.length - 1;

          const tableChunkDiv = createTableChunk(rowChunks[page], isLastPage);
          const hiddenDiv = document.createElement('div');
          hiddenDiv.style.position = 'fixed';
          hiddenDiv.style.left = '-99999px';
          hiddenDiv.style.top = '0';
          hiddenDiv.style.width = "1200px";
          hiddenDiv.style.background = "#fff";
          hiddenDiv.style.fontFamily = "'Rubik', sans-serif";
          document.body.appendChild(hiddenDiv);
          hiddenDiv.appendChild(tableChunkDiv);

          await new Promise(resolve => setTimeout(resolve, 50));

          const canvas = await html2canvas(tableChunkDiv, { scale: 1.2, useCORS: true, backgroundColor: "#fff" });
          const imgData = canvas.toDataURL("image/png");
          const pageWidth = pdf.internal.pageSize.getWidth();
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, "PNG", 20, yOffset, imgWidth, imgHeight);

          document.body.removeChild(hiddenDiv);

          const percent = Math.round(((page + 1) / rowChunks.length) * 100);
          const radial = document.getElementById("swal-radial-progress");
          const label = document.getElementById("swal-radial-label");
          if (radial) {
            radial.setAttribute("aria-valuenow", percent.toString());
            (radial as HTMLElement).style.setProperty("--progress", `${percent}%`);
          }
          if (label) {
            label.textContent = `${percent}%`;
          }
        }

        pdf.save(`${fileLabel}.pdf`);
        Swal.close();
      }, 0);
    }
  });
}
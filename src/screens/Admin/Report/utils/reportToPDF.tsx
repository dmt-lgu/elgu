import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { regionKeyToCode } from "./mockData";
import Swal from "sweetalert2";

/**
 * Helper to format a month string (yyyy-MM or yyyy-MM-dd) to "Month YYYY"
 */
function formatMonthYear(monthStr: string): string {
  if (!monthStr) return "";
  // Accept both "yyyy-MM" and "yyyy-MM-dd"
  const parts = monthStr.split("-");
  if (parts.length < 2) return monthStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  if (isNaN(year) || isNaN(month)) return monthStr;
  const date = new Date(year, month, 1);
  return date.toLocaleString('default', { month: 'long', year: 'numeric' });
}

/**
 * Helper to get a month range label for an array of months
 */
function getMonthRangeLabel(months: string[] | undefined): string {
  if (!months || months.length === 0) return "";
  if (months.length === 1) {
    return `(${formatMonthYear(months[0])})`;
  }
  return `(${formatMonthYear(months[0])} - ${formatMonthYear(months[months.length - 1])})`;
}

export async function exportTableReportToPDF({
  filteredResults,
  lguToRegion,
  dateRangeLabel,
  logoUrl,
  fileLabel = "report",
  isDayMode = false,
}: {
  filteredResults: any[];
  lguToRegion: Record<string, string>;
  dateRangeLabel: string;
  logoUrl: string;
  fileLabel?: string;
  isDayMode?: boolean;
}) {
  // 1. Group by region
  const regionGroups: Record<string, any[]> = {};
  filteredResults.forEach(lgu => {
    const regionKey = lgu.region || lgu.regionCode || lguToRegion[lgu.lgu] || "Unknown";
    if (!regionGroups[regionKey]) regionGroups[regionKey] = [];
    regionGroups[regionKey].push(lgu);
  });

  // 2. Flatten to rows for pagination
  type RowData = {
    regionKey: string;
    lgu: any;
    month?: string; // for day mode
    monthData?: any; // for day mode
  };
  const allRows: RowData[] = [];
  Object.entries(regionGroups).forEach(([regionKey, lguList]) => {
    if (isDayMode) {
      lguList.forEach((lgu: any) => {
        lgu.monthlyResults.forEach((month: any) => {
          allRows.push({
            regionKey,
            lgu,
            month: month.month,
            monthData: month,
          });
        });
      });
    } else {
      lguList.forEach((lgu: any) => {
        allRows.push({
          regionKey,
          lgu,
        });
      });
    }
  });

  // 3. Paginate: Use a safe number of rows per page to avoid memory issues
  const ROWS_FIRST_PAGE = 8;
  const ROWS_PER_PAGE = 10;
  const MAX_ROWS_PER_PAGE = 15; // Absolute max per page for safety

  const rowChunks: RowData[][] = [];
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

  // Define column widths (in px, adjust as needed)
  const columnWidths = [
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

  // Helper for <td> with column width and font
  function makeTd(val: any, opts: { bold?: boolean; align?: string; color?: string; bg?: string; fontSize?: string; width?: string; striped?: boolean } = {}) {
    const td = document.createElement('td');
    td.textContent = val != null ? val : "0";
    td.style.border = '#e5e5e5 0.5px solid'; // Use 0.5px border
    td.style.textAlign = opts.align || 'center';
    td.style.fontFamily = "'Rubik', sans-serif";
    if (opts.bold) td.style.fontWeight = 'bold';
    if (opts.color) td.style.color = opts.color;
    if (opts.bg) td.style.background = opts.bg;
    if (opts.fontSize) td.style.fontSize = opts.fontSize;
    if (opts.width) td.style.width = opts.width;
    // Only apply striped background if requested
    if (opts.striped) td.style.background = "#e4e4e7";
    return td;
  }

  // Calculate grand totals (same as TableReport)
  function calculateGrandTotals(results: any[]): any {
    return results.reduce(
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
    );
  }

  // 5. Helper: create a table chunk for a page
  const createTableChunk = (
    rows: RowData[],
    isLastPage: boolean
  ) => {
    const wrapperDiv = document.createElement('div');
    wrapperDiv.style.width = '1200px';
    wrapperDiv.style.background = '#fff';
    wrapperDiv.style.fontFamily = "'Rubik', sans-serif";

    // Table
    const tableChunk = document.createElement('table');
    tableChunk.setAttribute('style', 'width: 100%; font-size: 10px; font-family: Rubik, sans-serif;');

    // Header
    const thead = document.createElement('thead');
    // First header row (title)
    const headerRow1 = document.createElement('tr');
    const th1 = document.createElement('th');
    th1.colSpan = 16;
    th1.textContent = dateRangeLabel || "Report";
    th1.style.background = '#9ec6f7';
    th1.style.fontWeight = 'bold';
    th1.style.fontSize = '20px';
    th1.style.textAlign = 'center';
    th1.style.fontFamily = "'Rubik', sans-serif";
    th1.style.padding = "12px";
    th1.style.border = '#e5e5e5 0.5px solid';
    headerRow1.appendChild(th1);
    thead.appendChild(headerRow1);

    // Second header row (main columns)
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

    // Third header row (subcolumns)
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

    tableChunk.appendChild(thead);

    // Body
    const tbodyChunk = document.createElement('tbody');
    let prevRegionKey: string | null = null;
    let regionRowsLeft = 0;

    // Count how many rows for each region on this page
    const regionCounts: Record<string, number> = {};
    rows.forEach(r => {
      regionCounts[r.regionKey] = (regionCounts[r.regionKey] || 0) + 1;
    });

    rows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      // We'll apply striped background only to data cells (not region cell)
      const isStriped = idx % 2 === 1;

      // Region cell (never striped)
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
        // Do not append region cell (rowSpan)
      }

      // LGU cell (with province and month info)
      const lguTd = document.createElement('td');
      lguTd.style.border = '#e5e5e5 0.5px solid';
      lguTd.style.textAlign = 'left';
      lguTd.style.fontFamily = "'Rubik', sans-serif";
      lguTd.style.width = columnWidths[1] + "px";
      lguTd.style.padding = "4px 2px";
      if (isStriped) lguTd.style.background = "#e4e4e7";

      // Compose LGU and province (bold), month info (normal)
      let lguText = row.lgu.lgu || "";
      if (row.lgu.province) lguText += ` (${row.lgu.province})`;

      let monthInfo = "";
      // Always show month/year info for each row, matching the UI
      if (isDayMode && row.month) {
        monthInfo = ` (${formatMonthYear(row.month)})`;
      } else if (!isDayMode && row.lgu.months && row.lgu.months.length > 0) {
        monthInfo = ` ${getMonthRangeLabel(row.lgu.months)}`;
      }

      // Set innerHTML for bold LGU+province, normal month, with dynamic font size
      lguTd.innerHTML = `
        <span style="font-weight:bold; font-size:10px; font-family:'Rubik', sans-serif;">${lguText}</span>
        <span style="font-weight:normal; color: #1d4ed8; font-size:7px; font-family:'Rubik', sans-serif;">
            <br />
            ${monthInfo}
        </span>
        `;
      tr.appendChild(lguTd);

      // Data columns (striped only if isStriped)
      let data;
      if (isDayMode && row.monthData) {
        data = row.monthData;
      } else if (row.lgu.sum && Object.keys(row.lgu.sum).length > 0) {
        data = row.lgu.sum;
      } else {
        data = {};
      }
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

      tbodyChunk.appendChild(tr);
    });

    // --- Grand Total Row (only on last page) ---
    if (isLastPage) {
      const grandTotals = calculateGrandTotals(filteredResults);
      const totalTr = document.createElement('tr');
      totalTr.style.background = "#4b5563";
      totalTr.style.color = "white";
      totalTr.style.fontWeight = "bold";
      totalTr.style.fontFamily = "'Rubik', sans-serif";
      // Grand total label cell
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
      grandTotalCell.style.textAlign = "start";
      grandTotalCell.style.padding = "12px 8px";
      grandTotalCell.style.fontFamily = "'Rubik', sans-serif";
      grandTotalCell.style.width = (columnWidths[0] + columnWidths[1]) + "px";
      grandTotalCell.style.border = '#e5e5e5 0.5px solid';

      totalTr.appendChild(grandTotalCell);
      // Data cells (no striped background)
      totalTr.appendChild(makeTd(grandTotals.newPaid, { color: "#fff", bg: "#4b5563", width: columnWidths[2] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.newGeoPay, { color: "#fff", bg: "#4b5563", width: columnWidths[3] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.newPending, { color: "#fff", bg: "#4b5563", width: columnWidths[4] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.newPaid + grandTotals.newGeoPay + grandTotals.newPending, { color: "#fff", bg: "#4b5563", width: columnWidths[5] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.renewalPaid, { color: "#fff", bg: "#4b5563", width: columnWidths[6] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.renewalGeoPay, { color: "#fff", bg: "#4b5563", width: columnWidths[7] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.renewalPending, { color: "#fff", bg: "#4b5563", width: columnWidths[8] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.renewalPaid + grandTotals.renewalGeoPay + grandTotals.renewalPending, { color: "#fff", bg: "#4b5563", width: columnWidths[9] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.malePaid, { color: "#fff", bg: "#4b5563", width: columnWidths[10] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.malePending, { color: "#fff", bg: "#4b5563", width: columnWidths[11] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.malePaid + grandTotals.malePending, { color: "#fff", bg: "#4b5563", width: columnWidths[12] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.femalePaid, { color: "#fff", bg: "#4b5563", width: columnWidths[13] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.femalePending, { color: "#fff", bg: "#4b5563", width: columnWidths[14] + "px" }));
      totalTr.appendChild(makeTd(grandTotals.femalePaid + grandTotals.femalePending, { color: "#fff", bg: "#4b5563", width: columnWidths[15] + "px" }));
      tbodyChunk.appendChild(totalTr);
    }

    tableChunk.appendChild(tbodyChunk);
    wrapperDiv.appendChild(tableChunk);
    return wrapperDiv;
  };

  // --- SWEETALERT2 PROGRESS BAR ---
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
            yOffset = 20; // No logo on subsequent pages
          }
          const isLastPage = page === rowChunks.length - 1;

          // Create table chunk for this page
          const tableChunkDiv = createTableChunk(rowChunks[page], isLastPage);
          // Render to hidden DOM for html2canvas
          const hiddenDiv = document.createElement('div');
          hiddenDiv.style.position = 'fixed';
          hiddenDiv.style.left = '-99999px';
          hiddenDiv.style.top = '0';
          hiddenDiv.style.width = '1200px';
          hiddenDiv.style.background = "#fff";
          hiddenDiv.style.fontFamily = "'Rubik', sans-serif";
          document.body.appendChild(hiddenDiv);
          hiddenDiv.appendChild(tableChunkDiv);

          // Wait for DOM to render
          // eslint-disable-next-line no-await-in-loop
          await new Promise(resolve => setTimeout(resolve, 50));

          // Render table chunk to canvas (lower scale for memory safety)
          // eslint-disable-next-line no-await-in-loop
          const canvas = await html2canvas(tableChunkDiv, { scale: 1.2, useCORS: true, backgroundColor: "#fff" });
          const imgData = canvas.toDataURL("image/png");
          const pageWidth = pdf.internal.pageSize.getWidth();
          const imgWidth = pageWidth - 40;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, "PNG", 20, yOffset, imgWidth, imgHeight);

          document.body.removeChild(hiddenDiv);

          // --- UPDATE RADIAL PROGRESS BAR ---
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
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { regionKeyToCode } from "./mockData";


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

  // 3. Paginate: first page 8 rows, rest 10 per page
  const rowChunks: RowData[][] = [];
  let idx = 0;
  if (allRows.length > 0) {
    rowChunks.push(allRows.slice(0, 8));
    idx = 8;
    while (idx < allRows.length) {
      rowChunks.push(allRows.slice(idx, idx + 10));
      idx += 10;
    }
  } else {
    rowChunks.push([]);
  }

  // 4. Prepare PDF
  const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

  // Helper for formatting month
  function formatMonthYear(monthStr: string): string {
    if (!monthStr) return "";
    const [year, month] = monthStr.split("-");
    if (!year || !month) return monthStr;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
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
  function makeTd(val: any, opts: { bold?: boolean; align?: string; color?: string; bg?: string; fontSize?: string; width?: string } = {}) {
    const td = document.createElement('td');
    td.textContent = val != null ? val : "0";
    td.style.border = '1px solid #ccc';
    td.style.textAlign = opts.align || 'center';
    td.style.fontFamily = "'Rubik', sans-serif"; // Standardized
    if (opts.bold) td.style.fontWeight = 'bold';
    if (opts.color) td.style.color = opts.color;
    if (opts.bg) td.style.background = opts.bg;
    if (opts.fontSize) td.style.fontSize = opts.fontSize;
    if (opts.width) td.style.width = opts.width;
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
    wrapperDiv.style.fontFamily = "'Rubik', sans-serif"; // Standardized

    // Table
    const tableChunk = document.createElement('table');
    tableChunk.setAttribute('style', 'width: 100%; font-size: 10px; font-family: Rubik, sans-serif;'); // Standardized

    // Header
    const thead = document.createElement('thead');
    // First header row (title)
    const headerRow1 = document.createElement('tr');
    const th1 = document.createElement('th');
    th1.colSpan = 16;
    th1.textContent = dateRangeLabel || "Report";
    th1.style.background = '#cbd5e1';
    th1.style.fontWeight = 'bold';
    th1.style.fontSize = '20px';
    th1.style.textAlign = 'center';
    th1.style.fontFamily = "'Rubik', sans-serif"; // Standardized
    th1.style.padding = "12px";
    th1.style.border = '1px solid #ccc';
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
      th.style.background = '#cbd5e1';
      th.style.fontWeight = 'bold';
      th.style.border = '1px solid #ccc';
      th.style.textAlign = 'center';
      th.style.fontFamily = "'Rubik', sans-serif"; // Standardized
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
      th.style.background = '#cbd5e1';
      th.style.fontWeight = 'bold';
      th.style.border = '1px solid #ccc';
      th.style.textAlign = 'center';
      th.style.fontFamily = "'Rubik', sans-serif"; // Standardized
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
      // Region cell
      if (idx === 0 || row.regionKey !== prevRegionKey) {
        const td = document.createElement('td');
        td.textContent = regionKeyToCode[row.regionKey] || row.regionKey;
        td.style.border = '1px solid #ccc';
        td.style.fontWeight = 'bold';
        // td.style.background = '#ccc';
        td.style.textAlign = 'center';
        td.style.fontFamily = "'Rubik', sans-serif"; // Standardized
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
      lguTd.style.border = '1px solid #ccc';
      lguTd.style.textAlign = 'left';
      lguTd.style.fontFamily = "'Rubik', sans-serif"; // Standardized
      lguTd.style.width = columnWidths[1] + "px";
      lguTd.style.padding = "4px 2px"; 

      // Compose LGU and province (bold), month info (normal)
      let lguText = row.lgu.lgu || "";
      if (row.lgu.province) lguText += ` (${row.lgu.province})`;

      let monthInfo = "";
      if (isDayMode && row.month) {
        monthInfo = ` (${formatMonthYear(row.month)})`;
      } else if (!isDayMode && row.lgu.months && row.lgu.months.length > 0) {
        if (row.lgu.months.length === 1) {
          monthInfo = ` (${formatMonthYear(row.lgu.months[0])})`;
        } else {
          monthInfo = ` (${formatMonthYear(row.lgu.months[0])} - ${formatMonthYear(row.lgu.months[row.lgu.months.length - 1])})`;
        }
      }
      // Determine font sizes based on date range type
      let lguTextFontSize = "8px";
      let monthInfoFontSize = "8px";
      if (isDayMode) {
        lguTextFontSize = "12px";
        monthInfoFontSize = "10px";
      }

      // Set innerHTML for bold LGU+province, normal month, with dynamic font size
      lguTd.innerHTML = `
        <span style="font-weight:bold; font-size:${lguTextFontSize}; font-family:'Rubik', sans-serif;">${lguText}</span>
        <span style="font-weight:normal; font-size:${monthInfoFontSize}; font-family:'Rubik', sans-serif;">
            <br />
            ${monthInfo}
        </span>
        `;
      tr.appendChild(lguTd);

      // Data columns
      let data;
      if (isDayMode && row.monthData) {
        data = row.monthData;
      } else if (row.lgu.sum && Object.keys(row.lgu.sum).length > 0) {
        data = row.lgu.sum;
      } else {
        data = {};
      }
      // NEW
      tr.appendChild(makeTd(data.newPaid, { width: columnWidths[2] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd(data.newPaidViaEgov, { width: columnWidths[3] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd(data.newPending, { width: columnWidths[4] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd((data.newPaid || 0) + (data.newPaidViaEgov || 0) + (data.newPending || 0), { width: columnWidths[5] + "px", fontSize: "10px", bg: "#e5e5e5" }));
      // RENEWAL
      tr.appendChild(makeTd(data.renewPaid, { width: columnWidths[6] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd(data.renewPaidViaEgov, { width: columnWidths[7] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd(data.renewPending, { width: columnWidths[8] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd((data.renewPaid || 0) + (data.renewPaidViaEgov || 0) + (data.renewPending || 0), { width: columnWidths[9] + "px", fontSize: "10px", bg: "#e5e5e5" }));
      // MALE
      tr.appendChild(makeTd(data.malePaid, { width: columnWidths[10] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd(data.malePending, { width: columnWidths[11] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd((data.malePaid || 0) + (data.malePending || 0), { width: columnWidths[12] + "px", fontSize: "10px", bg: "#e5e5e5" }));
      // FEMALE
      tr.appendChild(makeTd(data.femalePaid, { width: columnWidths[13] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd(data.femalePending, { width: columnWidths[14] + "px", fontSize: "10px" }));
      tr.appendChild(makeTd((data.femalePaid || 0) + (data.femalePending || 0), { width: columnWidths[15] + "px", fontSize: "10px", bg: "#e5e5e5" }));

      tbodyChunk.appendChild(tr);
    });

    // --- Grand Total Row (only on last page) ---
    if (isLastPage) {
      const grandTotals = calculateGrandTotals(filteredResults);
      const totalTr = document.createElement('tr');
      totalTr.style.background = "#4b5563";
      totalTr.style.color = "white";
      totalTr.style.fontWeight = "bold";
      totalTr.style.fontFamily = "'Rubik', sans-serif"; // Standardized
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
      grandTotalCell.style.fontFamily = "'Rubik', sans-serif"; // Standardized
      grandTotalCell.style.width = (columnWidths[0] + columnWidths[1]) + "px";
      grandTotalCell.style.border = '1px solid #ccc';

      totalTr.appendChild(grandTotalCell);
      // Data cells
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

  // 6. Render each chunk to canvas and add to PDF
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
    logoHeight = 70;
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
    // Only include date label on first page
    // Only include date label on first page
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
    hiddenDiv.style.fontFamily = "'Rubik', sans-serif"; // Standardized
    document.body.appendChild(hiddenDiv);
    hiddenDiv.appendChild(tableChunkDiv);

    // Wait for DOM to render
    // eslint-disable-next-line no-await-in-loop
    await new Promise(resolve => setTimeout(resolve, 50));

    // Render table chunk to canvas
    // eslint-disable-next-line no-await-in-loop
    const canvas = await html2canvas(tableChunkDiv, { scale: 2, useCORS: true, backgroundColor: "#fff" });
    const imgData = canvas.toDataURL("image/png");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const imgWidth = pageWidth - 40;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 20, yOffset, imgWidth, imgHeight);

    document.body.removeChild(hiddenDiv);
  }

  pdf.save(`${fileLabel}.pdf`);
}
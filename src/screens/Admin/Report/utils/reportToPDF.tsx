import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { regionKeyToCode, regionMapping } from "./mockData";
import Swal from "sweetalert2";
import { format } from "date-fns";

// --- TYPE DEFINITIONS ---

type RowData = {
  regionKey: string;
  lgu: any;
  month?: string;
  monthData?: any;
  yearLabel?: string;
};

interface ExportTableReportToPDFParams {
  filteredResults: any[];
  lguToRegion: Record<string, string>;
  dateRangeLabel: string;
  logoUrl: string;
  fileLabel?: string;
  moduleLabel?: string;
  selectedDateType?: string;
  captureElement?: HTMLElement | null;
  captureSelector?: string;
}

// --- CONSTANTS ---

const columnWidths = {
  bc: ["20%", "60%", "20%"],
  co: ["20%", "40%", "20%", "20%"],
  bldg: ["20%", "40%", "20%", "20%"],
  bp: [
    "7%", "15%", "5%", "7%", "5%", "7%", "5%", "7%",
    "5%", "7%", "5%", "5%", "6%", "5%", "5%", "6%",
  ],
};

// --- HELPERS (no changes needed here) ---

const formatMonthYear = (monthStr: string): string => {
  if (!monthStr) return "";
  const parts = monthStr.split("-");
  if (parts.length < 2) return monthStr;
  const year = Number(parts[0]);
  const month = Number(parts[1]) - 1;
  if (isNaN(year) || isNaN(month)) return monthStr;
  const date = new Date(year, month, 1);
  return date.toLocaleString("default", { month: "long", year: "numeric" });
};

const getMonthRangeLabel = (months?: string[]): string => {
  if (!months || months.length === 0) return "";
  if (months.length === 1) return `(${formatMonthYear(months[0])})`;
  return `(${formatMonthYear(months[0])} - ${formatMonthYear(
    months[months.length - 1]
  )})`;
};

const makeTd = (val: any, opts: any = {}): HTMLTableCellElement => {
  const td = document.createElement("td");
  td.innerHTML = val != null && val !== "" ? String(val) : "0";
  td.style.border = "#e5e5e5 0.5px solid";
  td.style.padding = "5px";
  td.style.textAlign = opts.align || "center";
  td.style.fontFamily = "'Rubik', sans-serif";
  td.style.verticalAlign = "middle";
  td.style.fontSize = opts.fontSize || "11px";
  if (opts.bold) td.style.fontWeight = "bold";
  if (opts.color) td.style.color = opts.color;
  if (opts.bg) td.style.background = opts.bg;
  if (opts.striped) td.style.background = "#f4f4f5";
  if (opts.colSpan) td.colSpan = opts.colSpan;
  return td;
};

const createPdfHeader = (
  logoUrl: string,
  moduleLabel: string,
  dateRangeLabel: string,
  generatedAt: Date
): HTMLDivElement => {
  const headerContainer = document.createElement("div");
  headerContainer.style.display = "flex";
  headerContainer.style.justifyContent = "space-between";
  headerContainer.style.alignItems = "flex-start";
  headerContainer.style.marginBottom = "16px";

  const logoImg = document.createElement("img");
  logoImg.src = logoUrl;
  logoImg.style.width = "300px";
  logoImg.style.height = "auto";
  headerContainer.appendChild(logoImg);

  const infoDiv = document.createElement("div");
  infoDiv.style.textAlign = "right";
  infoDiv.innerHTML = `
      <h2 style="font-size: 20px; font-weight: bold; margin: 0; font-family: 'Rubik', sans-serif;">${
        moduleLabel || "Report"
      }</h2>
      ${
        dateRangeLabel
          ? `<p style="font-size: 13px; font-weight: bold; color: #333; margin: 5px 0 0 0; font-family: 'Rubik', sans-serif;">${dateRangeLabel}</p>`
          : ""
      }
      <p style="font-size: 11px; color: #555; margin: 8px 0 0 0; font-family: 'Rubik', sans-serif;">Generated on: ${format(
        generatedAt,
        "MMM dd, yyyy, h:mm:ss a"
      )}</p>
    `;
  headerContainer.appendChild(infoDiv);
  return headerContainer;
};

const createReportTableHeader = (
  _moduleLabel: any,
  isCO: boolean,
  isBldg: boolean,
  isBC: boolean
): HTMLTableSectionElement => {
  const thead = document.createElement("thead");
  const applyThBase = (th: HTMLTableCellElement) => {
    th.style.background = "#9ec6f7";
    th.style.fontWeight = "bold";
    th.style.border = "#e5e5e5 0.5px solid";
    th.style.textAlign = "center";
    th.style.verticalAlign = "middle";
    th.style.whiteSpace = "normal";
    th.style.wordBreak = "break-word";
    th.style.lineHeight = "1.15";
  };

  if (isBC) {
    const headerRow = document.createElement("tr");
    ["Region", "LGU", "Total Results"].forEach((label, idx) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.style.width = columnWidths.bc[idx];
      applyThBase(th);
      th.style.padding = "10px 10px";
      th.style.fontSize = "16px";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
  } else if (isCO || isBldg) {
    const headerRow = document.createElement("tr");
    const labels = ["Region", "LGU", "Pending", "Paid"];
    const widths = isCO ? columnWidths.co : columnWidths.bldg;
    labels.forEach((label, idx) => {
      const th = document.createElement("th");
      th.textContent = label;
      th.style.width = widths[idx];
      applyThBase(th);
      th.style.padding = "8px 6px";
      th.style.fontSize = "12px";
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
  } else {
    const headerRow1 = document.createElement("tr");
    [
      { label: "Region", rowSpan: 2 }, { label: "LGU", rowSpan: 2 },
      { label: "NEW", colSpan: 4 }, { label: "RENEWAL", colSpan: 4 },
      { label: "MALE", colSpan: 3 }, { label: "FEMALE", colSpan: 3 },
    ].forEach((col, idx) => {
      const th = document.createElement("th");
      th.textContent = col.label;
      if (idx < 2) th.style.width = columnWidths.bp[idx];
      applyThBase(th);
      th.style.padding = "8px 6px";
      th.style.fontSize = "12px";
      if (col.rowSpan) th.rowSpan = col.rowSpan;
      if (col.colSpan) th.colSpan = col.colSpan;
      headerRow1.appendChild(th);
    });

    const headerRow2 = document.createElement("tr");
    const labels2 = [
      "PAID", "PAID (eGOVPay)", "PENDING", "GRANDTOTAL PER LGU",
      "PAID", "PAID (eGOVPay)", "PENDING", "GRANDTOTAL PER LGU",
      "PAID", "PENDING", "GRANDTOTAL PER LGU",
      "PAID", "PENDING", "GRANDTOTAL PER LGU",
    ] as const;

    labels2.forEach((label, idx) => {
      const th = document.createElement("th");
      if (label.includes("(eGOVPay)")) {
        th.innerHTML = "PAID<br /><span style='font-size:9px; font-weight:normal;'>(Per OR<br/>Paid with<br/>eGOVPay)</span>";
        th.style.fontSize = "10px";
      } else if (label.includes("GRANDTOTAL")) {
        th.innerHTML = "GRAND TOTAL<br/><span style='font-size:8px; font-weight:bold;'>PER LGU</span>";
        th.style.fontSize = "10px";
        (th.style as any).minWidth = "100px";
        th.style.padding = "6px 4px";
        th.style.letterSpacing = "0.2px";
      } else {
        th.textContent = label;
        th.style.fontSize = "11px";
      }
      th.style.width = columnWidths.bp[idx + 2];
      applyThBase(th);
      if (!label.includes("GRANDTOTAL")) {
        th.style.padding = label.includes("(eGOVPay)") ? "4px 3px" : "6px 4px";
      }
      headerRow2.appendChild(th);
    });

    thead.appendChild(headerRow1);
    thead.appendChild(headerRow2);
  }
  return thead;
};

const createReportGrandTotalRow = (
  filteredResults: any[], isBC: boolean, isCO: boolean, isBldg: boolean,
  isDayMode: boolean, dateRangeLabel: string, isLastPage: boolean
): HTMLTableRowElement => {
  const totalTr = document.createElement("tr");
  totalTr.style.background = "#3a4554";
  totalTr.style.color = "white";
  totalTr.style.fontWeight = "bold";

  const grandTotalCell = makeTd("", { bold: true, align: "left", bg: "#3a4554", color: "#fff", fontSize: "12px" });
  grandTotalCell.colSpan = 2;
  grandTotalCell.innerHTML = `GRAND TOTAL FOR <br/><span style="font-size:9px; font-weight:normal;">(${dateRangeLabel})</span>`;
  totalTr.appendChild(grandTotalCell);

  const commonProps = { bold: true, bg: "#3a4554", color: "#fff" };

  if (isBC) {
    const total = filteredResults.reduce((sum, lgu) => {
      if (isDayMode && lgu.monthlyResults) {
        return sum + lgu.monthlyResults.reduce((mSum: number, month: any) => mSum + (month.totalCount || 0), 0);
      }
      return sum + (lgu.totalCount || lgu.sum?.totalCount || 0);
    }, 0);
    totalTr.appendChild(makeTd(total, { ...commonProps, fontSize: "16px" }));
  } else if (isCO || isBldg) {
    const pendingKey = isCO ? "coPending" : "buildingPending";
    const paidKey = isCO ? "coPaid" : "buildingPaid";
    const totalPending = filteredResults.reduce((sum, lgu) => sum + (lgu.sum?.[pendingKey] || lgu?.[pendingKey] || 0), 0);
    const totalPaid = filteredResults.reduce((sum, lgu) => sum + (lgu.sum?.[paidKey] || lgu?.[paidKey] || 0), 0);
    totalTr.appendChild(makeTd(totalPending, commonProps));
    totalTr.appendChild(makeTd(totalPaid, commonProps));
  } else {
    const totals = filteredResults.reduce((acc, lgu) => {
      const dataToSum = isDayMode ? lgu.monthlyResults || [] : lgu.sum ? [lgu.sum] : [];
      dataToSum.forEach((s: any) => {
        acc.newPaid += s.newPaid || 0;
        acc.newGeoPay += s.newPaidViaEgov || 0;
        acc.newPending += s.newPending || 0;
        acc.renewalPaid += s.renewPaid || 0;
        acc.renewalGeoPay += s.renewPaidViaEgov || 0;
        acc.renewalPending += s.renewPending || 0;
        acc.malePaid += s.malePaid || 0;
        acc.malePending += s.malePending || 0;
        acc.femalePaid += s.femalePaid || 0;
        acc.femalePending += s.femalePending || 0;
      });
      return acc;
    }, { newPaid: 0, newGeoPay: 0, newPending: 0, renewalPaid: 0, renewalGeoPay: 0, renewalPending: 0, malePaid: 0, malePending: 0, femalePaid: 0, femalePending: 0 });

    totalTr.appendChild(makeTd(totals.newPaid, commonProps));
    totalTr.appendChild(makeTd(totals.newGeoPay, commonProps));
    totalTr.appendChild(makeTd(totals.newPending, commonProps));
    totalTr.appendChild(makeTd(totals.newPaid + totals.newGeoPay + totals.newPending, commonProps));
    totalTr.appendChild(makeTd(totals.renewalPaid, commonProps));
    totalTr.appendChild(makeTd(totals.renewalGeoPay, commonProps));
    totalTr.appendChild(makeTd(totals.renewalPending, commonProps));
    totalTr.appendChild(makeTd(totals.renewalPaid + totals.renewalGeoPay + totals.renewalPending, commonProps));
    totalTr.appendChild(makeTd(totals.malePaid, commonProps));
    totalTr.appendChild(makeTd(totals.malePending, commonProps));
    totalTr.appendChild(makeTd(totals.malePaid + totals.malePending, commonProps));
    totalTr.appendChild(makeTd(totals.femalePaid, commonProps));
    totalTr.appendChild(makeTd(totals.femalePending, commonProps));
    totalTr.appendChild(makeTd(totals.femalePaid + totals.femalePending, commonProps));
  }
  if (!isLastPage) totalTr.style.visibility = "hidden";
  return totalTr;
};

const createPageContent = (
  rows: RowData[], isLastPage: boolean, params: ExportTableReportToPDFParams, generatedAt: Date,
  _isSimpleReport: boolean, isBC: boolean, isCO: boolean, isBldg: boolean,
  isDayMode: boolean, isLandscape: boolean
): HTMLDivElement => {
  const { logoUrl, moduleLabel = "Report", dateRangeLabel, filteredResults } = params;
  const wrapperDiv = document.createElement("div");
  const isBP = moduleLabel === "Business Permit";
  const isWP = moduleLabel === "Working Permit";
  const isSimpleModule = isBC || isCO || isBldg;
  const isWideModule = isBP || isWP || isSimpleModule;
  const desiredWidthPx = isLandscape ? (isWideModule ? 1280 : 1100) : (isSimpleModule ? 1100 : 1000);

  wrapperDiv.style.cssText = `display: inline-block; background: #fff; font-family: 'Rubik', sans-serif; padding: 16px; width: ${desiredWidthPx}px;`;

  const header = createPdfHeader(logoUrl, moduleLabel, dateRangeLabel, generatedAt);
  wrapperDiv.appendChild(header);

  const tableChunk = document.createElement("table");
  tableChunk.setAttribute("style", `width: 100%; font-size: 11px; font-family: Rubik, sans-serif; border-collapse: collapse; table-layout: fixed;`);
  const thead = createReportTableHeader(moduleLabel, isCO, isBldg, isBC);
  tableChunk.appendChild(thead);
  const tbodyChunk = document.createElement("tbody");

  let prevRegionKey: string | null = null;
  const regionCountsOnPage: Record<string, number> = {};
  rows.forEach((r) => { regionCountsOnPage[r.regionKey] = (regionCountsOnPage[r.regionKey] || 0) + 1; });

  rows.forEach((row, idx) => {
    const tr = document.createElement("tr");
    const isStriped = idx % 2 === 0;
    if (row.regionKey !== prevRegionKey) {
      const regionText = regionKeyToCode[row.regionKey] || row.regionKey || "N/A";
      const regionFontSize = isBC ? "18px" : (isLandscape ? "14px" : "13px");
      const td = makeTd(regionText, { bold: true, fontSize: regionFontSize });
      (td.style as any).padding = isBC ? "10px 6px" : "8px 6px";
      td.rowSpan = regionCountsOnPage[row.regionKey];
      tr.appendChild(td);
      prevRegionKey = row.regionKey;
    }
    const lguParts = (row.lgu?.lgu || "").split(",");
    const lguName = lguParts[0] ? lguParts[0].trim() : "";
    const provinceName = row.lgu?.province || (lguParts[1] ? lguParts[1].trim() : "");
    const lguNameSize = isBC ? "16px" : "11px";
    const provinceNameSize = isBC ? "13px" : "10px";
    const dateSize = isBC ? "12px" : "9px";

    const lguHtml = `<span style="font-weight:bold; font-size:${lguNameSize};">${lguName}</span>
      ${provinceName ? `<br><span style="font-weight:normal; font-size:${provinceNameSize};">${provinceName}</span>` : ""}
      <br/><span style="font-size:${dateSize}; color:#1d4ed8;">
        ${isDayMode ? `(${formatMonthYear(row.month || "")})` : getMonthRangeLabel(row.lgu?.months)}
      </span>`;
    tr.appendChild(makeTd(lguHtml, { align: "center", striped: isStriped }));

    if (isBC) {
      const data = isDayMode ? row.monthData : row.lgu;
      tr.appendChild(makeTd((data?.totalCount ?? 0), { striped: isStriped, fontSize: "12px" }));
    } else if (isCO || isBldg) {
      const src = isDayMode ? row.monthData : (row.lgu?.sum ?? row.lgu ?? {});
      const pendingKey = isCO ? "coPending" : "buildingPending";
      const paidKey = isCO ? "coPaid" : "buildingPaid";
      tr.appendChild(makeTd(src?.[pendingKey] ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd(src?.[paidKey] ?? 0, { striped: isStriped }));
    } else {
      const data = isDayMode ? row.monthData : (row.lgu?.sum || {});
      tr.appendChild(makeTd(data?.newPaid ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd(data?.newPaidViaEgov ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd(data?.newPending ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd((data?.newPaid ?? 0) + (data?.newPaidViaEgov ?? 0) + (data?.newPending ?? 0), { bold: true, striped: isStriped }));
      tr.appendChild(makeTd(data?.renewPaid ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd(data?.renewPaidViaEgov ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd(data?.renewPending ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd((data?.renewPaid ?? 0) + (data?.renewPaidViaEgov ?? 0) + (data?.renewPending ?? 0), { bold: true, striped: isStriped }));
      tr.appendChild(makeTd(data?.malePaid ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd(data?.malePending ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd((data?.malePaid ?? 0) + (data?.malePending ?? 0), { bold: true, striped: isStriped }));
      tr.appendChild(makeTd(data?.femalePaid ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd(data?.femalePending ?? 0, { striped: isStriped }));
      tr.appendChild(makeTd((data?.femalePaid ?? 0) + (data?.femalePending ?? 0), { bold: true, striped: isStriped }));
    }
    tbodyChunk.appendChild(tr);
  });

  const totalTr = createReportGrandTotalRow(filteredResults, isBC, isCO, isBldg, isDayMode, dateRangeLabel, isLastPage);
  tbodyChunk.appendChild(totalTr);
  tableChunk.appendChild(tbodyChunk);
  wrapperDiv.appendChild(tableChunk);
  return wrapperDiv;
};

const sliceCanvasIntoPdf = async (opts: any) => {
  const { pdf, canvas, pageWidth, pageHeight, marginX, marginY, centerHorizontally = false, progressBar, progressLabel, flushFrame } = opts;
  const maxWidth = pageWidth - marginX * 2;
  const maxHeight = pageHeight - marginY * 2;
  const aspect = (canvas.width || 1) / (canvas.height || 1);
  let drawWidth = maxWidth;
  let drawHeight = drawWidth / aspect;
  if (drawHeight > maxHeight) {
    drawHeight = maxHeight;
    drawWidth = drawHeight * aspect;
  }
  const scaleX = drawWidth / (canvas.width || 1);
  const sliceHeightPx = Math.max(1, Math.floor(maxHeight / scaleX));
  const totalSlices = Math.ceil((canvas.height || 1) / sliceHeightPx);
  const temp = document.createElement("canvas");
  const tctx = temp.getContext("2d");
  temp.width = canvas.width;

  for (let i = 0; i < totalSlices; i++) {
    const startY = i * sliceHeightPx;
    const thisSlicePx = Math.max(1, Math.min(sliceHeightPx, canvas.height - startY));
    temp.height = thisSlicePx;
    tctx?.clearRect(0, 0, temp.width, temp.height);
    tctx?.drawImage(canvas, 0, startY, canvas.width, thisSlicePx, 0, 0, canvas.width, thisSlicePx);
    const imgData = temp.toDataURL("image/jpeg", 0.7);
    const sliceDrawHeight = thisSlicePx * scaleX;
    const xPos = centerHorizontally ? (pageWidth - drawWidth) / 2 : marginX;
    if (i > 0) pdf.addPage();
    pdf.addImage(imgData, "JPEG", xPos, marginY, drawWidth, sliceDrawHeight, undefined, "FAST");
    
    const progress = Math.round(((i + 1) / totalSlices) * 100);
    if (progressBar && progressLabel) {
      progressBar.style.width = `${progress}%`;
      progressLabel.textContent = `${progress}%`;
    }
    if ((i + 1) % 5 === 0) await flushFrame();
  }
  try { tctx?.clearRect(0, 0, temp.width, temp.height); (temp as any).width = 1; (temp as any).height = 1; } catch {}
};

/**
 * Main function to export tabular report data to a PDF file.
 */
export async function exportTableReportToPDF(params: ExportTableReportToPDFParams): Promise<void> {
  const { filteredResults, lguToRegion, fileLabel = "report", moduleLabel, selectedDateType, captureElement, captureSelector } = params;
  const generatedAt = new Date();
  const isBC = moduleLabel === "Barangay Clearance";
  const isCO = moduleLabel === "Certificate of Occupancy";
  const isBldg = moduleLabel === "Building Permit";
  const isBP = moduleLabel === "Business Permit";
  const isWP = moduleLabel === "Working Permit";
  const isDayMode = selectedDateType === "Day";
  let allRows: RowData[] = [];

  if (isDayMode) {
    filteredResults.forEach((lgu: any) => {
      const months = Array.isArray(lgu?.monthlyResults) ? lgu.monthlyResults : [];
      months.forEach((monthData: any) => {
        const regionKey = regionMapping[lgu?.region] || regionMapping[lgu?.regionCode] || lguToRegion?.[lgu?.lgu] || lgu?.region || lgu?.regionCode || "unknown";
        allRows.push({ regionKey, lgu, month: monthData?.month, monthData });
      });
    });
  } else {
    const regionGroups: Record<string, any[]> = {};
    filteredResults.forEach((lgu: any) => {
      const regionKey = regionMapping[lgu?.region] || regionMapping[lgu?.regionCode] || lguToRegion?.[lgu?.lgu] || lgu?.region || lgu?.regionCode || "unknown";
      if (!regionGroups[regionKey]) regionGroups[regionKey] = [];
      regionGroups[regionKey].push(lgu);
    });
    Object.entries(regionGroups).forEach(([regionKey, lguList]) => {
      lguList.forEach((lgu: any) => { allRows.push({ regionKey, lgu }); });
    });
  }

  const isSimpleReport = isBC || isCO || isBldg;
  const ROWS_PER_PAGE = isSimpleReport ? 22 : 10;
  const rowChunks: RowData[][] = [];
  if (allRows.length > 0) {
    for (let i = 0; i < allRows.length; i += ROWS_PER_PAGE) {
      rowChunks.push(allRows.slice(i, i + ROWS_PER_PAGE));
    }
  } else {
    rowChunks.push([]);
  }

  const flushFrame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

  // --- DYNAMIC MODAL TEXT ---
  const modalTitle = moduleLabel ? `Generating ${moduleLabel} Report` : 'Compiling Your Document';
  const modalSubtitle = moduleLabel ? `Please wait, we're preparing your ${moduleLabel.toLowerCase()} data.` : 'Gathering data and creating the PDF...';
  // --- END DYNAMIC TEXT ---

  await Swal.fire({
    width: 380,
    title: modalTitle,
    html: `
      <style>
        .swal-modal-container { display: flex; flex-direction: column; align-items: center; gap: 20px; padding-top: 10px; }
        /* From Uiverse.io by Nawsome */ 
        .typewriter { --blue: #5C86FF; --blue-dark: #275EFE; --key: #fff; --paper: #EEF0FD; --text: #D3D4EC; --tool: #FBC56C; --duration: 3s; position: relative; -webkit-animation: bounce05 var(--duration) linear infinite; animation: bounce05 var(--duration) linear infinite; }
        .typewriter .slide { width: 92px; height: 20px; border-radius: 3px; margin-left: 14px; transform: translateX(14px); background: linear-gradient(var(--blue), var(--blue-dark)); -webkit-animation: slide05 var(--duration) ease infinite; animation: slide05 var(--duration) ease infinite; }
        .typewriter .slide:before, .typewriter .slide:after, .typewriter .slide i:before { content: ""; position: absolute; background: var(--tool); }
        .typewriter .slide:before { width: 2px; height: 8px; top: 6px; left: 100%; }
        .typewriter .slide:after { left: 94px; top: 3px; height: 14px; width: 6px; border-radius: 3px; }
        .typewriter .slide i { display: block; position: absolute; right: 100%; width: 6px; height: 4px; top: 4px; background: var(--tool); }
        .typewriter .slide i:before { right: 100%; top: -2px; width: 4px; border-radius: 2px; height: 14px; }
        .typewriter .paper { position: absolute; left: 24px; top: -26px; width: 40px; height: 46px; border-radius: 5px; background: var(--paper); transform: translateY(46px); -webkit-animation: paper05 var(--duration) linear infinite; animation: paper05 var(--duration) linear infinite; }
        .typewriter .paper:before { content: ""; position: absolute; left: 6px; right: 6px; top: 7px; border-radius: 2px; height: 4px; transform: scaleY(0.8); background: var(--text); box-shadow: 0 12px 0 var(--text), 0 24px 0 var(--text), 0 36px 0 var(--text); }
        .typewriter .keyboard { width: 120px; height: 56px; margin-top: -10px; z-index: 1; position: relative; }
        .typewriter .keyboard:before, .typewriter .keyboard:after { content: ""; position: absolute; }
        .typewriter .keyboard:before { top: 0; left: 0; right: 0; bottom: 0; border-radius: 7px; background: linear-gradient(135deg, var(--blue), var(--blue-dark)); transform: perspective(10px) rotateX(2deg); transform-origin: 50% 100%; }
        .typewriter .keyboard:after { left: 2px; top: 25px; width: 11px; height: 4px; border-radius: 2px; box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); -webkit-animation: keyboard05 var(--duration) linear infinite; animation: keyboard05 var(--duration) linear infinite; }
        @keyframes bounce05 { 85%, 92%, 100% { transform: translateY(0); } 89% { transform: translateY(-4px); } 95% { transform: translateY(2px); } }
        @keyframes slide05 { 5% { transform: translateX(14px); } 15%, 30% { transform: translateX(6px); } 40%, 55% { transform: translateX(0); } 65%, 70% { transform: translateX(-4px); } 80%, 89% { transform: translateX(-12px); } 100% { transform: translateX(14px); } }
        @keyframes paper05 { 5% { transform: translateY(46px); } 20%, 30% { transform: translateY(34px); } 40%, 55% { transform: translateY(22px); } 65%, 70% { transform: translateY(10px); } 80%, 85% { transform: translateY(0); } 92%, 100% { transform: translateY(46px); } }
        @keyframes keyboard05 { 5%, 12%, 21%, 30%, 39%, 48%, 57%, 66%, 75%, 84% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 9% { box-shadow: 15px 2px 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 18% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 2px 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 27% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 12px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 36% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 12px 0 var(--key), 60px 12px 0 var(--key), 68px 12px 0 var(--key), 83px 10px 0 var(--key); } 45% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 2px 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 54% { box-shadow: 15px 0 0 var(--key), 30px 2px 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 63% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 12px 0 var(--key); } 72% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 2px 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 10px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } 81% { box-shadow: 15px 0 0 var(--key), 30px 0 0 var(--key), 45px 0 0 var(--key), 60px 0 0 var(--key), 75px 0 0 var(--key), 90px 0 0 var(--key), 22px 10px 0 var(--key), 37px 12px 0 var(--key), 52px 10px 0 var(--key), 60px 10px 0 var(--key), 68px 10px 0 var(--key), 83px 10px 0 var(--key); } }
        .swal-modal-subtitle { font-size: 1rem; color: #4b5563; margin-top: 5px; }
        .swal-progress-container { display: flex; align-items: center; justify-content: center; gap: 10px; width: 100%; margin-top: 15px; }
        .swal-progress-bar-container { width: 90%; height: 8px; background-color: #e5e7eb; border-radius: 4px; }
        .swal-progress-bar-fill { width: 0%; height: 100%; background-color: #3b82f6; border-radius: 4px; transition: width 0.2s ease-out; }
        .swal-progress-label { font-size: 0.9rem; font-weight: 600; color: #374151; }
      </style>
      <div class="swal-modal-container">
        <div class="typewriter">
          <div class="slide"><i></i></div>
          <div class="paper"></div>
          <div class="keyboard"></div>
        </div>
        <p class="swal-modal-subtitle">${modalSubtitle}</p>
        <div class="swal-progress-container">
            <div class="swal-progress-bar-container">
              <div id="swal-progress-bar" class="swal-progress-bar-fill"></div>
            </div>
            <span id="swal-progress-label" class="swal-progress-label">0%</span>
        </div>
      </div>
    `,
    allowOutsideClick: false,
    showConfirmButton: false,
    didOpen: () => {
      const progressBar = document.getElementById("swal-progress-bar") as HTMLElement | null;
      const progressLabel = document.getElementById("swal-progress-label") as HTMLElement | null;

      setTimeout(async () => {
        let pdf: jsPDF | null = null;
        try {
          const orientation = (isBP || isWP) ? "landscape" : (isSimpleReport ? "portrait" : "landscape");
          const isLandscape = orientation === "landscape";
          pdf = new jsPDF({ orientation, unit: "pt", format: "a4", compress: true, putOnlyUsedFonts: true } as any);
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const marginX = isSimpleReport ? 8 : 20;
          const marginY = 20;
          
          let elementToCapture: HTMLElement | null =
            captureElement instanceof HTMLElement
              ? captureElement
              : (captureSelector
                  ? (document.querySelector(captureSelector) as HTMLElement | null)
                  : null);

          if (elementToCapture) {
            await new Promise(res => setTimeout(res, 30));
            const canvas = await html2canvas(elementToCapture, { scale: 1.5, useCORS: true, backgroundColor: "#fff", scrollY: -window.scrollY });
            await sliceCanvasIntoPdf({ pdf, canvas, pageWidth, pageHeight, marginX, marginY, centerHorizontally: isBC && !isLandscape, progressBar, progressLabel, flushFrame });
            try { const ctx = canvas.getContext("2d"); ctx?.clearRect(0, 0, canvas.width, canvas.height); (canvas as any).width = 1; (canvas as any).height = 1; } catch {}
          } else {
            const totalChunks = rowChunks.length > 0 ? rowChunks.length : 1;
            for (let i = 0; i < totalChunks; i++) {
              if (i > 0) pdf.addPage();
              const chunk = rowChunks[i] || [];
              const isLastPage = i === totalChunks - 1;
              const tableDiv = createPageContent(chunk, isLastPage, params, generatedAt, isSimpleReport, isBC, isCO, isBldg, isDayMode, isLandscape);
              const hiddenDiv = document.createElement("div");
              hiddenDiv.style.position = "fixed"; hiddenDiv.style.left = "-9999px"; hiddenDiv.style.display = "inline-block";
              document.body.appendChild(hiddenDiv);
              hiddenDiv.appendChild(tableDiv);
              await new Promise(res => setTimeout(res, 30));
              
              const canvas = await html2canvas(tableDiv, { scale: 1.25, useCORS: true, backgroundColor: "#fff" });
              const imgData = canvas.toDataURL("image/jpeg", 0.7);
              const maxWidth = pageWidth - marginX * 2;
              const maxHeight = pageHeight - marginY * 2;
              const imgAspectRatio = canvas.width / canvas.height || 1;
              let imgWidth = maxWidth;
              let imgHeight = imgWidth / imgAspectRatio;
              if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = imgHeight * imgAspectRatio;
              }
              const xPos = isBC && !isLandscape ? (pageWidth - imgWidth) / 2 : marginX;
              pdf.addImage(imgData, "JPEG", xPos, marginY, imgWidth, imgHeight, undefined, "FAST");
              try { document.body.removeChild(hiddenDiv); } catch {}
              try { const ctx = canvas.getContext("2d"); if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height); (canvas as any).width = 1; (canvas as any).height = 1; } catch {}
              
              const progress = Math.round(((i + 1) / totalChunks) * 100);
              if (progressBar && progressLabel) {
                progressBar.style.width = `${progress}%`;
                progressLabel.textContent = `${progress}%`;
              }
              if ((i + 1) % 5 === 0) await flushFrame();
            }
          }
          if (progressBar && progressLabel) {
            progressBar.style.width = `100%`;
            progressLabel.textContent = `100%`;
            await flushFrame();
          }
          pdf.save(`${fileLabel}.pdf`);
        } catch (err) {
          console.error("Failed to generate PDF:", err);
          await Swal.fire({ icon: "error", title: "PDF Generation Failed", text: "Please try again or adjust your filters.", timer: 2000, showConfirmButton: false });
        } finally {
          Swal.close();
        }
      }, 50);
    },
  });
}
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as xlsx from 'xlsx';
import { format } from 'date-fns';

// --- REGION ORDER (R1..R13, CAR, BARMM1, BARMM2) ---
const REGION_ORDER_KEYS = [
  'region1', 'region2', 'region3', 'region4a', 'region4b', 'region5', 'region6',
  'region7', 'region8', 'region9', 'region10', 'region11', 'region12', 'region13',
  'CAR', 'BARMM1', 'BARMM2',
];

const regionOrderIndex = (key?: string | null): number => {
  if (!key) return Number.MAX_SAFE_INTEGER;
  const idx = REGION_ORDER_KEYS.findIndex(k => k.toLowerCase() === String(key).toLowerCase());
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};

const compareByRegion = (a: any, b: any): number => {
  const ia = regionOrderIndex(a?.region);
  const ib = regionOrderIndex(b?.region);
  if (ia !== ib) return ia - ib;
  // tie-breaker to keep deterministic order
  return String(a?.lgu || '').localeCompare(String(b?.lgu || ''));
};

// --- HELPER FUNCTIONS ---
export const regionGroups: Record<string, string> = {
  "region1": "R1", "region2": "R2", "region3": "R3", "region4a": "R4-A", "region4b": "R4-B",
  "region5": "R5", "region6": "R6", "region7": "R7", "region8": "R8", "region9": "R9",
  "region10": "R10", "region11": "R11", "region12": "R12", "region13": "R13", "CAR": "CAR",
  "BARMM1": "BARMM 1", "BARMM2": "BARMM 2",
};

const getRegionDisplayName = (regionKey: string): string => {
  return regionGroups[regionKey] || regionKey;
};

const loadImageAsBase64 = (url: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width; canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Cannot get canvas context'));
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (err) => reject(err);
    img.src = url;
  });
};

const formatNumberForDisplay = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
};

const formatNumberForExcel = (num: number | null | undefined): number => {
  return num || 0;
};

const formatMonthYear = (monthStr: string): string => {
  if (!monthStr) return "";
  try {
    const date = new Date(monthStr.length === 7 ? `${monthStr}-02` : monthStr);
    return format(date, "MMMM yyyy");
  } catch { return monthStr; }
};

const getPeriodLabel = (lgu: any, isDayMode: boolean, month?: string): string => {
  if (isDayMode) return month ? `(${formatMonthYear(month)})` : '';
  if (!lgu.months || lgu.months.length === 0) return "";
  const sortedMonths = [...lgu.months].sort();
  if (sortedMonths.length === 1) return `(${formatMonthYear(sortedMonths[0])})`;
  return `(${formatMonthYear(sortedMonths[0])} - ${formatMonthYear(sortedMonths[sortedMonths.length - 1])})`;
};

// Normalize/dedupe LGU results so PDF/Excel match the table behavior exactly.
// - Overwrite per-month values (do not sum duplicates) using the latest occurrence.
// - Preserve hasError if any duplicate reports an error.
// - Sort months ascending and attach a derived "months" array like the table.
const normalizeResults = (data: any[]): any[] => {
  type MonthEntry = Record<string, any> & { month: string };
  const byLgu = new Map<string, { lgu: any; monthsMap: Map<string, MonthEntry>; hasError?: boolean }>();

  for (const entry of data || []) {
    const key = entry?.lgu || '';
    if (!key) continue;

    if (!byLgu.has(key)) {
      // Shallow clone base LGU object, we will replace monthlyResults afterwards
      byLgu.set(key, {
        lgu: { ...entry, monthlyResults: [] },
        monthsMap: new Map<string, MonthEntry>(),
        hasError: entry?.hasError,
      });
    }

    const bucket = byLgu.get(key)!;

    // Any occurrence of error flags the LGU
    if (entry?.hasError) bucket.hasError = true;

    // Overwrite per-month numeric values by month key
    const monthsArr: any[] = Array.isArray(entry?.monthlyResults) ? entry.monthlyResults : [];
    for (const m of monthsArr) {
      const mKey = m?.month;
      if (!mKey) continue;

      // Overwrite: last seen wins, keep only numeric fields + month
      const next: MonthEntry = { month: mKey };
      Object.keys(m).forEach(k => {
        if (k === 'month') return;
        const v = (m as any)[k];
        if (typeof v === 'number') {
          next[k] = Number(v);
        }
      });

      bucket.monthsMap.set(mKey, next);
    }
  }

  // Finalize into array with sorted months and month labels
  const deduped: any[] = [];
  byLgu.forEach(({ lgu, monthsMap, hasError }) => {
    const monthlyResults = Array.from(monthsMap.values()).sort((a, b) => String(a.month).localeCompare(String(b.month)));
    const months = monthlyResults.map(m => m.month);
    deduped.push({
      ...lgu,
      hasError: !!hasError,
      monthlyResults,
      months,
    });
  });

  return deduped;
};

const calculateGrandTotals = (data: any[], moduleLabel: string) => {
  const totals = {
    newPaid: 0, newGeoPay: 0, newPending: 0, renewalPaid: 0, renewalGeoPay: 0, renewalPending: 0,
    malePaid: 0, malePending: 0, femalePaid: 0, femalePending: 0,
    paid: 0, pending: 0, totalCount: 0
  };

  for (const lgu of data) {
    const itemsToSum = lgu.monthlyResults || [];
    for (const item of itemsToSum) {
      if (moduleLabel === 'Barangay Clearance') {
        totals.totalCount += item.totalCount || 0;

      // Certificate of Occupancy: align with table (use coPaid/coPending)
      } else if (moduleLabel === 'Certificate of Occupancy') {
        totals.paid += item.coPaid || 0;
        totals.pending += item.coPending || 0;

      } else if (moduleLabel === 'Building Permit') {
        totals.paid += item.buildingPaid || 0;
        totals.pending += item.buildingPending || 0;

      } else { // Business and Working Permit
        totals.newPaid += item.newPaid || 0;
        totals.newGeoPay += item.newPaidViaEgov || 0;
        totals.newPending += item.newPending || 0;
        totals.renewalPaid += item.renewPaid || 0;
        totals.renewalGeoPay += item.renewPaidViaEgov || 0;
        totals.renewalPending += item.renewPending || 0;
        totals.malePaid += item.malePaid || 0;
        totals.malePending += item.malePending || 0;
        totals.femalePaid += item.femalePaid || 0;
        totals.femalePending += item.femalePending || 0;
      }
    }
  }
  return totals;
};

interface PdfParams {
  data: any[]; logoUrl: string; moduleLabel: string;
  dateRangeLabel: string; isDayMode: boolean; generatedAt: Date;
}

// Note: pageCount added to support "Page X of Y"
const addHeader = (doc: jsPDF, params: PdfParams, pageNumber: number, pageCount: number, base64Logo: string) => {
  const { moduleLabel, dateRangeLabel, generatedAt } = params;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 30;
  if (base64Logo) {
    try { doc.addImage(base64Logo, 'PNG', margin, 30, 90, 30); }
    catch (e) { console.error("Error adding logo to PDF:", e); }
  }
  doc.setFontSize(16); doc.setFont('helvetica', 'bold'); doc.text(moduleLabel, margin + 100, 40);
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.text(`Generated for the period: ${dateRangeLabel}`, margin + 100, 55);
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text('Generated On', pageWidth - margin, 40, { align: 'right' });
  doc.setFont('courier', 'normal'); doc.text(format(generatedAt, "MMM dd, yyyy, h:mm:ss a"), pageWidth - margin, 50, { align: 'right' });
  doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 20, { align: 'right' });
};

export const exportReportToPdf = async (params: PdfParams) => {
  // Keep error entries excluded from exports; totals in the table also exclude errors.
  const exportableData = (params.data || []).filter(lgu => !lgu.hasError);

  // Normalize to match the table calculations (dedupe months and overwrite duplicates)
  const normalizedData = normalizeResults(exportableData);

  // Timestamp at click-time
  const finalParams = { ...params, generatedAt: new Date() };
  const { moduleLabel, isDayMode, dateRangeLabel } = finalParams;

  // Sort by custom region order
  const sortedData = [...normalizedData].sort(compareByRegion);

  let base64Logo = '';
  try { base64Logo = await loadImageAsBase64(finalParams.logoUrl); }
  catch (error) { console.error("Could not load logo for PDF.", error); }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });

  // For Certificate of Occupancy
  const head: any[] = [['Region', 'LGU', 'Paid', 'Ongoing']];

  const allRows = sortedData.flatMap(lgu => {
    if (isDayMode) {
      const results = Array.isArray(lgu.monthlyResults) && lgu.monthlyResults.length > 0
        ? lgu.monthlyResults
        // Align with table: if no monthly data, show a single zero row with no period label
        : [{ coPaid: 0, coPending: 0 }];
      return results.map((monthData: any) => ({
        lguInfo: lgu,
        itemToDisplay: monthData,
        // No month provided => blank label (same as table)
        periodLabel: monthData.month ? getPeriodLabel(lgu, true, monthData.month) : '',
      }));
    } else {
      // Aggregate across months (sum numeric keys)
      const aggregatedItem = (lgu.monthlyResults || []).reduce((acc: any, month: any) => {
        Object.keys(month).forEach(key => {
          if (typeof month[key] === 'number') { acc[key] = (acc[key] || 0) + month[key]; }
        });
        return acc;
      }, {});
      return [{ lguInfo: lgu, itemToDisplay: aggregatedItem, periodLabel: getPeriodLabel(lgu, false) }];
    }
  });

  // Compute totals from normalized data so values match the table
  const totals = calculateGrandTotals(sortedData, moduleLabel);
  const rowsPerPage = 25; // Adjusted for portrait mode
  const numPages = allRows.length > 0 ? Math.ceil(allRows.length / rowsPerPage) : 1;

  for (let i = 0; i < numPages; i++) {
    const pageData = allRows.slice(i * rowsPerPage, (i + 1) * rowsPerPage);
    const pageBody: any[] = [];
    let lastRegionOnPage: string | null = null;

    pageData.forEach(rowData => {
      const { lguInfo, itemToDisplay, periodLabel } = rowData;
      const lguText = `${lguInfo.lgu}\n${periodLabel}`;
      const dataCells: any[] = [];

      // Certificate of Occupancy columns
      dataCells.push(
        formatNumberForDisplay(itemToDisplay.coPaid),
        formatNumberForDisplay(itemToDisplay.coPending)
      );

      if (lguInfo.region !== lastRegionOnPage) {
        lastRegionOnPage = lguInfo.region;
        const regionRowCountOnPage = pageData.filter(r => r.lguInfo.region === lastRegionOnPage).length;
        const regionCell = { content: getRegionDisplayName(lguInfo.region), rowSpan: regionRowCountOnPage, styles: { valign: 'middle' } };
        pageBody.push([regionCell, { content: lguText, styles: { halign: 'left' } }, ...dataCells]);
      } else {
        pageBody.push([{ content: lguText, styles: { halign: 'left' } }, ...dataCells]);
      }
    });

    if (i === numPages - 1 && allRows.length > 0) {
      const grandTotalLabel = `GRAND TOTAL\n(${dateRangeLabel})`;
      const totalCellStyles = { halign: 'center', valign: 'middle', fillColor: '#1e2b3b', textColor: '#ffffff', fontStyle: 'bold', lineWidth: 0.5, lineColor: '#475569' };

      const totalCells = [
        { content: formatNumberForDisplay(totals.paid), styles: totalCellStyles },
        { content: formatNumberForDisplay(totals.pending), styles: totalCellStyles }
      ];
      const grandTotalRow = [{ content: grandTotalLabel, colSpan: 2, styles: { ...totalCellStyles, halign: 'left' } }, ...totalCells];
      pageBody.push(grandTotalRow);
    }

    if (i > 0) doc.addPage();
    autoTable(doc, {
      head, body: pageBody,
      didDrawPage: () => { addHeader(doc, finalParams, i + 1, numPages, base64Logo); },
      margin: { top: 90 },
      styles: { fontSize: 8, cellPadding: 4, halign: 'center', lineWidth: 0.5, lineColor: '#dee2e6' },
      headStyles: { fontStyle: 'bold', fillColor: '#9ec6f7', textColor: '#000000', lineWidth: 0.5, lineColor: '#cbd5e1' },
      alternateRowStyles: { fillColor: '#f8fafc' }
    });
  }
  doc.save(`${moduleLabel.toLowerCase().replace(/\s/g, '-')}-report.pdf`);
};

interface ExcelParams { data: any[]; moduleLabel: string; isDayMode: boolean; }

export const exportReportToExcel = (params: ExcelParams) => {
  // Keep error entries excluded to match how totals are computed in the table
  const exportableData = (params.data || []).filter(lgu => !lgu.hasError);

  // Normalize to match the table behavior
  const normalizedData = normalizeResults(exportableData);

  const { moduleLabel, isDayMode } = params;

  // Sort by custom region order
  const sortedData = [...normalizedData].sort(compareByRegion);

  // For Certificate of Occupancy
  let headers: any[][] = [['Region', 'LGU', 'Paid', 'Ongoing']];
  let body: any[][] = [];
  let merges: xlsx.Range[] = [];
  const totals = calculateGrandTotals(sortedData, moduleLabel);

  const allRows = sortedData.flatMap(lgu => {
    if (isDayMode) {
      const results = Array.isArray(lgu.monthlyResults) && lgu.monthlyResults.length > 0
        ? lgu.monthlyResults
        // Align with the table: one zero row and no period label if no months
        : [{ coPaid: 0, coPending: 0 }];
      return results.map((monthData: any) => ({
        lguInfo: lgu,
        itemToDisplay: monthData,
        periodLabel: monthData.month ? getPeriodLabel(lgu, true, monthData.month) : '',
      }));
    } else {
      const aggregatedItem = (lgu.monthlyResults || []).reduce((acc: any, month: any) => {
        Object.keys(month).forEach(key => {
          if (typeof month[key] === 'number') { acc[key] = (acc[key] || 0) + month[key]; }
        });
        return acc;
      }, {});
      return [{ lguInfo: lgu, itemToDisplay: aggregatedItem, periodLabel: getPeriodLabel(lgu, false) }];
    }
  });

  let currentRowIndex = headers.length;
  let lastRegion: string | null = null;
  let regionStartIndex = currentRowIndex;

  allRows.forEach(rowData => {
    const { lguInfo, itemToDisplay, periodLabel } = rowData;
    let row: any[] = [];

    if (lguInfo.region !== lastRegion) {
      if (lastRegion !== null && currentRowIndex > regionStartIndex + 1) {
        merges.push({ s: { r: regionStartIndex, c: 0 }, e: { r: currentRowIndex - 1, c: 0 } });
      }
      lastRegion = lguInfo.region;
      regionStartIndex = currentRowIndex;
      row.push(getRegionDisplayName(lguInfo.region));
    } else {
      row.push(null);
    }

    const lguText = `${lguInfo.lgu} ${periodLabel}`;
    row.push(lguText);

    // Certificate of Occupancy numbers
    row.push(formatNumberForExcel(itemToDisplay.coPaid), formatNumberForExcel(itemToDisplay.coPending));

    body.push(row);
    currentRowIndex++;
  });

  if (lastRegion !== null && currentRowIndex > regionStartIndex + 1) {
    merges.push({ s: { r: regionStartIndex, c: 0 }, e: { r: currentRowIndex - 1, c: 0 } });
  }

  if (allRows.length > 0) {
    // Grand Total row
    let totalRow: any[] = ['GRAND TOTAL', null, totals.paid, totals.pending];
    merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 1 } });
    body.push(totalRow);
  }

  const ws = xlsx.utils.aoa_to_sheet([...headers, ...body]);
  ws['!merges'] = merges;
  const colWidths = headers[0].map(() => ({ wch: 25 }));
  ws['!cols'] = colWidths;

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Report');
  xlsx.writeFile(wb, `${moduleLabel.toLowerCase().replace(/\s/g, '-')}-report.xlsx`);
};
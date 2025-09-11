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

// Normalize region strings into canonical keys used for ordering and display.
// Examples:
//   "R4-B", "IV-B", "region4b" -> "region4b"
//   "CAR" / "car" -> "CAR"
//   "BARMM1" / "barmm1" -> "BARMM1"
const normalizeRegionKey = (input?: string | null): string => {
  const raw = String(input || '').trim();
  if (!raw) return raw;

  const key = raw.toLowerCase();

  // Canonical already
  if (key.startsWith('region')) return key; // e.g., region4a, region10

  if (key === 'car') return 'CAR';
  if (key === 'barmm1') return 'BARMM1';
  if (key === 'barmm2') return 'BARMM2';

  // R forms: r1, r4-a, r4b, r 10, etc.
  const rMatch = key.match(/^r\s*([0-9]{1,2})(?:\s*[-]?\s*([ab]))?$/i);
  if (rMatch) {
    const num = rMatch[1];
    const suffix = rMatch[2] ? rMatch[2].toLowerCase() : '';
    return `region${num}${suffix}`;
  }

  // Roman numerals (including IV-A / IV-B)
  const romanMap: Record<string, string> = {
    'i': '1', 'ii': '2', 'iii': '3',
    'iv-a': '4a', 'iv-b': '4b', 'iv': '4',
    'v': '5', 'vi': '6', 'vii': '7', 'viii': '8',
    'ix': '9', 'x': '10', 'xi': '11', 'xii': '12', 'xiii': '13',
  };
  if (romanMap[key]) {
    return `region${romanMap[key]}`;
  }

  return raw; // unknown left as-is
};

const regionOrderIndex = (key?: string | null): number => {
  if (!key) return Number.MAX_SAFE_INTEGER;
  const canonical = normalizeRegionKey(key);
  // Compare in case-insensitive manner
  const idx = REGION_ORDER_KEYS.findIndex(k => k.toLowerCase() === canonical.toLowerCase());
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
  const canonical = normalizeRegionKey(regionKey);
  // For 'region*' canonical, keys are lowercase in regionGroups; CAR/BARMM* are uppercase
  if (canonical.toLowerCase().startsWith('region')) {
    return regionGroups[canonical.toLowerCase()] || regionKey;
  }
  return regionGroups[canonical] || regionKey;
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
      } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
        const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
        const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
        totals.paid += item[paidKey] || 0;
        totals.pending += item[pendingKey] || 0;
      } else { // For Business and Working Permit
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

// Normalize Certificate of Occupancy data to match the table behavior:
// - Dedupe LGUs
// - Overwrite per-month values (do not accumulate duplicates)
// - Normalize region keys for proper ordering and display
const normalizeCertificateOfOccupancyData = (rawData: any[]): any[] => {
  type MonthEntry = { month: string; coPaid: number; coPending: number };
  const byLgu = new Map<string, {
    base: any; // base LGU info to carry along (province, etc.)
    monthsMap: Map<string, MonthEntry>;
    hasError?: boolean;
    region?: string;
  }>();

  for (const entry of rawData || []) {
    const key = entry?.lgu || '';
    if (!key) continue;

    if (!byLgu.has(key)) {
      byLgu.set(key, {
        base: { ...entry, monthlyResults: [] },
        monthsMap: new Map<string, MonthEntry>(),
        hasError: entry?.hasError,
        region: normalizeRegionKey(entry?.region),
      });
    }

    const bucket = byLgu.get(key)!;

    // Propagate region if missing; always keep normalized variant
    if (!bucket.region && entry?.region) {
      bucket.region = normalizeRegionKey(entry.region);
    }

    // If any duplicate reports an error, mark it
    if (entry?.hasError) bucket.hasError = true;

    // Overwrite monthly values by month key to avoid inflated totals
    const monthsArr = Array.isArray(entry?.monthlyResults) ? entry.monthlyResults : [];
    for (const m of monthsArr) {
      const mKey = m?.month;
      if (!mKey) continue;
      bucket.monthsMap.set(mKey, {
        month: mKey,
        coPaid: Number(m?.coPaid || 0),
        coPending: Number(m?.coPending || 0),
      });
    }
  }

  // Finalize array
  const deduped: any[] = [];
  byLgu.forEach(({ base, monthsMap, hasError, region }) => {
    const monthlyResults = Array.from(monthsMap.values()).sort((a, b) => a.month.localeCompare(b.month));
    const months = monthlyResults.map(m => m.month);
    deduped.push({
      ...base,
      region, // normalized for sorting/display
      hasError: !!hasError,
      monthlyResults,
      months,
    });
  });

  return deduped;
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

export const exportReportToPdf = async (params: PdfParams, signal?: AbortSignal) => {
  // Use deduped/normalized data for Certificate of Occupancy to match the table totals/format
  const baseData = params.data.filter(lgu => !lgu.hasError);
  const exportableData =
    params.moduleLabel === 'Certificate of Occupancy'
      ? normalizeCertificateOfOccupancyData(baseData)
      : baseData;

  // --- FIX PARA SA TIMESTAMP ---
  // Atong kuhaon ang saktong oras sa pag-click sa download
  const finalParams = { ...params, generatedAt: new Date() };

  const { moduleLabel, isDayMode, dateRangeLabel } = finalParams;

  // Sort by custom region order (after normalizing region keys)
  const sortedData = [...exportableData].sort(compareByRegion);

  let base64Logo = '';
  const throwIfAborted = () => {
    if (signal?.aborted) {
      const e: any = new Error('canceled');
      e.name = 'CanceledError';
      throw e;
    }
  };
  try {
    throwIfAborted();
    base64Logo = await loadImageAsBase64(finalParams.logoUrl);
  } catch (error) {
    if ((error as any)?.name === 'CanceledError') throw error;
    console.error("Could not load logo for PDF.", error);
  }

  const isComplex = ['Business Permit', 'Working Permit'].includes(moduleLabel);
  const orientation = isComplex ? 'landscape' : 'portrait';
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

  const head: any[] = isComplex
    ? [
        [{ content: 'Region', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'LGU', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } }, { content: 'New', colSpan: 4, styles: { halign: 'center' } }, { content: 'Renewal', colSpan: 4, styles: { halign: 'center' } }, { content: 'Male', colSpan: 3, styles: { halign: 'center' } }, { content: 'Female', colSpan: 3, styles: { halign: 'center' } }],
        ['PAID', 'PAID (eGOVPay)', 'ONGOING', 'Total', 'PAID', 'PAID (eGOVPay)', 'ONGOING', 'Total', 'PAID', 'ONGOING', 'Total', 'PAID', 'ONGOING', 'Total']
      ]
    : [['Region', 'LGU', ...(moduleLabel === 'Barangay Clearance' ? ['Total Results'] : ['Paid', 'Ongoing'])]];

  const allRows = sortedData.flatMap(lgu => {
    if (isDayMode) {
      const results = lgu.monthlyResults?.length > 0 ? lgu.monthlyResults : [{ month: lgu.months?.[0] || '' }];
      return results.map((monthData: any) => ({
        lguInfo: lgu, itemToDisplay: monthData, periodLabel: getPeriodLabel(lgu, true, monthData.month)
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

  const totals = calculateGrandTotals(sortedData, moduleLabel);
  const rowsPerPage = isComplex ? 17 : 25;
  const numPages = allRows.length > 0 ? Math.ceil(allRows.length / rowsPerPage) : 1;

  for (let i = 0; i < numPages; i++) {
    throwIfAborted();
    const pageData = allRows.slice(i * rowsPerPage, (i + 1) * rowsPerPage);
    const pageBody: any[] = [];
    let lastRegionOnPage: string | null = null;

    pageData.forEach(rowData => {
      const { lguInfo, itemToDisplay, periodLabel } = rowData;
      const lguText = `${lguInfo.lgu}\n${periodLabel}`;
      const dataCells: any[] = [];

      if (isComplex) {
        dataCells.push(formatNumberForDisplay(itemToDisplay.newPaid), formatNumberForDisplay(itemToDisplay.newPaidViaEgov), formatNumberForDisplay(itemToDisplay.newPending), { content: formatNumberForDisplay((itemToDisplay.newPaid||0)+(itemToDisplay.newPaidViaEgov||0)+(itemToDisplay.newPending||0)), styles: { fontStyle: 'bold' } });
        dataCells.push(formatNumberForDisplay(itemToDisplay.renewPaid), formatNumberForDisplay(itemToDisplay.renewPaidViaEgov), formatNumberForDisplay(itemToDisplay.renewPending), { content: formatNumberForDisplay((itemToDisplay.renewPaid||0)+(itemToDisplay.renewPaidViaEgov||0)+(itemToDisplay.renewPending||0)), styles: { fontStyle: 'bold' } });
        dataCells.push(formatNumberForDisplay(itemToDisplay.malePaid), formatNumberForDisplay(itemToDisplay.malePending), { content: formatNumberForDisplay((itemToDisplay.malePaid||0)+(itemToDisplay.malePending||0)), styles: { fontStyle: 'bold' } });
        dataCells.push(formatNumberForDisplay(itemToDisplay.femalePaid), formatNumberForDisplay(itemToDisplay.femalePending), { content: formatNumberForDisplay((itemToDisplay.femalePaid||0)+(itemToDisplay.femalePending||0)), styles: { fontStyle: 'bold' } });
      } else {
        if (moduleLabel === 'Barangay Clearance') { dataCells.push(formatNumberForDisplay(itemToDisplay.totalCount)); } 
        else {
          const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
          const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
          dataCells.push(formatNumberForDisplay(itemToDisplay[paidKey]), formatNumberForDisplay(itemToDisplay[pendingKey]));
        }
      }

      // Normalize region for display/row span
      const canonicalRegion = normalizeRegionKey(lguInfo.region);
      if (canonicalRegion !== lastRegionOnPage) {
        lastRegionOnPage = canonicalRegion;
        const regionRowCountOnPage = pageData.filter(r => normalizeRegionKey(r.lguInfo.region) === lastRegionOnPage).length;
        const regionCell = { content: getRegionDisplayName(canonicalRegion), rowSpan: regionRowCountOnPage, styles: { valign: 'middle' } };
        pageBody.push([regionCell, { content: lguText, styles: { halign: 'left' } }, ...dataCells]);
      } else {
        pageBody.push([{ content: lguText, styles: { halign: 'left' } }, ...dataCells]);
      }
    });

    if (i === numPages - 1 && allRows.length > 0) {
      const grandTotalLabel = `GRAND TOTAL\n(${dateRangeLabel})`;
      const totalCellStyles = { halign: 'center', valign: 'middle', fillColor: '#1e2b3b', textColor: '#ffffff', fontStyle: 'bold', lineWidth: 0.5, lineColor: '#475569' };
      if (isComplex) {
        const grandTotalRow = [
          { content: grandTotalLabel, colSpan: 2, styles: { ...totalCellStyles, halign: 'left' } },
          { content: formatNumberForDisplay(totals.newPaid), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.newGeoPay), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.newPending), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.newPaid + totals.newGeoPay + totals.newPending), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.renewalPaid), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.renewalGeoPay), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.renewalPending), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.renewalPaid + totals.renewalGeoPay + totals.renewalPending), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.malePaid), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.malePending), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.malePaid + totals.malePending), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.femalePaid), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.femalePending), styles: totalCellStyles }, { content: formatNumberForDisplay(totals.femalePaid + totals.femalePending), styles: totalCellStyles }
        ];
        pageBody.push(grandTotalRow);
      } else {
        const totalCells = moduleLabel === 'Barangay Clearance'
          ? [{ content: formatNumberForDisplay(totals.totalCount), styles: totalCellStyles }]
          : [
              { content: formatNumberForDisplay(totals.paid), styles: totalCellStyles },
              { content: formatNumberForDisplay(totals.pending), styles: totalCellStyles }
            ];
        const grandTotalRow = [{ content: grandTotalLabel, colSpan: 2, styles: { ...totalCellStyles, halign: 'left' } }, ...totalCells];
        pageBody.push(grandTotalRow);
      }
    }

  if (i > 0) doc.addPage();
    autoTable(doc, {
      head, body: pageBody,
      // Use the loop index and computed numPages to render "Page X of Y" correctly.
      didDrawPage: () => { addHeader(doc, finalParams, i + 1, numPages, base64Logo); },
      margin: { top: 90 },
      styles: { fontSize: 7, cellPadding: 4, halign: 'center', lineWidth: 0.5, lineColor: '#dee2e6' },
      headStyles: { fontStyle: 'bold', fillColor: '#9ec6f7', textColor: '#000000', lineWidth: 0.5, lineColor: '#cbd5e1' },
      alternateRowStyles: { fillColor: '#f8fafc' }
    });
  }
  if (signal?.aborted) {
    const e: any = new Error('canceled');
    e.name = 'CanceledError';
    throw e;
  }
  doc.save(`${moduleLabel.toLowerCase().replace(/\s/g, '-')}-report.pdf`);
};

interface ExcelParams { data: any[]; moduleLabel: string; isDayMode: boolean; }

export const exportReportToExcel = (params: ExcelParams, signal?: AbortSignal) => {
  // Use deduped/normalized data for Certificate of Occupancy to match the table totals/format
  const baseData = params.data.filter(lgu => !lgu.hasError);
  const exportableData =
    params.moduleLabel === 'Certificate of Occupancy'
      ? normalizeCertificateOfOccupancyData(baseData)
      : baseData;

  const { moduleLabel, isDayMode } = params;
  const throwIfAborted = () => {
    if (signal?.aborted) {
      const e: any = new Error('canceled');
      e.name = 'CanceledError';
      throw e;
    }
  };
  throwIfAborted();

  // Sort by custom region order (after normalizing region keys)
  const sortedData = [...exportableData].sort(compareByRegion);

  const isComplex = ['Business Permit', 'Working Permit'].includes(moduleLabel);
  let headers: any[][] = [];
  let body: any[][] = [];
  let merges: xlsx.Range[] = [];
  const totals = calculateGrandTotals(sortedData, moduleLabel);

  const allRows = sortedData.flatMap(lgu => {
    if (isDayMode) {
      const results = lgu.monthlyResults?.length > 0 ? lgu.monthlyResults : [{ month: lgu.months?.[0] || '' }];
      return results.map((monthData: any) => ({
        lguInfo: lgu, itemToDisplay: monthData, periodLabel: getPeriodLabel(lgu, true, monthData.month)
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
  
  if (isComplex) {
    headers = [
      ['Region', 'LGU', 'New', null, null, null, 'Renewal', null, null, null, 'Male', null, null, 'Female', null, null],
      [null, null, 'PAID', 'PAID (eGOVPay)', 'ONGOING', 'Total', 'PAID', 'PAID (eGOVPay)', 'ONGOING', 'Total', 'PAID', 'ONGOING', 'Total', 'PAID', 'ONGOING', 'Total']
    ];
  } else {
    headers = [moduleLabel === 'Barangay Clearance' ? ['Region', 'LGU', 'Total Results'] : ['Region', 'LGU', 'Paid', 'Ongoing']];
  }
  
  let currentRowIndex = headers.length;
  let lastRegion: string | null = null;
  let regionStartIndex = currentRowIndex;

  allRows.forEach(rowData => {
    const { lguInfo, itemToDisplay, periodLabel } = rowData;
    let row: any[] = [];
    
    const canonicalRegion = normalizeRegionKey(lguInfo.region);
    if (canonicalRegion !== lastRegion) {
      if (lastRegion !== null && currentRowIndex > regionStartIndex + 1) {
        merges.push({ s: { r: regionStartIndex, c: 0 }, e: { r: currentRowIndex - 1, c: 0 } });
      }
      lastRegion = canonicalRegion;
      regionStartIndex = currentRowIndex;
      row.push(getRegionDisplayName(canonicalRegion));
    } else {
      row.push(null);
    }

    const lguText = `${lguInfo.lgu} ${periodLabel}`;
    row.push(lguText);

    if (isComplex) {
      row.push(formatNumberForExcel(itemToDisplay.newPaid), formatNumberForExcel(itemToDisplay.newPaidViaEgov), formatNumberForExcel(itemToDisplay.newPending), (itemToDisplay.newPaid||0)+(itemToDisplay.newPaidViaEgov||0)+(itemToDisplay.newPending||0));
      row.push(formatNumberForExcel(itemToDisplay.renewPaid), formatNumberForExcel(itemToDisplay.renewPaidViaEgov), formatNumberForExcel(itemToDisplay.renewPending), (itemToDisplay.renewPaid||0)+(itemToDisplay.renewPaidViaEgov||0)+(itemToDisplay.renewPending||0));
      row.push(formatNumberForExcel(itemToDisplay.malePaid), formatNumberForExcel(itemToDisplay.malePending), (itemToDisplay.malePaid||0)+(itemToDisplay.malePending||0));
      row.push(formatNumberForExcel(itemToDisplay.femalePaid), formatNumberForExcel(itemToDisplay.femalePending), (itemToDisplay.femalePaid||0)+(itemToDisplay.femalePending||0));
    } else if (moduleLabel === 'Barangay Clearance') {
      row.push(formatNumberForExcel(itemToDisplay.totalCount));
    } else {
      const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
      const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
      row.push(formatNumberForExcel(itemToDisplay[paidKey]), formatNumberForExcel(itemToDisplay[pendingKey]));
    }
    
    body.push(row);
    currentRowIndex++;
  });
  
  if (lastRegion !== null && currentRowIndex > regionStartIndex + 1) {
    merges.push({ s: { r: regionStartIndex, c: 0 }, e: { r: currentRowIndex - 1, c: 0 } });
  }

  if (allRows.length > 0) {
    let totalRow: any[];
    if (isComplex) {
      totalRow = ['GRAND TOTAL', null, totals.newPaid, totals.newGeoPay, totals.newPending, (totals.newPaid+totals.newGeoPay+totals.newPending), totals.renewalPaid, totals.renewalGeoPay, totals.renewalPending, (totals.renewalPaid+totals.renewalGeoPay+totals.renewalPending), totals.malePaid, totals.malePending, (totals.malePaid+totals.malePending), totals.femalePaid, totals.femalePending, (totals.femalePaid+totals.femalePending)];
      merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 1 } });
    } else {
      totalRow = ['GRAND TOTAL', null, totals.paid, totals.pending];
      if(moduleLabel === 'Barangay Clearance') totalRow = ['GRAND TOTAL', null, totals.totalCount];
      merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 1 } });
    }
    body.push(totalRow);
  }
  
  const ws = xlsx.utils.aoa_to_sheet([...headers, ...body]);
  if (isComplex) {
    merges.push(
      { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 0, c: 5 } }, { s: { r: 0, c: 6 }, e: { r: 0, c: 9 } },
      { s: { r: 0, c: 10 }, e: { r: 0, c: 12 } }, { s: { r: 0, c: 13 }, e: { r: 0, c: 15 } }
    );
  }
  ws['!merges'] = merges;
  const colWidths = headers[headers.length - 1].map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  const wb = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(wb, ws, 'Report');
  if (signal?.aborted) {
    const e: any = new Error('canceled');
    e.name = 'CanceledError';
    throw e;
  }
  xlsx.writeFile(wb, `${moduleLabel.toLowerCase().replace(/\s/g, '-')}-report.xlsx`);
};
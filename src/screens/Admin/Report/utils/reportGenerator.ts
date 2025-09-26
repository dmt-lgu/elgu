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
    // For Business/Working Permit
    newIssued: 0, newPaid: 0, newGeoPay: 0, newPending: 0,
    renewalIssued: 0, renewalPaid: 0, renewalGeoPay: 0, renewalPending: 0,
    maleIssued: 0, malePaid: 0, malePending: 0,
    femaleIssued: 0, femalePaid: 0, femalePending: 0,
    // For Building/CO/Barangay
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
        // Derived "License Issued" values
        const newIssued = (item.newPaid || 0) + (item.newPaidViaEgov || 0);
        const renewalIssued = (item.renewPaid || 0) + (item.renewPaidViaEgov || 0);
        const maleIssued = (item.malePaid || 0);
        const femaleIssued = (item.femalePaid || 0);

        totals.newIssued += newIssued;
        totals.newPaid += item.newPaid || 0;
        totals.newGeoPay += item.newPaidViaEgov || 0;
        totals.newPending += item.newPending || 0;

        totals.renewalIssued += renewalIssued;
        totals.renewalPaid += item.renewPaid || 0;
        totals.renewalGeoPay += item.renewPaidViaEgov || 0;
        totals.renewalPending += item.renewPending || 0;

        totals.maleIssued += maleIssued;
        totals.malePaid += item.malePaid || 0;
        totals.malePending += item.malePending || 0;

        totals.femaleIssued += femaleIssued;
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
// Note: pageCount added to support "Page X of Y"
  // Note: pageCount added to support "Page X of Y"
  // Note: pageCount added to support "Page X of Y"
  const addHeader = (doc: jsPDF, params: PdfParams, pageNumber: number, pageCount: number, base64Logo: string) => {
    const { moduleLabel, dateRangeLabel, generatedAt } = params;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;

    // Logo sizing constraints (no stretch, preserve aspect ratio)
    const maxLogoW = 140; // increased bounds
    const maxLogoH = 48;
    let logoW = 0;
    let logoH = 0;

    // Fixed logo placement
    const logoX = margin;
    const logoY = 30;

    // Text start X; shifts right if a logo is drawn
    let labelX = margin + 10;

    if (base64Logo) {
      try {
        const props = (doc as any).getImageProperties ? (doc as any).getImageProperties(base64Logo) : null;
        if (props && props.width && props.height) {
          const scale = Math.min(maxLogoW / props.width, maxLogoH / props.height, 1); // never upscale
          logoW = props.width * scale;
          logoH = props.height * scale;
        } else {
          // Fallback if props unavailable
          logoW = maxLogoW;
          logoH = maxLogoH;
        }

        // Draw logo at margin, preserving aspect ratio
        doc.addImage(base64Logo, 'PNG', logoX, logoY, logoW, logoH);

        // Draw a vertical border only at the right side of the logo with margins
        doc.setDrawColor('#cbd5e1'); // subtle slate border to match table header lines
        doc.setLineWidth(0.5);
        const gapX = 6;   // horizontal gap between logo and border
        const padY = 2;   // extra top/bottom so the line does not touch the logo edges
        const borderX = logoX + logoW + gapX;
        doc.line(borderX, logoY - padY, borderX, logoY + logoH + padY);

        // Start text after the border (keep 10pt spacing after border)
        labelX = borderX + 10;
      } catch (e) {
        console.error('Error adding logo to PDF:', e);
      }
    }

    // Left-side title and subtitle
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(moduleLabel, labelX, 40);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated for the period: ${dateRangeLabel}`, labelX, 55);

    // Right-aligned "Generated On" section and page number
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Generated On', pageWidth - margin, 40, { align: 'right' });
    doc.setFont('courier', 'normal');
    doc.text(format(generatedAt, 'MMM dd, yyyy, h:mm:ss a'), pageWidth - margin, 50, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
  };


export const exportReportToPdf = async (params: PdfParams, signal?: AbortSignal) => {
    // Use deduped/normalized data for Certificate of Occupancy to match the table totals/format
    const baseData = params.data.filter(lgu => !lgu.hasError);
    const exportableData =
      params.moduleLabel === 'Certificate of Occupancy'
        ? normalizeCertificateOfOccupancyData(baseData)
        : baseData;

    // Ensure accurate timestamp at click time
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
      console.error('Could not load logo for PDF.', error);
    }

    const isComplex = ['Business Permit', 'Working Permit'].includes(moduleLabel);
    const orientation = isComplex ? 'landscape' : 'portrait';
    const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

    // Table header (with explanatory notes on PAID/ONGOING)
    const head: any[] = isComplex
      ? [
          [
            { content: 'REGION', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'LGU', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
            { content: 'New', colSpan: 5, styles: { halign: 'center' } },
            { content: 'Renewal', colSpan: 5, styles: { halign: 'center' } },
            { content: 'Male', colSpan: 4, styles: { halign: 'center' } },
            { content: 'Female', colSpan: 4, styles: { halign: 'center' } }
          ],
          [
            'License Issued',
            'PAID\n(For Issuance to License Issued)',
            'PAID (eGOVPay)\n(For Issuance to License Issued)',
            'ONGOING\n(For verification to For Payment)',
            'Total',

            'License Issued',
            'PAID\n(For Issuance to License Issued)',
            'PAID (eGOVPay)\n(For Issuance to License Issued)',
            'ONGOING\n(For verification to For Payment)',
            'Total',

            'License Issued',
            'PAID\n(For Issuance to License Issued)',
            'ONGOING\n(For verification to For Payment)',
            'Total',

            'License Issued',
            'PAID\n(For Issuance to License Issued)',
            'ONGOING\n(For verification to For Payment)',
            'Total'
          ]
        ]
      : [[
          'REGION',
          'LGU',
          ...(moduleLabel === 'Barangay Clearance'
            ? ['Total Results']
            : (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy')
              ? [
                  'License Issued',
                  'Paid\n(For Issuance to License Issued)',
                  'Ongoing\n(For verification to For Payment)',
                  'Total'
                ]
              : [
                  'Paid\n(For Issuance to License Issued)',
                  'Ongoing\n(For verification to For Payment)'
                ])
        ]];

    // Build all rows (flattened)
    const allRows = sortedData.flatMap(lgu => {
      if (isDayMode) {
        const results = lgu.monthlyResults?.length > 0 ? lgu.monthlyResults : [{ month: lgu.months?.[0] || '' }];
        return results.map((monthData: any) => ({
          lguInfo: lgu,
          itemToDisplay: monthData,
          periodLabel: getPeriodLabel(lgu, true, monthData.month)
        }));
      } else {
        const aggregatedItem = (lgu.monthlyResults || []).reduce((acc: any, month: any) => {
          Object.keys(month).forEach(key => {
            if (typeof month[key] === 'number') {
              acc[key] = (acc[key] || 0) + month[key];
            }
          });
          return acc;
        }, {});
        return [{ lguInfo: lgu, itemToDisplay: aggregatedItem, periodLabel: getPeriodLabel(lgu, false) }];
      }
    });

    const totals = calculateGrandTotals(sortedData, moduleLabel);

    // Build table data rows (keep Grand Total separate for last page)
    const dataRows: any[] = [];
    allRows.forEach(rowData => {
      const { lguInfo, itemToDisplay, periodLabel } = rowData;
      const lguText = `${lguInfo.lgu}\n${periodLabel}`;
      const regionDisplay = getRegionDisplayName(normalizeRegionKey(lguInfo.region));

        const dataCells: any[] = [];
        if (isComplex) {
          // New
          const newIssued = (itemToDisplay.newPaid || 0) + (itemToDisplay.newPaidViaEgov || 0);
          dataCells.push(
            formatNumberForDisplay(newIssued),
            formatNumberForDisplay(itemToDisplay.newPaid),
            formatNumberForDisplay(itemToDisplay.newPaidViaEgov),
            formatNumberForDisplay(itemToDisplay.newPending),
            { content: formatNumberForDisplay((itemToDisplay.newPaid || 0) + (itemToDisplay.newPaidViaEgov || 0) + (itemToDisplay.newPending || 0)), styles: { fontStyle: 'bold' } }
          );
          // Renewal
          const renewIssued = (itemToDisplay.renewPaid || 0) + (itemToDisplay.renewPaidViaEgov || 0);
          dataCells.push(
            formatNumberForDisplay(renewIssued),
            formatNumberForDisplay(itemToDisplay.renewPaid),
            formatNumberForDisplay(itemToDisplay.renewPaidViaEgov),
            formatNumberForDisplay(itemToDisplay.renewPending),
            { content: formatNumberForDisplay((itemToDisplay.renewPaid || 0) + (itemToDisplay.renewPaidViaEgov || 0) + (itemToDisplay.renewPending || 0)), styles: { fontStyle: 'bold' } }
          );
          // Male
          const maleIssued = (itemToDisplay.malePaid || 0);
          dataCells.push(
            formatNumberForDisplay(maleIssued),
            formatNumberForDisplay(itemToDisplay.malePaid),
            formatNumberForDisplay(itemToDisplay.malePending),
            { content: formatNumberForDisplay((itemToDisplay.malePaid || 0) + (itemToDisplay.malePending || 0)), styles: { fontStyle: 'bold' } }
          );
          // Female
          const femaleIssued = (itemToDisplay.femalePaid || 0);
          dataCells.push(
            formatNumberForDisplay(femaleIssued),
            formatNumberForDisplay(itemToDisplay.femalePaid),
            formatNumberForDisplay(itemToDisplay.femalePending),
            { content: formatNumberForDisplay((itemToDisplay.femalePaid || 0) + (itemToDisplay.femalePending || 0)), styles: { fontStyle: 'bold' } }
          );
        } else {
          if (moduleLabel === 'Barangay Clearance') {
            dataCells.push(formatNumberForDisplay(itemToDisplay.totalCount));
          } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
            const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
            const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
            const paid = Number(itemToDisplay[paidKey] || 0);
            const pending = Number(itemToDisplay[pendingKey] || 0);
            const issued = paid; // License Issued equals Paid
            const total = paid + pending;
            dataCells.push(
              formatNumberForDisplay(issued),
              formatNumberForDisplay(paid),
              formatNumberForDisplay(pending),
              formatNumberForDisplay(total)
            );
          } else {
            const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
            const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
            dataCells.push(formatNumberForDisplay(itemToDisplay[paidKey]), formatNumberForDisplay(itemToDisplay[pendingKey]));
          }
        }

      dataRows.push([
        { content: regionDisplay, styles: { valign: 'middle' } }, // Region column cell
        { content: lguText, styles: { halign: 'left' } },        // LGU column
        ...dataCells
      ]);
    });

    // Totals row and table rendering helpers
    const totalCellStyles = {
      halign: 'center',
      valign: 'middle',
      fillColor: '#1e293b', // requested color
      textColor: '#ffffff',
      fontStyle: 'bold',
      lineWidth: 0.5,
      lineColor: '#475569'
    };
    let grandTotalRow: any[] | null = null;
    if (allRows.length > 0) {
      if (isComplex) {
        // For Business Permit, License Issued grand totals must equal PAID (For Issuance to License Issued)
        const licenseIssuedNewTotal =
          moduleLabel === 'Business Permit' ? totals.newPaid : totals.newIssued;
        const licenseIssuedRenewalTotal =
          moduleLabel === 'Business Permit' ? totals.renewalPaid : totals.renewalIssued;

        grandTotalRow = [
          { content: `GRAND TOTAL\n(${dateRangeLabel})`, colSpan: 2, styles: { ...totalCellStyles, halign: 'left' } },

          // New
          { content: formatNumberForDisplay(licenseIssuedNewTotal), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.newPaid), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.newGeoPay), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.newPending), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.newPaid + totals.newGeoPay + totals.newPending), styles: totalCellStyles },

          // Renewal
          { content: formatNumberForDisplay(licenseIssuedRenewalTotal), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.renewalPaid), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.renewalGeoPay), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.renewalPending), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.renewalPaid + totals.renewalGeoPay + totals.renewalPending), styles: totalCellStyles },

          // Male
          { content: formatNumberForDisplay(totals.maleIssued), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.malePaid), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.malePending), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.malePaid + totals.malePending), styles: totalCellStyles },

          // Female
          { content: formatNumberForDisplay(totals.femaleIssued), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.femalePaid), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.femalePending), styles: totalCellStyles },
          { content: formatNumberForDisplay(totals.femalePaid + totals.femalePending), styles: totalCellStyles }
        ];
      } else {
        let totalCells: any[] = [];
        if (moduleLabel === 'Barangay Clearance') {
          totalCells = [{ content: formatNumberForDisplay(totals.totalCount), styles: totalCellStyles }];
        } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
          // License Issued = Paid; Total = Paid + Ongoing
          totalCells = [
            { content: formatNumberForDisplay(totals.paid), styles: totalCellStyles },   // License Issued
            { content: formatNumberForDisplay(totals.paid), styles: totalCellStyles },   // Paid
            { content: formatNumberForDisplay(totals.pending), styles: totalCellStyles },// Ongoing
            { content: formatNumberForDisplay(totals.paid + totals.pending), styles: totalCellStyles } // Total
          ];
        } else {
          totalCells = [
            { content: formatNumberForDisplay(totals.paid), styles: totalCellStyles },
            { content: formatNumberForDisplay(totals.pending), styles: totalCellStyles }
          ];
        }
        grandTotalRow = [{ content: `GRAND TOTAL\n(${dateRangeLabel})`, colSpan: 2, styles: { ...totalCellStyles, halign: 'left' } }, ...totalCells];
      }
    }

    type RegionGroup = { text: string; page: number; x: number; width: number; yTop: number; yBottom: number; };
    const pageGroups: Record<number, { openGroup: RegionGroup | null }> = {};
    const lineColor = '#dee2e6';
    const WHITE = '#FFFFFF';

    // Table margins aligned with header margins (Generated On at right = 30)
    const TABLE_MARGINS = { top: 100, left: 30, right: 30 };
    const getContentWidth = () =>
      doc.internal.pageSize.getWidth() - TABLE_MARGINS.left - TABLE_MARGINS.right;

    // Compute column styles to make layout cleaner and consistent
    const buildColumnStyles = () => {
      const columnStyles: Record<number, any> = {};
      // Region and LGU column widths
      columnStyles[0] = { cellWidth: 70, halign: 'center' }; // REGION fixed for readability
      // LGU: flexible width so the table can stretch with the page
      columnStyles[1] = { halign: 'left', fontStyle: 'bold' }; // no fixed width

      let totalColumns = 0;
      if (isComplex) {
        const leafCols = head[1]?.length || 0;
        totalColumns = 2 + leafCols;
      } else {
        totalColumns = head[0]?.length || 0;
      }

      // Right align all numeric columns; allow auto width so the table can expand to the right margin
      for (let idx = 2; idx < totalColumns; idx++) {
        columnStyles[idx] = { halign: 'right' }; // no fixed width here
      }
      return columnStyles;
    };

    const drawHBorder = (x: number, width: number, y: number) => {
      doc.setDrawColor(lineColor);
      doc.setLineWidth(0.5);
      doc.line(x, y, x + width, y);
    };
    const drawMergedRegionText = (grp: RegionGroup) => {
      if (!grp) return;
      const centerX = grp.x + grp.width / 2;
      const centerY = grp.yTop + (grp.yBottom - grp.yTop) / 2;
      try {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.text(grp.text, centerX, centerY, { align: 'center', baseline: 'middle' as any });
      } catch {
        doc.text(grp.text, centerX, centerY + 2.5, { align: 'center' });
      }
    };

    const renderChunk = (chunkRows: any[], appendGrandTotal: boolean, _isFirstChunk: boolean) => {
      autoTable(doc, {
        head,
        body: appendGrandTotal && grandTotalRow ? [...chunkRows, grandTotalRow] : chunkRows,
        theme: 'grid',
        margin: TABLE_MARGINS,
        // Make the table width flush with the right margin (same as "Generated On")
        tableWidth: getContentWidth(),
        styles: {
          font: 'helvetica',
          fontSize: 7,
          cellPadding: { top: 2, right: 3, bottom: 2, left: 3 },
          halign: 'center',
          valign: 'middle',
          lineWidth: 0.4,
          lineColor: lineColor,
          overflow: 'linebreak'
        },
        headStyles: {
          fontStyle: 'bold',
          fillColor: '#9ec6f7', // keep requested header background color
          textColor: '#000000',
          lineWidth: 0.5,
          lineColor: '#cbd5e1',
          halign: 'center',
          valign: 'middle',
          fontSize: 7
        },
        bodyStyles: {
          fillColor: WHITE,
          textColor: '#111827'
        },
        alternateRowStyles: {
          fillColor: '#f8fafc' // subtle zebra striping
        },
        columnStyles: buildColumnStyles(),

        // Ensure Region column (index 0) is never zebra-striped, except on the Grand Total row
        didParseCell: (data: any) => {
          if (data.section === 'head') {
            if (isComplex && data.row.index === 1) {
              data.cell.styles.fontSize = 6;
              data.cell.styles.cellPadding = { top: 1.5, right: 2, bottom: 1.5, left: 2 };
              data.cell.styles.lineHeight = 1.1;
            }
            data.cell.styles.halign = 'center';
          }

          // Detect Grand Total row
          const isGrandTotalRow =
            data.section === 'body' &&
            data.row?.raw &&
            Array.isArray(data.row.raw) &&
            (() => {
              const first = data.row.raw[0];
              const content =
                first && typeof first === 'object' && 'content' in first ? (first.content as any) : null;
              return typeof content === 'string' ? content.startsWith('GRAND TOTAL') : false;
            })();

          // Region column: force white background to override alternateRowStyles,
          // but NOT on the Grand Total row so it keeps the total styles.
          if (data.section === 'body' && data.column.index === 0 && !isGrandTotalRow) {
            data.cell.styles.fillColor = WHITE;
          }

          // LGU rows: keep LGU left aligned and allow wrapping
          if (data.section === 'body' && data.column.index === 1) {
            data.cell.styles.halign = 'left';
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.valign = 'top';
          }

          // Numbers: right align for better readability
          if (data.section === 'body' && data.column.index >= 2) {
            data.cell.styles.halign = 'right';
          }
        },

        // Make Region col clean (merged look) and preserve group borders
        willDrawCell: (data: any) => {
          if (data.section !== 'body') return;
          if (data.column.index !== 0) return;
          if (data.cell.colSpan && data.cell.colSpan > 1) return; // Grand Total has colSpan=2; don't override its styles

          // Remove interior grid for region col and keep vertical outer borders
          data.cell.styles.fillColor = WHITE; // ensure it's not striped on normal rows
          (data.cell.styles as any).lineWidth = { top: 0, right: 0.5, bottom: 0, left: 0.5 };
          (data.cell.styles as any).lineColor = { top: lineColor, right: lineColor, bottom: lineColor, left: lineColor };

          const raw = data.cell.raw as any;
          if (raw && typeof raw === 'object' && raw.content) {
            raw._regionText = raw.content;
          } else {
            raw._regionText = Array.isArray(data.cell.text) ? data.cell.text.join('') : String(data.cell.text || '');
          }
          data.cell.text = [''];
        },

        didDrawCell: (data: any) => {
          if (data.section !== 'body') return;
          if (data.column.index !== 0) return;
          if (data.cell.colSpan && data.cell.colSpan > 1) return;

          const page = data.table.pageNumber as number;
          const raw = data.cell.raw as any;
          const text: string = (raw && raw._regionText) || (raw && raw.content) || '';
          if (!pageGroups[page]) pageGroups[page] = { openGroup: null };
          const state = pageGroups[page];

          if (!state.openGroup || state.openGroup.text !== text) {
            if (state.openGroup) {
              state.openGroup.yBottom = data.cell.y;
              drawHBorder(state.openGroup.x, state.openGroup.width, state.openGroup.yBottom);
              drawMergedRegionText(state.openGroup);
            }
            state.openGroup = {
              text,
              page,
              x: data.cell.x,
              width: data.cell.width,
              yTop: data.cell.y,
              yBottom: data.cell.y + data.cell.height
            };
            drawHBorder(state.openGroup.x, state.openGroup.width, state.openGroup.yTop);
          } else {
            state.openGroup.yBottom = data.cell.y + data.cell.height;
          }
        },

        didDrawPage: (data: any) => {
          const page = data.table.pageNumber as number;
          const state = pageGroups[page];
          if (state?.openGroup) {
            drawHBorder(state.openGroup.x, state.openGroup.width, state.openGroup.yBottom);
            drawMergedRegionText(state.openGroup);
            state.openGroup = null;
          }
        }
      });
    };

    // Pagination:
    // - For Business/Working Permit: keep all rows of an LGU together.
    //   If month/year is selected (isDayMode), limit to 7 unique LGUs per page; otherwise 8.
    // - For others (Barangay/Building/CO): keep existing row-based pagination (26 rows)
    if (isComplex) {
      // Pair each rendered row with its LGU key
      const rowsWithKey = allRows.map((rowData, idx) => ({
        lguKey: String(rowData.lguInfo?.lgu || ''),
        row: dataRows[idx]
      }));

      const lguLimit = isDayMode ? 7 : 8;

      const chunks: any[][] = [];
      let currentChunk: any[][] = [];
      let currentLguCount = 0;
      let prevLguKey: string | null = null;

      for (const item of rowsWithKey) {
        const sameLgu = prevLguKey !== null && item.lguKey === prevLguKey;

        // If we're starting a new LGU and already reached the page limit, start a new page
        if (!sameLgu && currentLguCount === lguLimit) {
          chunks.push(currentChunk);
          currentChunk = [];
          currentLguCount = 0;
        }

        if (!sameLgu) {
          currentLguCount += 1;
        }

        currentChunk.push(item.row);
        prevLguKey = item.lguKey;
      }
      if (currentChunk.length) chunks.push(currentChunk);

      // Render all chunks; only the last chunk gets the grand total row
      chunks.forEach((chunk, i) => {
        if (i > 0) doc.addPage();
        const isLast = i === chunks.length - 1;
        renderChunk(chunk, isLast, i === 0);
      });
    } else {
      const enforceLguLimit = ['Barangay Clearance', 'Building Permit', 'Certificate of Occupancy'].includes(moduleLabel);
      const rowsPerPage = enforceLguLimit ? 26 : 0;
      const dataRowsToUse = dataRows;

      if (!rowsPerPage || dataRowsToUse.length <= rowsPerPage) {
        renderChunk(dataRowsToUse, true, true);
      } else {
        const totalChunks = Math.ceil(dataRowsToUse.length / rowsPerPage);
        for (let i = 0; i < totalChunks; i++) {
          if (i > 0) doc.addPage();
          const start = i * rowsPerPage;
          const end = Math.min(start + rowsPerPage, dataRowsToUse.length);
          const segment = dataRowsToUse.slice(start, end);
          const isLast = i === totalChunks - 1;
          renderChunk(segment, isLast, i === 0);
        }
      }
    }

    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      throwIfAborted();
      doc.setPage(p);
      addHeader(doc, finalParams, p, pageCount, base64Logo);
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
      // Updated headers with explanatory notes
      headers = [
        // Row 0 (group headers)
        ['Region', 'LGU', 'New', null, null, null, null, 'Renewal', null, null, null, null, 'Male', null, null, null, 'Female', null, null, null],
        // Row 1 (detail headers)
        [null, null,
          'License Issued',
          'PAID\n(For Issuance to License Issued)',
          'PAID (eGOVPay)\n(For Issuance to License Issued)',
          'ONGOING\n(For verification to For Payment)',
          'Total',

          'License Issued',
          'PAID\n(For Issuance to License Issued)',
          'PAID (eGOVPay)\n(For Issuance to License Issued)',
          'ONGOING\n(For verification to For Payment)',
          'Total',

          'License Issued',
          'PAID\n(For Issuance to License Issued)',
          'ONGOING\n(For verification to For Payment)',
          'Total',

          'License Issued',
          'PAID\n(For Issuance to License Issued)',
          'ONGOING\n(For verification to For Payment)',
          'Total'
        ]
      ];
    } else {
      headers = [
        moduleLabel === 'Barangay Clearance'
          ? ['Region', 'LGU', 'Total Results']
          : (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy')
            ? ['Region', 'LGU',
                'License Issued',
                'Paid\n(For Issuance to License Issued)',
                'Ongoing\n(For verification to For Payment)',
                'Total'
              ]
            : ['Region', 'LGU',
                'Paid\n(For Issuance to License Issued)',
                'Ongoing\n(For verification to For Payment)'
              ]
      ];
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
        // New
        const newIssued = (itemToDisplay.newPaid || 0) + (itemToDisplay.newPaidViaEgov || 0);
        row.push(
          formatNumberForExcel(newIssued),
          formatNumberForExcel(itemToDisplay.newPaid),
          formatNumberForExcel(itemToDisplay.newPaidViaEgov),
          formatNumberForExcel(itemToDisplay.newPending),
          (itemToDisplay.newPaid || 0) + (itemToDisplay.newPaidViaEgov || 0) + (itemToDisplay.newPending || 0)
        );
        // Renewal
        const renewIssued = (itemToDisplay.renewPaid || 0) + (itemToDisplay.renewPaidViaEgov || 0);
        row.push(
          formatNumberForExcel(renewIssued),
          formatNumberForExcel(itemToDisplay.renewPaid),
          formatNumberForExcel(itemToDisplay.renewPaidViaEgov),
          formatNumberForExcel(itemToDisplay.renewPending),
          (itemToDisplay.renewPaid || 0) + (itemToDisplay.renewPaidViaEgov || 0) + (itemToDisplay.renewPending || 0)
        );
        // Male
        const maleIssued = (itemToDisplay.malePaid || 0);
        row.push(
          formatNumberForExcel(maleIssued),
          formatNumberForExcel(itemToDisplay.malePaid),
          formatNumberForExcel(itemToDisplay.malePending),
          (itemToDisplay.malePaid || 0) + (itemToDisplay.malePending || 0)
        );
        // Female
        const femaleIssued = (itemToDisplay.femalePaid || 0);
        row.push(
          formatNumberForExcel(femaleIssued),
          formatNumberForExcel(itemToDisplay.femalePaid),
          formatNumberForExcel(itemToDisplay.femalePending),
          (itemToDisplay.femalePaid || 0) + (itemToDisplay.femalePending || 0)
        );
      } else if (moduleLabel === 'Barangay Clearance') {
        row.push(formatNumberForExcel(itemToDisplay.totalCount));
      } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
        const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
        const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
        const paid = Number(itemToDisplay[paidKey] || 0);
        const pending = Number(itemToDisplay[pendingKey] || 0);
        const issued = paid; // License Issued equals Paid
        const total = paid + pending;
        row.push(
          formatNumberForExcel(issued),
          formatNumberForExcel(paid),
          formatNumberForExcel(pending),
          total
        );
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
        // For Business Permit, License Issued grand totals must equal PAID (For Issuance to License Issued)
        const licenseIssuedNewTotal =
          moduleLabel === 'Business Permit' ? totals.newPaid : totals.newIssued;
        const licenseIssuedRenewalTotal =
          moduleLabel === 'Business Permit' ? totals.renewalPaid : totals.renewalIssued;

        totalRow = [
          'GRAND TOTAL', null,
          // New
          licenseIssuedNewTotal, totals.newPaid, totals.newGeoPay, totals.newPending, (totals.newPaid + totals.newGeoPay + totals.newPending),
          // Renewal
          licenseIssuedRenewalTotal, totals.renewalPaid, totals.renewalGeoPay, totals.renewalPending, (totals.renewalPaid + totals.renewalGeoPay + totals.renewalPending),
          // Male
          totals.maleIssued, totals.malePaid, totals.malePending, (totals.malePaid + totals.malePending),
          // Female
          totals.femaleIssued, totals.femalePaid, totals.femalePending, (totals.femalePaid + totals.femalePending)
        ];
        merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 1 } });
      } else {
        if (moduleLabel === 'Barangay Clearance') {
          totalRow = ['GRAND TOTAL', null, totals.totalCount];
        } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
          // License Issued = Paid; Total = Paid + Ongoing
          totalRow = [
            'GRAND TOTAL', null,
            totals.paid,   // License Issued
            totals.paid,   // Paid
            totals.pending,// Ongoing
            (totals.paid + totals.pending) // Total
          ];
        } else {
          totalRow = ['GRAND TOTAL', null, totals.paid, totals.pending];
        }
        merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 1 } });
      }
      body.push(totalRow);
    }

    const ws = xlsx.utils.aoa_to_sheet([...headers, ...body]);
    if (isComplex) {
      merges.push(
        // Region and LGU headers span 2 rows
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
        // Group headers
        { s: { r: 0, c: 2 }, e: { r: 0, c: 6 } },   // New (5 cols)
        { s: { r: 0, c: 7 }, e: { r: 0, c: 11 } },  // Renewal (5 cols)
        { s: { r: 0, c: 12 }, e: { r: 0, c: 15 } }, // Male (4 cols)
        { s: { r: 0, c: 16 }, e: { r: 0, c: 19 } }  // Female (4 cols)
      );
    }
    ws['!merges'] = merges;

    // Slightly wider columns to accommodate wrapped header notes
    const lastHeaderRow = headers[headers.length - 1];
    const colWidths = lastHeaderRow.map((_c: any, idx: number) => {
      if (idx <= 1) return { wch: 22 };
      return { wch: 24 };
    });
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
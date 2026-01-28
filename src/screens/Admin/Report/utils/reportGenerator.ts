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
const normalizeRegionKey = (input?: string | null): string => {
  const raw = String(input || '').trim();
  if (!raw) return raw;
  const key = raw.toLowerCase();

  if (key.startsWith('region')) return key;
  if (key === 'car') return 'CAR';
  if (key === 'barmm1') return 'BARMM1';
  if (key === 'barmm2') return 'BARMM2';

  const rMatch = key.match(/^r\s*([0-9]{1,2})(?:\s*[-]?\s*([ab]))?$/i);
  if (rMatch) {
    const num = rMatch[1];
    const suffix = rMatch[2] ? rMatch[2].toLowerCase() : '';
    return `region${num}${suffix}`;
  }

  const romanMap: Record<string, string> = {
    'i': '1', 'ii': '2', 'iii': '3',
    'iv-a': '4a', 'iv-b': '4b', 'iv': '4',
    'v': '5', 'vi': '6', 'vii': '7', 'viii': '8',
    'ix': '9', 'x': '10', 'xi': '11', 'xii': '12', 'xiii': '13',
  };
  if (romanMap[key]) {
    return `region${romanMap[key]}`;
  }
  return raw;
};

const regionOrderIndex = (key?: string | null): number => {
  if (!key) return Number.MAX_SAFE_INTEGER;
  const canonical = normalizeRegionKey(key);
  const idx = REGION_ORDER_KEYS.findIndex(k => k.toLowerCase() === canonical.toLowerCase());
  return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
};

const compareByRegion = (a: any, b: any): number => {
  const ia = regionOrderIndex(a?.region);
  const ib = regionOrderIndex(b?.region);
  if (ia !== ib) return ia - ib;
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
    newIssued: 0, newPaid: 0, newGeoPay: 0, newPending: 0,
    renewalIssued: 0, renewalPaid: 0, renewalGeoPay: 0, renewalPending: 0,
    newLicenseIssued: 0, renewalLicenseIssued: 0,
    maleIssued: 0, malePaid: 0, malePending: 0,
    femaleIssued: 0, femalePaid: 0, femalePending: 0,
    // licenseIssued used for Building Permit / CO grand totals (displayed in 'License Issued' column)
    licenseIssued: 0,
    // For complex modules (Business/Working Permit) track explicit license-issued counts separately
    licenseIssuedNew: 0,
    licenseIssuedRenewal: 0,
    paid: 0, pending: 0, totalCount: 0,
    // Sum of per-LGU totalCitizensServed (for Building Permit / Certificate of Occupancy)
    totalCitizensServed: 0
  };

  for (const lgu of data) {
      // Accumulate per-LGU 'totalCitizensServed' once per LGU for all modules.
      // Prefer a top-level `totalCitizensServed` when present; otherwise
      // fall back to `sum.totalCitizensServed` or sum `monthlyResults` values.
      const perLguCitizens = Number(lgu?.totalCitizensServed ?? (Array.isArray(lgu?.monthlyResults) && lgu.monthlyResults.length
        ? lgu.monthlyResults.reduce((s: number, m: any) => s + (Number(m.totalCitizensServed || 0)), 0)
        : (lgu?.sum?.totalCitizensServed ?? 0)));
      totals.totalCitizensServed += perLguCitizens;
    const itemsToSum = lgu.monthlyResults || [];
    const hasMonthly = Array.isArray(lgu.monthlyResults) && lgu.monthlyResults.length > 0;
    const isComplexModule = moduleLabel === 'Business Permit' || moduleLabel === 'Working Permit';
    // If no monthlyResults are present, attempt to read aggregated totals from lgu or lgu.sum
    if (!hasMonthly) {
      if (moduleLabel === 'Barangay Clearance') {
        // already handled above via top-level totalCount
      } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
        const src = lgu.sum ?? lgu;
        const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
        const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
        const licenseIssued = Number(src.newLicenseIssued ?? src.newIssued ?? src.newPaid ?? src[paidKey] ?? 0);
        const forIssuance = Number(src.newPaid ?? src[paidKey] ?? 0);
        const egov = Number(src.newPaidViaEgov ?? 0);
        const paidOnly = forIssuance + egov;
        totals.licenseIssued += licenseIssued;
        totals.paid += paidOnly;
        totals.pending += Number(src[pendingKey] ?? src.newPending ?? 0);
      } else if (isComplexModule) {
        const src = lgu.sum ?? lgu;
        totals.newLicenseIssued += Number(src.newLicenseIssued ?? src.newIssued ?? src.newPaid ?? 0);
        totals.newPaid += Number(src.newPaid ?? 0);
        totals.newGeoPay += Number(src.newPaidViaEgov ?? 0);
        totals.newPending += Number(src.newPending ?? 0);
        totals.renewalLicenseIssued += Number(src.renewLicenseIssued ?? src.renewIssued ?? src.renewPaid ?? 0);
        totals.renewalPaid += Number(src.renewPaid ?? 0);
        totals.renewalGeoPay += Number(src.renewPaidViaEgov ?? 0);
        totals.renewalPending += Number(src.renewPending ?? 0);
        totals.maleIssued += Number(src.malePaid ?? 0);
        totals.malePaid += Number(src.malePaid ?? 0);
        totals.malePending += Number(src.malePending ?? 0);
        totals.femaleIssued += Number(src.femalePaid ?? 0);
        totals.femalePaid += Number(src.femalePaid ?? 0);
        totals.femalePending += Number(src.femalePending ?? 0);
      }
    }
    // If there are no monthlyResults for Barangay Clearance, allow a top-level
    // `totalCount` (or `sum.totalCount`) to be used as the per-LGU value.
    if (moduleLabel === 'Barangay Clearance' && (!Array.isArray(lgu.monthlyResults) || lgu.monthlyResults.length === 0)) {
      totals.totalCount += Number(lgu?.totalCount ?? lgu?.sum?.totalCount ?? 0);
    }
    for (const item of itemsToSum) {
      if (moduleLabel === 'Barangay Clearance') {
        totals.totalCount += item.totalCount || 0;
      } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
          const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
          const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
          // Separate License Issued from PAID (For Issuance + eGOV) to avoid double-counting
          const licenseIssued = Number(item.newLicenseIssued ?? item.newIssued ?? item.newPaid ?? item[paidKey] ?? 0);
          const forIssuance = Number(item.newPaid ?? item[paidKey] ?? 0);
          const egov = Number(item.newPaidViaEgov ?? 0);
          const paidOnly = forIssuance + egov; // do NOT include licenseIssued here
          totals.licenseIssued += licenseIssued;
          totals.paid += paidOnly;
          totals.pending += Number(item[pendingKey] ?? item.newPending ?? 0);
      } else {
        // For complex modules (Business/Working Permit):
        // License Issued = explicit newLicenseIssued field (or fallback to newIssued or newPaid)
        const newLicenseIssued = Number(item.newLicenseIssued ?? item.newIssued ?? item.newPaid ?? 0);
        const renewalLicenseIssued = Number(item.renewLicenseIssued ?? item.renewIssued ?? item.renewPaid ?? 0);
        
        // PAID (For Issuance and License Issued) is computed where needed

        totals.newLicenseIssued += newLicenseIssued;
        totals.newPaid += item.newPaid || 0;
        totals.newGeoPay += item.newPaidViaEgov || 0;
        totals.newPending += item.newPending || 0;
        totals.renewalLicenseIssued += renewalLicenseIssued;
        totals.renewalPaid += item.renewPaid || 0;
        totals.renewalGeoPay += item.renewPaidViaEgov || 0;
        totals.renewalPending += item.renewPending || 0;
        
        // Male and Female: License Issued = malePaid / femalePaid (no eGOV breakdown in data)
        totals.maleIssued += (item.malePaid || 0);
        totals.malePaid += item.malePaid || 0;
        totals.malePending += item.malePending || 0;
        totals.femaleIssued += (item.femalePaid || 0);
        totals.femalePaid += item.femalePaid || 0;
        totals.femalePending += item.femalePending || 0;
      }
    }
  }
  return totals;
};

const normalizeCertificateOfOccupancyData = (rawData: any[]): any[] => {
  type MonthEntry = { month: string; coPaid: number; coPending: number };
  const byLgu = new Map<string, { base: any; monthsMap: Map<string, MonthEntry>; hasError?: boolean; region?: string; }>();

  for (const entry of rawData || []) {
    const key = entry?.lgu || '';
    if (!key) continue;
    if (!byLgu.has(key)) {
      byLgu.set(key, { base: { ...entry, monthlyResults: [] }, monthsMap: new Map<string, MonthEntry>(), hasError: entry?.hasError, region: normalizeRegionKey(entry?.region), });
    }
    const bucket = byLgu.get(key)!;
    if (!bucket.region && entry?.region) { bucket.region = normalizeRegionKey(entry.region); }
    if (entry?.hasError) bucket.hasError = true;
    const monthsArr = Array.isArray(entry?.monthlyResults) ? entry.monthlyResults : [];
    for (const m of monthsArr) {
      const mKey = m?.month;
      if (!mKey) continue;
      bucket.monthsMap.set(mKey, { month: mKey, coPaid: Number(m?.coPaid || 0), coPending: Number(m?.coPending || 0) });
    }
  }

  const deduped: any[] = [];
  byLgu.forEach(({ base, monthsMap, hasError, region }: any) => {
    const monthlyResults = Array.from(monthsMap.values()).sort((a: any, b: any) => a.month.localeCompare(b.month));
    const months = monthlyResults.map((m: any) => m.month);
    deduped.push({ ...base, region, hasError: !!hasError, monthlyResults, months });
  });
  return deduped;
};

interface PdfParams {
  data: any[]; logoUrl: string; moduleLabel: string;
  dateRangeLabel: string; isDayMode: boolean; generatedAt: Date;
}

const addHeader = (doc: jsPDF, params: PdfParams, pageNumber: number, pageCount: number, base64Logo: string) => {
    const { moduleLabel, dateRangeLabel, generatedAt } = params;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 30;

    const maxLogoW = 140, maxLogoH = 48;
    let logoW = 0, logoH = 0;
    const logoX = margin, logoY = 30;
    let labelX = margin + 10;

    if (base64Logo) {
        try {
            const props = (doc as any).getImageProperties ? (doc as any).getImageProperties(base64Logo) : { width: maxLogoW, height: maxLogoH };
            const scale = Math.min(maxLogoW / props.width, maxLogoH / props.height, 1);
            logoW = props.width * scale;
            logoH = props.height * scale;
            doc.addImage(base64Logo, 'PNG', logoX, logoY, logoW, logoH);

            doc.setDrawColor('#cbd5e1'); // slate-300
            doc.setLineWidth(0.5);
            const borderX = logoX + logoW + 6;
            doc.line(borderX, logoY - 2, borderX, logoY + logoH + 2);
            labelX = borderX + 10;
        } catch (e) { console.error('Error adding logo to PDF:', e); }
    }

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor('#1e293b'); // slate-800
    doc.text(moduleLabel, labelX, 45);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#64748b'); // slate-500
    doc.text(`Period Covered: ${dateRangeLabel}`, labelX, 60);

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor('#475569'); // slate-600
    doc.text('Generated On', pageWidth - margin, 40, { align: 'right' });

    doc.setFont('courier', 'normal');
    doc.setTextColor('#64748b'); // slate-500
    doc.text(format(generatedAt, 'MMM dd, yyyy, h:mm:ss a'), pageWidth - margin, 50, { align: 'right' });

    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Page ${pageNumber} of ${pageCount}`, pageWidth - margin, pageHeight - 20, { align: 'right' });
};

export const exportReportToPdf = async (params: PdfParams, signal?: AbortSignal) => {
    const baseData = params.data.filter(lgu => !lgu.hasError);
    const exportableData = params.moduleLabel === 'Certificate of Occupancy' ? normalizeCertificateOfOccupancyData(baseData) : baseData;
    const finalParams = { ...params, generatedAt: new Date() };
    const { moduleLabel, isDayMode, dateRangeLabel } = finalParams;

    // Build a safe filename that includes the period covered (if present)
    const sanitizeForFilename = (s: string) => {
      return (s || '').replace(/[<>:\"\\/\|\?\*\u0000-\u001F]/g, '').replace(/\s+/g, ' ').trim();
    };
    const moduleSlug = moduleLabel.toLowerCase().replace(/\s+/g, '-');
    const datePart = dateRangeLabel ? `(${dateRangeLabel})` : '';
    const rawFilename = `${moduleSlug}-report${datePart}`;
    const safeFilename = sanitizeForFilename(rawFilename);
    const sortedData = [...exportableData].sort(compareByRegion);

    let base64Logo = '';
    const throwIfAborted = () => { if (signal?.aborted) { const e: any = new Error('canceled'); e.name = 'CanceledError'; throw e; } };
    try { throwIfAborted(); base64Logo = await loadImageAsBase64(finalParams.logoUrl); } catch (error) { if ((error as any)?.name === 'CanceledError') throw error; console.error('Could not load logo for PDF.', error); }

    const isComplex = ['Business Permit', 'Working Permit'].includes(moduleLabel);
    const orientation = isComplex ? 'landscape' : 'portrait';
    const pdfFormat: any = isComplex ? 'a3' : 'a4';
    const doc = new jsPDF({ orientation, unit: 'pt', format: pdfFormat });

    let head: any[][] = [];
    const commonRowSpanStyles = { halign: 'center', valign: 'middle' };
    const commonColSpanStyles = { halign: 'center', fontStyle: 'bold' };

    if (isComplex) {
        head = [
            [
                { content: 'REGION', rowSpan: 2, styles: commonRowSpanStyles },
                { content: 'LGU', rowSpan: 2, styles: { ...commonRowSpanStyles, halign: 'left' } },
          { content: 'CITIZENS SERVED', rowSpan: 2, styles: commonRowSpanStyles },
                { content: 'NEW', colSpan: 5, styles: commonColSpanStyles },
                { content: 'RENEWAL', colSpan: 5, styles: commonColSpanStyles },
                { content: 'MALE', colSpan: 4, styles: commonColSpanStyles },
                { content: 'FEMALE', colSpan: 4, styles: commonColSpanStyles },
                /* Commented out: Total Licensed Issued column requested to be removed from PDF
                { content: 'TOTAL LICENSED ISSUED', rowSpan: 2, styles: commonRowSpanStyles }
                */
            ],
            [
                'License Issued', 'PAID\n(For Issuance and License Issued)', 'PAID\n(eGOVPay)', 'ONGOING\n(For Payment)', 'Total',
                'License Issued', 'PAID\n(For Issuance and License Issued)', 'PAID\n(eGOVPay)', 'ONGOING\n(For Payment)', 'Total',
                'License Issued', 'PAID\n(For Issuance and License Issued)', 'ONGOING\n(For Payment)', 'Total',
                'License Issued', 'PAID\n(For Issuance and License Issued)', 'ONGOING\n(For Payment)', 'Total'
            ]
        ];
    } else if (moduleLabel === 'Barangay Clearance') {
        head = [[
            { content: 'REGION', styles: commonRowSpanStyles },
            { content: 'LGU', styles: { ...commonRowSpanStyles, halign: 'left' } },
            { content: 'TOTAL ISSUED', styles: { ...commonRowSpanStyles, halign: 'right' } }
        ]];
    } else {
        const title = moduleLabel === 'Building Permit' ? 'BUILDING PERMITS' : 'CERTIFICATE OF OCCUPANCY';
        if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
          head = [
            [
              { content: 'REGION', rowSpan: 2, styles: commonRowSpanStyles },
              { content: 'LGU', rowSpan: 2, styles: { ...commonRowSpanStyles, halign: 'left' } },
              { content: 'Citizens Served', rowSpan: 2, styles: commonRowSpanStyles },
              { content: title, colSpan: 4, styles: commonColSpanStyles },
            ],
            ['License Issued', 'PAID\n(For Issuance and License Issued)', 'ONGOING\n(For Payment)', 'Total']
          ];
        } else {
          head = [
            [
              { content: 'REGION', rowSpan: 2, styles: commonRowSpanStyles },
              { content: 'LGU', rowSpan: 2, styles: { ...commonRowSpanStyles, halign: 'left' } },
              { content: 'Citizens Served', rowSpan: 2, styles: commonRowSpanStyles },
              { content: title, colSpan: 5, styles: commonColSpanStyles },
            ],
            ['License Issued', 'PAID\n(For Issuance and License Issued)', 'PAID\n(eGOVPay)', 'ONGOING\n(For Payment)', 'Total']
          ];
        }
    }

    const allRows = sortedData.flatMap((lgu: any) => {
        if (isDayMode) {
            const results = lgu.monthlyResults?.length > 0 ? lgu.monthlyResults : [{ month: lgu.months?.[0] || '' }];
            return results.map((monthData: any) => ({ lguInfo: lgu, itemToDisplay: monthData, periodLabel: getPeriodLabel(lgu, true, monthData.month) }));
        } else {
          const aggregatedItem = (lgu.monthlyResults || []).reduce((acc: any, month: any) => {
            Object.keys(month).forEach((key: string) => {
              const val = month[key];
              if (typeof val === 'number' || (!isNaN(Number(val)) && val !== null && val !== '')) {
                acc[key] = (acc[key] || 0) + Number(val);
              }
            });
            return acc;
          }, {});
          return [{ lguInfo: lgu, itemToDisplay: aggregatedItem, periodLabel: getPeriodLabel(lgu, false) }];
        }
    });

    const totals = calculateGrandTotals(sortedData, moduleLabel);
    const dataRows: any[] = [];
    allRows.forEach((rowData: any) => {
        const { lguInfo, itemToDisplay, periodLabel } = rowData;
        const lguText = `${lguInfo.lgu}\n${periodLabel}`;
        const regionDisplay = getRegionDisplayName(normalizeRegionKey(lguInfo.region));
        const dataCells: any[] = [];

        if (isComplex) {
          // Match table calculations exactly but avoid double-counting:
          // License Issued = explicit field (or fallback to newIssued)
          // PAID column should represent For Issuance (newPaid) only; eGOV shown in its own column.
          const newLicenseIssued = Number(itemToDisplay.newLicenseIssued ?? itemToDisplay.newIssued ?? itemToDisplay.newPaid ?? 0);
          const newEgov = Number(itemToDisplay.newPaidViaEgov || 0);
          // PAID column = License Issued + PAID (eGOVPay)
          const newPaidColumn = newLicenseIssued + newEgov;
          const newTotal = newPaidColumn + (itemToDisplay.newPending || 0);

          const renewLicenseIssued = Number(itemToDisplay.renewLicenseIssued ?? itemToDisplay.renewIssued ?? 0);
          const renewEgov = Number(itemToDisplay.renewPaidViaEgov || 0);
          const renewPaidColumn = renewLicenseIssued + renewEgov;
          const renewTotal = renewPaidColumn + (itemToDisplay.renewPending || 0);

          // Male/Female: License Issued may be provided separately; PAID = malePaid / femalePaid (no duplication)
          const maleLicenseIssued = Number(itemToDisplay.maleIssued ?? itemToDisplay.malePaid ?? 0);
          const malePaidColumn = Number(itemToDisplay.malePaid || 0);
          const maleTotal = malePaidColumn + (itemToDisplay.malePending || 0);

          const femaleLicenseIssued = Number(itemToDisplay.femaleIssued ?? itemToDisplay.femalePaid ?? 0);
          const femalePaidColumn = Number(itemToDisplay.femalePaid || 0);
          const femaleTotal = femalePaidColumn + (itemToDisplay.femalePending || 0);

          dataCells.push(formatNumberForDisplay(newLicenseIssued), formatNumberForDisplay(newPaidColumn), formatNumberForDisplay(newEgov), formatNumberForDisplay(itemToDisplay.newPending || 0), { content: formatNumberForDisplay(newTotal), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
          dataCells.push(formatNumberForDisplay(renewLicenseIssued), formatNumberForDisplay(renewPaidColumn), formatNumberForDisplay(renewEgov), formatNumberForDisplay(itemToDisplay.renewPending || 0), { content: formatNumberForDisplay(renewTotal), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
          dataCells.push(formatNumberForDisplay(maleLicenseIssued), formatNumberForDisplay(malePaidColumn), formatNumberForDisplay(itemToDisplay.malePending || 0), { content: formatNumberForDisplay(maleTotal), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
          dataCells.push(formatNumberForDisplay(femaleLicenseIssued), formatNumberForDisplay(femalePaidColumn), formatNumberForDisplay(itemToDisplay.femalePending || 0), { content: formatNumberForDisplay(femaleTotal), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
            // Append Total Licensed Issued (New + Renewal)
            // Commented out as requested — exclude the "Total Licensed Issued" column from PDF output
            // dataCells.push({ content: formatNumberForDisplay(newLicenseIssued + renewLicenseIssued), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
        } else if (moduleLabel === 'Barangay Clearance') {
          const bcVal = Number(lguInfo?.totalCount ?? itemToDisplay.totalCount ?? lguInfo?.sum?.totalCount ?? 0);
          // push a dedicated row for Barangay Clearance: Region, LGU, Total Issued
          dataRows.push([{ content: regionDisplay, styles: { valign: 'middle' } }, { content: lguText, styles: { halign: 'left' } }, formatNumberForDisplay(bcVal)]);
          return; // already pushed correct row; skip the generic push below
        } else {
          const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
          const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
          // Compute explicit License Issued and PAID aggregate (License Issued + For Issuance + eGOV)
            const licenseIssued = Number(itemToDisplay.newLicenseIssued ?? itemToDisplay.newIssued ?? itemToDisplay.newPaid ?? itemToDisplay[paidKey] ?? 0);
            const forIssuance = Number(itemToDisplay.newPaid ?? itemToDisplay[paidKey] ?? 0);
            const egov = Number(itemToDisplay.newPaidViaEgov ?? 0);
            const paidOnly = forIssuance + egov; // include egov into PAID summary but do not show separate column for Building Permit
            const pending = Number(itemToDisplay[pendingKey] ?? itemToDisplay.newPending ?? 0);
            // Present columns to match table order: Citizens Served | License Issued | PAID (For Issuance + eGOV) | ONGOING | Total
            const citizensVal = formatNumberForDisplay(lguInfo?.totalCitizensServed ?? itemToDisplay.totalCitizensServed ?? 0);
            if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
              // Do not render separate eGOV column for Building Permit or Certificate of Occupancy; PAID includes eGOV
              dataRows.push([{ content: regionDisplay, styles: { valign: 'middle' } }, { content: lguText, styles: { halign: 'left' } }, citizensVal, formatNumberForDisplay(licenseIssued), formatNumberForDisplay(paidOnly), formatNumberForDisplay(pending), { content: formatNumberForDisplay(paidOnly + pending), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } }]);
              return;
            }
            // (Other modules would display separate eGOV column)
            dataCells.push(formatNumberForDisplay(licenseIssued), formatNumberForDisplay(paidOnly), formatNumberForDisplay(egov), formatNumberForDisplay(pending), { content: formatNumberForDisplay(paidOnly + pending), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
            // We'll insert citizens cell separately (so region and LGU remain the first two cells)
            dataRows.push([{ content: regionDisplay, styles: { valign: 'middle' } }, { content: lguText, styles: { halign: 'left' } }, citizensVal, ...dataCells]);
            return; // already pushed row; skip the default push below
        }
            dataRows.push([{ content: regionDisplay, styles: { valign: 'middle' } }, { content: lguText, styles: { halign: 'left' } }, formatNumberForDisplay(lguInfo?.totalCitizensServed ?? itemToDisplay.totalCitizensServed ?? 0), ...dataCells]);
    });

    let grandTotalRow: any[] | null = null;
    if (allRows.length > 0) {
    if (isComplex) {
      // Match table footer calculations (do NOT double-count license-issued inside PAID totals):
      // License Issued column = explicit newLicenseIssued (or fallback to newPaid)
      // PAID column (summary) = sum of For Issuance (newPaid) + eGOV (newGeoPay) — licenseIssued is shown separately
      const newLicenseIssuedTotal = totals.newLicenseIssued;
      const newPaidOnlyTotal = totals.newLicenseIssued + totals.newGeoPay; // PAID = License Issued + eGOVPay
      const newTotalDisplay = newPaidOnlyTotal + totals.newPending;

      const renewLicenseIssuedTotal = totals.renewalLicenseIssued;
      const renewPaidOnlyTotal = totals.renewalLicenseIssued + totals.renewalGeoPay;
      const renewTotalDisplay = renewPaidOnlyTotal + totals.renewalPending;

      const maleLicenseIssuedTotal = totals.maleIssued; // equals totals.malePaid in table logic
      const malePaidOnlyTotal = totals.malePaid;
      const maleTotalDisplay = malePaidOnlyTotal + totals.malePending;

      const femaleLicenseIssuedTotal = totals.femaleIssued; // equals totals.femalePaid in table logic
      const femalePaidOnlyTotal = totals.femalePaid;
      const femaleTotalDisplay = femalePaidOnlyTotal + totals.femalePending;

      grandTotalRow = [ { content: `GRAND TOTAL\n(${dateRangeLabel})`, colSpan: 2 },
            formatNumberForDisplay((totals as any).totalCitizensServed || 0),
            formatNumberForDisplay(newLicenseIssuedTotal), formatNumberForDisplay(newPaidOnlyTotal), formatNumberForDisplay(totals.newGeoPay), formatNumberForDisplay(totals.newPending), formatNumberForDisplay(newTotalDisplay),
                formatNumberForDisplay(renewLicenseIssuedTotal), formatNumberForDisplay(renewPaidOnlyTotal), formatNumberForDisplay(totals.renewalGeoPay), formatNumberForDisplay(totals.renewalPending), formatNumberForDisplay(renewTotalDisplay),
                formatNumberForDisplay(maleLicenseIssuedTotal), formatNumberForDisplay(malePaidOnlyTotal), formatNumberForDisplay(totals.malePending), formatNumberForDisplay(maleTotalDisplay),
                formatNumberForDisplay(femaleLicenseIssuedTotal), formatNumberForDisplay(femalePaidOnlyTotal), formatNumberForDisplay(totals.femalePending), formatNumberForDisplay(femaleTotalDisplay)
            ];
            // Append GRAND TOTAL for Total Licensed Issued (New + Renewal)
            // Commented out as requested — exclude the "Total Licensed Issued" column from PDF grand total
            // grandTotalRow.push(formatNumberForDisplay(newLicenseIssuedTotal + renewLicenseIssuedTotal));
        } else if (moduleLabel === 'Barangay Clearance') {
            grandTotalRow = [{ content: `GRAND TOTAL\n(${dateRangeLabel})`, colSpan: 2 }, formatNumberForDisplay(totals.totalCount)];
        } else {
          // Column order: after LGU comes Citizens Served, then License Issued, PAID, ONGOING, Total
          grandTotalRow = [{ content: `GRAND TOTAL\n(${dateRangeLabel})`, colSpan: 2 }, formatNumberForDisplay((totals as any).totalCitizensServed || 0), formatNumberForDisplay(totals.licenseIssued), formatNumberForDisplay(totals.paid), formatNumberForDisplay(totals.pending), formatNumberForDisplay(totals.paid + totals.pending)];
        }
    }

    type RegionGroup = { text: string; page: number; x: number; width: number; yTop: number; yBottom: number; };
    const pageGroups: Record<number, { openGroup: RegionGroup | null }> = {};
    const lineColor = '#dee2e6';
    const WHITE = '#FFFFFF';

    const drawHBorder = (x: number, width: number, y: number) => { doc.setDrawColor(lineColor); doc.setLineWidth(0.5); doc.line(x, y, x + width, y); };
    const drawMergedRegionText = (grp: RegionGroup) => { if (!grp) return; const centerX = grp.x + grp.width / 2; const centerY = grp.yTop + (grp.yBottom - grp.yTop) / 2; try { doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.text(grp.text, centerX, centerY, { align: 'center', baseline: 'middle' as any }); } catch { doc.text(grp.text, centerX, centerY + 2.5, { align: 'center' }); } };
    
    const renderChunk = (chunkRows: any[], appendGrandTotal: boolean) => {
        autoTable(doc, {
            head,
            body: appendGrandTotal && grandTotalRow ? [...chunkRows, grandTotalRow] : chunkRows,
            theme: 'grid',
            margin: { top: 90, left: 30, right: 30 },
            tableWidth: 'auto',
            styles: { font: 'helvetica', fontSize: isComplex ? 8.5 : 7, cellPadding: { top: 4, right: 5, bottom: 4, left: 5 }, lineWidth: 0.4, lineColor: '#e2e8f0', overflow: 'linebreak' },
            headStyles: { fontStyle: 'bold', fillColor: '#9ec6f7', textColor: '#000000', lineWidth: 0.5, lineColor: '#a5b4fc', halign: 'center', valign: 'middle', fontSize: 7.5 },
            bodyStyles: { fillColor: '#FFFFFF', textColor: '#111827' },
            alternateRowStyles: { fillColor: '#f8fafc' },
      columnStyles: {
    // Keep REGION narrow and give LGU more room for complex modules (Business/Working Permit)
    0: { cellWidth: 60, halign: 'center' },
    1: isComplex ? { cellWidth: 115, halign: 'left', fontStyle: 'bold' } : { fontStyle: 'bold' },
      },
            didParseCell: (data: any) => {
                const isGrandTotalRow = data.row?.raw?.[0]?.content?.startsWith('GRAND TOTAL');
                if (data.section === 'head') {
                    if (data.row.index === 1) {
                        data.cell.styles.fillColor = '#dbeafe'; // bg-blue-100
                        data.cell.styles.fontSize = 6.5;
                        data.cell.styles.cellPadding = 3;
                    }
                    if (data.column.index >= 2) data.cell.styles.halign = 'center';
                } else if (data.section === 'body') {
                    if (isGrandTotalRow) {
                        data.cell.styles.fillColor = '#1e293b';
                        data.cell.styles.textColor = '#ffffff';
                        data.cell.styles.fontStyle = 'bold';
                        data.cell.styles.fontSize = 8;
                        if (data.column.index === 0) data.cell.styles.halign = 'left';
                        else data.cell.styles.halign = 'right';
                    } else {
                        if (data.column.index === 0) data.cell.styles.fillColor = '#FFFFFF';
                        if (data.column.index === 1) data.cell.styles.halign = 'left';
                        if (data.column.index >= 2) data.cell.styles.halign = 'right';
                    }
                }
            },
            willDrawCell: (data: any) => {
              if (data.section !== 'body' || data.column.index !== 0 || (data.cell.colSpan && data.cell.colSpan > 1)) return;
              data.cell.styles.fillColor = WHITE;
              (data.cell.styles as any).lineWidth = { top: 0, right: 0.5, bottom: 0, left: 0.5 };
              (data.cell.styles as any).lineColor = lineColor;
              const raw = data.cell.raw as any;
              raw._regionText = (raw && raw.content) ? raw.content : (Array.isArray(data.cell.text) ? data.cell.text.join('') : String(data.cell.text || ''));
              data.cell.text = [''];
            },
            didDrawCell: (data: any) => {
              if (data.section !== 'body' || data.column.index !== 0 || (data.cell.colSpan && data.cell.colSpan > 1)) return;
              const page = data.table.pageNumber as number;
              const raw = data.cell.raw as any;
              const text: string = (raw && raw._regionText) || (raw && raw.content) || '';
              if (!pageGroups[page]) pageGroups[page] = { openGroup: null };
              const state = pageGroups[page];
              if (!state.openGroup || state.openGroup.text !== text) {
                if (state.openGroup) { state.openGroup.yBottom = data.cell.y; drawHBorder(state.openGroup.x, state.openGroup.width, state.openGroup.yBottom); drawMergedRegionText(state.openGroup); }
                state.openGroup = { text, page, x: data.cell.x, width: data.cell.width, yTop: data.cell.y, yBottom: data.cell.y + data.cell.height };
                drawHBorder(state.openGroup.x, state.openGroup.width, state.openGroup.yTop);
              } else {
                state.openGroup.yBottom = data.cell.y + data.cell.height;
              }
            },
            didDrawPage: (data: any) => {
              const page = data.table.pageNumber as number;
              const state = pageGroups[page];
              if (state?.openGroup) { drawHBorder(state.openGroup.x, state.openGroup.width, state.openGroup.yBottom); drawMergedRegionText(state.openGroup); state.openGroup = null; }
            }
        });
    };

    const rowsPerPage = isComplex ? (isDayMode ? 15 : 15) : 26;
    if (!rowsPerPage || dataRows.length <= rowsPerPage) {
        renderChunk(dataRows, true);
    } else {
        const totalChunks = Math.ceil(dataRows.length / rowsPerPage);
        for (let i = 0; i < totalChunks; i++) {
            if (i > 0) doc.addPage();
            const start = i * rowsPerPage;
            const end = Math.min(start + rowsPerPage, dataRows.length);
            const segment = dataRows.slice(start, end);
            renderChunk(segment, i === totalChunks - 1);
        }
    }

    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
        throwIfAborted();
        doc.setPage(p);
        addHeader(doc, finalParams, p, pageCount, base64Logo);
    }
    if (signal?.aborted) { const e: any = new Error('canceled'); e.name = 'CanceledError'; throw e; }
    doc.save(`${safeFilename}.pdf`);
};

// --- FIX: Added ExcelParams interface definition ---
interface ExcelParams {
  data: any[];
  moduleLabel: string;
  isDayMode: boolean;
  dateRangeLabel?: string;
}
export const exportReportToExcel = (params: ExcelParams, signal?: AbortSignal) => {
    const baseData = params.data.filter((lgu: any) => !lgu.hasError);
    const exportableData = params.moduleLabel === 'Certificate of Occupancy' ? normalizeCertificateOfOccupancyData(baseData) : baseData;
    const { moduleLabel, isDayMode, dateRangeLabel } = params;
    const throwIfAborted = () => { if (signal?.aborted) { const e: any = new Error('canceled'); e.name = 'CanceledError'; throw e; } };
    throwIfAborted();

    const sortedData = [...exportableData].sort(compareByRegion);
    const isComplex = ['Business Permit', 'Working Permit'].includes(moduleLabel);
    let headers: any[][] = [];
    let body: any[][] = [];
    let merges: xlsx.Range[] = [];
    const totals = calculateGrandTotals(sortedData, moduleLabel);

    const allRows = sortedData.flatMap((lgu: any) => {
        if (isDayMode) {
            const results = lgu.monthlyResults?.length > 0 ? lgu.monthlyResults : [{ month: lgu.months?.[0] || '' }];
            return results.map((monthData: any) => ({ lguInfo: lgu, itemToDisplay: monthData, periodLabel: getPeriodLabel(lgu, true, monthData.month) }));
        } else {
          const aggregatedItem = (lgu.monthlyResults || []).reduce((acc: any, month: any) => {
            Object.keys(month).forEach((key: string) => {
              const val = month[key];
              if (typeof val === 'number' || (!isNaN(Number(val)) && val !== null && val !== '')) {
                acc[key] = (acc[key] || 0) + Number(val);
              }
            });
            return acc;
          }, {});
          return [{ lguInfo: lgu, itemToDisplay: aggregatedItem, periodLabel: getPeriodLabel(lgu, false) }];
        }
    });

    if (isComplex) {
      headers = [
      ['Region', 'LGU', 'Citizens Served', 'New', null, null, null, null, 'Renewal', null, null, null, null, 'Male', null, null, null, 'Female', null, null, null/*, 'Total Licensed Issued'*/],
      [null, null, null, 'License Issued', 'PAID\n(For Issuance to License Issued)', 'PAID (eGOVPay)\n', 'ONGOING\n(For verification to For Payment)', 'Total', 'License Issued', 'PAID\n(For Issuance to License Issued)', 'PAID (eGOVPay)\n', 'ONGOING\n(For verification to For Payment)', 'Total', 'License Issued', 'PAID\n(For Issuance to License Issued)', 'ONGOING\n(For verification to For Payment)', 'Total', 'License Issued', 'PAID\n(For Issuance to License Issued)', 'ONGOING\n(For verification to For Payment)', 'Total'/*, null*/]
      ];
    } else {
      headers = [
        moduleLabel === 'Barangay Clearance'
          ? ['Region', 'LGU', 'Total Results']
                : (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy')
                ? ['Region', 'LGU', 'Citizens Served', 'License Issued', 'Paid\n(For Issuance to License Issued)', 'Ongoing\n(For verification to For Payment)', 'Total']
            : ['Region', 'LGU', 'Paid\n(For Issuance to License Issued)', 'Ongoing\n(For verification to For Payment)']
      ];
    }

    let currentRowIndex = headers.length;
    let lastRegion: string | null = null;
    let regionStartIndex = currentRowIndex;

    allRows.forEach((rowData: any) => {
        const { lguInfo, itemToDisplay, periodLabel } = rowData;
        let row: any[] = [];
        const canonicalRegion = normalizeRegionKey(lguInfo.region);
        if (canonicalRegion !== lastRegion) {
            if (lastRegion !== null && currentRowIndex > regionStartIndex + 1) { merges.push({ s: { r: regionStartIndex, c: 0 }, e: { r: currentRowIndex - 1, c: 0 } }); }
            lastRegion = canonicalRegion;
            regionStartIndex = currentRowIndex;
            row.push(getRegionDisplayName(canonicalRegion));
        } else {
            row.push(null);
        }
        row.push(`${lguInfo.lgu} ${periodLabel}`);

        if (isComplex) {
          // Match table calculations but avoid double-counting in Excel too:
            // Prefer itemToDisplay values but fall back to lguInfo or lguInfo.sum when missing
            const srcNew = itemToDisplay.newLicenseIssued ?? itemToDisplay.newIssued ?? lguInfo?.newLicenseIssued ?? lguInfo?.newIssued ?? itemToDisplay.newPaid ?? lguInfo?.newPaid ?? 0;
            const newLicenseIssued = Number(srcNew);
            const newEgov = Number(itemToDisplay.newPaidViaEgov ?? lguInfo?.newPaidViaEgov ?? 0);
            const newPaidColumn = newLicenseIssued + newEgov; // PAID = License Issued + eGOVPay
            const newTotal = newPaidColumn + Number(itemToDisplay.newPending ?? lguInfo?.newPending ?? 0);

            const srcRenew = itemToDisplay.renewLicenseIssued ?? itemToDisplay.renewIssued ?? lguInfo?.renewLicenseIssued ?? lguInfo?.renewIssued ?? itemToDisplay.renewPaid ?? lguInfo?.renewPaid ?? 0;
            const renewLicenseIssued = Number(srcRenew);
            const renewEgov = Number(itemToDisplay.renewPaidViaEgov ?? lguInfo?.renewPaidViaEgov ?? 0);
            const renewPaidColumn = renewLicenseIssued + renewEgov;
            const renewTotal = renewPaidColumn + Number(itemToDisplay.renewPending ?? lguInfo?.renewPending ?? 0);

            const maleLicenseIssued = Number(itemToDisplay.maleIssued ?? lguInfo?.maleIssued ?? itemToDisplay.malePaid ?? lguInfo?.malePaid ?? 0);
            const malePaidColumn = Number(itemToDisplay.malePaid ?? lguInfo?.malePaid ?? 0);
            const maleTotal = malePaidColumn + Number(itemToDisplay.malePending ?? lguInfo?.malePending ?? 0);

            const femaleLicenseIssued = Number(itemToDisplay.femaleIssued ?? lguInfo?.femaleIssued ?? itemToDisplay.femalePaid ?? lguInfo?.femalePaid ?? 0);
            const femalePaidColumn = Number(itemToDisplay.femalePaid ?? lguInfo?.femalePaid ?? 0);
            const femaleTotal = femalePaidColumn + Number(itemToDisplay.femalePending ?? lguInfo?.femalePending ?? 0);

            const citizensVal = formatNumberForExcel(lguInfo?.totalCitizensServed ?? itemToDisplay.totalCitizensServed ?? lguInfo?.sum?.totalCitizensServed ?? 0);
            row.push(citizensVal, formatNumberForExcel(newLicenseIssued), formatNumberForExcel(newPaidColumn), formatNumberForExcel(newEgov), formatNumberForExcel(Number(itemToDisplay.newPending ?? lguInfo?.newPending ?? 0)), newTotal);
            row.push(formatNumberForExcel(renewLicenseIssued), formatNumberForExcel(renewPaidColumn), formatNumberForExcel(renewEgov), formatNumberForExcel(Number(itemToDisplay.renewPending ?? lguInfo?.renewPending ?? 0)), renewTotal);
            row.push(formatNumberForExcel(maleLicenseIssued), formatNumberForExcel(malePaidColumn), formatNumberForExcel(Number(itemToDisplay.malePending ?? lguInfo?.malePending ?? 0)), maleTotal);
            row.push(formatNumberForExcel(femaleLicenseIssued), formatNumberForExcel(femalePaidColumn), formatNumberForExcel(Number(itemToDisplay.femalePending ?? lguInfo?.femalePending ?? 0)), femaleTotal);
            // Append Total Licensed Issued (New + Renewal)
            // Commented out as requested — exclude the "Total Licensed Issued" column from Excel output
            // row.push(newLicenseIssued + renewLicenseIssued);
        } else if (moduleLabel === 'Barangay Clearance') {
          const bcVal = lguInfo?.totalCount ?? itemToDisplay.totalCount ?? lguInfo?.sum?.totalCount ?? 0;
          row.push(formatNumberForExcel(bcVal));
        } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
          const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
          const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
          // License Issued + For Issuance + eGOV should be considered in the PAID column
          const licenseIssued = Number(itemToDisplay.newLicenseIssued ?? itemToDisplay.newIssued ?? itemToDisplay.newPaid ?? itemToDisplay[paidKey] ?? 0);
          const forIssuance = Number(itemToDisplay.newPaid ?? itemToDisplay[paidKey] ?? 0);
          const egov = Number(itemToDisplay.newPaidViaEgov ?? 0);
          const paidOnly = forIssuance + egov;
          const pending = Number(itemToDisplay[pendingKey] ?? itemToDisplay.newPending ?? 0);
          const citizensVal = formatNumberForExcel(lguInfo?.totalCitizensServed ?? itemToDisplay.totalCitizensServed ?? 0);
          // Order: Citizens Served, License Issued, PAID, ONGOING, Total
          row.push(citizensVal, formatNumberForExcel(licenseIssued), formatNumberForExcel(paidOnly), formatNumberForExcel(pending), paidOnly + pending);
        } else {
            const paidKey = moduleLabel === 'Building Permit' ? 'buildingPaid' : 'coPaid';
            const pendingKey = moduleLabel === 'Building Permit' ? 'buildingPending' : 'coPending';
            row.push(formatNumberForExcel(itemToDisplay[paidKey]), formatNumberForExcel(itemToDisplay[pendingKey]));
        }
        body.push(row);
        currentRowIndex++;
    });

    if (lastRegion !== null && currentRowIndex > regionStartIndex + 1) { merges.push({ s: { r: regionStartIndex, c: 0 }, e: { r: currentRowIndex - 1, c: 0 } }); }

    if (allRows.length > 0) {
      let totalRow: any[];
    if (isComplex) {
      // Match table footer calculations: do NOT double-count license-issued inside PAID totals.
      const newLicenseIssuedTotal = totals.newLicenseIssued;
      const newPaidOnlyTotal = totals.newPaid + totals.newGeoPay;
      const newTotalDisplay = newPaidOnlyTotal + totals.newPending;

      const renewLicenseIssuedTotal = totals.renewalLicenseIssued;
      const renewPaidOnlyTotal = totals.renewalPaid + totals.renewalGeoPay;
      const renewTotalDisplay = renewPaidOnlyTotal + totals.renewalPending;

      const maleLicenseIssuedTotal = totals.maleIssued;
      const malePaidOnlyTotal = totals.malePaid;
      const maleTotalDisplay = malePaidOnlyTotal + totals.malePending;

      const femaleLicenseIssuedTotal = totals.femaleIssued;
      const femalePaidOnlyTotal = totals.femalePaid;
      const femaleTotalDisplay = femalePaidOnlyTotal + totals.femalePending;

            totalRow = [ 'GRAND TOTAL', null, (totals as any).totalCitizensServed || 0, newLicenseIssuedTotal, newPaidOnlyTotal, totals.newGeoPay, totals.newPending, newTotalDisplay,
              renewLicenseIssuedTotal, renewPaidOnlyTotal, totals.renewalGeoPay, totals.renewalPending, renewTotalDisplay,
              maleLicenseIssuedTotal, malePaidOnlyTotal, totals.malePending, maleTotalDisplay,
              femaleLicenseIssuedTotal, femalePaidOnlyTotal, totals.femalePending, femaleTotalDisplay ];
        // Append GRAND TOTAL for Total Licensed Issued (New + Renewal)
        // Commented out as requested — exclude the "Total Licensed Issued" column from Excel grand total
        // totalRow.push(newLicenseIssuedTotal + renewLicenseIssuedTotal);
        merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 1 } });
        } else {
            if (moduleLabel === 'Barangay Clearance') {
                totalRow = ['GRAND TOTAL', null, totals.totalCount];
            } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
              // Column order: Region, LGU, Citizens Served, License Issued, PAID, ONGOING, Total
              totalRow = [ 'GRAND TOTAL', null, (totals as any).totalCitizensServed, totals.licenseIssued, totals.paid, totals.pending, (totals.paid + totals.pending) ];
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
        { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
        { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
        { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
        { s: { r: 0, c: 3 }, e: { r: 0, c: 7 } },
        { s: { r: 0, c: 8 }, e: { r: 0, c: 12 } },
        { s: { r: 0, c: 13 }, e: { r: 0, c: 16 } },
        { s: { r: 0, c: 17 }, e: { r: 0, c: 20 } }
        // Commented out merge for last 'Total Licensed Issued' column (removed)
        // { s: { r: 0, c: 20 }, e: { r: 1, c: 20 } }
      );
    }
    ws['!merges'] = merges;
    const lastHeaderRow = headers[headers.length - 1];
  // Make LGU column wider in Excel output only for complex modules (Business/Working Permit)
  ws['!cols'] = lastHeaderRow.map((_c: any, idx: number) => ({ wch: idx === 0 ? 22 : idx === 1 ? (isComplex ? 40 : 24) : 24 }));

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Report');
    if (signal?.aborted) { const e: any = new Error('canceled'); e.name = 'CanceledError'; throw e; }

    // Build safe filename for Excel export including Period Covered
    const sanitizeForFilename = (s: string) => {
      return (s || '').replace(/[<>:\"\\/\|\?\*\u0000-\u001F]/g, '').replace(/\s+/g, ' ').trim();
    };
    const moduleSlug = moduleLabel.toLowerCase().replace(/\s+/g, '-');
    const datePart = dateRangeLabel ? `(${dateRangeLabel})` : '';
    const rawFilename = `${moduleSlug}-report${datePart}`;
    const safeFilename = sanitizeForFilename(rawFilename);

    xlsx.writeFile(wb, `${safeFilename}.xlsx`);
};
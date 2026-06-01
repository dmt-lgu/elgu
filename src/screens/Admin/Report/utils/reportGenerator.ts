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

const NEW_LICENSE_KEYS = ['newLicenseIssued', 'newIssued', 'licenseIssuedNew', 'newLicense'];
const RENEW_LICENSE_KEYS = ['renewLicenseIssued', 'renewIssued', 'licenseIssuedRenewal', 'renewLicense'];
const MALE_LICENSE_KEYS = ['maleLicenseIssued', 'maleIssued'];
const FEMALE_LICENSE_KEYS = ['femaleLicenseIssued', 'femaleIssued'];
const BUILDING_LICENSE_KEYS = ['buildingLicenseIssued', 'buildingIssued', 'licenseIssued', 'issued'];
const BUILDING_FOR_ISSUANCE_KEYS = ['buildingForIssuance', 'forIssuance'];
const CO_LICENSE_KEYS = ['coLicenseIssued', 'coIssued', 'licenseIssued', 'issued'];
const CO_FOR_ISSUANCE_KEYS = ['coForIssuance', 'forIssuance'];

const getLicenseIssued = (item: any, keys: string[], fallback: number): number => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== null && value !== undefined && value !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return fallback;
};

const getExplicitNumber = (item: any, keys: string[]): number | null => {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== null && value !== undefined && value !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return null;
};

const getSimplePermitCounts = (item: any, moduleLabel: string) => {
  const isBuilding = moduleLabel === 'Building Permit';
  const paidKey = isBuilding ? 'buildingPaid' : 'coPaid';
  const pendingKey = isBuilding ? 'buildingPending' : 'coPending';
  const licenseKeys = isBuilding ? BUILDING_LICENSE_KEYS : CO_LICENSE_KEYS;
  const forIssuanceKeys = isBuilding ? BUILDING_FOR_ISSUANCE_KEYS : CO_FOR_ISSUANCE_KEYS;
  const fallbackPaid = Number(item?.[paidKey] || 0);
  const forIssuance = getExplicitNumber(item, forIssuanceKeys);
  const licenseIssued = getLicenseIssued(item, licenseKeys, fallbackPaid);
  const paid = forIssuance === null ? fallbackPaid : forIssuance;
  const pending = Number(item?.[pendingKey] || 0);
  return { licenseIssued, paid, pending };
};

const getCitizensServed = (lgu: any): number => Number(lgu?.totalCitizensServed || 0);

const toFileSlug = (value: string): string =>
  String(value || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const buildReportFileName = (moduleLabel: string, dateRangeLabel: string, extension: 'pdf' | 'xlsx'): string => {
  const moduleSlug = toFileSlug(moduleLabel).replace(/-report$/, '') || 'report';
  const rangeSlug = toFileSlug(dateRangeLabel);
  return `${moduleSlug}-report${rangeSlug ? `-${rangeSlug}` : ''}.${extension}`;
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
    maleIssued: 0, malePaid: 0, malePending: 0,
    femaleIssued: 0, femalePaid: 0, femalePending: 0,
    paid: 0, pending: 0, totalCount: 0, citizensServed: 0, licenseIssued: 0
  };

  for (const lgu of data) {
    totals.citizensServed += getCitizensServed(lgu);
    const itemsToSum = lgu.monthlyResults || [];
    for (const item of itemsToSum) {
      if (moduleLabel === 'Barangay Clearance') {
        totals.totalCount += item.totalCount || 0;
      } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
        const counts = getSimplePermitCounts(item, moduleLabel);
        totals.licenseIssued += counts.licenseIssued;
        totals.paid += counts.paid;
        totals.pending += counts.pending;
      } else {
        const newIssued = getLicenseIssued(item, NEW_LICENSE_KEYS, Number(item.newPaid || 0));
        const renewalIssued = getLicenseIssued(item, RENEW_LICENSE_KEYS, Number(item.renewPaid || 0));
        totals.newIssued += newIssued;
        totals.newPaid += item.newPaid || 0;
        totals.newGeoPay += item.newPaidViaEgov || 0;
        totals.newPending += item.newPending || 0;
        totals.renewalIssued += renewalIssued;
        totals.renewalPaid += item.renewPaid || 0;
        totals.renewalGeoPay += item.renewPaidViaEgov || 0;
        totals.renewalPending += item.renewPending || 0;
        totals.maleIssued += getLicenseIssued(item, MALE_LICENSE_KEYS, Number(item.malePaid || 0));
        totals.malePaid += item.malePaid || 0;
        totals.malePending += item.malePending || 0;
        totals.femaleIssued += getLicenseIssued(item, FEMALE_LICENSE_KEYS, Number(item.femalePaid || 0));
        totals.femalePaid += item.femalePaid || 0;
        totals.femalePending += item.femalePending || 0;
      }
    }
  }
  return totals;
};

const normalizeReportData = (rawData: any[], moduleLabel: string): any[] => {
  const byLgu = new Map<string, { base: any; monthsMap: Map<string, any>; hasError?: boolean; region?: string; }>();

  for (const entry of rawData || []) {
    const key = entry?.lgu || '';
    if (!key) continue;
    if (!byLgu.has(key)) {
      byLgu.set(key, { base: { ...entry, monthlyResults: [] }, monthsMap: new Map<string, any>(), hasError: entry?.hasError, region: normalizeRegionKey(entry?.region), });
    }
    const bucket = byLgu.get(key)!;
    if (!bucket.region && entry?.region) { bucket.region = normalizeRegionKey(entry.region); }
    if (entry?.hasError) bucket.hasError = true;
    const monthsArr = Array.isArray(entry?.monthlyResults) ? entry.monthlyResults : [];
    for (const m of monthsArr) {
      const mKey = m?.month;
      if (!mKey) continue;
      const existing = bucket.monthsMap.get(mKey) || { month: mKey };

      if (moduleLabel === 'Barangay Clearance') {
        existing.totalCount = Math.max(Number(existing.totalCount || 0), Number(m?.totalCount || 0));
      } else if (moduleLabel === 'Building Permit') {
        existing.buildingPaid = Math.max(Number(existing.buildingPaid || 0), Number(m?.buildingPaid || 0));
        existing.buildingForIssuance = Math.max(Number(existing.buildingForIssuance || 0), getExplicitNumber(m, BUILDING_FOR_ISSUANCE_KEYS) ?? 0);
        existing.buildingLicenseIssued = Math.max(Number(existing.buildingLicenseIssued || 0), getLicenseIssued(m, BUILDING_LICENSE_KEYS, Number(m?.buildingPaid || 0)));
        existing.buildingPending = Math.max(Number(existing.buildingPending || 0), Number(m?.buildingPending || 0));
      } else if (moduleLabel === 'Certificate of Occupancy') {
        existing.coPaid = Number(m?.coPaid || 0);
        existing.coForIssuance = getExplicitNumber(m, CO_FOR_ISSUANCE_KEYS) ?? 0;
        existing.coLicenseIssued = getLicenseIssued(m, CO_LICENSE_KEYS, Number(m?.coPaid || 0));
        existing.coPending = Number(m?.coPending || 0);
      } else {
        Object.keys(m).forEach(field => {
          if (field === 'month') return;
          const value = m[field];
          if (typeof value === 'number') {
            existing[field] = Math.max(Number(existing[field] || 0), Number(value));
          } else if (existing[field] === undefined) {
            existing[field] = value;
          }
        });
      }

      bucket.monthsMap.set(mKey, existing);
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
    const exportableData = normalizeReportData(baseData, params.moduleLabel);
    const finalParams = { ...params, generatedAt: new Date() };
    const { moduleLabel, isDayMode, dateRangeLabel } = finalParams;
    const sortedData = [...exportableData].sort(compareByRegion);

    let base64Logo = '';
    const throwIfAborted = () => { if (signal?.aborted) { const e: any = new Error('canceled'); e.name = 'CanceledError'; throw e; } };
    try { throwIfAborted(); base64Logo = await loadImageAsBase64(finalParams.logoUrl); } catch (error) { if ((error as any)?.name === 'CanceledError') throw error; console.error('Could not load logo for PDF.', error); }

    const isComplex = ['Business Permit', 'Working Permit'].includes(moduleLabel);
    const orientation = isComplex ? 'landscape' : 'portrait';
    const pdfFormat = isComplex ? [1190, 842] : 'a4';
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
                { content: 'FEMALE', colSpan: 4, styles: commonColSpanStyles }
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
            { content: 'CITIZENS SERVED', styles: { ...commonRowSpanStyles, halign: 'right' } },
            { content: 'TOTAL ISSUED', styles: { ...commonRowSpanStyles, halign: 'right' } }
        ]];
    } else {
        const title = moduleLabel === 'Building Permit' ? 'BUILDING PERMITS' : 'CERTIFICATE OF OCCUPANCY';
        head = [
            [
                { content: 'REGION', rowSpan: 2, styles: commonRowSpanStyles },
                { content: 'LGU', rowSpan: 2, styles: { ...commonRowSpanStyles, halign: 'left' } },
                { content: 'CITIZENS SERVED', rowSpan: 2, styles: commonRowSpanStyles },
                { content: title, colSpan: 4, styles: commonColSpanStyles },
            ],
            ['License Issued', 'PAID\n(For Issuance and License Issued)', 'ONGOING\n(For Payment)', 'Total']
        ];
    }

    const allRows = sortedData.flatMap((lgu: any) => {
        if (isDayMode) {
            const results = lgu.monthlyResults?.length > 0 ? lgu.monthlyResults : [{ month: lgu.months?.[0] || '' }];
            return results.map((monthData: any) => ({ lguInfo: lgu, itemToDisplay: monthData, periodLabel: getPeriodLabel(lgu, true, monthData.month) }));
        } else {
            const aggregatedItem = (lgu.monthlyResults || []).reduce((acc: any, month: any) => { Object.keys(month).forEach((key: string) => { if (typeof month[key] === 'number') { acc[key] = (acc[key] || 0) + month[key]; } }); return acc; }, {});
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
            const newIssued = getLicenseIssued(itemToDisplay, NEW_LICENSE_KEYS, Number(itemToDisplay.newPaid || 0));
            const newPaidWithEgov = (itemToDisplay.newPaid || 0) + (itemToDisplay.newPaidViaEgov || 0);
            dataCells.push(formatNumberForDisplay(newIssued), formatNumberForDisplay(newPaidWithEgov), formatNumberForDisplay(itemToDisplay.newPaidViaEgov), formatNumberForDisplay(itemToDisplay.newPending), { content: formatNumberForDisplay(newPaidWithEgov + (itemToDisplay.newPending || 0)), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
            const renewIssued = getLicenseIssued(itemToDisplay, RENEW_LICENSE_KEYS, Number(itemToDisplay.renewPaid || 0));
            const renewPaidWithEgov = (itemToDisplay.renewPaid || 0) + (itemToDisplay.renewPaidViaEgov || 0);
            dataCells.push(formatNumberForDisplay(renewIssued), formatNumberForDisplay(renewPaidWithEgov), formatNumberForDisplay(itemToDisplay.renewPaidViaEgov), formatNumberForDisplay(itemToDisplay.renewPending), { content: formatNumberForDisplay(renewPaidWithEgov + (itemToDisplay.renewPending || 0)), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
            dataCells.push(formatNumberForDisplay(getLicenseIssued(itemToDisplay, MALE_LICENSE_KEYS, Number(itemToDisplay.malePaid || 0))), formatNumberForDisplay(itemToDisplay.malePaid), formatNumberForDisplay(itemToDisplay.malePending), { content: formatNumberForDisplay((itemToDisplay.malePaid || 0) + (itemToDisplay.malePending || 0)), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
            dataCells.push(formatNumberForDisplay(getLicenseIssued(itemToDisplay, FEMALE_LICENSE_KEYS, Number(itemToDisplay.femalePaid || 0))), formatNumberForDisplay(itemToDisplay.femalePaid), formatNumberForDisplay(itemToDisplay.femalePending), { content: formatNumberForDisplay((itemToDisplay.femalePaid || 0) + (itemToDisplay.femalePending || 0)), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
        } else if (moduleLabel === 'Barangay Clearance') {
            dataCells.push(formatNumberForDisplay(itemToDisplay.totalCount));
        } else {
            const { licenseIssued, paid, pending } = getSimplePermitCounts(itemToDisplay, moduleLabel);
            dataCells.push(formatNumberForDisplay(licenseIssued), formatNumberForDisplay(paid), formatNumberForDisplay(pending), { content: formatNumberForDisplay(paid + pending), styles: { fontStyle: 'bold', fillColor: '#f1f5f9' } });
        }
        dataRows.push([{ content: regionDisplay, styles: { valign: 'middle' } }, { content: lguText, styles: { halign: 'left' } }, formatNumberForDisplay(getCitizensServed(lguInfo)), ...dataCells]);
    });

    let grandTotalRow: any[] | null = null;
    if (allRows.length > 0) {
    if (isComplex) {
      // Prefer explicit issued totals when available; otherwise use the paid count.
      const licenseIssuedNewTotal = totals.newIssued;
      const licenseIssuedRenewalTotal = totals.renewalIssued;
            grandTotalRow = [ { content: `GRAND TOTAL\n(${dateRangeLabel})`, colSpan: 2 },
                formatNumberForDisplay(totals.citizensServed),
                formatNumberForDisplay(licenseIssuedNewTotal), formatNumberForDisplay(totals.newPaid + totals.newGeoPay), formatNumberForDisplay(totals.newGeoPay), formatNumberForDisplay(totals.newPending), formatNumberForDisplay(totals.newPaid + totals.newGeoPay + totals.newPending),
                formatNumberForDisplay(licenseIssuedRenewalTotal), formatNumberForDisplay(totals.renewalPaid + totals.renewalGeoPay), formatNumberForDisplay(totals.renewalGeoPay), formatNumberForDisplay(totals.renewalPending), formatNumberForDisplay(totals.renewalPaid + totals.renewalGeoPay + totals.renewalPending),
                formatNumberForDisplay(totals.maleIssued), formatNumberForDisplay(totals.malePaid), formatNumberForDisplay(totals.malePending), formatNumberForDisplay(totals.malePaid + totals.malePending),
                formatNumberForDisplay(totals.femaleIssued), formatNumberForDisplay(totals.femalePaid), formatNumberForDisplay(totals.femalePending), formatNumberForDisplay(totals.femalePaid + totals.femalePending)
            ];
        } else if (moduleLabel === 'Barangay Clearance') {
            grandTotalRow = [{ content: `GRAND TOTAL\n(${dateRangeLabel})`, colSpan: 2 }, formatNumberForDisplay(totals.citizensServed), formatNumberForDisplay(totals.totalCount)];
        } else {
            grandTotalRow = [{ content: `GRAND TOTAL\n(${dateRangeLabel})`, colSpan: 2 }, formatNumberForDisplay(totals.citizensServed), formatNumberForDisplay(totals.licenseIssued), formatNumberForDisplay(totals.paid), formatNumberForDisplay(totals.pending), formatNumberForDisplay(totals.paid + totals.pending)];
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
            styles: { font: 'helvetica', fontSize: 7, cellPadding: { top: 4, right: 5, bottom: 4, left: 5 }, lineWidth: 0.4, lineColor: '#e2e8f0', overflow: 'linebreak' },
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

    const rowsPerPage = 20;
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
    doc.save(buildReportFileName(moduleLabel, dateRangeLabel, 'pdf'));
};

// --- FIX: Added ExcelParams interface definition ---
interface ExcelParams {
  data: any[];
  moduleLabel: string;
  isDayMode: boolean;
  dateRangeLabel: string;
}
export const exportReportToExcel = (params: ExcelParams, signal?: AbortSignal) => {
    const baseData = params.data.filter((lgu: any) => !lgu.hasError);
    const exportableData = normalizeReportData(baseData, params.moduleLabel);
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
            const aggregatedItem = (lgu.monthlyResults || []).reduce((acc: any, month: any) => { Object.keys(month).forEach((key: string) => { if (typeof month[key] === 'number') { acc[key] = (acc[key] || 0) + month[key]; } }); return acc; }, {});
            return [{ lguInfo: lgu, itemToDisplay: aggregatedItem, periodLabel: getPeriodLabel(lgu, false) }];
        }
    });

    if (isComplex) {
        headers = [
            ['Region', 'LGU', 'Citizens Served', 'New', null, null, null, null, 'Renewal', null, null, null, null, 'Male', null, null, null, 'Female', null, null, null],
            [null, null, null, 'License Issued', 'PAID\n(For Issuance to License Issued)', 'PAID (eGOVPay)\n', 'ONGOING\n(For verification to For Payment)', 'Total', 'License Issued', 'PAID\n(For Issuance to License Issued)', 'PAID (eGOVPay)\n', 'ONGOING\n(For verification to For Payment)', 'Total', 'License Issued', 'PAID\n(For Issuance to License Issued)', 'ONGOING\n(For verification to For Payment)', 'Total', 'License Issued', 'PAID\n(For Issuance to License Issued)', 'ONGOING\n(For verification to For Payment)', 'Total']
        ];
    } else {
        headers = [
            moduleLabel === 'Barangay Clearance'
                ? ['Region', 'LGU', 'Citizens Served', 'Total Results']
                : (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy')
                    ? ['Region', 'LGU', 'Citizens Served', 'License Issued', 'Paid\n(For Issuance and License Issued)', 'Ongoing\n(For verification to For Payment)', 'Total']
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
        row.push(formatNumberForExcel(getCitizensServed(lguInfo)));

        if (isComplex) {
            const newIssued = getLicenseIssued(itemToDisplay, NEW_LICENSE_KEYS, Number(itemToDisplay.newPaid || 0));
            const newPaidWithEgov = (itemToDisplay.newPaid || 0) + (itemToDisplay.newPaidViaEgov || 0);
            row.push(formatNumberForExcel(newIssued), formatNumberForExcel(newPaidWithEgov), formatNumberForExcel(itemToDisplay.newPaidViaEgov), formatNumberForExcel(itemToDisplay.newPending), newPaidWithEgov + (itemToDisplay.newPending || 0));
            const renewIssued = getLicenseIssued(itemToDisplay, RENEW_LICENSE_KEYS, Number(itemToDisplay.renewPaid || 0));
            const renewPaidWithEgov = (itemToDisplay.renewPaid || 0) + (itemToDisplay.renewPaidViaEgov || 0);
            row.push(formatNumberForExcel(renewIssued), formatNumberForExcel(renewPaidWithEgov), formatNumberForExcel(itemToDisplay.renewPaidViaEgov), formatNumberForExcel(itemToDisplay.renewPending), renewPaidWithEgov + (itemToDisplay.renewPending || 0));
            const maleIssued = getLicenseIssued(itemToDisplay, MALE_LICENSE_KEYS, Number(itemToDisplay.malePaid || 0));
            row.push(formatNumberForExcel(maleIssued), formatNumberForExcel(itemToDisplay.malePaid), formatNumberForExcel(itemToDisplay.malePending), (itemToDisplay.malePaid || 0) + (itemToDisplay.malePending || 0));
            const femaleIssued = getLicenseIssued(itemToDisplay, FEMALE_LICENSE_KEYS, Number(itemToDisplay.femalePaid || 0));
            row.push(formatNumberForExcel(femaleIssued), formatNumberForExcel(itemToDisplay.femalePaid), formatNumberForExcel(itemToDisplay.femalePending), (itemToDisplay.femalePaid || 0) + (itemToDisplay.femalePending || 0));
        } else if (moduleLabel === 'Barangay Clearance') {
            row.push(formatNumberForExcel(itemToDisplay.totalCount));
        } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
            const { licenseIssued, paid, pending } = getSimplePermitCounts(itemToDisplay, moduleLabel);
            row.push(formatNumberForExcel(licenseIssued), formatNumberForExcel(paid), formatNumberForExcel(pending), paid + pending);
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
      // Use the same issued totals shown in the rows for grand totals.
      const licenseIssuedNewTotal = totals.newIssued;
      const licenseIssuedRenewalTotal = totals.renewalIssued;
            totalRow = [ 'GRAND TOTAL', null, totals.citizensServed, licenseIssuedNewTotal, totals.newPaid + totals.newGeoPay, totals.newGeoPay, totals.newPending, (totals.newPaid + totals.newGeoPay + totals.newPending), licenseIssuedRenewalTotal, totals.renewalPaid + totals.renewalGeoPay, totals.renewalGeoPay, totals.renewalPending, (totals.renewalPaid + totals.renewalGeoPay + totals.renewalPending), totals.maleIssued, totals.malePaid, totals.malePending, (totals.malePaid + totals.malePending), totals.femaleIssued, totals.femalePaid, totals.femalePending, (totals.femalePaid + totals.femalePending) ];
            merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 1 } });
        } else {
            if (moduleLabel === 'Barangay Clearance') {
                totalRow = ['GRAND TOTAL', null, totals.citizensServed, totals.totalCount];
            } else if (moduleLabel === 'Building Permit' || moduleLabel === 'Certificate of Occupancy') {
                totalRow = [ 'GRAND TOTAL', null, totals.citizensServed, totals.licenseIssued, totals.paid, totals.pending, (totals.paid + totals.pending) ];
            } else {
                totalRow = ['GRAND TOTAL', null, totals.paid, totals.pending];
            }
            merges.push({ s: { r: currentRowIndex, c: 0 }, e: { r: currentRowIndex, c: 1 } });
        }
        body.push(totalRow);
    }

    const ws = xlsx.utils.aoa_to_sheet([...headers, ...body]);
    if (isComplex) {
        merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } }, { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } }, { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } }, { s: { r: 0, c: 3 }, e: { r: 0, c: 7 } }, { s: { r: 0, c: 8 }, e: { r: 0, c: 12 } }, { s: { r: 0, c: 13 }, e: { r: 0, c: 16 } }, { s: { r: 0, c: 17 }, e: { r: 0, c: 20 } });
    }
    ws['!merges'] = merges;
    const lastHeaderRow = headers[headers.length - 1];
  // Make LGU column wider in Excel output only for complex modules (Business/Working Permit)
  ws['!cols'] = lastHeaderRow.map((_c: any, idx: number) => ({ wch: idx === 0 ? 22 : idx === 1 ? (isComplex ? 40 : 24) : 24 }));

    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Report');
    if (signal?.aborted) { const e: any = new Error('canceled'); e.name = 'CanceledError'; throw e; }
    xlsx.writeFile(wb, buildReportFileName(moduleLabel, dateRangeLabel, 'xlsx'));
};

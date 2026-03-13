import * as xlsx from 'xlsx';
import { format } from 'date-fns';

const formatNumber = (num: number | null | undefined): number => {
  return num || 0; // Excel handles formatting, so just return the number or 0
};

const formatMonthYear = (monthStr: string): string => {
  if (!monthStr) return "";
  try {
    const date = new Date(monthStr.length === 7 ? `${monthStr}-02` : monthStr); // Use day 02 to avoid timezone issues
    return format(date, "MMMM yyyy");
  } catch {
    return monthStr;
  }
};

// --- Sheet Generation Logic for Each Report Type ---

/**
 * Generates the worksheet for Barangay Clearance.
 */
function _generateBrgyClearanceSheet(data: any[], isDayMode: boolean): xlsx.WorkSheet {
  const headers = ['Region', 'LGU', 'Province', 'Period', 'Total Results'];
  
  const body = data.flatMap(lgu => {
    if (isDayMode) {
        return (lgu.monthlyResults || []).map((month: any) => ([
            lgu.region,
            lgu.lgu,
            lgu.province || '',
            formatMonthYear(month.month),
            formatNumber(month.totalCount)
        ]));
    }
    const period = lgu.months?.length > 1
        ? `${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])}`
        : lgu.months?.length === 1 ? formatMonthYear(lgu.months[0]) : "";
    const totalCount = (lgu.monthlyResults || []).reduce((sum:any, month:any) => sum + (month.totalCount || 0), 0);
    return [[
        lgu.region,
        lgu.lgu,
        lgu.province || '',
        period,
        formatNumber(totalCount)
    ]];
  });

  const finalData = [headers, ...body];

  // Append GRAND TOTAL row
  if (body.length > 0) {
    const grandTotal = body.reduce((acc: any, row: any[]) => {
      // numeric columns start at index 4
      for (let i = 4; i < headers.length; i++) {
        acc[i] = (acc[i] || 0) + (Number(row[i] || 0) || 0);
      }
      return acc;
    }, {} as Record<number, number>);

    const totalRow: any[] = [];
    totalRow[0] = 'GRAND TOTAL';
    totalRow[1] = '';
    totalRow[2] = '';
    totalRow[3] = '';
    for (let i = 4; i < headers.length; i++) totalRow[i] = grandTotal[i] || 0;
    finalData.push(totalRow);
  }

  const ws = xlsx.utils.aoa_to_sheet(finalData);

  const colWidths = headers.map((_, i) => ({
      wch: finalData.reduce((w, r) => Math.max(w, String(r[i] || '').length), 10)
  }));
  ws['!cols'] = colWidths;
  
  return ws;
}

/**
 * [FIXED] Generates the worksheet for Building Permit or Certificate of Occupancy.
 */
function _generateBuildingPermitSheet(data: any[], moduleLabel: string, isDayMode: boolean): xlsx.WorkSheet {
  // Include computed "License Issued" and place 'Citizens Served' before numeric columns
  const headers = ['Region', 'LGU', 'Province', 'Period', 'Citizens Served', 'License Issued', 'Paid', 'Paid (eGOV)', 'Ongoing', 'Total'];
  const isBuildingPermit = moduleLabel.includes("Building");
  const paidKey = isBuildingPermit ? 'buildingPaid' : 'coPaid';
  const geoKey = isBuildingPermit ? 'buildingPaidViaEgov' : 'coPaidViaEgov';
  const pendingKey = isBuildingPermit ? 'buildingPending' : 'coPending';

  const body = data.flatMap(lgu => {
    if (isDayMode) {
      // DAY MODE: Create a row for each month and compute license issued per month
        return (lgu.monthlyResults || []).map((month: any) => {
        const paid = Number(month[paidKey] || 0);
        const geo = Number(month[geoKey] || 0);
        const pending = Number(month[pendingKey] || 0);
        // prefer explicit license-issued field if available
        const licenseIssuedField = Number(month?.newLicenseIssued ?? month?.newIssued ?? month?.licenseIssued ?? (paid + geo));
        const forIssuance = Number(month[paidKey] || month?.newPaid || 0);
        const paidCol = licenseIssuedField + forIssuance; // PAID column should show License Issued + For Issuance
        const total = paidCol + geo + pending;
        // Swap data: put PAID aggregate under the "License Issued" header, and explicit
        // License Issued value under the "PAID" header (headers remain unchanged).
        const citizens = Number(month?.totalCitizensServed ?? lgu?.totalCitizensServed ?? 0);
        // Order: Region, LGU, Province, Period, Citizens, License Issued (PAID aggregate), PAID explicit, PAID(eGOV), Ongoing, Total
        return [
          lgu.region, lgu.lgu, lgu.province || '', formatMonthYear(month.month),
          formatNumber(citizens), formatNumber(paidCol), formatNumber(licenseIssuedField), formatNumber(geo), formatNumber(pending), formatNumber(total)
        ];
      });
    } else {
      // MONTH/YEAR MODE: Sum up values from all filtered monthly results, like the UI.
      if (!lgu.monthlyResults || lgu.monthlyResults.length === 0) return [];

      const lguTotals = lgu.monthlyResults.reduce((acc: any, month: any) => {
        acc.paid += Number(month[paidKey] || 0);
        acc.geo += Number(month[geoKey] || 0);
        acc.pending += Number(month[pendingKey] || 0);
        return acc;
      }, { paid: 0, geo: 0, pending: 0 });

      const licenseIssuedField = Number(lguTotals.newLicenseIssued ?? lguTotals.newIssued ?? lguTotals.licenseIssued ?? (lguTotals.paid + lguTotals.geo));
      const forIssuance = Number(lguTotals.paid || 0);
      const paidCol = licenseIssuedField + forIssuance;
      const period = lgu.months?.length > 1
        ? `${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])}`
        : lgu.months?.length === 1 ? formatMonthYear(lgu.months[0]) : "";

      const citizens = Number(lgu?.totalCitizensServed ?? (Array.isArray(lgu?.monthlyResults) && lgu.monthlyResults.length
        ? lgu.monthlyResults.reduce((s: number, m: any) => s + (Number(m.totalCitizensServed || 0)), 0)
        : (lgu?.sum?.totalCitizensServed ?? 0)));
      return [[
        lgu.region, lgu.lgu, lgu.province || '', period,
        formatNumber(citizens), formatNumber(paidCol), formatNumber(licenseIssuedField), formatNumber(lguTotals.geo), formatNumber(lguTotals.pending), formatNumber(paidCol + lguTotals.geo + lguTotals.pending)
      ]];
    }
  });

  const finalData = [headers, ...body];

  // Append GRAND TOTAL row for Building / CO
    if (body.length > 0) {
    const grandTotal = body.reduce((acc: any, row: any[]) => {
      for (let i = 4; i < headers.length; i++) {
        acc[i] = (acc[i] || 0) + (Number(row[i] || 0) || 0);
      }
      return acc;
    }, {} as Record<number, number>);

    const totalRow: any[] = [];
    totalRow[0] = 'GRAND TOTAL';
    totalRow[1] = '';
    totalRow[2] = '';
    totalRow[3] = '';
    for (let i = 4; i < headers.length; i++) totalRow[i] = grandTotal[i] || 0;
    finalData.push(totalRow);
  }

  const ws = xlsx.utils.aoa_to_sheet(finalData);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  return ws;
}


/**
 * Generates the worksheet for Business or Working Permit.
 */
function _generateBusinessPermitSheet(data: any[], isDayMode: boolean): xlsx.WorkSheet {
  // Match UI ordering: License Issued, PAID (For Issuance), PAID (eGOVPay), ONGOING, Total
  const headers = [
    'Region', 'LGU', 'Province', 'Period',
    'Citizens Served', 'New - License Issued', 'New - Paid (For Issuance and License Issued)', 'New - Paid (eGOV)', 'New - Ongoing', 'New - Total',
    'Renewal - License Issued', 'Renewal - Paid', 'Renewal - Paid (eGOV)', 'Renewal - Ongoing', 'Renewal - Total',
    'Male - License Issued', 'Male - Paid', 'Male - Ongoing', 'Male - Total',
    'Female - License Issued', 'Female - Paid', 'Female - Ongoing', 'Female - Total'
  ];

  const createRowData = (item: any) => {
      const newForIssuance = Number(item.newPaid || 0);
      const newGeo = Number(item.newPaidViaEgov || 0);
      const newPending = Number(item.newPending || 0);
      const newLicense = Number(item.newLicenseIssued ?? item.newIssued ?? 0);
      const newPaidCol = newLicense + newForIssuance; // PAID = License Issued + For Issuance
      const newTotal = newPaidCol + newGeo + newPending;

      const renewForIssuance = Number(item.renewPaid || 0);
      const renewGeo = Number(item.renewPaidViaEgov || 0);
      const renewPending = Number(item.renewPending || 0);
      const renewLicense = Number(item.renewLicenseIssued ?? item.renewIssued ?? item.renewPaid ?? 0);
      const renewPaidCol = renewLicense + renewForIssuance;
      const renewTotal = renewPaidCol + renewGeo + renewPending;

      const maleLicense = Number(item.maleLicenseIssued ?? 0);
      const malePaid = Number(item.malePaid || 0);
      const malePending = Number(item.malePending || 0);
      const maleTotal = maleLicense + malePaid + malePending;

      const femaleLicense = Number(item.femaleLicenseIssued ?? 0);
      const femalePaid = Number(item.femalePaid || 0);
      const femalePending = Number(item.femalePending || 0);
      const femaleTotal = femaleLicense + femalePaid + femalePending;

      return [
        formatNumber(newLicense), formatNumber(newPaidCol), formatNumber(newGeo), formatNumber(newPending), formatNumber(newTotal),
        formatNumber(renewLicense), formatNumber(renewPaidCol), formatNumber(renewGeo), formatNumber(renewPending), formatNumber(renewTotal),
        formatNumber(maleLicense), formatNumber(malePaid), formatNumber(malePending), formatNumber(maleTotal),
        formatNumber(femaleLicense), formatNumber(femalePaid), formatNumber(femalePending), formatNumber(femaleTotal),
      ];
  };

  const body = data.flatMap(lgu => {
    if (isDayMode) {
      return (lgu.monthlyResults || []).map((month: any) => {
        const citizens = Number(month?.totalCitizensServed ?? lgu?.totalCitizensServed ?? 0);
        return [
          lgu.region, lgu.lgu, lgu.province || '', formatMonthYear(month.month), citizens, ...createRowData(month)
        ];
      });
    }
    const period = lgu.months?.length > 1
        ? `${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])}`
        : lgu.months?.length === 1 ? formatMonthYear(lgu.months[0]) : "";

    const lguTotals = (lgu.monthlyResults || []).reduce((acc:any, item:any) => {
        Object.keys(item).forEach(key => {
            if (typeof item[key] === 'number') acc[key] = (acc[key] || 0) + item[key];
        });
        return acc;
    }, {});
    
      const citizens = Number(lgu?.totalCitizensServed ?? (Array.isArray(lgu?.monthlyResults) && lgu.monthlyResults.length
        ? lgu.monthlyResults.reduce((s: number, m: any) => s + (Number(m.totalCitizensServed || 0)), 0)
        : (lgu?.sum?.totalCitizensServed ?? 0)));
    return [[ lgu.region, lgu.lgu, lgu.province || '', period, citizens, ...createRowData(lguTotals) ]];
  });

  const finalData = [headers, ...body];

  // Append GRAND TOTAL row for Business/Working
  if (body.length > 0) {
    const grandTotal = body.reduce((acc: any, row: any[]) => {
      for (let i = 4; i < headers.length; i++) {
        acc[i] = (acc[i] || 0) + (Number(row[i] || 0) || 0);
      }
      return acc;
    }, {} as Record<number, number>);

    const totalRow: any[] = [];
    totalRow[0] = 'GRAND TOTAL';
    totalRow[1] = '';
    totalRow[2] = '';
    totalRow[3] = '';
    for (let i = 4; i < headers.length; i++) totalRow[i] = grandTotal[i] || 0;
    finalData.push(totalRow);
  }

  const ws = xlsx.utils.aoa_to_sheet(finalData);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));
  return ws;
}


// --- Main Export Function ---

interface ExcelExportParams {
  filteredResults: any[];
  lguToRegion: Record<string, string>;
  dateRangeLabel: string;
  fileLabel: string;
  moduleLabel: string;
  selectedDateType: string; // This is now required
}

export const exportTableReportToExcel = ({
  filteredResults,
  fileLabel,
  moduleLabel,
  selectedDateType, // Destructure the new parameter
}: ExcelExportParams) => {
  const wb = xlsx.utils.book_new();
  let ws: xlsx.WorkSheet;

  // Re-add region from LGU mapping if it's missing, to ensure grouping works
  const enrichedData = filteredResults.map(lgu => ({
      ...lgu,
      region: lgu.region || filteredResults.find(f => f.lgu === lgu.lgu)?.region || 'Unknown Region'
  }));
  
  // Group and sort the data by region
  const groupedByRegion = enrichedData.reduce((acc, lgu) => {
      const region = lgu.region;
      if (!acc[region]) acc[region] = [];
      acc[region].push(lgu);
      return acc;
  }, {} as Record<string, any[]>);

  const finalSortedData = Object.keys(groupedByRegion)
      .sort()
      .flatMap(region => groupedByRegion[region]);

  const isDayMode = selectedDateType === 'Day';

  switch (moduleLabel) {
    case "Barangay Clearance":
      ws = _generateBrgyClearanceSheet(finalSortedData, isDayMode);
      break;
    case "Building Permit":
    case "Certificate of Occupancy":
      // [FIXED] Pass the isDayMode flag to the corrected function
      ws = _generateBuildingPermitSheet(finalSortedData, moduleLabel, isDayMode);
      break;
    case "Business Permit":
    case "Working Permit":
      ws = _generateBusinessPermitSheet(finalSortedData, isDayMode);
      break;
    default:
      console.error("Unknown module for Excel export:", moduleLabel);
      return;
  }

  xlsx.utils.book_append_sheet(wb, ws, "Report Data");
  xlsx.writeFile(wb, `${fileLabel}.xlsx`);
};
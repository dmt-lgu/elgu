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
  // Include computed "License Issued" = Paid + Paid (eGOV) for both Building and CO
  const headers = ['Region', 'LGU', 'Province', 'Period', 'License Issued', 'Paid', 'Paid (eGOV)', 'Ongoing', 'Total'];
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
        const license = paid + geo;
        const total = license + pending;
        return [
          lgu.region, lgu.lgu, lgu.province || '', formatMonthYear(month.month),
          formatNumber(license), formatNumber(paid), formatNumber(geo), formatNumber(pending), formatNumber(total)
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

      const license = lguTotals.paid + lguTotals.geo;
      const period = lgu.months?.length > 1
        ? `${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])}`
        : lgu.months?.length === 1 ? formatMonthYear(lgu.months[0]) : "";

      return [[
        lgu.region, lgu.lgu, lgu.province || '', period,
        formatNumber(license), formatNumber(lguTotals.paid), formatNumber(lguTotals.geo), formatNumber(lguTotals.pending), formatNumber(license + lguTotals.pending)
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
    'New - License Issued', 'New - Paid (For Issuance and License Issued)', 'New - Paid (eGOV)', 'New - Ongoing', 'New - Total',
    'Renewal - License Issued', 'Renewal - Paid', 'Renewal - Paid (eGOV)', 'Renewal - Ongoing', 'Renewal - Total',
    'Male - License Issued', 'Male - Paid', 'Male - Ongoing', 'Male - Total',
    'Female - License Issued', 'Female - Paid', 'Female - Ongoing', 'Female - Total'
  ];

  const createRowData = (item: any) => {
      const newPaid = Number(item.newPaid || 0);
      const newGeo = Number(item.newPaidViaEgov || 0);
      const newPending = Number(item.newPending || 0);
      const newLicense = newPaid + newGeo;
      const newTotal = newLicense + newPending;

      const renewPaid = Number(item.renewPaid || 0);
      const renewGeo = Number(item.renewPaidViaEgov || 0);
      const renewPending = Number(item.renewPending || 0);
      const renewLicense = renewPaid + renewGeo;
      const renewTotal = renewLicense + renewPending;

      const malePaid = Number(item.malePaid || 0);
      const malePending = Number(item.malePending || 0);
      const maleLicense = malePaid;
      const maleTotal = malePaid + malePending;

      const femalePaid = Number(item.femalePaid || 0);
      const femalePending = Number(item.femalePending || 0);
      const femaleLicense = femalePaid;
      const femaleTotal = femalePaid + femalePending;

      return [
        formatNumber(newLicense), formatNumber(newPaid), formatNumber(newGeo), formatNumber(newPending), formatNumber(newTotal),
        formatNumber(renewLicense), formatNumber(renewPaid), formatNumber(renewGeo), formatNumber(renewPending), formatNumber(renewTotal),
        formatNumber(maleLicense), formatNumber(malePaid), formatNumber(malePending), formatNumber(maleTotal),
        formatNumber(femaleLicense), formatNumber(femalePaid), formatNumber(femalePending), formatNumber(femaleTotal),
      ];
  };

  const body = data.flatMap(lgu => {
    if (isDayMode) {
        return (lgu.monthlyResults || []).map((month: any) => ([
            lgu.region, lgu.lgu, lgu.province || '', formatMonthYear(month.month), ...createRowData(month)
        ]));
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
    
    return [[ lgu.region, lgu.lgu, lgu.province || '', period, ...createRowData(lguTotals) ]];
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
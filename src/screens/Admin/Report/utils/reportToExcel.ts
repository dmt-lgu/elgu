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
    const headers = ['Region', 'LGU', 'Province', 'Period', 'Paid', 'Ongoing'];
    const isBuildingPermit = moduleLabel.includes("Building");
    const paidKey = isBuildingPermit ? 'buildingPaid' : 'coPaid';
    const pendingKey = isBuildingPermit ? 'buildingPending' : 'coPending';

    const body = data.flatMap(lgu => {
        if (isDayMode) {
            // DAY MODE: Correctly creates a row for each month.
            return (lgu.monthlyResults || []).map((month: any) => ([
                lgu.region, lgu.lgu, lgu.province || '', formatMonthYear(month.month),
                formatNumber(month[paidKey]), formatNumber(month[pendingKey])
            ]));
        } else {
            // MONTH/YEAR MODE: Creates ONE aggregated row per LGU.
            if (!lgu.monthlyResults || lgu.monthlyResults.length === 0) return [];

            // THE FIX: Sum up values from all filtered monthly results, just like the UI.
            const lguTotals = lgu.monthlyResults.reduce((acc: any, month: any) => {
                acc.paid += month[paidKey] || 0;
                acc.pending += month[pendingKey] || 0;
                return acc;
            }, { paid: 0, pending: 0 });

            const period = lgu.months?.length > 1
                ? `${formatMonthYear(lgu.months[0])} - ${formatMonthYear(lgu.months[lgu.months.length - 1])}`
                : lgu.months?.length === 1 ? formatMonthYear(lgu.months[0]) : "";

            return [[
                lgu.region, lgu.lgu, lgu.province || '', period,
                formatNumber(lguTotals.paid), formatNumber(lguTotals.pending)
            ]];
        }
    });

    const finalData = [headers, ...body];
    const ws = xlsx.utils.aoa_to_sheet(finalData);
    ws['!cols'] = headers.map((_, i) => ({ wch: finalData.reduce((w, r) => Math.max(w, String(r[i] || '').length), 15) }));
    return ws;
}


/**
 * Generates the worksheet for Business or Working Permit.
 */
function _generateBusinessPermitSheet(data: any[], isDayMode: boolean): xlsx.WorkSheet {
  const headers = [
    'Region', 'LGU', 'Province', 'Period',
    'New - Paid', 'New - Paid (eGOV)', 'New - Ongoing', 'New - Total',
    'Renewal - Paid', 'Renewal - Paid (eGOV)', 'Renewal - Ongoing', 'Renewal - Total',
    'Male - Paid', 'Male - Ongoing', 'Male - Total',
    'Female - Paid', 'Female - Ongoing', 'Female - Total'
  ];

  const createRowData = (item: any) => {
      const newTotal = (item.newPaid || 0) + (item.newPaidViaEgov || 0) + (item.newPending || 0);
      const renewTotal = (item.renewPaid || 0) + (item.renewPaidViaEgov || 0) + (item.renewPending || 0);
      const maleTotal = (item.malePaid || 0) + (item.malePending || 0);
      const femaleTotal = (item.femalePaid || 0) + (item.femalePending || 0);
      return [
        formatNumber(item.newPaid), formatNumber(item.newPaidViaEgov), formatNumber(item.newPending), formatNumber(newTotal),
        formatNumber(item.renewPaid), formatNumber(item.renewPaidViaEgov), formatNumber(item.renewPending), formatNumber(renewTotal),
        formatNumber(item.malePaid), formatNumber(item.malePending), formatNumber(maleTotal),
        formatNumber(item.femalePaid), formatNumber(item.femalePending), formatNumber(femaleTotal),
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
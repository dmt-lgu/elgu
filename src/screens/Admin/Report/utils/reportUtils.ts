import { format, parse, startOfMonth, endOfMonth, isSameDay } from "date-fns";
import { islandRegionMap, regionMapping } from "./mockData"; // Siguroha nga sakto ang path

// --- Date and Formatting Utilities ---
export function ensureDate(d: Date | string | null | undefined): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

export function normalizeDateRange(dr: { start: Date | string | null; end: Date | string | null }) {
  return { start: ensureDate(dr?.start), end: ensureDate(dr?.end) };
}

export function formatMonthYear(monthStr: string): string {
  if (!monthStr) return "";
  try {
    const date = parse(monthStr, monthStr.length === 7 ? "yyyy-MM" : "yyyy-MM-dd", new Date());
    return format(date, "MMMM yyyy");
  } catch {
    return monthStr;
  }
}

export const formatNumber = (num: number | null | undefined): string => {
  if (num === null || num === undefined) return '0';
  return num.toLocaleString('en-US');
};

function isFullMonthRange(start: Date, end: Date) {
  return isSameDay(start, startOfMonth(start)) && isSameDay(end, endOfMonth(end));
}

export function getDateRangeLabel(start: Date | string | null, end: Date | string | null, selectedDateType?: string): string {
    const startDate = ensureDate(start);
    const endDate = ensureDate(end);
    if (!startDate && !endDate) return "No date range selected";
    if ((selectedDateType === "Month" || selectedDateType === "Year") && startDate && endDate && isFullMonthRange(startDate, endDate)) {
        return `${format(startDate, "MMMM yyyy")} - ${format(endDate, "MMMM yyyy")}`;
    }
    if (startDate && endDate) {
        return isSameDay(startDate, endDate)
            ? format(startDate, "MMMM dd, yyyy")
            : `${format(startDate, "MMMM dd, yyyy")} - ${format(endDate, "MMMM dd, yyyy")}`;
    }
    if (startDate) return `From ${format(startDate, "MMMM dd, yyyy")}`;
    if (endDate) return `Until ${format(endDate, "MMMM dd, yyyy")}`;
    return "Date range not specified";
}

// --- "SMART" REGION FINDER ---
function getLguRegionName(lgu: any, lguToRegion: Record<string, string>): string | undefined {
    const regionKeyFromApi = lgu.region as keyof typeof regionMapping;
    const regionCodeFromApi = lgu.regionCode as keyof typeof regionMapping;

    return regionMapping[regionKeyFromApi]
        || regionMapping[regionCodeFromApi]
        || lguToRegion[lgu.lgu]
        || lgu.region;
}

// --- Data Extraction and Grouping Utilities ---
export function groupResultsByRegion(results: any[], lguToRegion: Record<string, string>) {
  const grouped: Record<string, any[]> = {};
  const UNASSIGNED_REGION = "Region Not Specified";

  results.forEach(lgu => {
    const finalRegion = getLguRegionName(lgu, lguToRegion) || UNASSIGNED_REGION;
    if (!grouped[finalRegion]) {
      grouped[finalRegion] = [];
    }
    grouped[finalRegion].push(lgu);
  });
  
  return grouped;
}

export function extractProvince(lgu: any): string {
    if (lgu.province && typeof lgu.province === "string" && lgu.province.trim()) {
        return lgu.province.trim();
    }
    const parts = (lgu.lgu || "").split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : "";
}

export function extractCity(lgu: any): string {
    if (lgu.city && typeof lgu.city === "string" && lgu.city.trim()) {
        return lgu.city.trim();
    }
    const parts = (lgu.lgu || "").split(',');
    return parts.length > 0 ? parts[0].trim() : (lgu.lgu || "").trim();
}

function isMonthInRange(monthStr: string, range: { start: Date | null; end: Date | null }) {
  if (!range.start && !range.end) return true;
  const monthDate = new Date(monthStr.length === 7 ? `${monthStr}-01T00:00:00` : monthStr);
  const start = range.start ? startOfMonth(range.start) : null;
  const end = range.end ? endOfMonth(range.end) : null;
  if (start && end) return monthDate >= start && monthDate <= end;
  if (start) return monthDate >= start;
  if (end) return monthDate <= end;
  return true;
}

// --- THE FINAL, MOST ROBUST filterTableResults FUNCTION ---
export function filterTableResults(params: any) {
    const {
      apiData,
      selectedRegions = [],
      selectedProvinces = [],
      selectedCities = [],
      selectedIslands = [],
      lguToRegion = {},
      dateRange = { start: null, end: null },
    } = params;

    if (!apiData?.results || !Array.isArray(apiData.results)) {
      return [];
    }

    // Preprocess to mark errors and ensure monthlyResults is an array
    const preProcessedResults = apiData.results.map((lgu: any) => {
      if (lgu.error || !Array.isArray(lgu.monthlyResults)) {
        return { ...lgu, hasError: true, monthlyResults: [] };
      }
      return lgu;
    });

    // Location filters
    let locationFiltered = preProcessedResults;

    const getRegionsFromIslands = (islands: string[]) =>
      islands.flatMap((island) => islandRegionMap[island as keyof typeof islandRegionMap] || []);

    if (selectedIslands.length > 0) {
      const regionsFromIslands = getRegionsFromIslands(selectedIslands).map(
        (code) => regionMapping[code as keyof typeof regionMapping] || code
      );
      locationFiltered = locationFiltered.filter((lgu: any) => {
        const lguRegion = getLguRegionName(lgu, lguToRegion);
        return lguRegion && regionsFromIslands.includes(lguRegion);
      });
    } else if (selectedRegions.length > 0) {
      locationFiltered = locationFiltered.filter((lgu: any) => {
        const lguRegion = getLguRegionName(lgu, lguToRegion);
        return lguRegion && selectedRegions.includes(lguRegion);
      });
    }

    if (selectedProvinces.length > 0) {
      locationFiltered = locationFiltered.filter((lgu: any) =>
        selectedProvinces.some(
          (p: any) => p?.trim().toLowerCase() === extractProvince(lgu)?.toLowerCase()
        )
      );
    }

    if (selectedCities.length > 0) {
      locationFiltered = locationFiltered.filter((lgu: any) =>
        selectedCities.some(
          (c: any) => c?.trim().toLowerCase() === extractCity(lgu)?.toLowerCase()
        )
      );
    }

    // If no date range is selected, DO NOT filter by date.
    const hasDateBounds = Boolean(dateRange?.start) || Boolean(dateRange?.end);
    if (!hasDateBounds) {
      // Keep all LGUs that passed location filters; compute months for convenience
      return locationFiltered.map((lgu: any) => {
        if (lgu.hasError) return lgu;
        const months = (lgu.monthlyResults || [])
          .map((m: any) => m?.month)
          .filter(Boolean)
          .sort();
        return { ...lgu, months };
      });
    }

    // With a date range selected, apply the date filter but KEEP LGUs even if they end up with 0 months.
    const normalizedDateRange = normalizeDateRange(dateRange);
    const dateFiltered = locationFiltered.map((lgu: any) => {
      if (lgu.hasError) {
        return lgu;
      }
      const relevantMonths = (lgu.monthlyResults || []).filter((month: any) =>
        isMonthInRange(month.month, normalizedDateRange)
      );
      return {
        ...lgu,
        monthlyResults: relevantMonths,
        months: relevantMonths.map((m: any) => m.month).sort(),
      };
    });

    // IMPORTANT: Do NOT filter out LGUs with empty monthlyResults.
    // The tables are designed to render zero rows when arrays are empty.
    return dateFiltered;
  }
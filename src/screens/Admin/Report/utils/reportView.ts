// Helpers for the report toolbar (search / status / sort), charts and summary comparisons.

export const BP = "Business Permit";
export const WP = "Working Permit";
export const BC = "Barangay Clearance";
export const BLDG = "Building Permit";
export const CO = "Certificate of Occupancy";

const NEW_LICENSE_KEYS = ['newLicenseIssued', 'newIssued', 'licenseIssuedNew', 'newLicense'];
const RENEW_LICENSE_KEYS = ['renewLicenseIssued', 'renewIssued', 'licenseIssuedRenewal', 'renewLicense'];

export type SortMode = 'default' | 'name-asc' | 'name-desc' | 'issued-desc' | 'issued-asc';
export type StatusFilter = 'all' | 'data' | 'errors';
export type ReportViewOptions = { search: string; status: StatusFilter; sort: SortMode };

export const DEFAULT_VIEW_OPTIONS: ReportViewOptions = { search: '', status: 'all', sort: 'default' };

function explicitOrFallback(item: any, keys: string[], fallback: number): number {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== null && value !== undefined && value !== '') {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : 0;
    }
  }
  return fallback;
}

export function getNewIssued(item: any): number {
  return explicitOrFallback(item, NEW_LICENSE_KEYS, Number(item?.newPaid || 0));
}

export function getRenewIssued(item: any): number {
  return explicitOrFallback(item, RENEW_LICENSE_KEYS, Number(item?.renewPaid || 0));
}

// The headline "issued" number of one monthly record, matching the summary cards.
export function getIssued(moduleKey: string, item: any): number {
  if (moduleKey === BP || moduleKey === WP) return getNewIssued(item) + getRenewIssued(item);
  if (moduleKey === BC) {
    const genderTotal = Number(item?.malePaid || 0) + Number(item?.malePending || 0) + Number(item?.femalePaid || 0) + Number(item?.femalePending || 0);
    return genderTotal || Number(item?.totalCount || 0);
  }
  if (moduleKey === BLDG) return Number(item?.buildingLicenseIssued || 0);
  if (moduleKey === CO) return Number(item?.coLicenseIssued || 0);
  return 0;
}

export function isErrorLgu(lgu: any): boolean {
  return !!lgu?.error || !!lgu?.hasError || !Array.isArray(lgu?.monthlyResults);
}

export function getLguIssued(moduleKey: string, lgu: any): number {
  if (isErrorLgu(lgu)) return 0;
  return lgu.monthlyResults.reduce((sum: number, item: any) => sum + getIssued(moduleKey, item), 0);
}

// Applies the toolbar's search, status filter and sort to one module's API data.
export function applyReportView(moduleKey: string, apiData: any, options: ReportViewOptions): any {
  if (!apiData || !Array.isArray(apiData.results)) return apiData;
  const { search, status, sort } = options;
  const term = search.trim().toLowerCase();
  if (!term && status === 'all' && sort === 'default') return apiData;

  let results: any[] = apiData.results;
  if (term) results = results.filter((lgu: any) => String(lgu?.lgu || '').toLowerCase().includes(term));
  if (status === 'data') results = results.filter((lgu: any) => !isErrorLgu(lgu));
  if (status === 'errors') results = results.filter((lgu: any) => isErrorLgu(lgu));

  if (sort !== 'default') {
    const byName = (a: any, b: any) => String(a?.lgu || '').localeCompare(String(b?.lgu || ''));
    results = results.slice().sort((a: any, b: any) => {
      if (sort === 'name-asc') return byName(a, b);
      if (sort === 'name-desc') return byName(b, a);
      const diff = getLguIssued(moduleKey, a) - getLguIssued(moduleKey, b);
      return (sort === 'issued-asc' ? diff : -diff) || byName(a, b);
    });
  }
  return { ...apiData, results };
}

function lastDayOfMonth(monthKey: string): number {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year, month, 0).getDate();
}

// A month is only comparable when the selected range covers all of it and it has already ended.
export function isCompleteMonth(monthKey: string, rangeStart: string | null, rangeEnd: string | null, today: string): boolean {
  if (monthKey.length !== 7) return false;
  if (monthKey >= today.slice(0, 7)) return false;
  if (rangeStart && monthKey === rangeStart.slice(0, 7) && rangeStart.slice(8, 10) !== '01') return false;
  if (rangeEnd && monthKey === rangeEnd.slice(0, 7) && Number(rangeEnd.slice(8, 10)) !== lastDayOfMonth(monthKey)) return false;
  return true;
}

export type MonthComparison = { currentMonth: string; previousMonth: string; current: number; previous: number; percent: number | null };

// Compares the last two complete months found in the data. Returns null when there are fewer than two.
export function compareLastTwoMonths(monthTotals: Map<string, number>, rangeStart: string | null, rangeEnd: string | null, today: string): MonthComparison | null {
  const months = Array.from(monthTotals.keys()).filter(m => isCompleteMonth(m, rangeStart, rangeEnd, today)).sort();
  if (months.length < 2) return null;
  const currentMonth = months[months.length - 1];
  const previousMonth = months[months.length - 2];
  const current = monthTotals.get(currentMonth) || 0;
  const previous = monthTotals.get(previousMonth) || 0;
  const percent = previous === 0 ? null : ((current - previous) / previous) * 100;
  return { currentMonth, previousMonth, current, previous, percent };
}

// "2026-01" -> "Jan 2026" (short form for chart axes and summary cards)
export function formatShortMonth(monthKey: string): string {
  const [year, month] = String(monthKey || '').split('-').map(Number);
  if (!year || !month) return monthKey;
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}



export interface StatisticData {
  title: string;
  value: string | number;
  showInfo?: boolean;
}

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export interface FilterOptions {
  modules: string[];
  regions: string[];
  dateRange: {
    start: string | null;
    end: string | null;
  };
}

export interface FilterState {
  selectedModules: string[];
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities?: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

export interface RegionData {
  region: string;
  newPaid: number;
  newGeoPay: number;
  newPending: number;
  newTotal: number;
  renewalPaid: number;
  renewalGeoPay: number;
  renewalPending: number;
  renewalTotal: number;
  malePaid: number;
  malePending: number;
  maleTotal: number;
  femalePaid: number;
  femalePending: number;
  femaleTotal: number;
  [key: string]: number | string;
}

const cities: { [province: string]: string[] } = {};

export function generateLguProvinceList(): { lgu: string; province: string }[] {
  const result: { lgu: string; province: string }[] = [];
  Object.entries(cities).forEach(([province, lguList]) => {
    if (Array.isArray(lguList)) {
      lguList.forEach(lgu => {
        result.push({ lgu, province });
      });
    }
  });
  return result;
}


export const Bp = "Business Permit";
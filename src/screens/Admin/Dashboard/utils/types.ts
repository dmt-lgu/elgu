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
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}
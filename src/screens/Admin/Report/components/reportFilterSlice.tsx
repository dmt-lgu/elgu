import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DateRange {
  start: Date | null;
  end: Date | null;
}

export interface FilterState {
  selectedModules: string[];
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  selectedIslands: string[];
  dateRange: DateRange;
  selectedDateType: string;
}

// --- Utility: Parse a date value to Date or null ---
function parseDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d === 'string') {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

// --- Utility: Normalize a DateRange object ---
function normalizeDateRange(dr: any): DateRange {
  return {
    start: parseDate(dr?.start),
    end: parseDate(dr?.end),
  };
}

// --- Utility: Normalize the whole filter state ---
function normalizeFilterState(state: Partial<FilterState>): FilterState {
  return {
    selectedModules: state.selectedModules || [],
    selectedRegions: state.selectedRegions || [],
    selectedProvinces: state.selectedProvinces || [],
    selectedCities: state.selectedCities || [],
    selectedIslands: state.selectedIslands || [],
    dateRange: normalizeDateRange(state.dateRange || {}),
    selectedDateType: state.selectedDateType ?? "",
  };
}

// --- Load from localStorage and revive dates ---
function loadInitialState(): FilterState {
  try {
    const persisted = localStorage.getItem('reportFilter');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      return normalizeFilterState(parsed);
    }
  } catch {}
  return {
    selectedModules: [],
    selectedRegions: [],
    selectedProvinces: [],
    selectedCities: [],
    selectedIslands: [],
    dateRange: { start: null, end: null },
    selectedDateType: "",
  };
}

const initialState: FilterState = loadInitialState();

const reportFilterSlice = createSlice({
  name: 'reportFilter',
  initialState,
  reducers: {
    setFilterState(state, action: PayloadAction<FilterState>) {
      const normalized = normalizeFilterState(action.payload);
      Object.assign(state, normalized);
    },
    updateFilterField<K extends keyof FilterState>(
      state: FilterState,
      action: PayloadAction<{ key: K; value: FilterState[K] }>
    ) {
      if (action.payload.key === 'dateRange') {
        state.dateRange = normalizeDateRange(action.payload.value);
      } else {
        state[action.payload.key] = action.payload.value;
      }
    },
    resetFilter(state) {
      state.selectedModules = [];
      state.selectedRegions = [];
      state.selectedProvinces = [];
      state.selectedCities = [];
      state.selectedIslands = [];
      state.dateRange = { start: null, end: null };
      state.selectedDateType = "";
    },
  },
});

export const { setFilterState, updateFilterField, resetFilter } = reportFilterSlice.actions;
export default reportFilterSlice.reducer;

// --- Persistence Middleware ---
// This middleware ensures that the filter state is always saved to localStorage as ISO strings for dates.
export const reportFilterPersistence =
  (store: { getState: () => { reportFilter: FilterState } }) =>
  (next: (action: any) => any) =>
  (action: any) => {
    const result = next(action);
    if (action.type.startsWith('reportFilter/')) {
      const state: FilterState = store.getState().reportFilter;
      // Serialize dates as ISO strings for persistence
      const toSave = {
        ...state,
        dateRange: {
          start: state.dateRange.start ? state.dateRange.start.toISOString() : null,
          end: state.dateRange.end ? state.dateRange.end.toISOString() : null,
        },
      };
      localStorage.setItem('reportFilter', JSON.stringify(toSave));
    }
    return result;
  };
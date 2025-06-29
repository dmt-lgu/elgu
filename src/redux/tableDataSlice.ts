import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DateRange {
  start: Date | string | null;
  end: Date | string | null;
}

interface AppliedFilter {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  dateRange: DateRange;
  selectedDateType: string;
  selectedIslands: string[];
  // Add other filter fields if needed
}

interface TableDataState {
  tableData: any | null;
  appliedFilter: AppliedFilter | null;
}

// --- Utility: Parse date string to Date object ---
function parseDate(d: any): Date | null {
  if (!d) return null;
  if (d instanceof Date) return d;
  if (typeof d === 'string') {
    const dt = new Date(d);
    return isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

// --- Utility: Normalize AppliedFilter (revive dates) ---
function normalizeAppliedFilter(filter: any): AppliedFilter | null {
  if (!filter || typeof filter !== 'object') return null;
  const out = { ...filter };
  if (out.dateRange) {
    out.dateRange = {
      start: parseDate(out.dateRange.start),
      end: parseDate(out.dateRange.end),
    };
  }
  return out as AppliedFilter;
}

// --- Load initial state from localStorage ---
function loadInitialState(): TableDataState {
  try {
    const persisted = localStorage.getItem('tableData');
    if (persisted) {
      const parsed = JSON.parse(persisted);
      return {
        tableData: parsed.tableData ?? null,
        appliedFilter: normalizeAppliedFilter(parsed.appliedFilter),
      };
    }
  } catch {}
  return {
    tableData: null,
    appliedFilter: null,
  };
}

const initialState: TableDataState = loadInitialState();

const tableDataSlice = createSlice({
  name: 'tableData',
  initialState,
  reducers: {
    setTableData(state, action: PayloadAction<any>) {
      state.tableData = action.payload;
    },
    setAppliedFilter(state, action: PayloadAction<AppliedFilter | null>) {
      state.appliedFilter = normalizeAppliedFilter(action.payload);
    },
    clearTableData(state) {
      state.tableData = null;
      state.appliedFilter = null;
    },
  },
});

export const { setTableData, setAppliedFilter, clearTableData } = tableDataSlice.actions;
export default tableDataSlice.reducer;

// --- Middleware for localStorage persistence ---
export const tableDataPersistence =
  (store: { getState: () => { tableData: TableDataState } }) =>
  (next: (action: any) => any) =>
  (action: any) => {
    const result = next(action);
    if (action.type.startsWith('tableData/')) {
      const state: TableDataState = store.getState().tableData;
      // Serialize dates as ISO strings for persistence
      let toSave: any = {
        ...state,
        appliedFilter: state.appliedFilter
          ? {
              ...state.appliedFilter,
              dateRange: state.appliedFilter.dateRange
                ? {
                    start: state.appliedFilter.dateRange.start
                      ? (typeof state.appliedFilter.dateRange.start === 'string'
                          ? state.appliedFilter.dateRange.start
                          : (state.appliedFilter.dateRange.start as Date).toISOString())
                      : null,
                    end: state.appliedFilter.dateRange.end
                      ? (typeof state.appliedFilter.dateRange.end === 'string'
                          ? state.appliedFilter.dateRange.end
                          : (state.appliedFilter.dateRange.end as Date).toISOString())
                      : null,
                  }
                : { start: null, end: null },
            }
          : null,
      };
      localStorage.setItem('tableData', JSON.stringify(toSave));
    }
    return result;
  };
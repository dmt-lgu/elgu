import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// --- Filter Slice ---
interface DateRange {
  start: string | null;
  end: string | null;
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

const initialFilterState: FilterState = {
  selectedModules: [],
  selectedRegions: [],
  selectedProvinces: [],
  selectedCities: [],
  selectedIslands: [],
  dateRange: { start: null, end: null },
  selectedDateType: "",
};

const reportFilterSlice = createSlice({
  name: 'reportFilter',
  initialState: initialFilterState,
  reducers: {
    setFilterState(state, action: PayloadAction<FilterState>) {
      Object.assign(state, action.payload);
    },
    updateFilterField<K extends keyof FilterState>(
      state: FilterState,
      action: PayloadAction<{ key: K; value: FilterState[K] }>
    ) {
      state[action.payload.key] = action.payload.value;
    },
    resetFilter(state) {
      Object.assign(state, initialFilterState);
    },
  },
});

export const { setFilterState, updateFilterField, resetFilter } = reportFilterSlice.actions;
export default reportFilterSlice.reducer;
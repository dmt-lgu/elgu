import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DateRange {
  start: string | null;
  end: string | null;
}

export interface AppliedFilter {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  dateRange: DateRange;
  selectedDateType: string;
  selectedIslands: string[];
  // Add other filter fields if needed
}

export interface TableDataState {
  tableData: any | null;
  appliedFilter: AppliedFilter | null;
}

const initialState: TableDataState = {
  tableData: null,
  appliedFilter: null,
};

const tableDataSlice = createSlice({
  name: 'businessPermitTable',
  initialState,
  reducers: {
    setTableData(state, action: PayloadAction<any>) {
      state.tableData = action.payload;
    },
    setAppliedFilter(state, action: PayloadAction<AppliedFilter | null>) {
      state.appliedFilter = action.payload;
    },
    clearTableData(state) {
      state.tableData = null;
      state.appliedFilter = null;
    },
  },
});

export const { setTableData, setAppliedFilter, clearTableData } = tableDataSlice.actions;
export default tableDataSlice.reducer;
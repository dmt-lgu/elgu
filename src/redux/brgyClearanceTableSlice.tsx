import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DateRange {
  start: string | null;
  end: string | null;
}

interface BrgyClearanceFilter {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  selectedIslands: string[];
  dateRange: DateRange;
}

interface BrgyClearanceTableState {
  tableData: any | null;
  appliedFilter: BrgyClearanceFilter | null;
}

const initialState: BrgyClearanceTableState = {
  tableData: null,
  appliedFilter: null,
};

const brgyClearanceTableSlice = createSlice({
  name: 'brgyClearanceTable',
  initialState,
  reducers: {
    setBrgyClearanceTableData(state, action: PayloadAction<any>) {
      state.tableData = action.payload;
    },
    setBrgyClearanceAppliedFilter(state, action: PayloadAction<BrgyClearanceFilter | null>) {
      state.appliedFilter = action.payload;
    },
    clearBrgyClearanceTableData(state) {
      state.tableData = null;
      state.appliedFilter = null;
    },
  },
});

export const {
  setBrgyClearanceTableData,
  setBrgyClearanceAppliedFilter,
  clearBrgyClearanceTableData,
} = brgyClearanceTableSlice.actions;

export default brgyClearanceTableSlice.reducer;
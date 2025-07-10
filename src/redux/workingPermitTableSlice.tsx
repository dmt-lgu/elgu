import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DateRange {
  start: string | null;
  end: string | null;
}

interface WorkingPermitFilter {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  selectedIslands: string[];
  dateRange: DateRange;
}

interface WorkingPermitTableState {
  tableData: any | null;
  appliedFilter: WorkingPermitFilter | null;
}

const initialState: WorkingPermitTableState = {
  tableData: null,
  appliedFilter: null,
};

const workingPermitTableSlice = createSlice({
  name: 'workingPermitTable',
  initialState,
  reducers: {
    setWorkingPermitTableData(state, action: PayloadAction<any>) {
      state.tableData = action.payload;
    },
    setWorkingPermitAppliedFilter(state, action: PayloadAction<WorkingPermitFilter | null>) {
      state.appliedFilter = action.payload;
    },
    clearWorkingPermitTableData(state) {
      state.tableData = null;
      state.appliedFilter = null;
    },
  },
});

export const {
  setWorkingPermitTableData,
  setWorkingPermitAppliedFilter,
  clearWorkingPermitTableData,
} = workingPermitTableSlice.actions;

export default workingPermitTableSlice.reducer;
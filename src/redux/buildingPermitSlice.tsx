import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DateRange {
  start: string | null;
  end: string | null;
}

interface buildingPermiFilter {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  selectedIslands: string[];
  dateRange: DateRange;
}

interface buildingPermitState {
  tableData: any | null;
  appliedFilter: buildingPermiFilter | null;
}

const initialState: buildingPermitState = {
  tableData: null,
  appliedFilter: null,
};

const buildingPermitSlice = createSlice({
  name: 'buildingPermit',
  initialState,
  reducers: {
    setbuildingPermitData(state, action: PayloadAction<any>) {
      state.tableData = action.payload;
    },
    setbuildingPermiAppliedFilter(state, action: PayloadAction<buildingPermiFilter | null>) {
      state.appliedFilter = action.payload;
    },
    clearbuildingPermitData(state) {
      state.tableData = null;
      state.appliedFilter = null;
    },
  },
});

export const {
  setbuildingPermitData,
  setbuildingPermiAppliedFilter,
  clearbuildingPermitData,
} = buildingPermitSlice.actions;

export default buildingPermitSlice.reducer;
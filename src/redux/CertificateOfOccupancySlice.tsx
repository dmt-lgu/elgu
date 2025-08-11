import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DateRange {
  start: string | null;
  end: string | null;
}

interface certificateOfOccupancyFilter {
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  selectedIslands: string[];
  dateRange: DateRange;
}

interface certificateOfOccupancyState {
  tableData: any | null;
  appliedFilter: certificateOfOccupancyFilter | null;
}

const initialState: certificateOfOccupancyState = {
  tableData: null,
  appliedFilter: null,
};

const certificateOfOccupancySlice = createSlice({
  name: 'certificateOfOccupancy',
  initialState,
  reducers: {
    setcertificateOfOccupancy(state, action: PayloadAction<any>) {
      state.tableData = action.payload;
    },
    setCertificateOfOccupancyAppliedFilter(state, action: PayloadAction<certificateOfOccupancyFilter | null>) {
      state.appliedFilter = action.payload;
    },
    clearcertificateOfOccupancy(state) {
      state.tableData = null;
      state.appliedFilter = null;
    },
  },
});

export const {
  setcertificateOfOccupancy,
  setCertificateOfOccupancyAppliedFilter,
  clearcertificateOfOccupancy,
} = certificateOfOccupancySlice.actions;

export default certificateOfOccupancySlice.reducer;
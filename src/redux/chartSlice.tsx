import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface ChartsState {
  value: string[];
}

const initialState: ChartsState = {
  value: [], // Initial empty list of regions
};

export const chartSlice = createSlice({
  name: 'charts',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = [];
    },
    setCharts: (state, action: PayloadAction<string[]>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setCharts } = chartSlice.actions;
export const selectCharts = (state: { charts: ChartsState }) => state.charts.value;

export default chartSlice.reducer;

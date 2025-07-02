import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DateState {
  value: string[];
}

const initialState: DateState = {
  value: ['2024-01'], // Initial empty list of regions
};

export const dateSlice = createSlice({
  name: 'dates',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = [];
    },
    setDate: (state, action: PayloadAction<string[]>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setDate } = dateSlice.actions;
export const selectDate = (state: { dates: DateState }) => state.dates.value;

export default dateSlice.reducer;

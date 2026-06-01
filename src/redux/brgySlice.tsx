import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface BrgyState {
  value: any;
}

const initialState: BrgyState = {
  value: {
 
  "BRGY": [],
  "BRGYraw": [],
}, // Initial empty list of regions
};

export const brgySlice = createSlice({
  name: 'brgy',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = {};
    },
    setBrgy: (state, action: PayloadAction<any>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setBrgy } = brgySlice.actions;
export const selectBrgy = (state: { brgy: BrgyState }) => state.brgy.value;

export default brgySlice.reducer;

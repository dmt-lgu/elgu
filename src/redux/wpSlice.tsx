import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface WpState {
  value: any;
}

const initialState: WpState = {
  value: {
 
  "WP": [],
  "WPraw": [],
}, // Initial empty list of regions
};

export const wpSlice = createSlice({
  name: 'wp',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = {};
    },
    setWp: (state, action: PayloadAction<any>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setWp } = wpSlice.actions;
export const selectWp = (state: { wp: WpState }) => state.wp.value;

export default wpSlice.reducer;

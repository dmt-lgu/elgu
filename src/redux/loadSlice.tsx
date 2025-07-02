import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface LoadState {
  value: any;
}

const initialState: LoadState = {
  value: false, // Initial loading state
};

export const loadSlice = createSlice({
  name: 'load',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = false;
    },
    setLoad: (state, action: PayloadAction<any>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setLoad } = loadSlice.actions;
export const selectLoad = (state: { load: LoadState }) => state.load.value;

export default loadSlice.reducer;

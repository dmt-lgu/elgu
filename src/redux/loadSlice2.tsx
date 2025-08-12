import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Load2State {
  value: boolean;
}

const initialState: Load2State = {
  value: false,
};

export const load2Slice = createSlice({
  name: 'load2',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = false;
    },
    setLoad2: (state, action: PayloadAction<boolean>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setLoad2 } = load2Slice.actions;
export const selectLoad2 = (state: { load2: Load2State }) => state.load2.value;

export default load2Slice.reducer;

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface StatusState {
  value: any;
}

const initialState: StatusState = {
  value: {
  "BP": [],
  "BPraw": [],
  "totalStatus":[]
}, // Initial empty list of regions
};

export const statusSlice = createSlice({
  name: 'status',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = {};
    },
    setStatus: (state, action: PayloadAction<any>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setStatus } = statusSlice.actions;
export const selectStatus = (state: { status: StatusState }) => state.status.value;

export default statusSlice.reducer;

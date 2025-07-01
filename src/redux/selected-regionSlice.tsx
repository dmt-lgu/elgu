import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Region {
  id: string;
  text: string;
  municipalities: string[];
}

interface RegionState {
  value: Region[];
}

const initialState: RegionState = {
  value: [],
};

export const sregionSlice = createSlice({
  name: 'sregion',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = [];
    },
    setRegions: (state, action: PayloadAction<Region[]>) => {
      state.value = action.payload;
    },
  },
});

export const { logout, setRegions } = sregionSlice.actions;
export const selectRegions = (state: { sregion: RegionState }) => state.sregion.value;

export default sregionSlice.reducer;
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
  value: [
  { id: "region1", text: "I", municipalities: [] },
  { id: "region2", text: "II", municipalities: [] },
  { id: "region3", text: "III", municipalities: [] },
  { id: "region4a", text: "IV-A", municipalities: [] },
  { id: "region5", text: "V", municipalities: [] },
  { id: "CAR", text: "CAR", municipalities: [] },
  { id: "NCR", text: "NCR", municipalities: [] },
  { id: "region7", text: "VII", municipalities: [] },
  { id: "region8", text: "VIII", municipalities: [] },
  { id: "region6", text: "VI", municipalities: [] },
  { id: "region9", text: "IX", municipalities: [] },
  { id: "region10", text: "X", municipalities: [] },
  { id: "region11", text: "XI", municipalities: [] },
  { id: "region12", text: "XII", municipalities: [] },
  { id: "BARMM1", text: "BARMM I", municipalities: [] },
  { id: "BARMM2", text: "BARMM II", municipalities: [] },
  { id: "region13", text: "XIII", municipalities: [] }
]
};

export const regionSlice = createSlice({
  name: 'region',
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

export const { logout, setRegions } = regionSlice.actions;
export const selectRegions = (state: { region: RegionState }) => state.region.value;

export default regionSlice.reducer;
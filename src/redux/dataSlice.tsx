import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DataState {
  value: any;
}

const initialState: DataState = {
  value: {
  "modules": [], // Initial empty list of modules
  "locationName": [],
  "municipalities": [],
  "province": [],
  "real":[],     // Can be a string or an array of strings
  "startDate": "",
  "endDate": "",
  "selectedDateType": "",
}, // Initial empty list of regions
};

export const dataSlice = createSlice({
  name: 'datas',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = {};
    },
    setData: (state, action: PayloadAction<any>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setData } = dataSlice.actions;
export const selectData = (state: { datas: DataState }) => state.datas.value;

export default dataSlice.reducer;

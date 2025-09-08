import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface DataState {
  value: any;
}

const initialState: DataState = {
  value: {
  "modules":["Business Permit","Working Permit","Barangay Clearance","Building Permit","Certificate of Occupancy"],
  "selectedTransactionModuleFilter": "All", // New field for transaction module filtering
  "selectedStatusModuleFilter": "All", // New field for status module filtering
  "selectedChartFilter_renew": "All", // Chart-specific filter for renew chart
  "selectedChartFilter_gender": "All", // Chart-specific filter for gender chart
  "selectedCardModuleFilter": [], // Changed to array for multi-selection
  "selectedChartModuleFilter": [], // Changed to array for multi-selection
  "locationName": ["I","II","III","IV-A","V","CAR","IV-B","VI","VII","VIII","IX","X","XI","XII","XIII","BARMM I","BARMM II"],
  "municipalities": [],
  "province": [],
  "real":["region1","region2","region3","region4a","region5","CAR","region4b","region6","region7","region8","region9","region10","region11","region12","region13","BARMM1","BARMM2"],     // Can be a string or an array of strings
  "startDate": "2025-01-01",
  "endDate": "2025-08-31",
  "selectedDateType": "Month",
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

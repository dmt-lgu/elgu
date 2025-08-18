import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SeparatedTransactionState {
  businessPermit: {
    results: any[];
    lguCount: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  workingPermit: {
    results: any[];
    lguCount: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
  combined: {
    results: any[];
    lguCount: number;
    dateRange: {
      startDate: string;
      endDate: string;
    };
  };
}

const initialState: SeparatedTransactionState = {
  businessPermit: {
    results: [],
    lguCount: 0,
    dateRange: {
      startDate: "",
      endDate: "",
    },
  },
  workingPermit: {
    results: [],
    lguCount: 0,
    dateRange: {
      startDate: "",
      endDate: "",
    },
  },
  combined: {
    results: [],
    lguCount: 0,
    dateRange: {
      startDate: "",
      endDate: "",
    },
  },
};

export const separatedTransactionSlice = createSlice({
  name: 'separatedTransaction',
  initialState,
  reducers: {
    setBusinessPermitData: (state, action: PayloadAction<any>) => {
      state.businessPermit = action.payload;
    },
    setWorkingPermitData: (state, action: PayloadAction<any>) => {
      state.workingPermit = action.payload;
    },
    setCombinedData: (state, action: PayloadAction<any>) => {
      state.combined = action.payload;
    },
    clearSeparatedData: (state) => {
      state.businessPermit = initialState.businessPermit;
      state.workingPermit = initialState.workingPermit;
      state.combined = initialState.combined;
    },
  },
});

export const { 
  setBusinessPermitData, 
  setWorkingPermitData, 
  setCombinedData,
  clearSeparatedData 
} = separatedTransactionSlice.actions;

export const selectSeparatedTransaction = (state: any) => state.separatedTransaction;
export const selectBusinessPermitData = (state: any) => state.separatedTransaction.businessPermit;
export const selectWorkingPermitData = (state: any) => state.separatedTransaction.workingPermit;
export const selectCombinedData = (state: any) => state.separatedTransaction.combined;

export default separatedTransactionSlice.reducer;

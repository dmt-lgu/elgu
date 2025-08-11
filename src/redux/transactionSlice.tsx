import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TransactionState {
  value: {
    results?: any[];
    lguCount?: number;
    dateRange?: {
      startDate: string;
      endDate: string;
    };
    totalResults?: number;
    isPartialData?: boolean;
  };
}

const initialState: TransactionState = {
  value: {}, // Initial empty object
};

export const transactionSlice = createSlice({
  name: 'transaction',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = {};
    },
    setTransaction: (state, action: PayloadAction<any>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setTransaction } = transactionSlice.actions;
export const selectTransaction = (state: { transaction: TransactionState }) => state.transaction.value;

export default transactionSlice.reducer;

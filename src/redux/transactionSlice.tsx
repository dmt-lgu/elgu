import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TransactionState {
  value: any;
}

const initialState: TransactionState = {
  value: {}, // Initial empty list of regions
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

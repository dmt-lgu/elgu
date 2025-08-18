import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TransactionCardState {
  value: any;
}

const initialState: TransactionCardState = {
  value: {
    businessPermit: {},
    workingPermit: {},
    combined: {}
  }, // Initial empty cards for different modules
};

export const transactionCardSlice = createSlice({
  name: 'transactionCard',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = {
        businessPermit: {},
        workingPermit: {},
        combined: {}
      };
    },
    setBusinessPermitCard: (state, action: PayloadAction<any>) => {
      state.value.businessPermit = action.payload;
    },
    setWorkingPermitCard: (state, action: PayloadAction<any>) => {
      state.value.workingPermit = action.payload;
    },
    setCombinedCard: (state, action: PayloadAction<any>) => {
      state.value.combined = action.payload;
    },
   
  },
});

export const { logout, setBusinessPermitCard, setWorkingPermitCard, setCombinedCard } = transactionCardSlice.actions;
export const selectTransactionCard = (state: { transactionCard: TransactionCardState }) => state.transactionCard.value;

export default transactionCardSlice.reducer;

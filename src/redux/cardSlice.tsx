import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CardState {
  value: any;
}

const initialState: CardState = {
  value: {}, // Initial empty list of regions
};

export const cardSlice = createSlice({
  name: 'card',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = {};
    },
    setCard: (state, action: PayloadAction<any>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setCard } = cardSlice.actions;
export const selectCard = (state: { card: CardState }) => state.card.value;

export default cardSlice.reducer;

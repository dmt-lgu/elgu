import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface Load2State {
  value: {
    bp: boolean;
    wp: boolean;
    brgy: boolean;
    bpco: boolean;
    isAnyLoading: boolean;
  };
}

const initialState: Load2State = {
  value: {
    bp: false,
    wp: false,
    brgy: false,
    bpco: false,
    isAnyLoading: false,
  },
};

export const load2Slice = createSlice({
  name: 'load2',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = {
        bp: false,
        wp: false,
        brgy: false,
        bpco: false,
        isAnyLoading: false,
      };
    },
    setLoad2: (state, action: PayloadAction<any>) => {
      state.value = action.payload;
    },
    setBPLoading: (state, action: PayloadAction<boolean>) => {
      state.value.bp = action.payload;
      state.value.isAnyLoading = state.value.bp || state.value.wp || state.value.brgy || state.value.bpco;
    },
    setWPLoading: (state, action: PayloadAction<boolean>) => {
      state.value.wp = action.payload;
      state.value.isAnyLoading = state.value.bp || state.value.wp || state.value.brgy || state.value.bpco;
    },
    setBRGYLoading: (state, action: PayloadAction<boolean>) => {
      state.value.brgy = action.payload;
      state.value.isAnyLoading = state.value.bp || state.value.wp || state.value.brgy || state.value.bpco;
    },
    setBPCOLoading: (state, action: PayloadAction<boolean>) => {
      state.value.bpco = action.payload;
      state.value.isAnyLoading = state.value.bp || state.value.wp || state.value.brgy || state.value.bpco;
    },
   
  },
});

export const { logout, setLoad2, setBPLoading, setWPLoading, setBRGYLoading, setBPCOLoading } = load2Slice.actions;
export const selectLoad2 = (state: { load2: Load2State }) => state.load2.value;

export default load2Slice.reducer;

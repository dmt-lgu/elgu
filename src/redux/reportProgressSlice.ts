import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type ProgressDetail = { currentRegion: string; currentIndex: number; totalRegions: number } | null;
type ProgressState = { [moduleKey: string]: ProgressDetail };

const initialState: ProgressState = {};

const slice = createSlice({
  name: 'reportProgress',
  initialState,
  reducers: {
    setModuleProgress(state, action: PayloadAction<{ moduleKey: string; progress: ProgressDetail }>) {
      const { moduleKey, progress } = action.payload;
      state[moduleKey] = progress;
    },
    clearModuleProgress(state, action: PayloadAction<{ moduleKey: string }>) {
      const { moduleKey } = action.payload;
      delete state[moduleKey];
    },
    clearAllProgress() {
      return {};
    }
  }
});

export const { setModuleProgress, clearModuleProgress, clearAllProgress } = slice.actions;
export default slice.reducer;

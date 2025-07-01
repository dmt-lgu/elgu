import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface RegionState {
  value: string[];
}

const initialState: RegionState = {
  value: [
    "Business Permit",
    "Building Permit",
    "Certificate of Occupancy",
    "Working Permit",
    "Barangay Clearance",
  ], // Initial empty list of regions
};

export const projectSlice = createSlice({
  name: 'project',
  initialState,
  reducers: {
    logout: (state) => {
      state.value = [];
    },
    setProjects: (state, action: PayloadAction<string[]>) => {
      state.value = action.payload;
    },
   
  },
});

export const { logout, setProjects } = projectSlice.actions;
export const selectProject = (state: { project: RegionState }) => state.project.value;

export default projectSlice.reducer;

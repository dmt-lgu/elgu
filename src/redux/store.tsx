import { configureStore } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import { combineReducers } from 'redux';
import regionReducer from './regionSlice';
import chartReducer from './chartSlice';
import projectReducer from './projectSlice';
import dateReducer from './dateSlice';
import dataReducer from './dataSlice';
import cardReducer from './cardSlice';
import transactionReducer from './transactionSlice';
import loadReducer from './loadSlice';
import load2Reducer from './loadSlice2';
import statusReducer from './statusSlice';
import reportFilterReducer from './reportFilterSlice';
import businessPermitTableReducer from './businessPermitSlice';
import workingPermitTableReducer from './workingPermitTableSlice';
import brgyClearanceTableReducer from './brgyClearanceTableSlice'; 
import WpReducer from './wpSlice';
import BrgyReducer from './brgySlice';
import buildingPermitReducer from './buildingPermitSlice';
import certificateOfOccupancyReducer from './CertificateOfOccupancySlice';


const persistConfig = {
  key: 'root',
  storage,
  whitelist: [
    'reportFilter',
    'businessPermitTable',
    'workingPermitTable',
    'brgyClearanceTable', 
    'region',
    'charts',
    'project',
    'dates',
    'datas',
    'card',
    'transaction',
    'load',
    'status',
    'wp',
    'brgy',
    'buildingPermit',
    'certificateOfOccupancy', 
    'load2', // Add load2 to the whitelist

  ],
};

const rootReducer = combineReducers({
  region: regionReducer,
  charts: chartReducer,
  project: projectReducer,
  dates: dateReducer,
  datas: dataReducer,
  card: cardReducer,
  transaction: transactionReducer,
  load: loadReducer,
  status: statusReducer,
  wp:WpReducer,
  reportFilter: reportFilterReducer,
  businessPermitTable: businessPermitTableReducer,
  workingPermitTable: workingPermitTableReducer,
  brgyClearanceTable: brgyClearanceTableReducer, 
  brgy: BrgyReducer,
  buildingPermit: buildingPermitReducer,
  certificateOfOccupancy: certificateOfOccupancyReducer,
  load2: load2Reducer,


});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      immutableCheck: false,
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
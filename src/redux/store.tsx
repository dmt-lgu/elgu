import { configureStore } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import { combineReducers } from 'redux';
import regionReducer from './regionSlice';
import chartReducer from './chartSlice';
import projectReducer from './projectSlice';
import dataReducer from './dataSlice';
import cardReducer from './cardSlice';
import transactionReducer from './transactionSlice';
import transactionCardReducer from './transactionCardSlice';
import loadReducer from './loadSlice';
import load2Reducer from './loadSlice2';
import statusReducer from './statusSlice';
import reportFilterReducer from './reportFilterSlice';
import reportProgressReducer from './reportProgressSlice';
import businessPermitTableReducer from './businessPermitSlice';
import workingPermitTableReducer from './workingPermitTableSlice';
import brgyClearanceTableReducer from './brgyClearanceTableSlice'; 
import WpReducer from './wpSlice';
import BrgyReducer from './brgySlice';
import buildingPermitReducer from './buildingPermitSlice';
import certificateOfOccupancyReducer from './CertificateOfOccupancySlice';
import separatedTransactionReducer from './separatedTransactionSlice';


const persistConfig = {
  key: 'root',
  storage,
  whitelist: [
    'reportFilter',
    'reportProgress',
    'businessPermitTable', 
    'workingPermitTable',
    'brgyClearanceTable',
    'region',
    'charts',
    'project',
    'dates',
    'datas',
    'card',
    'load',
    'load2',
    'buildingPermit',
    'certificateOfOccupancy',
    // Exclude large data slices to prevent quota exceeded errors:
    // 'transaction', 'status', 'wp', 'brgy' are not persisted
  ],
};

const rootReducer = combineReducers({
  region: regionReducer,
  charts: chartReducer,
  project: projectReducer,
  datas: dataReducer,
  card: cardReducer,
  transactionCard: transactionCardReducer,
  transaction: transactionReducer,
  separatedTransaction: separatedTransactionReducer,
  load: loadReducer,
  status: statusReducer,
  wp:WpReducer,
  reportFilter: reportFilterReducer,
  reportProgress: reportProgressReducer,
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
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
        ignoredActionsPaths: ['register', 'rehydrate'],
        ignoredPaths: ['register'],
      },
      immutableCheck: {
        // Disable for better performance with large state
        warnAfter: 128,
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
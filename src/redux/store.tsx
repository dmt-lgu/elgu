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
import loadReducer from './loadSlice';
import statusReducer from './statusSlice';
import reportFilterReducer from './reportFilterSlice';
import businessPermitTableReducer from './businessPermitSlice';
import workingPermitTableReducer from './workingPermitTableSlice';
import brgyClearanceTableReducer from './brgyClearanceTableSlice'; 

const persistConfig = {
  key: 'root',
  storage,
  whitelist: [
    'reportFilter',
    'businessPermitTable',
    'workingPermitTable',
    'brgyClearanceTable', 
  ],
};

const rootReducer = combineReducers({
  region: regionReducer,
  charts: chartReducer,
  project: projectReducer,
  datas: dataReducer,
  card: cardReducer,
  transaction: transactionReducer,
  load: loadReducer,
  status: statusReducer,
  reportFilter: reportFilterReducer,
  businessPermitTable: businessPermitTableReducer,
  workingPermitTable: workingPermitTableReducer,
  brgyClearanceTable: brgyClearanceTableReducer, 
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
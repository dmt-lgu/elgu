import { configureStore } from '@reduxjs/toolkit';
import storage from 'redux-persist/lib/storage';
import { persistReducer, persistStore } from 'redux-persist';
import { combineReducers } from 'redux';
import { handleStorageError, manageStorageIntelligently } from '@/lib/storageUtils';

// Create a custom storage wrapper that handles quota errors
const createStorageWrapper = () => {
  return {
    ...storage,
    setItem: async (key: string, value: string) => {
      try {
        // Check storage before saving
        manageStorageIntelligently();
        await storage.setItem(key, value);
      } catch (error) {
        console.error('Storage setItem error:', error);
        if (handleStorageError(error)) {
          // Try again after optimization
          try {
            await storage.setItem(key, value);
          } catch (retryError) {
            console.error('Storage retry failed:', retryError);
            // Don't throw the error, just log it to prevent app crash
          }
        }
      }
    },
    getItem: async (key: string) => {
      try {
        return await storage.getItem(key);
      } catch (error) {
        console.error('Storage getItem error for key:', key, error);
        return null; // Return null instead of throwing
      }
    },
    removeItem: async (key: string) => {
      try {
        await storage.removeItem(key);
      } catch (error) {
        console.error('Storage removeItem error for key:', key, error);
      }
    }
  };
};

const customStorage = createStorageWrapper();
import regionReducer from './regionSlice';
import chartReducer from './chartSlice';
import projectReducer from './projectSlice';
import dateReducer from './dateSlice';
import dataReducer from './dataSlice';
import cardReducer from './cardSlice';
import transactionReducer from './transactionSlice';
import transactionCardReducer from './transactionCardSlice';
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
import separatedTransactionReducer from './separatedTransactionSlice';

// Create a custom storage wrapper that handles quota errors
const createStorageWrapper = () => {
  return {
    ...storage,
    setItem: (key: string, item: string) => {
      try {
        return storage.setItem(key, item);
      } catch (error) {
        if (handleStorageError(error)) {
          // Try once more after cleaning storage
          try {
            return storage.setItem(key, item);
          } catch (retryError) {
            console.error('Failed to store data even after cleanup:', retryError);
            throw retryError;
          }
        }
        throw error;
      }
    }
  };
};

const customStorage = createStorageWrapper();

const persistConfig = {
  key: 'root',
  storage: customStorage,
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
    'load',
    'load2',
    'buildingPermit',
    'certificateOfOccupancy',
    'transaction', // Added to persist chart data
    'status',     // Added to persist status data
    'wp',         // Added to persist working permit data
    'brgy',       // Added to persist barangay data
  ],
};

const rootReducer = combineReducers({
  region: regionReducer,
  charts: chartReducer,
  project: projectReducer,
  dates: dateReducer,
  datas: dataReducer,
  card: cardReducer,
  transactionCard: transactionCardReducer,
  transaction: transactionReducer,
  separatedTransaction: separatedTransactionReducer,
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
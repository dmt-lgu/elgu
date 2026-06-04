import axios from '@/plugin/axios';
import { store } from '@/redux/store';
import { setTableData } from '@/redux/businessPermitSlice';
import { setWorkingPermitTableData } from '@/redux/workingPermitTableSlice';
import { setBrgyClearanceTableData } from '@/redux/brgyClearanceTableSlice';
import { setbuildingPermitData } from '@/redux/buildingPermitSlice';
import { setcertificateOfOccupancy } from '@/redux/CertificateOfOccupancySlice';
import { setModuleProgress } from '@/redux/reportProgressSlice';

type Filters = any;

// Keep a global registry so fetches survive navigation/unmounts
const globalAny: any = (globalThis as any);
if (!globalAny._reportFetches) globalAny._reportFetches = {};

// NIR has no backend region — replace it with its three provinces so the API
// can filter by province name instead of a region ID.
const NIR_PROVINCES = ['Negros Occidental', 'Negros Oriental', 'Siquijor'];
function expandNIR(regions: string[]): string[] {
  if (!regions.includes('NIR')) return regions;
  const expanded = regions.filter(r => r !== 'NIR');
  NIR_PROVINCES.forEach(p => { if (!expanded.includes(p)) expanded.push(p); });
  return expanded;
}

function getActionForModule(moduleKey: string) {
  switch (moduleKey) {
    case 'Business Permit': return setTableData;
    case 'Working Permit': return setWorkingPermitTableData;
    case 'Barangay Clearance': return setBrgyClearanceTableData;
    case 'Building Permit': return setbuildingPermitData;
    case 'Certificate of Occupancy': return setcertificateOfOccupancy;
    default: return null;
  }
}

async function fetchModuleSequentially(moduleKey: string, apiUrl: string, filters: Filters, controller: AbortController) {
  const regions: string[] = expandNIR(Array.isArray(filters.selectedRegions) ? filters.selectedRegions : []);
  const aggregated: any[] = [];
  for (let i = 0; i < regions.length; i++) {
    if (controller.signal.aborted) break;
    const region = regions[i];
    const payload: any = {
      locationName: [region],
      startDate: filters.dateRange?.start || null,
      endDate: filters.dateRange?.end || null,
    };
    try {
      // eslint-disable-next-line no-await-in-loop
      const res = await axios.post(apiUrl, payload, { signal: controller.signal });
      const raw = res?.data;
      if (raw && Array.isArray(raw.results)) {
        raw.results.forEach((r: any) => {
          if (!aggregated.some(a => a.lgu === r.lgu)) aggregated.push(r);
        });
      }
    } catch (err: any) {
      if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') break;
    }
      // update stored progress and dispatch progress event
    try {
        const progress = { currentRegion: region, currentIndex: i + 1, totalRegions: regions.length };
        globalAny._reportFetches[moduleKey].progress = progress;
        // persist to redux as well
        try { store.dispatch(setModuleProgress({ moduleKey, progress })); } catch (e) {}
        const evt = new CustomEvent('report-progress', { detail: { moduleKey, currentRegion: region, currentIndex: i + 1, totalRegions: regions.length } });
        window.dispatchEvent(evt);
    } catch (e) {}

    // push interim aggregated results to redux
    try {
      const action = getActionForModule(moduleKey);
      if (action) store.dispatch(action({ results: aggregated.slice(), lguCount: aggregated.length } as any));
    } catch (e) {}
  }

  // final
  try {
    const action = getActionForModule(moduleKey);
    if (action) store.dispatch(action({ results: aggregated.slice(), lguCount: aggregated.length } as any));
  } catch (e) {}
}

async function fetchModuleOnce(moduleKey: string, apiUrl: string, filters: Filters, controller: AbortController) {
  const payload: any = {
    locationName: expandNIR(Array.isArray(filters.selectedRegions) ? filters.selectedRegions : []),
    startDate: filters.dateRange?.start || null,
    endDate: filters.dateRange?.end || null,
  };
  Object.keys(payload).forEach(key => ((Array.isArray(payload[key]) && payload[key].length === 0) || payload[key] === null) ? delete payload[key] : {});
  try {
    const res = await axios.post(apiUrl, payload, { signal: controller.signal });
    const raw = res?.data;
    // dedupe LGUs
    let cleaned = raw;
    if (raw && Array.isArray(raw.results)) {
      const seen = new Set();
      const unique = raw.results.filter((lgu:any) => { if (seen.has(lgu.lgu)) return false; seen.add(lgu.lgu); return true; });
      cleaned = { ...raw, results: unique, lguCount: unique.length };
    }
        const progress = { currentRegion: 'Fetching', currentIndex: 0, totalRegions: Array.isArray(filters.selectedRegions) ? filters.selectedRegions.length : 0 };
        globalAny._reportFetches[moduleKey].progress = progress;
        try { store.dispatch(setModuleProgress({ moduleKey, progress })); } catch (e) {}
        const evtStart = new CustomEvent('report-progress', { detail: { moduleKey, currentRegion: 'Fetching', currentIndex: 0, totalRegions: Array.isArray(filters.selectedRegions) ? filters.selectedRegions.length : 0 } });
        window.dispatchEvent(evtStart);
        const action = getActionForModule(moduleKey);
        if (action) store.dispatch(action(cleaned as any));
  } catch (err: any) {
    if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') {
      // aborted
    } else {
      console.error('Background fetch error', moduleKey, err);
    }
  }
}

export function startReportsForFilter(filters: Filters) {
  const modules: string[] = filters.selectedModules || [];
  modules.forEach(moduleKey => {
    if (globalAny._reportFetches[moduleKey] && globalAny._reportFetches[moduleKey].status === 'running') return; // already running
    const controller = new AbortController();
    globalAny._reportFetches[moduleKey] = { status: 'running', controller };
    let apiUrl = '';
    if (moduleKey === 'Business Permit') apiUrl = `${(import.meta.env as any).VITE_URL}/api/bp/transaction-count`;
    if (moduleKey === 'Working Permit') apiUrl = `${(import.meta.env as any).VITE_URL}/api/wp/transaction-count`;
    if (moduleKey === 'Barangay Clearance') apiUrl = `${(import.meta.env as any).VITE_URL}/api/bc/transaction-count`;
    if (moduleKey === 'Building Permit') apiUrl = `${(import.meta.env as any).VITE_URL}/api/bpco/transaction-count-bp`;
    if (moduleKey === 'Certificate of Occupancy') apiUrl = `${(import.meta.env as any).VITE_URL}/api/bpco/transaction-count-co`;

    // Modules without a transaction count API (LCR, eNews, Cedula, etc.) — skip silently
    if (!apiUrl) {
      globalAny._reportFetches[moduleKey] = { status: 'done', controller };
      return;
    }

  const run = async () => {
      try {
        if (Array.isArray(filters.selectedRegions) && filters.selectedRegions.length > 1 && !filters.allRegionsSelected) {
          await fetchModuleSequentially(moduleKey, apiUrl, filters, controller);
        } else {
          await fetchModuleOnce(moduleKey, apiUrl, filters, controller);
        }
          globalAny._reportFetches[moduleKey].status = 'done';
          globalAny._reportFetches[moduleKey].progress = { currentRegion: 'Done', currentIndex: 0, totalRegions: 0 };
          const doneEvt = new CustomEvent('report-progress', { detail: { moduleKey, currentRegion: 'Done', currentIndex: 0, totalRegions: 0 } });
          window.dispatchEvent(doneEvt);
      } catch (e) {
        if ((e as any)?.name === 'CanceledError') {
          globalAny._reportFetches[moduleKey].status = 'cancelled';
        } else {
          globalAny._reportFetches[moduleKey].status = 'error';
        }
      }
    };
    void run();
  });
}

export function cancelReportsForFilter(filters: Filters) {
  const modules: string[] = filters.selectedModules || [];
  modules.forEach(moduleKey => {
    const entry = globalAny._reportFetches[moduleKey];
    if (entry && entry.controller) {
      try { entry.controller.abort(); } catch (e) {}
      entry.status = 'cancelled';
      try { store.dispatch(setModuleProgress({ moduleKey, progress: null })); } catch (e) {}
    }
  });
}

export function isModuleRunning(moduleKey: string) {
  const entry = globalAny._reportFetches[moduleKey];
  return !!entry && entry.status === 'running';
}

export function getModuleProgress(moduleKey: string) {
  const entry = globalAny._reportFetches[moduleKey];
  return entry ? entry.progress || null : null;
}

export function getAllProgress() {
  return Object.keys(globalAny._reportFetches).reduce((acc:any, key:string) => {
    acc[key] = globalAny._reportFetches[key].progress || null;
    return acc;
  }, {});
}

export default { startReportsForFilter, cancelReportsForFilter, isModuleRunning };

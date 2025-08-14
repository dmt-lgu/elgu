import { useMemo, useEffect, useRef, useCallback} from 'react';
import FilterSection from './components/FilterSection';
import ModuleFilter from './components/ModuleFilter';
import StatisticCard from './components/StatisticCard';


import TransactionChart from './components/TransChartComponent';
import { selectCard } from '@/redux/cardSlice';
import { selectTransaction } from '@/redux/transactionSlice';
import { useSelector, useDispatch } from 'react-redux';
import { selectData } from '@/redux/dataSlice';

import axios from './../../../plugin/axios2';


import TransactionChart2 from './components/TransChartComponent2';
import { selectStatus, setStatus } from '@/redux/statusSlice';

import { parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import StatusChartComponent from './components/StatusChartComponent';
import { setWp, selectWp } from '@/redux/wpSlice';
import { setBrgy, selectBrgy } from '@/redux/brgySlice';
import { selectLoad2, setLoad2 } from '@/redux/loadSlice2';
import StatisticCard2 from './components/StatisticCard2';



const DashboardPage = () => {
  const card = useSelector(selectCard);
  const status = useSelector(selectStatus);
  const wp = useSelector(selectWp)
  const brgy = useSelector(selectBrgy);
  const data = useSelector(selectData);
  const transactionData = useSelector(selectTransaction);
  const loading = useSelector(selectLoad2);
  const dispatch = useDispatch();

  // Loading states for each module


  // Cancel request controllers
  const bpControllerRef = useRef<AbortController | null>(null);
  const wpControllerRef = useRef<AbortController | null>(null);
  const brgyControllerRef = useRef<AbortController | null>(null);
  const bpcoControllerRef = useRef<AbortController | null>(null);
  
  // Debounce timer and queue
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fetchQueueRef = useRef<string[]>([]);
  const isProcessingRef = useRef(false);

  // Cancel all pending requests
  const cancelAllRequests = useCallback(() => {
    if (bpControllerRef.current) {
      bpControllerRef.current.abort();
      bpControllerRef.current = null;
    }
    if (wpControllerRef.current) {
      wpControllerRef.current.abort();
      wpControllerRef.current = null;
    }
    if (brgyControllerRef.current) {
      brgyControllerRef.current.abort();
      brgyControllerRef.current = null;
    }
    if (bpcoControllerRef.current) {
      bpcoControllerRef.current.abort();
      bpcoControllerRef.current = null;
    }
    
    // Clear loading state
    dispatch(setLoad2(false));
    
    // Clear queue
    fetchQueueRef.current = [];
    isProcessingRef.current = false;
  }, [dispatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAllRequests();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [cancelAllRequests]);

  

  // Enhanced filter and group logic
  const filterAndGroupResults = (results: any[], municipalities: any[], provinces: any[]) => {
    // 1. If municipalities is not blank, filter by selected municipalities (1 by 1)
    if (municipalities && municipalities.length > 0) {
      const selected = municipalities.map((m: any) => m.value);
      return results.filter((lgu: any) => selected.includes(lgu.lgu));
    }
    // 2. If provinces is not blank, group by province
    if (provinces && provinces.length > 0) {
      const selectedProvinces = provinces.map((p: any) => p.value);
      const grouped: { [province: string]: any } = {};
      results.forEach((lgu: any) => {
        // Extract province from lgu.lgu (e.g., "Aloran, Misamis Occidental" → "Misamis Occidental")
        const parts = lgu.lgu.split(',');
        const province = parts.length > 1 ? parts[1].trim() : '';
        if (selectedProvinces.includes(province)) {
          if (!grouped[province]) {
            grouped[province] = {
              lgu: province,
              province,
              monthlyResults: [],
            };
          }
          // Merge monthlyResults
          lgu.monthlyResults.forEach((m: any, idx: number) => {
            if (!grouped[province].monthlyResults[idx]) {
              grouped[province].monthlyResults[idx] = { ...m };
            } else {
              Object.keys(m).forEach(key => {
                if (typeof m[key] === 'number') {
                  grouped[province].monthlyResults[idx][key] =
                    (grouped[province].monthlyResults[idx][key] ?? 0) + m[key];
                }
              });
            }
          });
        }
      });
      return Object.values(grouped);
    }
    // 3. If blank, group by region and sum up the values
    const grouped: { [region: string]: any } = {};
    results.forEach((lgu: any) => {
      if (!grouped[lgu.region]) {
        grouped[lgu.region] = {
          lgu: lgu.region,
          region: lgu.region,
          monthlyResults: [],
        };
      }
      lgu.monthlyResults.forEach((m: any, idx: number) => {
        if (!grouped[lgu.region].monthlyResults[idx]) {
          grouped[lgu.region].monthlyResults[idx] = { ...m };
        } else {
          Object.keys(m).forEach(key => {
            if (typeof m[key] === 'number') {
              grouped[lgu.region].monthlyResults[idx][key] =
                (grouped[lgu.region].monthlyResults[idx][key] ?? 0) + m[key];
            }
          });
        }
      });
    });
    return Object.values(grouped);
  };

  const bpChartData: any = useMemo(() => {
  const bpArr = status?.BP;
  if (!bpArr || !Array.isArray(bpArr) || bpArr.length === 0) return { current: [], breakdown: [] };

  // Prepare date and region filters
  const startDate = data.startDate ? parseISO(data.startDate) : null;
  const endDate = data.endDate ? parseISO(data.endDate) : null;
  const selectedRegions = Array.isArray(data.real) ? data.real : data.real ? [data.real] : [];
  const selectedProvinces = Array.isArray(data.province) ? data.province : [];
  const selectedMunicipalities = Array.isArray(data.municipalities) ? data.municipalities : [];

  // Filter BP array by date range
  const filteredBPArr = bpArr.filter((bp: any) => {
    if (!bp.date) return true;
    const bpDate = parseISO(bp.date);
    let dateOk = true;
    if (startDate) dateOk = isAfter(bpDate, startDate) || isEqual(bpDate, startDate);
    if (endDate) dateOk = dateOk && (isBefore(bpDate, endDate) || isEqual(bpDate, endDate));
    return dateOk;
  });

  // Helper to group and sum by key
  function groupAndSum(arr: any[], key: string) {
    const grouped: Record<string, any> = {};
    arr.forEach(item => {
      const groupKey = item[key];
      if (!groupKey) return;
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          name: groupKey,
          operational: 0,
          developmental: 0,
          withdraw: 0,
        };
      }
      grouped[groupKey].operational += item.operational ?? 0;
      grouped[groupKey].developmental += item.developmental ?? 0;
      grouped[groupKey].withdraw += item.withdraw ?? 0;
    });
    return Object.values(grouped);
  }

  // --- 1. Current: latest by date ---
  let current: any[] = [];
  if (filteredBPArr.length > 0) {
    const sorted = [...filteredBPArr].sort((a, b) => (a.date > b.date ? -1 : 1));
    const latest = sorted[0];
    if (latest && latest.data) {
      let filteredData = latest.data;

      // Municipality filter (use lgu)
      if (selectedMunicipalities.length > 0) {
        const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
        filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
        current = groupAndSum(filteredData, "lgu");
      }
      // Province filter
      else if (selectedProvinces.length > 0) {
        const selectedProv = selectedProvinces.map((p: any) => p.value);
        filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
        current = groupAndSum(filteredData, "province");
      }
      // Region filter
      else if (selectedRegions.length > 0) {
        filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
        current = groupAndSum(filteredData, "region");
      } else {
        current = groupAndSum(filteredData, "region");
      }
    }
  }

  // --- 2. Breakdown: group by date, each with data:[] ---
  let breakdown: any[] = [];
  filteredBPArr.forEach((bp: any) => {
    let filteredData = bp.data;

    if (selectedMunicipalities.length > 0) {
      const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
      filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "lgu"),
      });
    } else if (selectedProvinces.length > 0) {
      const selectedProv = selectedProvinces.map((p: any) => p.value);
      filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "province"),
      });
    } else if (selectedRegions.length > 0) {
      filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "region"),
      });
    } else {
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "region"),
      });
    }
  });

  return { current, breakdown };
}, [
  status,
  data.startDate,
  data.endDate,
  data.real,
  data.province,
  data.municipalities,
]);


const wpChartData: any = useMemo(() => {
  const bpArr = wp?.WP;
  if (!bpArr || !Array.isArray(bpArr) || bpArr.length === 0) return { current: [], breakdown: [] };

  // Prepare date and region filters
  const startDate = data.startDate ? parseISO(data.startDate) : null;
  const endDate = data.endDate ? parseISO(data.endDate) : null;
  const selectedRegions = Array.isArray(data.real) ? data.real : data.real ? [data.real] : [];
  const selectedProvinces = Array.isArray(data.province) ? data.province : [];
  const selectedMunicipalities = Array.isArray(data.municipalities) ? data.municipalities : [];

  // Filter BP array by date range
  const filteredBPArr = bpArr.filter((bp: any) => {
    if (!bp.date) return true;
    const bpDate = parseISO(bp.date);
    let dateOk = true;
    if (startDate) dateOk = isAfter(bpDate, startDate) || isEqual(bpDate, startDate);
    if (endDate) dateOk = dateOk && (isBefore(bpDate, endDate) || isEqual(bpDate, endDate));
    return dateOk;
  });

  // Helper to group and sum by key
  function groupAndSum(arr: any[], key: string) {
    const grouped: Record<string, any> = {};
    arr.forEach(item => {
      const groupKey = item[key];
      if (!groupKey) return;
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          name: groupKey,
          operational: 0,
          developmental: 0,
          withdraw: 0,
        };
      }
      grouped[groupKey].operational += item.operational ?? 0;
      grouped[groupKey].developmental += item.developmental ?? 0;
      grouped[groupKey].withdraw += item.withdraw ?? 0;
    });
    return Object.values(grouped);
  }

  // --- 1. Current: latest by date ---
  let current: any[] = [];
  if (filteredBPArr.length > 0) {
    const sorted = [...filteredBPArr].sort((a, b) => (a.date > b.date ? -1 : 1));
    const latest = sorted[0];
    if (latest && latest.data) {
      let filteredData = latest.data;

      // Municipality filter (use lgu)
      if (selectedMunicipalities.length > 0) {
        const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
        filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
        current = groupAndSum(filteredData, "lgu");
      }
      // Province filter
      else if (selectedProvinces.length > 0) {
        const selectedProv = selectedProvinces.map((p: any) => p.value);
        filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
        current = groupAndSum(filteredData, "province");
      }
      // Region filter
      else if (selectedRegions.length > 0) {
        filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
        current = groupAndSum(filteredData, "region");
      } else {
        current = groupAndSum(filteredData, "region");
      }
    }
  }

  // --- 2. Breakdown: group by date, each with data:[] ---
  let breakdown: any[] = [];
  filteredBPArr.forEach((bp: any) => {
    let filteredData = bp.data;

    if (selectedMunicipalities.length > 0) {
      const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
      filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "lgu"),
      });
    } else if (selectedProvinces.length > 0) {
      const selectedProv = selectedProvinces.map((p: any) => p.value);
      filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "province"),
      });
    } else if (selectedRegions.length > 0) {
      filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "region"),
      });
    } else {
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "region"),
      });
    }
  });
  // console.log("wpChartData", current);
  return { current, breakdown };
}, [
  status,
  data.startDate,
  data.endDate,
  data.real,
  data.province,
  data.municipalities,
]);


const brgyChartData: any = useMemo(() => {
  const bpArr = brgy?.BRGY;
  if (!bpArr || !Array.isArray(bpArr) || bpArr.length === 0) return { current: [], breakdown: [] };

  // Prepare date and region filters
  const startDate = data.startDate ? parseISO(data.startDate) : null;
  const endDate = data.endDate ? parseISO(data.endDate) : null;
  const selectedRegions = Array.isArray(data.real) ? data.real : data.real ? [data.real] : [];
  const selectedProvinces = Array.isArray(data.province) ? data.province : [];
  const selectedMunicipalities = Array.isArray(data.municipalities) ? data.municipalities : [];

  // Filter BP array by date range
  const filteredBPArr = bpArr.filter((bp: any) => {
    if (!bp.date) return true;
    const bpDate = parseISO(bp.date);
    let dateOk = true;
    if (startDate) dateOk = isAfter(bpDate, startDate) || isEqual(bpDate, startDate);
    if (endDate) dateOk = dateOk && (isBefore(bpDate, endDate) || isEqual(bpDate, endDate));
    return dateOk;
  });

  // Helper to group and sum by key
  function groupAndSum(arr: any[], key: string) {
    const grouped: Record<string, any> = {};
    arr.forEach(item => {
      const groupKey = item[key];
      if (!groupKey) return;
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          name: groupKey,
          operational: 0,
          developmental: 0,
          withdraw: 0,
        };
      }
      grouped[groupKey].operational += item.operational ?? 0;
      grouped[groupKey].developmental += item.developmental ?? 0;
      grouped[groupKey].withdraw += item.withdraw ?? 0;
    });
    return Object.values(grouped);
  }

  // --- 1. Current: latest by date ---
  let current: any[] = [];
  if (filteredBPArr.length > 0) {
    const sorted = [...filteredBPArr].sort((a, b) => (a.date > b.date ? -1 : 1));
    const latest = sorted[0];
    if (latest && latest.data) {
      let filteredData = latest.data;

      // Municipality filter (use lgu)
      if (selectedMunicipalities.length > 0) {
        const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
        filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
        current = groupAndSum(filteredData, "lgu");
      }
      // Province filter
      else if (selectedProvinces.length > 0) {
        const selectedProv = selectedProvinces.map((p: any) => p.value);
        filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
        current = groupAndSum(filteredData, "province");
      }
      // Region filter
      else if (selectedRegions.length > 0) {
        filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
        current = groupAndSum(filteredData, "region");
      } else {
        current = groupAndSum(filteredData, "region");
      }
    }
  }

  // --- 2. Breakdown: group by date, each with data:[] ---
  let breakdown: any[] = [];
  filteredBPArr.forEach((bp: any) => {
    let filteredData = bp.data;

    if (selectedMunicipalities.length > 0) {
      const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
      filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "lgu"),
      });
    } else if (selectedProvinces.length > 0) {
      const selectedProv = selectedProvinces.map((p: any) => p.value);
      filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "province"),
      });
    } else if (selectedRegions.length > 0) {
      filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "region"),
      });
    } else {
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "region"),
      });
    }
  });
  return { current, breakdown };
}, [
  status,
  data.startDate,
  data.endDate,
  data.real,
  data.province,
  data.municipalities,
]);

const bpcoChartData: any = useMemo(() => {
  const bpArr = status?.BPCO;
  if (!bpArr || !Array.isArray(bpArr) || bpArr.length === 0) return { current: [], breakdown: [] };

  // Prepare date and region filters
  const startDate = data.startDate ? parseISO(data.startDate) : null;
  const endDate = data.endDate ? parseISO(data.endDate) : null;
  const selectedRegions = Array.isArray(data.real) ? data.real : data.real ? [data.real] : [];
  const selectedProvinces = Array.isArray(data.province) ? data.province : [];
  const selectedMunicipalities = Array.isArray(data.municipalities) ? data.municipalities : [];

  // Filter BP array by date range
  const filteredBPArr = bpArr.filter((bp: any) => {
    if (!bp.date) return true;
    const bpDate = parseISO(bp.date);
    let dateOk = true;
    if (startDate) dateOk = isAfter(bpDate, startDate) || isEqual(bpDate, startDate);
    if (endDate) dateOk = dateOk && (isBefore(bpDate, endDate) || isEqual(bpDate, endDate));
    return dateOk;
  });

  // Helper to group and sum by key
  function groupAndSum(arr: any[], key: string) {
    const grouped: Record<string, any> = {};
    arr.forEach(item => {
      const groupKey = item[key];
      if (!groupKey) return;
      if (!grouped[groupKey]) {
        grouped[groupKey] = {
          name: groupKey,
          operational: 0,
          developmental: 0,
          withdraw: 0,
        };
      }
      grouped[groupKey].operational += item.operational ?? 0;
      grouped[groupKey].developmental += item.developmental ?? 0;
      grouped[groupKey].withdraw += item.withdraw ?? 0;
    });
    return Object.values(grouped);
  }

  // --- 1. Current: latest by date ---
  let current: any[] = [];
  if (filteredBPArr.length > 0) {
    const sorted = [...filteredBPArr].sort((a, b) => (a.date > b.date ? -1 : 1));
    const latest = sorted[0];
    if (latest && latest.data) {
      let filteredData = latest.data;

      // Municipality filter (use lgu)
      if (selectedMunicipalities.length > 0) {
        const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
        filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
        current = groupAndSum(filteredData, "lgu");
      }
      // Province filter
      else if (selectedProvinces.length > 0) {
        const selectedProv = selectedProvinces.map((p: any) => p.value);
        filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
        current = groupAndSum(filteredData, "province");
      }
      // Region filter
      else if (selectedRegions.length > 0) {
        filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
        current = groupAndSum(filteredData, "region");
      } else {
        current = groupAndSum(filteredData, "region");
      }
    }
  }

  // --- 2. Breakdown: group by date, each with data:[] ---
  let breakdown: any[] = [];
  filteredBPArr.forEach((bp: any) => {
    let filteredData = bp.data;

    if (selectedMunicipalities.length > 0) {
      const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
      filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "lgu"),
      });
    } else if (selectedProvinces.length > 0) {
      const selectedProv = selectedProvinces.map((p: any) => p.value);
      filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "province"),
      });
    } else if (selectedRegions.length > 0) {
      filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "region"),
      });
    } else {
      breakdown.push({
        date: bp.date,
        data: groupAndSum(filteredData, "region"),
      });
    }
  });
  return { current, breakdown };
}, [
  status,
  data.startDate,
  data.endDate,
  data.real,
  data.province,
  data.municipalities,
]);

  // --- Calculate totals from all chart data sources ---
  const totalOperational = useMemo(() => {
    let total = 0;
    
    // Add BP data if module is enabled
    if (data.modules?.includes("Business Permit")) {
      total += bpChartData?.current.reduce((sum:any, item:any) => sum + (item.operational ?? 0), 0);
    }
    
    // Add WP data if module is enabled
    if (data.modules?.includes("Working Permit")) {
      total += wpChartData?.current.reduce((sum:any, item:any) => sum + (item.operational ?? 0), 0);
    }
    
    // Add BRGY data if module is enabled
    if (data.modules?.includes("Barangay Clearance")) {
      total += brgyChartData?.current.reduce((sum:any, item:any) => sum + (item.operational ?? 0), 0);
    }
    
    // Add BPCO data if module is enabled
    if (data.modules?.includes("Building Permit & Certificate of Occupancy")) {
      total += bpcoChartData?.current.reduce((sum:any, item:any) => sum + (item.operational ?? 0), 0);
    }
    
    return total;
  }, [bpChartData, wpChartData, brgyChartData, bpcoChartData, data.modules]);

  const totalDevelopmental = useMemo(() => {
    let total = 0;
    
    // Add BP data if module is enabled
    if (data.modules?.includes("Business Permit")) {
      total += bpChartData?.current.reduce((sum:any, item:any) => sum + (item.developmental ?? 0), 0);
    }
    
    // Add WP data if module is enabled
    if (data.modules?.includes("Working Permit")) {
      total += wpChartData?.current.reduce((sum:any, item:any) => sum + (item.developmental ?? 0), 0);
    }
    
    // Add BRGY data if module is enabled
    if (data.modules?.includes("Barangay Clearance")) {
      total += brgyChartData?.current.reduce((sum:any, item:any) => sum + (item.developmental ?? 0), 0);
    }
    
    // Add BPCO data if module is enabled
    if (data.modules?.includes("Building Permit & Certificate of Occupancy")) {
      total += bpcoChartData?.current.reduce((sum:any, item:any) => sum + (item.developmental ?? 0), 0);
    }
    
    return total;
  }, [bpChartData, wpChartData, brgyChartData, bpcoChartData, data.modules]);

  const totalWithdraw = useMemo(() => {
    let total = 0;
    
    // Add BP data if module is enabled
    if (data.modules?.includes("Business Permit")) {
      total += bpChartData?.current.reduce((sum:any, item:any) => sum + (item.withdraw ?? 0), 0);
    }
    
    // Add WP data if module is enabled
    if (data.modules?.includes("Working Permit")) {
      total += wpChartData?.current.reduce((sum:any, item:any) => sum + (item.withdraw ?? 0), 0);
    }
    
    // Add BRGY data if module is enabled
    if (data.modules?.includes("Barangay Clearance")) {
      total += brgyChartData?.current.reduce((sum:any, item:any) => sum + (item.withdraw ?? 0), 0);
    }
    
    // Add BPCO data if module is enabled
    if (data.modules?.includes("Building Permit & Certificate of Occupancy")) {
      total += bpcoChartData?.current.reduce((sum:any, item:any) => sum + (item.withdraw ?? 0), 0);
    }
    
    return total;
  }, [bpChartData, wpChartData, brgyChartData, bpcoChartData, data.modules]);


  const chartData = useMemo(() => {
    if (!transactionData || !transactionData.results) return [];
    // Filter or group results
    const filteredResults = filterAndGroupResults(
      transactionData.results,
      data.municipalities,
      data.province
    );

    return filteredResults.map((lgu: any) => {
      let paidMale = 0, paidFemale = 0, pendingMale = 0, pendingFemale = 0;
      let bpMalePaid = 0, bpFemalePaid = 0, bpMalePending = 0, bpFemalePending = 0;
      let wpMalePaid = 0, wpFemalePaid = 0, wpMalePending = 0, wpFemalePending = 0;
      
      lgu.monthlyResults.forEach((m: any) => {
        // Combined totals
        paidMale += (m.bpMalePaid ?? 0) + (m.wpMalePaid ?? 0);
        paidFemale += (m.bpFemalePaid ?? 0) + (m.wpFemalePaid ?? 0);
        pendingMale += (m.bpMalePending ?? 0) + (m.wpMalePending ?? 0);
        pendingFemale += (m.bpFemalePending ?? 0) + (m.wpFemalePending ?? 0);
        
        // Module-specific totals
        bpMalePaid += m.bpMalePaid ?? 0;
        bpFemalePaid += m.bpFemalePaid ?? 0;
        bpMalePending += m.bpMalePending ?? 0;
        bpFemalePending += m.bpFemalePending ?? 0;
        
        wpMalePaid += m.wpMalePaid ?? 0;
        wpFemalePaid += m.wpFemalePaid ?? 0;
        wpMalePending += m.wpMalePending ?? 0;
        wpFemalePending += m.wpFemalePending ?? 0;
      });
      return {
        name: lgu.lgu,
        paidMale,
        paidFemale,
        pendingMale,
        pendingFemale,
        // Module-specific data
        bpMalePaid,
        bpFemalePaid,
        bpMalePending,
        bpFemalePending,
        wpMalePaid,
        wpFemalePaid,
        wpMalePending,
        wpFemalePending,
      };
    });
  }, [data, transactionData]);

const chartData3 = useMemo(() => {
  if (!transactionData || !transactionData.results) return [];
  // Filter or group results
  const filteredResults = filterAndGroupResults(
    transactionData.results,
    data.municipalities,
    data.province
  );

  return filteredResults.map((lgu: any) => {
    let newPaid = 0, newPending = 0, newPaidViaEgov = 0, newPaidLinkBiz = 0;
    let renewPaid = 0, renewPending = 0, renewPaidViaEgov = 0, renewPaidLinkBiz = 0;
    let bpNewPaid = 0, bpNewPending = 0, bpNewPaidViaEgov = 0, bpNewPaidLinkBiz = 0;
    let bpRenewPaid = 0, bpRenewPending = 0, bpRenewPaidViaEgov = 0, bpRenewPaidLinkBiz = 0;
    let wpNewPaid = 0, wpNewPending = 0, wpNewPaidViaEgov = 0, wpNewPaidLinkBiz = 0;
    let wpRenewPaid = 0, wpRenewPending = 0, wpRenewPaidViaEgov = 0, wpRenewPaidLinkBiz = 0;
    
    lgu.monthlyResults.forEach((m: any) => {
      // Combined totals
      newPaid += (m.bpNewPaid ?? 0) + (m.wpNewPaid ?? 0);
      newPending += (m.bpNewPending ?? 0) + (m.wpNewPending ?? 0);
      newPaidViaEgov += (m.bpNewPaidViaEgov ?? 0) + (m.wpNewPaidViaEgov ?? 0);
      newPaidLinkBiz += (m.bpNewPaidLinkBiz ?? 0) + (m.wpNewPaidLinkBiz ?? 0);
      renewPaid += (m.bpRenewPaid ?? 0) + (m.wpRenewPaid ?? 0);
      renewPending += (m.bpRenewPending ?? 0) + (m.wpRenewPending ?? 0);
      renewPaidViaEgov += (m.bpRenewPaidViaEgov ?? 0) + (m.wpRenewPaidViaEgov ?? 0);
      renewPaidLinkBiz += (m.bpRenewPaidLinkBiz ?? 0) + (m.wpRenewPaidLinkBiz ?? 0);

      // Module-specific totals
      bpNewPaid += m.bpNewPaid ?? 0;
      bpNewPending += m.bpNewPending ?? 0;
      bpNewPaidViaEgov += m.bpNewPaidViaEgov ?? 0;
      bpNewPaidLinkBiz += m.bpNewPaidLinkBiz ?? 0;
      bpRenewPaid += m.bpRenewPaid ?? 0;
      bpRenewPending += m.bpRenewPending ?? 0;
      bpRenewPaidViaEgov += m.bpRenewPaidViaEgov ?? 0;
      bpRenewPaidLinkBiz += m.bpRenewPaidLinkBiz ?? 0;

      wpNewPaid += m.wpNewPaid ?? 0;
      wpNewPending += m.wpNewPending ?? 0;
      wpNewPaidViaEgov += m.wpNewPaidViaEgov ?? 0;
      wpNewPaidLinkBiz += m.wpNewPaidLinkBiz ?? 0;
      wpRenewPaid += m.wpRenewPaid ?? 0;
      wpRenewPending += m.wpRenewPending ?? 0;
      wpRenewPaidViaEgov += m.wpRenewPaidViaEgov ?? 0;
      wpRenewPaidLinkBiz += m.wpRenewPaidLinkBiz ?? 0;
    });

    return {
      name: lgu.lgu,
      newPaid,
      newPending,
      newPaidViaEgov,
      newPaidLinkBiz,
      renewPaid,
      renewPending,
      renewPaidViaEgov,
      renewPaidLinkBiz,
      // Module-specific data
      bpNewPaid,
      bpNewPending,
      bpNewPaidViaEgov,
      bpNewPaidLinkBiz,
      bpRenewPaid,
      bpRenewPending,
      bpRenewPaidViaEgov,
      bpRenewPaidLinkBiz,
      wpNewPaid,
      wpNewPending,
      wpNewPaidViaEgov,
      wpNewPaidLinkBiz,
      wpRenewPaid,
      wpRenewPending,
      wpRenewPaidViaEgov,
      wpRenewPaidLinkBiz,
    };
  });
}, [data, transactionData]);


  // Filter card statistics by data.municipalities or data.province if present
  const filteredCard = useMemo(() => {
    if (!card || !transactionData?.results) return card;
    // If municipalities or province is selected, filter/group accordingly
    const filteredResults = filterAndGroupResults(
      transactionData.results,
      data.municipalities,
      data.province
    );

    // Sum up all relevant fields for the filtered LGUs/provinces/regions
    const totals = {
      totalnewPending: 0,
      totalnewPaid: 0,
      totalnewPaidViaEgov: 0,
      totalrenewPending: 0,
      totalrenewPaid: 0,
      totalrenewPaidViaEgov: 0,
      totalmalePaid: 0,
      totalmalePending: 0,
      totalfemalePaid: 0,
      totalfemalePending: 0,
    };

    // Need to recalculate totals that include module-specific fields
    const moduleSpecificTotals = {
      bpTotalnewPending: 0,
      bpTotalnewPaid: 0,
      bpTotalnewPaidViaEgov: 0,
      bpTotalrenewPending: 0,
      bpTotalrenewPaid: 0,
      bpTotalrenewPaidViaEgov: 0,
      bpTotalmalePaid: 0,
      bpTotalmalePending: 0,
      bpTotalfemalePaid: 0,
      bpTotalfemalePending: 0,
      wpTotalnewPending: 0,
      wpTotalnewPaid: 0,
      wpTotalnewPaidViaEgov: 0,
      wpTotalrenewPending: 0,
      wpTotalrenewPaid: 0,
      wpTotalrenewPaidViaEgov: 0,
      wpTotalmalePaid: 0,
      wpTotalmalePending: 0,
      wpTotalfemalePaid: 0,
      wpTotalfemalePending: 0,
    };

    filteredResults.forEach((lgu: any) => {
      lgu.monthlyResults.forEach((m: any) => {
        // Use merged structure field names
        const bpNewPending = m.bpNewPending ?? 0;
        const bpNewPaid = m.bpNewPaid ?? 0;
        const bpNewPaidViaEgov = m.bpNewPaidViaEgov ?? 0;
        const bpRenewPending = m.bpRenewPending ?? 0;
        const bpRenewPaid = m.bpRenewPaid ?? 0;
        const bpRenewPaidViaEgov = m.bpRenewPaidViaEgov ?? 0;
        const bpMalePending = m.bpMalePending ?? 0;
        const bpMalePaid = m.bpMalePaid ?? 0;
        const bpFemalePending = m.bpFemalePending ?? 0;
        const bpFemalePaid = m.bpFemalePaid ?? 0;

        const wpNewPending = m.wpNewPending ?? 0;
        const wpNewPaid = m.wpNewPaid ?? 0;
        const wpNewPaidViaEgov = m.wpNewPaidViaEgov ?? 0;
        const wpRenewPending = m.wpRenewPending ?? 0;
        const wpRenewPaid = m.wpRenewPaid ?? 0;
        const wpRenewPaidViaEgov = m.wpRenewPaidViaEgov ?? 0;
        const wpMalePending = m.wpMalePending ?? 0;
        const wpMalePaid = m.wpMalePaid ?? 0;
        const wpFemalePending = m.wpFemalePending ?? 0;
        const wpFemalePaid = m.wpFemalePaid ?? 0;

        // Combined totals
        totals.totalnewPending += bpNewPending + wpNewPending;
        totals.totalnewPaid += bpNewPaid + wpNewPaid;
        totals.totalnewPaidViaEgov += bpNewPaidViaEgov + wpNewPaidViaEgov;
        totals.totalrenewPending += bpRenewPending + wpRenewPending;
        totals.totalrenewPaid += bpRenewPaid + wpRenewPaid;
        totals.totalrenewPaidViaEgov += bpRenewPaidViaEgov + wpRenewPaidViaEgov;
        totals.totalmalePaid += bpMalePaid + wpMalePaid;
        totals.totalmalePending += bpMalePending + wpMalePending;
        totals.totalfemalePaid += bpFemalePaid + wpFemalePaid;
        totals.totalfemalePending += bpFemalePending + wpFemalePending;

        // Module-specific totals
        moduleSpecificTotals.bpTotalnewPending += bpNewPending;
        moduleSpecificTotals.bpTotalnewPaid += bpNewPaid;
        moduleSpecificTotals.bpTotalnewPaidViaEgov += bpNewPaidViaEgov;
        moduleSpecificTotals.bpTotalrenewPending += bpRenewPending;
        moduleSpecificTotals.bpTotalrenewPaid += bpRenewPaid;
        moduleSpecificTotals.bpTotalrenewPaidViaEgov += bpRenewPaidViaEgov;
        moduleSpecificTotals.bpTotalmalePaid += bpMalePaid;
        moduleSpecificTotals.bpTotalmalePending += bpMalePending;
        moduleSpecificTotals.bpTotalfemalePaid += bpFemalePaid;
        moduleSpecificTotals.bpTotalfemalePending += bpFemalePending;

        moduleSpecificTotals.wpTotalnewPending += wpNewPending;
        moduleSpecificTotals.wpTotalnewPaid += wpNewPaid;
        moduleSpecificTotals.wpTotalnewPaidViaEgov += wpNewPaidViaEgov;
        moduleSpecificTotals.wpTotalrenewPending += wpRenewPending;
        moduleSpecificTotals.wpTotalrenewPaid += wpRenewPaid;
        moduleSpecificTotals.wpTotalrenewPaidViaEgov += wpRenewPaidViaEgov;
        moduleSpecificTotals.wpTotalmalePaid += wpMalePaid;
        moduleSpecificTotals.wpTotalmalePending += wpMalePending;
        moduleSpecificTotals.wpTotalfemalePaid += wpFemalePaid;
        moduleSpecificTotals.wpTotalfemalePending += wpFemalePending;
      });
    });

    return { ...card, ...totals, ...moduleSpecificTotals };
  }, [card, transactionData, data.municipalities, data.province]);





const regionMap: Record<string, string> = {
  R1: "region1",
  R2: "region2",
  R3: "region3",
  R4A: "region4a",
  R4B: "region4b",
  R5: "region5",
  R6: "region6",
  R7: "region7",
  R8: "region8",
  R9: "region9",
  R10: "region10",
  R11: "region11",
  R12: "region12",
  R13: "region13",
  CAR: "CAR",
  "BARMM I": "BARMM1",
  "BARMM II": "BARMM2",
};

function mapRegion(region: string): string {
  if (!region) return ''; // Handle undefined/null/empty regions
  return regionMap[region] || region.toLowerCase().replace(/\s+/g, '');
}


function getWP() {
    // Cancel previous request if exists
    if (wpControllerRef.current) {
      wpControllerRef.current.abort();
    }
    
    // Create new controller
    wpControllerRef.current = new AbortController();

    // Fetch both 2024 and 2025 data
    return Promise.all([
      axios.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/WP UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: wpControllerRef.current.signal
      }),
      axios.get('1Po3nyGoTmJ2OLRuYF1GBdfasLfaccRrumaoqIwoF6C0/values/WP UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: wpControllerRef.current.signal
      })
    ]).then((responses) => {
      const combinedGroupedByMonth: Record<string, Record<string, any>> = {};

      // Process both datasets
      responses.forEach((response) => {
        const data = response.data.values;
        const records = data.slice(3);

        // Map column indexes for easier maintenance
        const idx = {
          period: 1,
          lgu:4,
          name:13,
          province:14,
          dictRo: 18, // Use dictRo as region
          status: 10, // e.g. "Operational", "Developmental", "Training", "Withdraw"
        };

        // Group by period and dictRo, and sum statuses
        records.forEach((row: any) => {
          const period = row[idx.period];
          const lgu = row[idx.lgu];
          const region = mapRegion(row[idx.dictRo]);
          const name = row[idx.name];
          const province = row[idx.province];
          const status = (row[idx.status] || '').toLowerCase();

          if (!period || !lgu || !region) return; // Skip invalid entries

          if (!combinedGroupedByMonth[period]) combinedGroupedByMonth[period] = {};
          if (!combinedGroupedByMonth[period][lgu]) {
            combinedGroupedByMonth[period][lgu] = {
              lgu,
              period,
              region,
              name,
              province,
              operational: 0,
              developmental: 0,
              withdraw: 0,
            };
          }

          // Aggregate data from both years for the same period and LGU
          if (status.includes('operational')) combinedGroupedByMonth[period][lgu].operational += 1;
          else if (status.includes('developmental')) combinedGroupedByMonth[period][lgu].developmental += 1;
          else if (status.includes('withdraw')) combinedGroupedByMonth[period][lgu].withdraw += 1;
        });
      });

      // Format result with only essential data to reduce storage size
      const WP = Object.entries(combinedGroupedByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, lgus]) => ({
          date,
          data: Object.values(lgus).map((item: any) => ({
            lgu: item.lgu,
            region: item.region,
            province: item.province,
            operational: item.operational,
            developmental: item.developmental,
            withdraw: item.withdraw,
          })),
        }));

      const result = { WP };

     

      dispatch(setWp({
        ...wp,
        WP: result.WP,
      }));
      
    }).catch((error) => {
      if (error.name !== 'AbortError') { // Don't log aborted requests
        console.error("Error fetching WP data:", error);
      }
    });
  }


function getBRGY() {
    // Cancel previous request if exists
    if (brgyControllerRef.current) {
      brgyControllerRef.current.abort();
    }
    
    // Create new controller
    brgyControllerRef.current = new AbortController();

    // Fetch both 2024 and 2025 data
    return Promise.all([
      axios.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/BC UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: brgyControllerRef.current.signal
      }),
      axios.get('1Po3nyGoTmJ2OLRuYF1GBdfasLfaccRrumaoqIwoF6C0/values/BC UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: brgyControllerRef.current.signal
      })
    ]).then((responses) => {
      const combinedGroupedByMonth: Record<string, Record<string, any>> = {};

      // Process both datasets
      responses.forEach((response) => {
        const data = response.data.values;
        const records = data.slice(3);

        // Map column indexes for easier maintenance
        const idx = {
          period: 1,
          lgu:4,
          name:13,
          province:14,
          dictRo: 18, // Use dictRo as region
          status: 10, // e.g. "Operational", "Developmental", "Training", "Withdraw"
        };

        // Group by period and dictRo, and sum statuses
        records.forEach((row: any) => {
          const period = row[idx.period];
          const lgu = row[idx.lgu];
          const region = mapRegion(row[idx.dictRo]);
          const name = row[idx.name];
          const province = row[idx.province];
          const status = (row[idx.status] || '').toLowerCase();

          if (!period || !lgu || !region) return; // Skip invalid entries

          if (!combinedGroupedByMonth[period]) combinedGroupedByMonth[period] = {};
          if (!combinedGroupedByMonth[period][lgu]) {
            combinedGroupedByMonth[period][lgu] = {
              lgu,
              period,
              region,
              name,
              province,
              operational: 0,
              developmental: 0,
              withdraw: 0,
            };
          }

          // Aggregate data from both years for the same period and LGU
          if (status.includes('operational')) combinedGroupedByMonth[period][lgu].operational += 1;
          else if (status.includes('developmental')) combinedGroupedByMonth[period][lgu].developmental += 1;
          else if (status.includes('withdraw')) combinedGroupedByMonth[period][lgu].withdraw += 1;
        });
      });

      // Format result with only essential data to reduce storage size
      const BRGY = Object.entries(combinedGroupedByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, lgus]) => ({
          date,
          data: Object.values(lgus).map((item: any) => ({
            lgu: item.lgu,
            region: item.region,
            province: item.province,
            operational: item.operational,
            developmental: item.developmental,
            withdraw: item.withdraw,
          })),
        }));

      const result = { BRGY };

      

      dispatch(setBrgy({
        ...brgy,
        BRGY: result.BRGY,
      }));
      
    }).catch((error) => {
      if (error.name !== 'AbortError') { // Don't log aborted requests
        console.error("Error fetching BRGY data:", error);
      }
    });
  }


function getBPLS() {
    // Cancel previous request if exists
    if (bpControllerRef.current) {
      bpControllerRef.current.abort();
    }
    
    // Create new controller
    bpControllerRef.current = new AbortController();

    
    // Fetch both 2024 and 2025 data
    return Promise.all([
      axios.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/BP1 UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: bpControllerRef.current.signal
      }),
      axios.get('1Po3nyGoTmJ2OLRuYF1GBdfasLfaccRrumaoqIwoF6C0/values/BP1 UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: bpControllerRef.current.signal
      })
    ]).then((responses) => {
      const combinedGroupedByMonth: Record<string, Record<string, any>> = {};

      // Process both datasets
      responses.forEach((response) => {
        const data = response.data.values;
        const records = data.slice(3);

        // Map column indexes for easier maintenance
        const idx = {
          period: 1,
          lgu:4,
          name:13,
          province:14,
          dictRo: 19, // Use dictRo as region
          status: 10, // e.g. "Operational", "Developmental", "Training", "Withdraw"
        };

        // Group by period and dictRo, and sum statuses
        records.forEach((row: any) => {
          const period = row[idx.period];
          const lgu = row[idx.lgu];
          const region = mapRegion(row[idx.dictRo]);
          const name = row[idx.name];
          const province = row[idx.province];
          const status = (row[idx.status] || '').toLowerCase();

          if (!period || !lgu || !region) return; // Skip invalid entries

          if (!combinedGroupedByMonth[period]) combinedGroupedByMonth[period] = {};
          if (!combinedGroupedByMonth[period][lgu]) {
            combinedGroupedByMonth[period][lgu] = {
              lgu,
              period,
              region,
              name,
              province,
              operational: 0,
              developmental: 0,
              withdraw: 0,
            };
          }

          // Aggregate data from both years for the same period and LGU
          if (status.includes('operational')) combinedGroupedByMonth[period][lgu].operational += 1;
          else if (status.includes('developmental')) combinedGroupedByMonth[period][lgu].developmental += 1;
          else if (status.includes('withdraw')) combinedGroupedByMonth[period][lgu].withdraw += 1;
        });
      });

      // Format result with only essential data to reduce storage size
      const BP = Object.entries(combinedGroupedByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, lgus]) => ({
          date,
          data: Object.values(lgus).map((item: any) => ({
            lgu: item.lgu,
            region: item.region,
            province: item.province,
            operational: item.operational,
            developmental: item.developmental,
            withdraw: item.withdraw,
          })),
        }));

      const result = { BP };

     

      dispatch(setStatus({
        BP: result.BP,
      }));
      
    }).catch((error) => {
      if (error.name !== 'AbortError') { // Don't log aborted requests
        console.error("Error fetching BP data:", error);
      }
    });
  }


function getBPCO(){
  // Cancel previous request if exists
  if (bpcoControllerRef.current) {
    bpcoControllerRef.current.abort();
  }
  
  // Create new controller
  bpcoControllerRef.current = new AbortController();

  // Fetch both 2024 and 2025 data
  return Promise.all([
    axios.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/BPCO UR Input', {
      headers: {
        Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
      },
      signal: bpcoControllerRef.current.signal
    }),
    axios.get('1Po3nyGoTmJ2OLRuYF1GBdfasLfaccRrumaoqIwoF6C0/values/BPCO UR Input', {
      headers: {
        Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
      },
      signal: bpcoControllerRef.current.signal
    })
  ]).then((responses) => {
    const combinedGroupedByMonth: Record<string, Record<string, any>> = {};

    // Process both datasets
    responses.forEach((response) => {
      const data = response.data.values;
      const records = data.slice(3);

      // Map column indexes for easier maintenance
      const idx = {
        period: 1,
        lgu:4,
        name:13,
        province:14,
        dictRo: 18, // Use dictRo as region
        status: 10, // e.g. "Operational", "Developmental", "Training", "Withdraw"
      };

      // Group by period and dictRo, and sum statuses
      records.forEach((row: any) => {
        const period = row[idx.period];
        const lgu = row[idx.lgu];
        const region = mapRegion(row[idx.dictRo]);
        const name = row[idx.name];
        const province = row[idx.province];
        const status = (row[idx.status] || '').toLowerCase();

        if (!period || !lgu || !region) return; // Skip invalid entries

        if (!combinedGroupedByMonth[period]) combinedGroupedByMonth[period] = {};
        if (!combinedGroupedByMonth[period][lgu]) {
          combinedGroupedByMonth[period][lgu] = {
            lgu,
            period,
            region,
            name,
            province,
            operational: 0,
            developmental: 0,
            withdraw: 0,
          };
        }

        // Aggregate data from both years for the same period and LGU
        if (status.includes('operational')) combinedGroupedByMonth[period][lgu].operational += 1;
        else if (status.includes('developmental')) combinedGroupedByMonth[period][lgu].developmental += 1;
        else if (status.includes('withdraw')) combinedGroupedByMonth[period][lgu].withdraw += 1;
      });
    });

    // Format result with only essential data to reduce storage size
    const BPCO = Object.entries(combinedGroupedByMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, lgus]) => ({
        date,
        data: Object.values(lgus).map((item: any) => ({
          lgu: item.lgu,
          region: item.region,
          province: item.province,
          operational: item.operational,
          developmental: item.developmental,
          withdraw: item.withdraw,
        })),
      }));

    const result = { BPCO };

 

    dispatch(setStatus({
      BPCO: result.BPCO,
    }));
    
   
  }).catch((error) => {
    if (error.name !== 'AbortError') { // Don't log aborted requests
      console.error("Error fetching BPCO data:", error);
    }
  });
}



  // function getBPBC(){

  //  axios.get( `${import.meta.env.VITE_URL}/api/bc/`,).then((response)=>{

  //     console.log("BPBC response", response.data);
  //   })
      
  // }


   // if (data.modules?.includes("Business Permit")) {
    //   // console.log("Business Permit module is enabled");
    //   getBPLS();
    // }

    // if (data.modules?.includes("Working Permit") ) {
    //   // console.log("Working Permit module is enabled");
    //   getWP();
    // }
    // if (data.modules?.includes("Barangay Clearance")) {
    //   // console.log("Barangay Clearance module is enabled");
    //   getBRGY();
    // }
    // if (data.modules?.includes("Building Permit & Certificate of Occupancy")) {
    //   // console.log("Building Permit & Certificate of Occupancy module is enabled");
    //   getBPCO();
    // }
    

useEffect(() => {
    // Sequential loading with delay to optimize resource usage
    const loadModulesSequentially = async () => {
      // Set loading to true at the start
      dispatch(setLoad2(true));
      
      // Small delay to prevent overwhelming the system
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      
      try {
        await getBPLS();
        await delay(500); // 500ms delay after BPLS
        
        await getWP();
        await delay(500); // 500ms delay after WP
        
        await getBRGY();
        await delay(500); // 500ms delay after BRGY
        
        await getBPCO();
      } catch (error) {
        console.error("Error in sequential loading:", error);
      } finally {
        // Always set loading to false at the end
        dispatch(setLoad2(false));
      }
    };

    loadModulesSequentially();
  }, []);


function formatList(arr:any) {
  if (arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  if (arr.length === 2) return arr.join(" and ");
  
  return arr.slice(0, -1).join(", ") + ", and " + arr[arr.length - 1];
}
  return (
    <div className="p-6 sm:p-2 md:p-4 max-w-[1200px] mx-auto  bg-background ">
      <FilterSection />
      
      {/* Module Filter Section */}
  
      
      {/* Loading indicator for dashboard */}
    {/* LGU Status Statistics */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-4 text-foreground">LGU Status Statistics</h3>
        <div className="grid grid-cols-3 lg:grid-cols-2 sm:grid-cols-1 gap-4">
          <StatisticCard2 
            title="No. of LGU Operational"
            value={totalOperational}
            showInfo={`Total of Operational Status on ${formatList(data?.modules)} as of ${data.startDate} - ${data.endDate}`}
          />
          <StatisticCard2 
            title="No. of LGU Developmental"
            value={totalDevelopmental}
            showInfo={`Total of Developmental Status on ${formatList(data?.modules)}  as of ${data.startDate} - ${data.endDate}`}
          />
          <StatisticCard2
            title="No. of LGU Withdraw"
            value={totalWithdraw}
            showInfo={`Total of Withdraw Status on ${formatList(data?.modules)}  as of ${data.startDate} - ${data.endDate}`}
          />
        </div>
      </div>
      
      {/* Transaction Statistics Section */}
      <div className="mb-6">
       
          
          <ModuleFilter 
            filterType="card" 
          />
    
        
        <div className="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1 gap-4">
          <StatisticCard 
            title="No. of Transaction"
          value={
            (filteredCard?.totalnewPending ?? 0) +
            (filteredCard?.totalnewPaid ?? 0) +
            (filteredCard?.totalrenewPending ?? 0) +
            (filteredCard?.totalrenewPaid ?? 0) 
          }
          bpValue={
            (filteredCard?.bpTotalnewPending ?? 0) +
            (filteredCard?.bpTotalnewPaid ?? 0) +
            (filteredCard?.bpTotalrenewPending ?? 0) +
            (filteredCard?.bpTotalrenewPaid ?? 0)
          }
          wpValue={
            (filteredCard?.wpTotalnewPending ?? 0) +
            (filteredCard?.wpTotalnewPaid ?? 0) +
            (filteredCard?.wpTotalrenewPending ?? 0) +
            (filteredCard?.wpTotalrenewPaid ?? 0)
          }
          showInfo={`total no. of transaction on ${formatList(data?.modules)} as of ${data.startDate} - ${data.endDate}`}
          />
          <StatisticCard 
            title="No. of Male"
            value={(filteredCard?.totalmalePaid ?? 0) + (filteredCard?.totalmalePending ?? 0)}
            bpValue={(filteredCard?.bpTotalmalePaid ?? 0) + (filteredCard?.bpTotalmalePending ?? 0)}
            wpValue={(filteredCard?.wpTotalmalePaid ?? 0) + (filteredCard?.wpTotalmalePending ?? 0)}
            showInfo={`total no. of male applicants on ${formatList(data?.modules)} as of ${data.startDate} - ${data.endDate}`}
          />
          <StatisticCard 
            title="No. of Female"
            value={(filteredCard?.totalfemalePaid ?? 0) + (filteredCard?.totalfemalePending ?? 0)}
            bpValue={(filteredCard?.bpTotalfemalePaid ?? 0) + (filteredCard?.bpTotalfemalePending ?? 0)}
            wpValue={(filteredCard?.wpTotalfemalePaid ?? 0) + (filteredCard?.wpTotalfemalePending ?? 0)}
            showInfo={`total no. of female applicants on ${formatList(data?.modules)} as of ${data.startDate} - ${data.endDate}`}
          />
          <StatisticCard 
            title="No. of eGovPay"
            value={(filteredCard?.totalrenewPaidViaEgov ?? 0) + (filteredCard?.totalnewPaidViaEgov ?? 0)}
            bpValue={(filteredCard?.bpTotalrenewPaidViaEgov ?? 0) + (filteredCard?.bpTotalnewPaidViaEgov ?? 0)}
            wpValue={(filteredCard?.wpTotalrenewPaidViaEgov ?? 0) + (filteredCard?.wpTotalnewPaidViaEgov ?? 0)}
            showInfo={`total no. of eGovPay transactions on ${formatList(data?.modules)} as of ${data.startDate} - ${data.endDate}`}
          />
          <StatisticCard 
            title="Non-Binary"
            value={
              ((filteredCard?.totalnewPending ?? 0) + (filteredCard?.totalnewPaid ?? 0) + (filteredCard?.totalrenewPending ?? 0) + (filteredCard?.totalrenewPaid ?? 0))
              - (((filteredCard?.totalmalePaid ?? 0) + (filteredCard?.totalmalePending ?? 0)) + ((filteredCard?.totalfemalePaid ?? 0) + (filteredCard?.totalfemalePending ?? 0))) < 0 ? 0 :((filteredCard?.totalnewPending ?? 0) + (filteredCard?.totalnewPaid ?? 0) + (filteredCard?.totalrenewPending ?? 0) + (filteredCard?.totalrenewPaid ?? 0))
              - (((filteredCard?.totalmalePaid ?? 0) + (filteredCard?.totalmalePending ?? 0)) + ((filteredCard?.totalfemalePaid ?? 0) + (filteredCard?.totalfemalePending ?? 0)))
            }
            bpValue={
              ((filteredCard?.bpTotalnewPending ?? 0) + (filteredCard?.bpTotalnewPaid ?? 0) + (filteredCard?.bpTotalrenewPending ?? 0) + (filteredCard?.bpTotalrenewPaid ?? 0))
              - (((filteredCard?.bpTotalmalePaid ?? 0) + (filteredCard?.bpTotalmalePending ?? 0)) + ((filteredCard?.bpTotalfemalePaid ?? 0) + (filteredCard?.bpTotalfemalePending ?? 0))) < 0 ? 0 : ((filteredCard?.bpTotalnewPending ?? 0) + (filteredCard?.bpTotalnewPaid ?? 0) + (filteredCard?.bpTotalrenewPending ?? 0) + (filteredCard?.bpTotalrenewPaid ?? 0))
              - (((filteredCard?.bpTotalmalePaid ?? 0) + (filteredCard?.bpTotalmalePending ?? 0)) + ((filteredCard?.bpTotalfemalePaid ?? 0) + (filteredCard?.bpTotalfemalePending ?? 0)))
            }
            wpValue={
              ((filteredCard?.wpTotalnewPending ?? 0) + (filteredCard?.wpTotalnewPaid ?? 0) + (filteredCard?.wpTotalrenewPending ?? 0) + (filteredCard?.wpTotalrenewPaid ?? 0))
              - (((filteredCard?.wpTotalmalePaid ?? 0) + (filteredCard?.wpTotalmalePending ?? 0)) + ((filteredCard?.wpTotalfemalePaid ?? 0) + (filteredCard?.wpTotalfemalePending ?? 0))) < 0 ? 0 : ((filteredCard?.wpTotalnewPending ?? 0) + (filteredCard?.wpTotalnewPaid ?? 0) + (filteredCard?.wpTotalrenewPending ?? 0) + (filteredCard?.wpTotalrenewPaid ?? 0))
              - (((filteredCard?.wpTotalmalePaid ?? 0) + (filteredCard?.wpTotalmalePending ?? 0)) + ((filteredCard?.wpTotalfemalePaid ?? 0) + (filteredCard?.wpTotalfemalePending ?? 0)))
            }
            showInfo={`calculated non-binary applicants on ${formatList(data?.modules)} as of ${data.startDate} - ${data.endDate}`}
          />
        </div>
      </div>

    

      {/* Non-Binary Statistics - Separate section for special calculation */}
     
      
      {/* Charts */}

     
      {/* Combined Status Chart for all modules */}
      {(data.modules?.includes("Business Permit") || 
        data.modules?.includes("Working Permit") || 
        data.modules?.includes("Barangay Clearance") ||
        data.modules?.includes("Building Permit & Certificate of Occupancy")) && (
        <StatusChartComponent 
          data={[]} // Not used anymore
          raw={null} // Not used anymore
          bpData={bpChartData?.current || []}
          wpData={wpChartData?.current || []}
          brgyData={brgyChartData?.current || []}
          bpcoData={bpcoChartData?.current || []}
          bpRaw={bpChartData?.breakdown || []}
          wpRaw={wpChartData?.breakdown || []}
          brgyRaw={brgyChartData?.breakdown || []}
          bpcoRaw={bpcoChartData?.breakdown || []}
          modules={data.modules || []}
          title="Operational vs. Developmental vs. Withdrawal (All Modules)"
          period={`${data.startDate} - ${data.endDate}`}
          loading={loading}
        />
      )}



      {/* Charts Section */}
      <div className="mb-6">
  
          <ModuleFilter 
            title="Chart Analytics" 
            filterType="chart" 
            className=""
          />
     
        
        <div className="space-y-6">
          <TransactionChart
            data={chartData3}
            title="NUMBER OF TRANSACTION PER REGION FOR RENEW APPLICATION"
            period={`${data.startDate} - ${data.endDate}`}
          />
          <TransactionChart2
            data={chartData}
            title="NUMBER OF TRANSACTION PER REGION AND GENDER"
            period={`${data.startDate} - ${data.endDate}`}
          />
        </div>
      </div>
    
    </div>
  );
};

export default DashboardPage;
import { useMemo, useEffect, useState, useRef } from 'react';
import FilterSection from './components/FilterSection';
import ModuleFilter from './components/ModuleFilter';
import StatisticCard from './components/StatisticCard';
import axios from './../../../plugin/axios';


import TransactionChart from './components/TransChartComponent';
import { selectCard } from '@/redux/cardSlice';
import { selectTransaction } from '@/redux/transactionSlice';
import { useSelector } from 'react-redux';
import { selectData } from '@/redux/dataSlice';

import TransactionChart2 from './components/TransChartComponent2';
import StatusChartComponent from './components/StatusChartComponent';
import ComparisonChartComponent from './components/ComparisonChartComponent';
import StatisticCard2 from './components/StatisticCard2';
import TrendLineChart from './components/TrendLineChart';



// Maps Redux locationName short codes → breakdown display names used by the detail API
const LOCATION_TO_DISPLAY: Record<string, string> = {
  'I': 'Region 1', 'II': 'Region 2', 'III': 'Region 3',
  'IV-A': 'Region 4A', 'IV-B': 'MIMAROPA', 'V': 'Region 5',
  'VI': 'Region 6', 'VII': 'Region 7', 'VIII': 'Region 8',
  'IX': 'Region 9', 'X': 'Region 10', 'XI': 'Region 11',
  'XII': 'Region 12', 'XIII': 'Region 13',
  'CAR': 'CAR', 'NCR': 'NCR', 'NIR': 'NIR',
  'BARMM I': 'BARMM', 'BARMM II': 'BARMM',
};

const DashboardPage = () => {
  const card = useSelector(selectCard);
  const data = useSelector(selectData);
  const transactionData:any = useSelector(selectTransaction);

  const backendUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_URL || '').replace(/\/$/, '');

  const [apiChartData, setApiChartData] = useState<Record<string, { current: any[]; breakdown: any[] }>>({});
  const [apiEpaymentCounts, setApiEpaymentCounts] = useState<{ epayment: number; egovpay_v1: number; egovpay_v2: number; by_region: any[] }>({ epayment: 0, egovpay_v1: 0, egovpay_v2: 0, by_region: [] });
  const [chartLoading, setChartLoading] = useState(false);

  // Keep a ref so the event handler always reads the latest filter values
  const dataRef = useRef(data);
  useEffect(() => { dataRef.current = data; }, [data]);

  // Client-side region filter applied to raw API data — reacts to region selection without an API call
  const filteredChartData = useMemo(() => {
    const locations: string[] = Array.isArray(data?.locationName) ? data.locationName : [];
    const displayNames = new Set<string>(locations.map((loc: string) => LOCATION_TO_DISPLAY[loc] ?? loc));

    const filterCurrent = (current: any[]) =>
      displayNames.size === 0 ? current : (current || []).filter((item: any) => displayNames.has(item.name));
    const filterBreakdown = (breakdown: any[]) =>
      displayNames.size === 0
        ? breakdown
        : (breakdown || []).map((period: any) => ({
            ...period,
            data: (period.data || []).filter((item: any) => displayNames.has(item.name)),
          }));

    const result: Record<string, { current: any[]; breakdown: any[] }> = {};
    for (const [code, moduleData] of Object.entries(apiChartData)) {
      result[code] = {
        current:   filterCurrent(moduleData.current),
        breakdown: filterBreakdown(moduleData.breakdown),
      };
    }
    return result;
  }, [apiChartData, data.locationName]);

  // Derive LGU status counts from filtered detail data — updates on module or region changes
  const apiUstatus = useMemo((): { operational: number; developmental: number; withdraw: number } => {
    const zero = { operational: 0, developmental: 0, withdraw: 0 };
    if (!data.modules || data.modules.length === 0 || Object.keys(filteredChartData).length === 0) return zero;

    const sumCurrent = (current: any[] | undefined) =>
      (current || []).reduce(
        (acc: any, item: any) => ({
          operational:   acc.operational   + (Number(item.operational)   || 0),
          developmental: acc.developmental + (Number(item.developmental) || 0),
          withdraw:      acc.withdraw      + (Number(item.withdraw)      || 0),
        }),
        { operational: 0, developmental: 0, withdraw: 0 },
      );

    const totals = { ...zero };
    const add = (s: typeof zero) => {
      totals.operational   += s.operational;
      totals.developmental += s.developmental;
      totals.withdraw      += s.withdraw;
    };

    if (data.modules.includes('Business Permit'))    add(sumCurrent(filteredChartData['BP1']?.current));
    if (data.modules.includes('Working Permit'))     add(sumCurrent(filteredChartData['WP']?.current));
    if (data.modules.includes('Barangay Clearance')) add(sumCurrent(filteredChartData['BC']?.current));
    // BPCO and Building Permit share the same backend code — count once only
    const bpcoSel = data.modules.includes('Certificate of Occupancy');
    const bpbpSel = data.modules.includes('Building Permit');
    if (bpcoSel || bpbpSel) add(sumCurrent(filteredChartData['BPCO']?.current));

    return totals;
  }, [filteredChartData, data.modules]);

  const filteredEpaymentCounts = useMemo(() => {
    const locations: string[] = Array.isArray(data?.locationName) ? data.locationName : [];
    const displayNames = new Set<string>(locations.map((loc: string) => LOCATION_TO_DISPLAY[loc] ?? loc));
    if (displayNames.size === 0 || apiEpaymentCounts.by_region.length === 0) {
      return { epayment: apiEpaymentCounts.epayment, egovpay_v1: apiEpaymentCounts.egovpay_v1, egovpay_v2: apiEpaymentCounts.egovpay_v2 };
    }
    const matched = apiEpaymentCounts.by_region.filter((r: any) => displayNames.has(r.name));
    return {
      epayment:   matched.reduce((s: number, r: any) => s + (r.epayment   || 0), 0),
      egovpay_v1: matched.reduce((s: number, r: any) => s + (r.egovpay_v1 || 0), 0),
      egovpay_v2: matched.reduce((s: number, r: any) => s + (r.egovpay_v2 || 0), 0),
    };
  }, [apiEpaymentCounts, data.locationName]);

  // Fetch both summary and detail. Runs once on mount and again whenever the
  // Run button is clicked. Module-only changes are handled client-side via the
  // apiUstatus memo above — no extra API call needed for those.
  useEffect(() => {
    const toYearMonth = (iso: string) => iso?.slice(0, 7) ?? '';

    const fetchAll = () => {
      const d = dataRef.current;
      const startPeriod = toYearMonth(d.startDate);
      const endPeriod   = toYearMonth(d.endDate);

      // Fetch all modules so any module combination can be filtered client-side
      const regions   = Array.isArray(d.real) ? d.real : d.real ? [d.real] : [];
      const provinces = (d.province      || []).map((p: any) => p.value);
      const lgus      = (d.municipalities || []).map((m: any) => m.value);
      const groupBy   = lgus.length > 0 ? 'lgu' : provinces.length > 0 ? 'province' : 'region';

      setChartLoading(true);
      axios
        .post(`${backendUrl}/api/v1/elgu/ustatus-detail/`, {
          modules:      ['Business Permit', 'Working Permit', 'Barangay Clearance', 'Certificate of Occupancy', 'Building Permit'],
          start_period: startPeriod || undefined,
          end_period:   endPeriod   || undefined,
          group_by:     groupBy,
          regions:      regions.length   > 0 ? regions   : undefined,
          provinces:    provinces.length > 0 ? provinces : undefined,
          lgus:         lgus.length      > 0 ? lgus      : undefined,
        })
        .then((res) => {
          const raw = res.data ?? {};
          const ep = raw.epayment_counts ?? { epayment: 0, egovpay_v1: 0, egovpay_v2: 0 };
          setApiEpaymentCounts(ep);
          const { epayment_counts: _ep, ...chartOnly } = raw;
          setApiChartData(chartOnly);
        })
        .catch(() => { setApiChartData({}); setApiEpaymentCounts({ epayment: 0, egovpay_v1: 0, egovpay_v2: 0, by_region: [] }); })
        .finally(() => setChartLoading(false));
    };

    fetchAll(); // Initial load — no Run click required
    window.addEventListener('triggerFilterAPI', fetchAll);
    return () => window.removeEventListener('triggerFilterAPI', fetchAll);
  }, [backendUrl]);

  // Toggle states for visibility
  const [showStatisticCards, setShowStatisticCards] = useState(true);
  const [showStatusChart, setShowStatusChart] = useState(true);
  const [showComparisonChart, setShowComparisonChart] = useState(true);
  const [showTransactionAnalyticsByRegion, setShowTransactionAnalyticsByRegion] = useState(true);
  const [showTransactionAnalyticsByGender, setShowTransactionAnalyticsByGender] = useState(true);
  const [showTrendLineChart, setShowTrendLineChart] = useState(true);

  



  



  // Enhanced filter and group logic
  const filterAndGroupResults = (results: any[], municipalities: any[], provinces: any[], regions: any[] = []) => {
    // 1. If municipalities is not blank, filter by selected municipalities (1 by 1)
    
    if (municipalities && municipalities?.length > 0) {
      const selected = municipalities.map((m: any) => m.value);
      return results.filter((lgu: any) => selected.includes(lgu.lgu));
    }
    // 2. If provinces is not blank, group by province
    if (provinces && provinces?.length > 0) {
      const selectedProvinces = provinces.map((p: any) => p.value);
      const grouped: { [province: string]: any } = {};
      results.forEach((lgu: any) => {
        // Extract province from lgu.lgu (e.g., "Aloran, Misamis Occidental" → "Misamis Occidental")
        const parts = lgu.lgu.split(',');
        const province = parts?.length > 1 ? parts[1].trim() : '';
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
    // 3. If regions are selected, filter by selected regions
    if (regions && regions?.length > 0) {
      const userRegions: string[] = Array.isArray(regions) ? regions : [regions];
      const hasNIR = userRegions.includes('NIR');
      const NIR_PROVINCES = ['Negros Occidental', 'Negros Oriental', 'Siquijor'];

      const getProvince = (lgu: any): string => {
        const parts = lgu.lgu.split(',');
        return parts.length > 1 ? parts[1].trim() : '';
      };
      const isNIRProvince = (lgu: any) => NIR_PROVINCES.includes(getProvince(lgu));

      // Expand NIR → region6+region7 to match actual LGU region values in the data
      const backendRegions = hasNIR
        ? [...userRegions.filter(r => r !== 'NIR'), 'region6', 'region7']
        : userRegions;

      const filteredResults = results.filter((lgu: any) => {
        if (!backendRegions.includes(lgu.region)) return false;
        if (isNIRProvince(lgu)) return hasNIR; // NIR provinces only shown when NIR is selected
        return userRegions.includes(lgu.region); // non-NIR LGUs only shown when their region is explicitly selected
      });

      const grouped: { [key: string]: any } = {};
      filteredResults.forEach((lgu: any) => {
        const key = (hasNIR && isNIRProvince(lgu)) ? 'NIR' : lgu.region;
        if (!grouped[key]) {
          grouped[key] = { lgu: key, region: key, monthlyResults: [] };
        }
        lgu.monthlyResults.forEach((m: any, idx: number) => {
          if (!grouped[key].monthlyResults[idx]) {
            grouped[key].monthlyResults[idx] = { ...m };
          } else {
            Object.keys(m).forEach(k => {
              if (typeof m[k] === 'number') {
                grouped[key].monthlyResults[idx][k] =
                  (grouped[key].monthlyResults[idx][k] ?? 0) + m[k];
              }
            });
          }
        });
      });
      return Object.values(grouped);
    }
    // 4. If blank, group by region and sum up the values
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



  const chartData = useMemo(() => {
    if (!transactionData || !transactionData.results) return [];
    // Filter or group results
    const filteredResults = filterAndGroupResults(
      transactionData.results,
      data.municipalities,
      data.province,
      data.real
    );

    return filteredResults.map((lgu: any) => {
      let paidMale = 0, paidFemale = 0, pendingMale = 0, pendingFemale = 0;
      let bpMalePaid = 0, bpFemalePaid = 0, bpMalePending = 0, bpFemalePending = 0;
      let wpMalePaid = 0, wpFemalePaid = 0, wpMalePending = 0, wpFemalePending = 0;
      let bpcoMalePaid = 0, bpcoFemalePaid = 0, bpcoMalePending = 0, bpcoFemalePending = 0;
      let bpbpMalePaid = 0, bpbpFemalePaid = 0, bpbpMalePending = 0, bpbpFemalePending = 0;
      let brgyMalePaid = 0, brgyFemalePaid = 0, brgyMalePending = 0, brgyFemalePending = 0;
      
      lgu.monthlyResults.forEach((m: any) => {
        // Module-specific totals
        bpMalePaid += m.bpMalePaid ?? 0;
        bpFemalePaid += m.bpFemalePaid ?? 0;
        bpMalePending += m.bpMalePending ?? 0;
        bpFemalePending += m.bpFemalePending ?? 0;
        
        wpMalePaid += m.wpMalePaid ?? 0;
        wpFemalePaid += m.wpFemalePaid ?? 0;
        wpMalePending += m.wpMalePending ?? 0;
        wpFemalePending += m.wpFemalePending ?? 0;

        bpcoMalePaid += m.bpcoMalePaid ?? 0;
        bpcoFemalePaid += m.bpcoFemalePaid ?? 0;
        bpcoMalePending += m.bpcoMalePending ?? 0;
        bpcoFemalePending += m.bpcoFemalePending ?? 0;

        bpbpMalePaid += m.bpbpMalePaid ?? 0;
        bpbpFemalePaid += m.bpbpFemalePaid ?? 0;
        bpbpMalePending += m.bpbpMalePending ?? 0;
        bpbpFemalePending += m.bpbpFemalePending ?? 0;

        // BRGY data only has totalCount, no gender breakdown
        brgyMalePaid += 0; // BRGY doesn't have gender data
        brgyFemalePaid += 0; // BRGY doesn't have gender data
        brgyMalePending += 0; // BRGY doesn't have gender data
        brgyFemalePending += 0; // BRGY doesn't have gender data

        // Combined totals - only include selected modules
        if (data.modules?.includes("Business Permit")) {
          paidMale += m.bpMalePaid ?? 0;
          paidFemale += m.bpFemalePaid ?? 0;
          pendingMale += m.bpMalePending ?? 0;
          pendingFemale += m.bpFemalePending ?? 0;
        }
        if (data.modules?.includes("Working Permit")) {
          paidMale += m.wpMalePaid ?? 0;
          paidFemale += m.wpFemalePaid ?? 0;
          pendingMale += m.wpMalePending ?? 0;
          pendingFemale += m.wpFemalePending ?? 0;
        }
        if (data.modules?.includes("Certificate of Occupancy")) {
          paidMale += m.bpcoMalePaid ?? 0;
          paidFemale += m.bpcoFemalePaid ?? 0;
          pendingMale += m.bpcoMalePending ?? 0;
          pendingFemale += m.bpcoFemalePending ?? 0;
        }
        if (data.modules?.includes("Building Permit")) {
          paidMale += m.bpbpMalePaid ?? 0;
          paidFemale += m.bpbpFemalePaid ?? 0;
          pendingMale += m.bpbpMalePending ?? 0;
          pendingFemale += m.bpbpFemalePending ?? 0;
        }
        if (data.modules?.includes("Barangay Clearance")) {
          // BRGY data doesn't have gender breakdown, so we don't add to paidMale/paidFemale
          // The totalCount from BRGY will be handled separately in the card calculations
          paidMale += 0; // BRGY doesn't have gender data
          paidFemale += 0; // BRGY doesn't have gender data
          pendingMale += 0; // BRGY doesn't have pending data
          pendingFemale += 0; // BRGY doesn't have pending data
        }
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
        bpcoMalePaid,
        bpcoFemalePaid,
        bpcoMalePending,
        bpcoFemalePending,
        bpbpMalePaid,
        bpbpFemalePaid,
        bpbpMalePending,
        bpbpFemalePending,
        brgyMalePaid,
        brgyFemalePaid,
        brgyMalePending,
        brgyFemalePending,
      };
    });
  }, [data, transactionData, data.modules]);

const chartData3 = useMemo(() => {
  if (!transactionData || !transactionData.results) return [];
  // Filter or group results
  const filteredResults = filterAndGroupResults(
    transactionData.results,
    data.municipalities,
    data.province,
    data.real
  );

  return filteredResults.map((lgu: any) => {
    let newPaid = 0, newPending = 0, newPaidViaEgov = 0, newPaidLinkBiz = 0;
    let renewPaid = 0, renewPending = 0, renewPaidViaEgov = 0, renewPaidLinkBiz = 0;
    let bpNewPaid = 0, bpNewPending = 0, bpNewPaidViaEgov = 0, bpNewPaidLinkBiz = 0;
    let bpRenewPaid = 0, bpRenewPending = 0, bpRenewPaidViaEgov = 0, bpRenewPaidLinkBiz = 0;
    let wpNewPaid = 0, wpNewPending = 0, wpNewPaidViaEgov = 0, wpNewPaidLinkBiz = 0;
    let wpRenewPaid = 0, wpRenewPending = 0, wpRenewPaidViaEgov = 0, wpRenewPaidLinkBiz = 0;
    let bpcoNewPaid = 0, bpcoNewPending = 0, bpcoNewPaidViaEgov = 0, bpcoNewPaidLinkBiz = 0;
    let bpcoRenewPaid = 0, bpcoRenewPending = 0, bpcoRenewPaidViaEgov = 0, bpcoRenewPaidLinkBiz = 0;
    let bpbpNewPaid = 0, bpbpNewPending = 0, bpbpNewPaidViaEgov = 0, bpbpNewPaidLinkBiz = 0;
    let bpbpRenewPaid = 0, bpbpRenewPending = 0, bpbpRenewPaidViaEgov = 0, bpbpRenewPaidLinkBiz = 0;
    let brgyNewPaid = 0, brgyNewPending = 0, brgyNewPaidViaEgov = 0, brgyNewPaidLinkBiz = 0;
    let brgyRenewPaid = 0, brgyRenewPending = 0, brgyRenewPaidViaEgov = 0, brgyRenewPaidLinkBiz = 0;
    
    lgu.monthlyResults.forEach((m: any) => {
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

      bpcoNewPaid += m.bpcoNewPaid ?? 0;
      bpcoNewPending += m.bpcoNewPending ?? 0;
      bpcoNewPaidViaEgov += m.bpcoNewPaidViaEgov ?? 0;
      bpcoNewPaidLinkBiz += m.bpcoNewPaidLinkBiz ?? 0;
      bpcoRenewPaid += m.bpcoRenewPaid ?? 0;
      bpcoRenewPending += m.bpcoRenewPending ?? 0;
      bpcoRenewPaidViaEgov += m.bpcoRenewPaidViaEgov ?? 0;
      bpcoRenewPaidLinkBiz += m.bpcoRenewPaidLinkBiz ?? 0;

      bpbpNewPaid += m.bpbpNewPaid ?? 0;
      bpbpNewPending += m.bpbpNewPending ?? 0;
      bpbpNewPaidViaEgov += m.bpbpNewPaidViaEgov ?? 0;
      bpbpNewPaidLinkBiz += m.bpbpNewPaidLinkBiz ?? 0;
      bpbpRenewPaid += m.bpbpRenewPaid ?? 0;
      bpbpRenewPending += m.bpbpRenewPending ?? 0;
      bpbpRenewPaidViaEgov += m.bpbpRenewPaidViaEgov ?? 0;
      bpbpRenewPaidLinkBiz += m.bpbpRenewPaidLinkBiz ?? 0;

      // BRGY data only has totalCount, map to newPaid
      brgyNewPaid += m.totalCount ?? 0; // Map totalCount to newPaid for BRGY
      brgyNewPending += 0; // BRGY doesn't have pending data
      brgyNewPaidViaEgov += 0; // BRGY doesn't have eGov data
      brgyNewPaidLinkBiz += 0; // BRGY doesn't have linkBiz data
      brgyRenewPaid += 0; // BRGY doesn't have renew data
      brgyRenewPending += 0; // BRGY doesn't have renew pending data
      brgyRenewPaidViaEgov += 0; // BRGY doesn't have renew eGov data
      brgyRenewPaidLinkBiz += 0; // BRGY doesn't have renew linkBiz data

      // Combined totals - only include selected modules
      if (data.modules?.includes("Business Permit")) {
        newPaid += m.bpNewPaid ?? 0;
        newPending += m.bpNewPending ?? 0;
        newPaidViaEgov += m.bpNewPaidViaEgov ?? 0;
        newPaidLinkBiz += m.bpNewPaidLinkBiz ?? 0;
        renewPaid += m.bpRenewPaid ?? 0;
        renewPending += m.bpRenewPending ?? 0;
        renewPaidViaEgov += m.bpRenewPaidViaEgov ?? 0;
        renewPaidLinkBiz += m.bpRenewPaidLinkBiz ?? 0;
      }
      if (data.modules?.includes("Working Permit")) {
        newPaid += m.wpNewPaid ?? 0;
        newPending += m.wpNewPending ?? 0;
        newPaidViaEgov += m.wpNewPaidViaEgov ?? 0;
        newPaidLinkBiz += m.wpNewPaidLinkBiz ?? 0;
        renewPaid += m.wpRenewPaid ?? 0;
        renewPending += m.wpRenewPending ?? 0;
        renewPaidViaEgov += m.wpRenewPaidViaEgov ?? 0;
        renewPaidLinkBiz += m.wpRenewPaidLinkBiz ?? 0;
      }
      if (data.modules?.includes("Certificate of Occupancy")) {
        newPaid += m.bpcoNewPaid ?? 0;
        newPending += m.bpcoNewPending ?? 0;
        newPaidViaEgov += m.bpcoNewPaidViaEgov ?? 0;
        newPaidLinkBiz += m.bpcoNewPaidLinkBiz ?? 0;
        renewPaid += m.bpcoRenewPaid ?? 0;
        renewPending += m.bpcoRenewPending ?? 0;
        renewPaidViaEgov += m.bpcoRenewPaidViaEgov ?? 0;
        renewPaidLinkBiz += m.bpcoRenewPaidLinkBiz ?? 0;
      }
      if (data.modules?.includes("Building Permit")) {
        newPaid += m.bpbpNewPaid ?? 0;
        newPending += m.bpbpNewPending ?? 0;
        newPaidViaEgov += m.bpbpNewPaidViaEgov ?? 0;
        newPaidLinkBiz += m.bpbpNewPaidLinkBiz ?? 0;
        renewPaid += m.bpbpRenewPaid ?? 0;
        renewPending += m.bpbpRenewPending ?? 0;
        renewPaidViaEgov += m.bpbpRenewPaidViaEgov ?? 0;
        renewPaidLinkBiz += m.bpbpRenewPaidLinkBiz ?? 0;
      }
      if (data.modules?.includes("Barangay Clearance")) {
        newPaid += m.totalCount ?? 0; // Map totalCount to newPaid for BRGY
        newPending += 0; // BRGY doesn't have pending data
        newPaidViaEgov += 0; // BRGY doesn't have eGov data
        newPaidLinkBiz += 0; // BRGY doesn't have linkBiz data
        renewPaid += 0; // BRGY doesn't have renew data
        renewPending += 0; // BRGY doesn't have renew pending data
        renewPaidViaEgov += 0; // BRGY doesn't have renew eGov data
        renewPaidLinkBiz += 0; // BRGY doesn't have renew linkBiz data
      }
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
      bpcoNewPaid,
      bpcoNewPending,
      bpcoNewPaidViaEgov,
      bpcoNewPaidLinkBiz,
      bpcoRenewPaid,
      bpcoRenewPending,
      bpcoRenewPaidViaEgov,
      bpcoRenewPaidLinkBiz,
      bpbpNewPaid,
      bpbpNewPending,
      bpbpNewPaidViaEgov,
      bpbpNewPaidLinkBiz,
      bpbpRenewPaid,
      bpbpRenewPending,
      bpbpRenewPaidViaEgov,
      bpbpRenewPaidLinkBiz,
      brgyNewPaid,
      brgyNewPending,
      brgyNewPaidViaEgov,
      brgyNewPaidLinkBiz,
      brgyRenewPaid,
      brgyRenewPending,
      brgyRenewPaidViaEgov,
      brgyRenewPaidLinkBiz,
    };
  });
}, [data, transactionData, data.modules]);


  // Filter card statistics by data.municipalities or data.province if present
  const filteredCard = useMemo(() => {
    if (!card || !transactionData?.results) return card;
    // If municipalities or province is selected, filter/group accordingly
    const filteredResults = filterAndGroupResults(
      transactionData.results,
      data.municipalities,
      data.province,
      data.real
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
      bpcoTotalnewPending: 0,
      bpcoTotalnewPaid: 0,
      bpcoTotalnewPaidViaEgov: 0,
      bpcoTotalrenewPending: 0,
      bpcoTotalrenewPaid: 0,
      bpcoTotalrenewPaidViaEgov: 0,
      bpcoTotalmalePaid: 0,
      bpcoTotalmalePending: 0,
      bpcoTotalfemalePaid: 0,
      bpcoTotalfemalePending: 0,
      bpbpTotalnewPending: 0,
      bpbpTotalnewPaid: 0,
      bpbpTotalnewPaidViaEgov: 0,
      bpbpTotalrenewPending: 0,
      bpbpTotalrenewPaid: 0,
      bpbpTotalrenewPaidViaEgov: 0,
      bpbpTotalmalePaid: 0,
      bpbpTotalmalePending: 0,
      bpbpTotalfemalePaid: 0,
      bpbpTotalfemalePending: 0,
      brgyTotalnewPending: 0,
      brgyTotalnewPaid: 0,
      brgyTotalnewPaidViaEgov: 0,
      brgyTotalrenewPending: 0,
      brgyTotalrenewPaid: 0,
      brgyTotalrenewPaidViaEgov: 0,
      brgyTotalmalePaid: 0,
      brgyTotalmalePending: 0,
      brgyTotalfemalePaid: 0,
      brgyTotalfemalePending: 0,
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

        const bpcoNewPending = m.bpcoNewPending ?? 0;
        const bpcoNewPaid = m.bpcoNewPaid ?? 0;
        const bpcoNewPaidViaEgov = m.bpcoNewPaidViaEgov ?? 0;
        const bpcoRenewPending = m.bpcoRenewPending ?? 0;
        const bpcoRenewPaid = m.bpcoRenewPaid ?? 0;
        const bpcoRenewPaidViaEgov = m.bpcoRenewPaidViaEgov ?? 0;
        const bpcoMalePending = m.bpcoMalePending ?? 0;
        const bpcoMalePaid = m.bpcoMalePaid ?? 0;
        const bpcoFemalePending = m.bpcoFemalePending ?? 0;
        const bpcoFemalePaid = m.bpcoFemalePaid ?? 0;

        const bpbpNewPending = m.bpbpNewPending ?? 0;
        const bpbpNewPaid = m.bpbpNewPaid ?? 0;
        const bpbpNewPaidViaEgov = m.bpbpNewPaidViaEgov ?? 0;
        const bpbpRenewPending = m.bpbpRenewPending ?? 0;
        const bpbpRenewPaid = m.bpbpRenewPaid ?? 0;
        const bpbpRenewPaidViaEgov = m.bpbpRenewPaidViaEgov ?? 0;
        const bpbpMalePending = m.bpbpMalePending ?? 0;
        const bpbpMalePaid = m.bpbpMalePaid ?? 0;
        const bpbpFemalePending = m.bpbpFemalePending ?? 0;
        const bpbpFemalePaid = m.bpbpFemalePaid ?? 0;

        const brgyNewPending = 0; // BRGY data doesn't have pending field
        const brgyNewPaid = m.totalCount ?? 0; // Map totalCount to newPaid for BRGY
        const brgyNewPaidViaEgov = 0; // BRGY data doesn't have eGov field
        const brgyRenewPending = 0; // BRGY data doesn't have renew pending field
        const brgyRenewPaid = 0; // BRGY data doesn't have renew paid field
        const brgyRenewPaidViaEgov = 0; // BRGY data doesn't have renew eGov field
        const brgyMalePending = 0; // BRGY data doesn't have gender breakdown
        const brgyMalePaid = 0; // BRGY data doesn't have gender breakdown
        const brgyFemalePending = 0; // BRGY data doesn't have gender breakdown
        const brgyFemalePaid = 0; // BRGY data doesn't have gender breakdown

        // Combined totals - only include selected modules
        if (data.modules?.includes("Business Permit")) {
          totals.totalnewPending += bpNewPending;
          totals.totalnewPaid += bpNewPaid;
          totals.totalnewPaidViaEgov += bpNewPaidViaEgov;
          totals.totalrenewPending += bpRenewPending;
          totals.totalrenewPaid += bpRenewPaid;
          totals.totalrenewPaidViaEgov += bpRenewPaidViaEgov;
          totals.totalmalePaid += bpMalePaid;
          totals.totalmalePending += bpMalePending;
          totals.totalfemalePaid += bpFemalePaid;
          totals.totalfemalePending += bpFemalePending;
        }
        if (data.modules?.includes("Working Permit")) {
          totals.totalnewPending += wpNewPending;
          totals.totalnewPaid += wpNewPaid;
          totals.totalnewPaidViaEgov += wpNewPaidViaEgov;
          totals.totalrenewPending += wpRenewPending;
          totals.totalrenewPaid += wpRenewPaid;
          totals.totalrenewPaidViaEgov += wpRenewPaidViaEgov;
          totals.totalmalePaid += wpMalePaid;
          totals.totalmalePending += wpMalePending;
          totals.totalfemalePaid += wpFemalePaid;
          totals.totalfemalePending += wpFemalePending;
        }
        if (data.modules?.includes("Certificate of Occupancy")) {
          totals.totalnewPending += bpcoNewPending;
          totals.totalnewPaid += bpcoNewPaid;
          totals.totalnewPaidViaEgov += bpcoNewPaidViaEgov;
          totals.totalrenewPending += bpcoRenewPending;
          totals.totalrenewPaid += bpcoRenewPaid;
          totals.totalrenewPaidViaEgov += bpcoRenewPaidViaEgov;
          totals.totalmalePaid += bpcoMalePaid;
          totals.totalmalePending += bpcoMalePending;
          totals.totalfemalePaid += bpcoFemalePaid;
          totals.totalfemalePending += bpcoFemalePending;
        }
        if (data.modules?.includes("Building Permit")) {
          totals.totalnewPending += bpbpNewPending;
          totals.totalnewPaid += bpbpNewPaid;
          totals.totalnewPaidViaEgov += bpbpNewPaidViaEgov;
          totals.totalrenewPending += bpbpRenewPending;
          totals.totalrenewPaid += bpbpRenewPaid;
          totals.totalrenewPaidViaEgov += bpbpRenewPaidViaEgov;
          totals.totalmalePaid += bpbpMalePaid;
          totals.totalmalePending += bpbpMalePending;
          totals.totalfemalePaid += bpbpFemalePaid;
          totals.totalfemalePending += bpbpFemalePending;
        }
        if (data.modules?.includes("Barangay Clearance")) {
          totals.totalnewPending += brgyNewPending;
          totals.totalnewPaid += brgyNewPaid;
          totals.totalnewPaidViaEgov += brgyNewPaidViaEgov;
          totals.totalrenewPending += brgyRenewPending;
          totals.totalrenewPaid += brgyRenewPaid;
          totals.totalrenewPaidViaEgov += brgyRenewPaidViaEgov;
          totals.totalmalePaid += brgyMalePaid;
          totals.totalmalePending += brgyMalePending;
          totals.totalfemalePaid += brgyFemalePaid;
          totals.totalfemalePending += brgyFemalePending;
        }

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

        moduleSpecificTotals.bpcoTotalnewPending += bpcoNewPending;
        moduleSpecificTotals.bpcoTotalnewPaid += bpcoNewPaid;
        moduleSpecificTotals.bpcoTotalnewPaidViaEgov += bpcoNewPaidViaEgov;
        moduleSpecificTotals.bpcoTotalrenewPending += bpcoRenewPending;
        moduleSpecificTotals.bpcoTotalrenewPaid += bpcoRenewPaid;
        moduleSpecificTotals.bpcoTotalrenewPaidViaEgov += bpcoRenewPaidViaEgov;
        moduleSpecificTotals.bpcoTotalmalePaid += bpcoMalePaid;
        moduleSpecificTotals.bpcoTotalmalePending += bpcoMalePending;
        moduleSpecificTotals.bpcoTotalfemalePaid += bpcoFemalePaid;
        moduleSpecificTotals.bpcoTotalfemalePending += bpcoFemalePending;

        moduleSpecificTotals.bpbpTotalnewPending += bpbpNewPending;
        moduleSpecificTotals.bpbpTotalnewPaid += bpbpNewPaid;
        moduleSpecificTotals.bpbpTotalnewPaidViaEgov += bpbpNewPaidViaEgov;
        moduleSpecificTotals.bpbpTotalrenewPending += bpbpRenewPending;
        moduleSpecificTotals.bpbpTotalrenewPaid += bpbpRenewPaid;
        moduleSpecificTotals.bpbpTotalrenewPaidViaEgov += bpbpRenewPaidViaEgov;
        moduleSpecificTotals.bpbpTotalmalePaid += bpbpMalePaid;
        moduleSpecificTotals.bpbpTotalmalePending += bpbpMalePending;
        moduleSpecificTotals.bpbpTotalfemalePaid += bpbpFemalePaid;
        moduleSpecificTotals.bpbpTotalfemalePending += bpbpFemalePending;

        moduleSpecificTotals.brgyTotalnewPending += brgyNewPending;
        moduleSpecificTotals.brgyTotalnewPaid += brgyNewPaid;
        moduleSpecificTotals.brgyTotalnewPaidViaEgov += brgyNewPaidViaEgov;
        moduleSpecificTotals.brgyTotalrenewPending += brgyRenewPending;
        moduleSpecificTotals.brgyTotalrenewPaid += brgyRenewPaid;
        moduleSpecificTotals.brgyTotalrenewPaidViaEgov += brgyRenewPaidViaEgov;
        moduleSpecificTotals.brgyTotalmalePaid += brgyMalePaid;
        moduleSpecificTotals.brgyTotalmalePending += brgyMalePending;
        moduleSpecificTotals.brgyTotalfemalePaid += brgyFemalePaid;
        moduleSpecificTotals.brgyTotalfemalePending += brgyFemalePending;
      });
    });

    return { ...card, ...totals, ...moduleSpecificTotals };
  }, [card, transactionData, data.municipalities, data.province, data.real, data.modules]);





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
    // if (data.modules?.includes("Building Permit","Certificate of Occupancy")) {
    //   // console.log("Building Permit & Certificate of Occupancy module is enabled");
    //   getBPCO();
    // }
    
useEffect(() => {
    // Sequential loading moved to Admin.tsx
  }, []);


function formatList(arr:any) {
  if (arr?.length === 0) return "";
  if (arr?.length === 1) return arr[0];
  if (arr?.length === 2) return arr.join(" and ");
  
  return arr.slice(0, -1).join(", ") + ", and " + arr[arr?.length - 1];
}

// Function to get selected card modules for display
function getSelectedCardModules(data: any) {
  const selectedModules = Array.isArray(data.selectedCardModuleFilter) ? data.selectedCardModuleFilter : [];
  if (selectedModules?.length === 0) {
    return data?.modules || []; // All modules
  }
  return selectedModules;
}

// Function to scroll to status chart section
const scrollToStatusChart = () => {
  const element = document.getElementById('status-chart-section');
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  }
};

  // "Certificate of Occupancy" and "Building Permit" share the same backend code (BPCO).
  // If both are selected, only pass the data to one prop to avoid double-counting.
  const bpcoSelected = data.modules?.includes('Certificate of Occupancy');
  const bpbpSelected = data.modules?.includes('Building Permit');
  const bpcoCurrent   = filteredChartData['BPCO']?.current   || [];
  const bpcoBreakdown = filteredChartData['BPCO']?.breakdown || [];
  // Give the data to bpco unless only Building Permit is selected (not Certificate of Occupancy)
  const bpcoDataProp     = bpcoSelected ? bpcoCurrent   : [];
  const bpcoRawProp      = bpcoSelected ? bpcoBreakdown : [];
  const bpbpDataProp     = bpbpSelected && !bpcoSelected ? bpcoCurrent   : [];
  const bpbpRawProp      = bpbpSelected && !bpcoSelected ? bpcoBreakdown : [];

  return (
    <div className="p-6 md:p-4 sm:p-3 max-w-[1200px] mx-auto bg-background min-w-0">
      <FilterSection />
      
      {/* Toggle Controls Section */}
      <div className="flex flex-wrap gap-2 items-center mb-6">
        {/* Statistic Cards Toggle */}
        <button
          onClick={() => setShowStatisticCards(!showStatisticCards)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            showStatisticCards
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
          }`}
        >
          {showStatisticCards ? '✓' : '○'} Statistics
        </button>

        {/* Status Chart Toggle */}
        <button
          onClick={() => setShowStatusChart(!showStatusChart)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            showStatusChart
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
          }`}
        >
          {showStatusChart ? '✓' : '○'} LGU Status
        </button>

        {/* Comparison Chart Toggle */}
        <button
          onClick={() => setShowComparisonChart(!showComparisonChart)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            showComparisonChart
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
          }`}
        >
          {showComparisonChart ? '✓' : '○'} Comparison
        </button>

        {/* Transaction by Region Toggle */}
        <button
          onClick={() => setShowTransactionAnalyticsByRegion(!showTransactionAnalyticsByRegion)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            showTransactionAnalyticsByRegion
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
          }`}
        >
          {showTransactionAnalyticsByRegion ? '✓' : '○'} Region Analysis
        </button>

        {/* Transaction by Gender Toggle */}
        <button
          onClick={() => setShowTransactionAnalyticsByGender(!showTransactionAnalyticsByGender)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            showTransactionAnalyticsByGender
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
          }`}
        >
          {showTransactionAnalyticsByGender ? '✓' : '○'} Gender Analysis
        </button>

        {/* Trend Line Chart Toggle */}
        <button
          onClick={() => setShowTrendLineChart(!showTrendLineChart)}
          className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
            showTrendLineChart
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'
          }`}
        >
          {showTrendLineChart ? '✓' : '○'} Trends
        </button>
      </div>
      
      {/* Module Filter Section */}
  
      
      {/* Loading indicator for dashboard */}
    {/* LGU Status Statistics */}
      {showStatisticCards && (
      <div className="mb-6">
      
        <div className="grid grid-cols-3 slg:grid-cols-2 md:grid-cols-1 gap-4">
          <StatisticCard2
            title="No. of LGU Operational"
            value={apiUstatus.operational}
            loading={chartLoading}
            showInfo={`Number of Local Government Units with Operational status for ${formatList(data?.modules)} within the period of ${data.startDate} to ${data.endDate}`}
            onClick={scrollToStatusChart}
          />
          <StatisticCard2
            title="No. of LGU Developmental"
            value={apiUstatus.developmental}
            loading={chartLoading}
            showInfo={`Number of Local Government Units in Developmental stage for ${formatList(data?.modules)} within the period of ${data.startDate} to ${data.endDate}`}
            onClick={scrollToStatusChart}
          />
          <StatisticCard2
            title="No. of LGU Withdraw"
            value={apiUstatus.withdraw}
            loading={chartLoading}
            showInfo={`Number of Local Government Units that have withdrawn from ${formatList(data?.modules)} within the period of ${data.startDate} to ${data.endDate}`}
            onClick={scrollToStatusChart}
          />
        </div>

        {/* ePayment counts */}
        <div className="grid grid-cols-3 slg:grid-cols-2 md:grid-cols-1 gap-4 mt-4">
          <StatisticCard2
            title="No. of LGU with ePayment"
            value={filteredEpaymentCounts.epayment}
            loading={chartLoading}
            showInfo={`Number of LGUs that have adopted ePayment within the selected period`}
          />
          <StatisticCard2
            title="No. of LGU with eGovPay v1"
            value={filteredEpaymentCounts.egovpay_v1}
            loading={chartLoading}
            showInfo={`Number of LGUs using eGovPay v1 within the selected period`}
          />
          <StatisticCard2
            title="No. of LGU with eGovPay v2"
            value={filteredEpaymentCounts.egovpay_v2}
            loading={chartLoading}
            showInfo={`Number of LGUs using eGovPay v2 within the selected period`}
          />
        </div>
      </div>
      )}

      {/* Transaction Statistics Section */}
      {showStatisticCards && (
      <div className="mb-6">
       
          
          <ModuleFilter 
            filterType="card" 
          />
    
        
        <div className="grid grid-cols-3 slg:grid-cols-2 md:grid-cols-1 gap-4">
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
            bpcoValue={
              (filteredCard?.bpcoTotalnewPending ?? 0) +
              (filteredCard?.bpcoTotalnewPaid ?? 0) +
              (filteredCard?.bpcoTotalrenewPending ?? 0) +
              (filteredCard?.bpcoTotalrenewPaid ?? 0)
            }
            bpbpValue={
              (filteredCard?.bpbpTotalnewPending ?? 0) +
              (filteredCard?.bpbpTotalnewPaid ?? 0) +
              (filteredCard?.bpbpTotalrenewPending ?? 0) +
              (filteredCard?.bpbpTotalrenewPaid ?? 0)
            }
            brgyValue={
              (filteredCard?.brgyTotalnewPending ?? 0) +
              (filteredCard?.brgyTotalnewPaid ?? 0) +
              (filteredCard?.brgyTotalrenewPending ?? 0) +
              (filteredCard?.brgyTotalrenewPaid ?? 0)
            }
            showInfo={`Total number of transactions across ${formatList(getSelectedCardModules(data))} from ${data.startDate} to ${data.endDate}`}
          />
          <StatisticCard 
            title="New Licenses Issued"
            value={(filteredCard?.totalnewPaid  ?? 0)  + (filteredCard?.totalnewPaidViaEgov ?? 0)}
            bpValue={filteredCard?.bpTotalnewPaid ?? 0}
            wpValue={filteredCard?.wpTotalnewPaid ?? 0}
            bpcoValue={filteredCard?.bpcoTotalnewPaid ?? 0}
            bpbpValue={filteredCard?.bpbpTotalnewPaid ?? 0}
            brgyValue={filteredCard?.brgyTotalnewPaid ?? 0}
            showInfo={`Total number of new licenses issued for ${formatList(getSelectedCardModules(data))} from ${data.startDate} to ${data.endDate}`}
          />
          <StatisticCard 
            title="Renew Licenses Issued"
            value={(filteredCard?.totalrenewPaid ?? 0) + (filteredCard?.totalrenewPaidViaEgov ?? 0)}
            bpValue={filteredCard?.bpTotalrenewPaid ?? 0}
            wpValue={filteredCard?.wpTotalrenewPaid ?? 0}
            bpcoValue={filteredCard?.bpcoTotalrenewPaid ?? 0}
            bpbpValue={filteredCard?.bpbpTotalrenewPaid ?? 0}
            brgyValue={filteredCard?.brgyTotalrenewPaid ?? 0}
            showInfo={`Total number of licenses renewed for ${formatList(getSelectedCardModules(data))} from ${data.startDate} to ${data.endDate}`}
          />

         
          <StatisticCard 
            title="No. of Male"
            value={(filteredCard?.totalmalePaid ?? 0) + (filteredCard?.totalmalePending ?? 0)}
            bpValue={(filteredCard?.bpTotalmalePaid ?? 0) + (filteredCard?.bpTotalmalePending ?? 0)}
            wpValue={(filteredCard?.wpTotalmalePaid ?? 0) + (filteredCard?.wpTotalmalePending ?? 0)}
            bpcoValue={(filteredCard?.bpcoTotalmalePaid ?? 0) + (filteredCard?.bpcoTotalmalePending ?? 0)}
            bpbpValue={(filteredCard?.bpbpTotalmalePaid ?? 0) + (filteredCard?.bpbpTotalmalePending ?? 0)}
            brgyValue={(filteredCard?.brgyTotalmalePaid ?? 0) + (filteredCard?.brgyTotalmalePending ?? 0)}
            showInfo={`Total number of male applicants for ${formatList(getSelectedCardModules(data))} from ${data.startDate} to ${data.endDate}`}
          />
          <StatisticCard 
            title="No. of Female"
            value={(filteredCard?.totalfemalePaid ?? 0) + (filteredCard?.totalfemalePending ?? 0)}
            bpValue={(filteredCard?.bpTotalfemalePaid ?? 0) + (filteredCard?.bpTotalfemalePending ?? 0)}
            wpValue={(filteredCard?.wpTotalfemalePaid ?? 0) + (filteredCard?.wpTotalfemalePending ?? 0)}
            bpcoValue={(filteredCard?.bpcoTotalfemalePaid ?? 0) + (filteredCard?.bpcoTotalfemalePending ?? 0)}
            bpbpValue={(filteredCard?.bpbpTotalfemalePaid ?? 0) + (filteredCard?.bpbpTotalfemalePending ?? 0)}
            brgyValue={(filteredCard?.brgyTotalfemalePaid ?? 0) + (filteredCard?.brgyTotalfemalePending ?? 0)}
            showInfo={`Total number of female applicants for ${formatList(getSelectedCardModules(data))} from ${data.startDate} to ${data.endDate}`}
          />
          <StatisticCard 
            title="No. of eGovPay"
            value={(filteredCard?.totalrenewPaidViaEgov ?? 0) + (filteredCard?.totalnewPaidViaEgov ?? 0)}
            bpValue={(filteredCard?.bpTotalrenewPaidViaEgov ?? 0) + (filteredCard?.bpTotalnewPaidViaEgov ?? 0)}
            wpValue={(filteredCard?.wpTotalrenewPaidViaEgov ?? 0) + (filteredCard?.wpTotalnewPaidViaEgov ?? 0)}
            bpcoValue={(filteredCard?.bpcoTotalrenewPaidViaEgov ?? 0) + (filteredCard?.bpcoTotalnewPaidViaEgov ?? 0)}
            bpbpValue={(filteredCard?.bpbpTotalrenewPaidViaEgov ?? 0) + (filteredCard?.bpbpTotalnewPaidViaEgov ?? 0)}
            brgyValue={(filteredCard?.brgyTotalrenewPaidViaEgov ?? 0) + (filteredCard?.brgyTotalnewPaidViaEgov ?? 0)}
            showInfo={`Total number of transactions processed through eGovPay for ${formatList(getSelectedCardModules(data))} from ${data.startDate} to ${data.endDate}`}
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
            bpcoValue={
              ((filteredCard?.bpcoTotalnewPending ?? 0) + (filteredCard?.bpcoTotalnewPaid ?? 0) + (filteredCard?.bpcoTotalrenewPending ?? 0) + (filteredCard?.bpcoTotalrenewPaid ?? 0))
              - (((filteredCard?.bpcoTotalmalePaid ?? 0) + (filteredCard?.bpcoTotalmalePending ?? 0)) + ((filteredCard?.bpcoTotalfemalePaid ?? 0) + (filteredCard?.bpcoTotalfemalePending ?? 0))) < 0 ? 0 : ((filteredCard?.bpcoTotalnewPending ?? 0) + (filteredCard?.bpcoTotalnewPaid ?? 0) + (filteredCard?.bpcoTotalrenewPending ?? 0) + (filteredCard?.bpcoTotalrenewPaid ?? 0))
              - (((filteredCard?.bpcoTotalmalePaid ?? 0) + (filteredCard?.bpcoTotalmalePending ?? 0)) + ((filteredCard?.bpcoTotalfemalePaid ?? 0) + (filteredCard?.bpcoTotalfemalePending ?? 0)))
            }
            bpbpValue={
              ((filteredCard?.bpbpTotalnewPending ?? 0) + (filteredCard?.bpbpTotalnewPaid ?? 0) + (filteredCard?.bpbpTotalrenewPending ?? 0) + (filteredCard?.bpbpTotalrenewPaid ?? 0))
              - (((filteredCard?.bpbpTotalmalePaid ?? 0) + (filteredCard?.bpbpTotalmalePending ?? 0)) + ((filteredCard?.bpbpTotalfemalePaid ?? 0) + (filteredCard?.bpbpTotalfemalePending ?? 0))) < 0 ? 0 : ((filteredCard?.bpbpTotalnewPending ?? 0) + (filteredCard?.bpbpTotalnewPaid ?? 0) + (filteredCard?.bpbpTotalrenewPending ?? 0) + (filteredCard?.bpbpTotalrenewPaid ?? 0))
              - (((filteredCard?.bpbpTotalmalePaid ?? 0) + (filteredCard?.bpbpTotalmalePending ?? 0)) + ((filteredCard?.bpbpTotalfemalePaid ?? 0) + (filteredCard?.bpbpTotalfemalePending ?? 0)))
            }
            brgyValue={
              ((filteredCard?.brgyTotalnewPending ?? 0) + (filteredCard?.brgyTotalnewPaid ?? 0) + (filteredCard?.brgyTotalrenewPending ?? 0) + (filteredCard?.brgyTotalrenewPaid ?? 0))
              - (((filteredCard?.brgyTotalmalePaid ?? 0) + (filteredCard?.brgyTotalmalePending ?? 0)) + ((filteredCard?.brgyTotalfemalePaid ?? 0) + (filteredCard?.brgyTotalfemalePending ?? 0))) < 0 ? 0 : ((filteredCard?.brgyTotalnewPending ?? 0) + (filteredCard?.brgyTotalnewPaid ?? 0) + (filteredCard?.brgyTotalrenewPending ?? 0) + (filteredCard?.brgyTotalrenewPaid ?? 0))
              - (((filteredCard?.brgyTotalmalePaid ?? 0) + (filteredCard?.brgyTotalmalePending ?? 0)) + ((filteredCard?.brgyTotalfemalePaid ?? 0) + (filteredCard?.brgyTotalfemalePending ?? 0)))
            }
            showInfo={`Number of applicants identifying as non-binary for ${formatList(getSelectedCardModules(data))} from ${data.startDate} to ${data.endDate}`}
          />
              {/* Total Citizens Served Card */}
          <StatisticCard 
            title="Total Citizens Served"
            value={filteredCard?.totalCitizensServed ?? 0}
            bpValue={filteredCard?.bpTotalCitizensServed ?? 0}
            wpValue={filteredCard?.wpTotalCitizensServed ?? 0}
            bpcoValue={filteredCard?.bpcoTotalCitizensServed ?? 0}
            bpbpValue={filteredCard?.bpbpTotalCitizensServed ?? 0}
            brgyValue={filteredCard?.brgyTotalCitizensServed ?? 0}
            showInfo={`Total number of citizens served across all ${formatList(getSelectedCardModules(data))} from ${data.startDate} to ${data.endDate}`}
          />
        </div>

    
      
      </div>
      )}

    

      {/* Progress Indicator is rendered at Admin container level now */}

      {/* Non-Binary Statistics - Separate section for special calculation */}
     
      
      {/* Charts */}

     
      {/* Combined Status Chart for all modules */}
      {showStatusChart && (
      <div id="status-chart-section">
      {(data.modules?.includes("Business Permit") || 
        data.modules?.includes("Working Permit") || 
        data.modules?.includes("Barangay Clearance") ||
        data.modules?.includes("Building Permit") || data.modules?.includes("Certificate of Occupancy")) && (
        <StatusChartComponent
          data={[]} // Not used anymore
          raw={null} // Not used anymore
          bpData={filteredChartData['BP1']?.current || []}
          wpData={filteredChartData['WP']?.current || []}
          brgyData={filteredChartData['BC']?.current || []}
          bpcoData={bpcoDataProp}
          bpbpData={bpbpDataProp}
          bpRaw={filteredChartData['BP1']?.breakdown || []}
          wpRaw={filteredChartData['WP']?.breakdown || []}
          brgyRaw={filteredChartData['BC']?.breakdown || []}
          bpcoRaw={bpcoRawProp}
          bpbpRaw={bpbpRawProp}
          modules={data.modules || []}
          title="Operational vs. Developmental vs. Withdrawal (All Modules)"
          period={`${data.startDate} - ${data.endDate}`}
          loading={chartLoading}
        />
      )}
      </div>
      )}

    



      {/* Charts Section */}
      <div className="mb-6">

            {/* Date Range Comparison Chart */}
      <div className="mb-6">
      {showComparisonChart && (
        <>
          <ModuleFilter 
            title="Chart Analytics" 
            filterType="chart" 
            className=""
          />
        <ComparisonChartComponent
          bpData={filteredChartData['BP1']?.current || []}
          wpData={filteredChartData['WP']?.current || []}
          brgyData={filteredChartData['BC']?.current || []}
          bpcoData={bpcoDataProp}
          bpbpData={bpbpDataProp}
          bpRaw={filteredChartData['BP1']?.breakdown || []}
          wpRaw={filteredChartData['WP']?.breakdown || []}
          brgyRaw={filteredChartData['BC']?.breakdown || []}
          bpcoRaw={bpcoRawProp}
          bpbpRaw={bpbpRawProp}
          modules={data.modules || []}
          title="Date Range Comparison Analysis"
          startDate={data.startDate}
          endDate={data.endDate}
        />
        </>
      )}
      </div>     
        
        <div className="space-y-6">
          {showTransactionAnalyticsByRegion && (
          <TransactionChart
            data={chartData3}
            title="TRANSACTION ANALYTICS BY REGION"
            period={`${data.startDate} - ${data.endDate}`}
          />
          )}
          {showTransactionAnalyticsByGender && (
          <TransactionChart2
            data={chartData}
            title="TRANSACTION ANALYTICS BY GENDER"
            period={`${data.startDate} - ${data.endDate}`}
          />
          )}

            {showTrendLineChart && (
            <TrendLineChart
  bpResults={transactionData?.bpResults || []}
  wpResults={transactionData?.wpResults || []}
  brgyResults={transactionData?.brgyResults || []}
  bpcoResults={transactionData?.bpcoResults || []}
  bpbpResults={transactionData?.bpbpResults || []}
  startDate={data.startDate}
  endDate={data.endDate}
  availableModules={data.modules || []}
  title="Transaction Trend Analysis"
/>
            )}
        </div>
      </div>

    </div>
  );
};

export default DashboardPage;
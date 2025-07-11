import { useMemo, useEffect } from 'react';
import FilterSection from './components/FilterSection';
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

const DashboardPage = () => {
  const card = useSelector(selectCard);
  const status = useSelector(selectStatus);
  const wp = useSelector(selectWp);
  const brgy = useSelector(selectBrgy);
  const data = useSelector(selectData);
  const transactionData = useSelector(selectTransaction);
  const dispatch = useDispatch();

  // Always use safe arrays/strings for all data fields
  const modules = Array.isArray(data?.modules) ? data.modules : [];
  const province = Array.isArray(data?.province) ? data.province : [];
  const municipalities = Array.isArray(data?.municipalities) ? data.municipalities : [];
  const real = Array.isArray(data?.real) ? data.real : [];
  const startDate = data?.startDate || "";
  const endDate = data?.endDate || "";

  // Enhanced filter and group logic
  const filterAndGroupResults = (results: any[], municipalities: any[], provinces: any[]) => {
    if (Array.isArray(municipalities) && municipalities.length > 0) {
      const selected = municipalities.map((m: any) => m.value);
      return results.filter((lgu: any) => selected.includes(lgu.lgu));
    }
    if (Array.isArray(provinces) && provinces.length > 0) {
      const selectedProvinces = provinces.map((p: any) => p.value);
      const grouped: { [province: string]: any } = {};
      results.forEach((lgu: any) => {
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
    const start = startDate ? parseISO(startDate) : null;
    const end = endDate ? parseISO(endDate) : null;
    const selectedRegions = Array.isArray(real) ? real : real ? [real] : [];
    const selectedProvinces = Array.isArray(province) ? province : [];
    const selectedMunicipalities = Array.isArray(municipalities) ? municipalities : [];

    // Filter BP array by date range
    const filteredBPArr = bpArr.filter((bp: any) => {
      if (!bp.date) return true;
      const bpDate = parseISO(bp.date);
      let dateOk = true;
      if (start) dateOk = isAfter(bpDate, start) || isEqual(bpDate, start);
      if (end) dateOk = dateOk && (isBefore(bpDate, end) || isEqual(bpDate, end));
      return dateOk;
    });

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

    let current: any[] = [];
    if (filteredBPArr.length > 0) {
      const sorted = [...filteredBPArr].sort((a, b) => (a.date > b.date ? -1 : 1));
      const latest = sorted[0];
      if (latest && latest.data) {
        let filteredData = latest.data;

        if (Array.isArray(selectedMunicipalities) && selectedMunicipalities.length > 0) {
          const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
          filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
          current = groupAndSum(filteredData, "lgu");
        } else if (Array.isArray(selectedProvinces) && selectedProvinces.length > 0) {
          const selectedProv = selectedProvinces.map((p: any) => p.value);
          filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
          current = groupAndSum(filteredData, "province");
        } else if (Array.isArray(selectedRegions) && selectedRegions.length > 0) {
          filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
          current = groupAndSum(filteredData, "region");
        } else {
          current = groupAndSum(filteredData, "region");
        }
      }
    }

    let breakdown: any[] = [];
    filteredBPArr.forEach((bp: any) => {
      let filteredData = bp.data;

      if (Array.isArray(selectedMunicipalities) && selectedMunicipalities.length > 0) {
        const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
        filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
        breakdown.push({
          date: bp.date,
          data: groupAndSum(filteredData, "lgu"),
        });
      } else if (Array.isArray(selectedProvinces) && selectedProvinces.length > 0) {
        const selectedProv = selectedProvinces.map((p: any) => p.value);
        filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
        breakdown.push({
          date: bp.date,
          data: groupAndSum(filteredData, "province"),
        });
      } else if (Array.isArray(selectedRegions) && selectedRegions.length > 0) {
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
    startDate,
    endDate,
    real,
    province,
    municipalities,
  ]);

  const wpChartData: any = useMemo(() => {
    const bpArr = wp?.WP;
    if (!bpArr || !Array.isArray(bpArr) || bpArr.length === 0) return { current: [], breakdown: [] };

    const start = startDate ? parseISO(startDate) : null;
    const end = endDate ? parseISO(endDate) : null;
    const selectedRegions = Array.isArray(real) ? real : real ? [real] : [];
    const selectedProvinces = Array.isArray(province) ? province : [];
    const selectedMunicipalities = Array.isArray(municipalities) ? municipalities : [];

    const filteredBPArr = bpArr.filter((bp: any) => {
      if (!bp.date) return true;
      const bpDate = parseISO(bp.date);
      let dateOk = true;
      if (start) dateOk = isAfter(bpDate, start) || isEqual(bpDate, start);
      if (end) dateOk = dateOk && (isBefore(bpDate, end) || isEqual(bpDate, end));
      return dateOk;
    });

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

    let current: any[] = [];
    if (filteredBPArr.length > 0) {
      const sorted = [...filteredBPArr].sort((a, b) => (a.date > b.date ? -1 : 1));
      const latest = sorted[0];
      if (latest && latest.data) {
        let filteredData = latest.data;

        if (Array.isArray(selectedMunicipalities) && selectedMunicipalities.length > 0) {
          const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
          filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
          current = groupAndSum(filteredData, "lgu");
        } else if (Array.isArray(selectedProvinces) && selectedProvinces.length > 0) {
          const selectedProv = selectedProvinces.map((p: any) => p.value);
          filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
          current = groupAndSum(filteredData, "province");
        } else if (Array.isArray(selectedRegions) && selectedRegions.length > 0) {
          filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
          current = groupAndSum(filteredData, "region");
        } else {
          current = groupAndSum(filteredData, "region");
        }
      }
    }

    let breakdown: any[] = [];
    filteredBPArr.forEach((bp: any) => {
      let filteredData = bp.data;

      if (Array.isArray(selectedMunicipalities) && selectedMunicipalities.length > 0) {
        const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
        filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
        breakdown.push({
          date: bp.date,
          data: groupAndSum(filteredData, "lgu"),
        });
      } else if (Array.isArray(selectedProvinces) && selectedProvinces.length > 0) {
        const selectedProv = selectedProvinces.map((p: any) => p.value);
        filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
        breakdown.push({
          date: bp.date,
          data: groupAndSum(filteredData, "province"),
        });
      } else if (Array.isArray(selectedRegions) && selectedRegions.length > 0) {
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
    wp,
    startDate,
    endDate,
    real,
    province,
    municipalities,
  ]);

  const brgyChartData: any = useMemo(() => {
    const bpArr = brgy?.BRGY;
    if (!bpArr || !Array.isArray(bpArr) || bpArr.length === 0) return { current: [], breakdown: [] };

    const start = startDate ? parseISO(startDate) : null;
    const end = endDate ? parseISO(endDate) : null;
    const selectedRegions = Array.isArray(real) ? real : real ? [real] : [];
    const selectedProvinces = Array.isArray(province) ? province : [];
    const selectedMunicipalities = Array.isArray(municipalities) ? municipalities : [];

    const filteredBPArr = bpArr.filter((bp: any) => {
      if (!bp.date) return true;
      const bpDate = parseISO(bp.date);
      let dateOk = true;
      if (start) dateOk = isAfter(bpDate, start) || isEqual(bpDate, start);
      if (end) dateOk = dateOk && (isBefore(bpDate, end) || isEqual(bpDate, end));
      return dateOk;
    });

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

    let current: any[] = [];
    if (filteredBPArr.length > 0) {
      const sorted = [...filteredBPArr].sort((a, b) => (a.date > b.date ? -1 : 1));
      const latest = sorted[0];
      if (latest && latest.data) {
        let filteredData = latest.data;

        if (Array.isArray(selectedMunicipalities) && selectedMunicipalities.length > 0) {
          const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
          filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
          current = groupAndSum(filteredData, "lgu");
        } else if (Array.isArray(selectedProvinces) && selectedProvinces.length > 0) {
          const selectedProv = selectedProvinces.map((p: any) => p.value);
          filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
          current = groupAndSum(filteredData, "province");
        } else if (Array.isArray(selectedRegions) && selectedRegions.length > 0) {
          filteredData = filteredData.filter((item: any) => selectedRegions.includes(item.region));
          current = groupAndSum(filteredData, "region");
        } else {
          current = groupAndSum(filteredData, "region");
        }
      }
    }

    let breakdown: any[] = [];
    filteredBPArr.forEach((bp: any) => {
      let filteredData = bp.data;

      if (Array.isArray(selectedMunicipalities) && selectedMunicipalities.length > 0) {
        const selectedLGUs = selectedMunicipalities.map((m: any) => m.value);
        filteredData = filteredData.filter((item: any) => selectedLGUs.includes(item.lgu));
        breakdown.push({
          date: bp.date,
          data: groupAndSum(filteredData, "lgu"),
        });
      } else if (Array.isArray(selectedProvinces) && selectedProvinces.length > 0) {
        const selectedProv = selectedProvinces.map((p: any) => p.value);
        filteredData = filteredData.filter((item: any) => selectedProv.includes(item.province));
        breakdown.push({
          date: bp.date,
          data: groupAndSum(filteredData, "province"),
        });
      } else if (Array.isArray(selectedRegions) && selectedRegions.length > 0) {
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
    brgy,
    startDate,
    endDate,
    real,
    province,
    municipalities,
  ]);

  // --- Calculate totals from all chart data sources ---
  const totalOperational = useMemo(() => {
    let total = 0;

    if (modules.includes("Business Permit")) {
      total += bpChartData?.current?.reduce((sum: any, item: any) => sum + (item.operational ?? 0), 0) ?? 0;
    }
    if (modules.includes("Working Permit")) {
      total += wpChartData?.current?.reduce((sum: any, item: any) => sum + (item.operational ?? 0), 0) ?? 0;
    }
    if (modules.includes("Barangay Clearance")) {
      total += brgyChartData?.current?.reduce((sum: any, item: any) => sum + (item.operational ?? 0), 0) ?? 0;
    }
    return total;
  }, [bpChartData, wpChartData, brgyChartData, modules]);

  const totalDevelopmental = useMemo(() => {
    let total = 0;

    if (modules.includes("Business Permit")) {
      total += bpChartData?.current?.reduce((sum: any, item: any) => sum + (item.developmental ?? 0), 0) ?? 0;
    }
    if (modules.includes("Working Permit")) {
      total += wpChartData?.current?.reduce((sum: any, item: any) => sum + (item.developmental ?? 0), 0) ?? 0;
    }
    if (modules.includes("Barangay Clearance")) {
      total += brgyChartData?.current?.reduce((sum: any, item: any) => sum + (item.developmental ?? 0), 0) ?? 0;
    }
    return total;
  }, [bpChartData, wpChartData, brgyChartData, modules]);

  const totalWithdraw = useMemo(() => {
    let total = 0;

    if (modules.includes("Business Permit")) {
      total += bpChartData?.current?.reduce((sum: any, item: any) => sum + (item.withdraw ?? 0), 0) ?? 0;
    }
    if (modules.includes("Working Permit")) {
      total += wpChartData?.current?.reduce((sum: any, item: any) => sum + (item.withdraw ?? 0), 0) ?? 0;
    }
    if (modules.includes("Barangay Clearance")) {
      total += brgyChartData?.current?.reduce((sum: any, item: any) => sum + (item.withdraw ?? 0), 0) ?? 0;
    }
    return total;
  }, [bpChartData, wpChartData, brgyChartData, modules]);

  const chartData = useMemo(() => {
    if (!transactionData || !transactionData.results) return [];
    const filteredResults = filterAndGroupResults(
      transactionData.results,
      municipalities,
      province
    );

    return filteredResults.map((lgu: any) => {
      let paidMale = 0, paidFemale = 0, pendingMale = 0, pendingFemale = 0;
      lgu.monthlyResults.forEach((m: any) => {
        paidMale += m.malePaid ?? 0;
        paidFemale += m.femalePaid ?? 0;
        pendingMale += m.malePending ?? 0;
        pendingFemale += m.femalePending ?? 0;
      });
      return {
        name: lgu.lgu,
        paidMale,
        paidFemale,
        pendingMale,
        pendingFemale,
      };
    });
  }, [municipalities, province, transactionData]);

  const chartData3 = useMemo(() => {
    if (!transactionData || !transactionData.results) return [];
    const filteredResults = filterAndGroupResults(
      transactionData.results,
      municipalities,
      province
    );

    return filteredResults.map((lgu: any) => {
      let newPaid = 0, newPending = 0, newPaidViaEgov = 0, newPaidLinkBiz = 0;
      let renewPaid = 0, renewPending = 0, renewPaidViaEgov = 0, renewPaidLinkBiz = 0;
      lgu.monthlyResults.forEach((m: any) => {
        newPaid += m.newPaid ?? 0;
        newPending += m.newPending ?? 0;
        newPaidViaEgov += m.newPaidViaEgov ?? 0;
        newPaidLinkBiz += m.newPaidViaLinkBiz ?? 0;
        renewPaid += m.renewPaid ?? 0;
        renewPending += m.renewPending ?? 0;
        renewPaidViaEgov += m.renewPaidViaEgov ?? 0;
        renewPaidLinkBiz += m.renewPaidViaLinkBiz ?? 0;
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
      };
    });
  }, [municipalities, province, transactionData]);

  const filteredCard = useMemo(() => {
    if (!card || !transactionData?.results) return card;
    const filteredResults = filterAndGroupResults(
      transactionData.results,
      municipalities,
      province
    );

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

    filteredResults.forEach((lgu: any) => {
      lgu.monthlyResults.forEach((m: any) => {
        totals.totalnewPending += m.newPending ?? 0;
        totals.totalnewPaid += m.newPaid ?? 0;
        totals.totalnewPaidViaEgov += m.newPaidViaEgov ?? 0;
        totals.totalrenewPending += m.renewPending ?? 0;
        totals.totalrenewPaid += m.renewPaid ?? 0;
        totals.totalrenewPaidViaEgov += m.renewPaidViaEgov ?? 0;
        totals.totalmalePaid += m.malePaid ?? 0;
        totals.totalmalePending += m.malePending ?? 0;
        totals.totalfemalePaid += m.femalePaid ?? 0;
        totals.totalfemalePending += m.femalePending ?? 0;
      });
    });

    return { ...card, ...totals };
  }, [card, transactionData, municipalities, province]);

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
    return regionMap[region] || region.toLowerCase().replace(/\s+/g, '');
  }

  function getWP() {
    axios.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/WP UR Input', {
      headers: {
        Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
      }
    }).then((response) => {
      const data = response.data.values;
      if (!Array.isArray(data)) return;
      const records = data.slice(3);

      const idx = {
        period: 1,
        lgu: 4,
        name: 13,
        province: 14,
        dictRo: 18,
        status: 10,
      };

      const groupedByMonth: Record<string, Record<string, any>> = {};
      records.forEach((row: any) => {
        const period = row[idx.period];
        const lgu = row[idx.lgu];
        const region = mapRegion(row[idx.dictRo]);
        const name = row[idx.name];
        const province = row[idx.province];
        const status = (row[idx.status] || '').toLowerCase();

        if (!period || !lgu) return;

        if (!groupedByMonth[period]) groupedByMonth[period] = {};
        if (!groupedByMonth[period][lgu]) {
          groupedByMonth[period][lgu] = {
            lgu,
            period,
            region,
            name,
            province,
            operational: 0,
            developmental: 0,
            training: 0,
            withdraw: 0,
          };
        }

        if (status.includes('operational')) groupedByMonth[period][lgu].operational += 1;
        else if (status.includes('developmental')) groupedByMonth[period][lgu].developmental += 1;
        else if (status.includes('training')) groupedByMonth[period][lgu].training += 1;
        else if (status.includes('withdraw')) groupedByMonth[period][lgu].withdraw += 1;
      });

      const WP = Object.entries(groupedByMonth).map(([date, lgus]) => ({
        date,
        data: Object.values(lgus),
      }));

      const result = { WP };

      dispatch(setWp({
        ...wp,
        WP: result.WP,
      }));
    });
  }

  function getBRGY() {
    axios.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/BC UR Input', {
      headers: {
        Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
      }
    }).then((response) => {
      const data = response.data.values;
      if (!Array.isArray(data)) return;
      const records = data.slice(3);

      const idx = {
        period: 1,
        lgu: 4,
        name: 13,
        province: 14,
        dictRo: 18,
        status: 10,
      };

      const groupedByMonth: Record<string, Record<string, any>> = {};
      records.forEach((row: any) => {
        const period = row[idx.period];
        const lgu = row[idx.lgu];
        const region = mapRegion(row[idx.dictRo]);
        const name = row[idx.name];
        const province = row[idx.province];
        const status = (row[idx.status] || '').toLowerCase();

        if (!period || !lgu) return;

        if (!groupedByMonth[period]) groupedByMonth[period] = {};
        if (!groupedByMonth[period][lgu]) {
          groupedByMonth[period][lgu] = {
            lgu,
            period,
            region,
            name,
            province,
            operational: 0,
            developmental: 0,
            training: 0,
            withdraw: 0,
          };
        }

        if (status.includes('operational')) groupedByMonth[period][lgu].operational += 1;
        else if (status.includes('developmental')) groupedByMonth[period][lgu].developmental += 1;
        else if (status.includes('training')) groupedByMonth[period][lgu].training += 1;
        else if (status.includes('withdraw')) groupedByMonth[period][lgu].withdraw += 1;
      });

      const BRGY = Object.entries(groupedByMonth).map(([date, lgus]) => ({
        date,
        data: Object.values(lgus),
      }));

      const result = { BRGY };

      dispatch(setBrgy({
        ...brgy,
        BRGY: result.BRGY,
      }));
    });
  }

  function getBPLS() {
    axios.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/BP1 UR Input', {
      headers: {
        Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
      }
    }).then((response) => {
      const data = response.data.values;
      if (!Array.isArray(data)) return;
      const records = data.slice(3);

      const idx = {
        period: 1,
        lgu: 4,
        name: 13,
        province: 14,
        dictRo: 19,
        status: 10,
      };

      const groupedByMonth: Record<string, Record<string, any>> = {};
      records.forEach((row: any) => {
        const period = row[idx.period];
        const lgu = row[idx.lgu];
        const region = mapRegion(row[idx.dictRo]);
        const name = row[idx.name];
        const province = row[idx.province];
        const status = (row[idx.status] || '').toLowerCase();

        if (!period || !lgu) return;

        if (!groupedByMonth[period]) groupedByMonth[period] = {};
        if (!groupedByMonth[period][lgu]) {
          groupedByMonth[period][lgu] = {
            lgu,
            period,
            region,
            name,
            province,
            operational: 0,
            developmental: 0,
            training: 0,
            withdraw: 0,
          };
        }

        if (status.includes('operational')) groupedByMonth[period][lgu].operational += 1;
        else if (status.includes('developmental')) groupedByMonth[period][lgu].developmental += 1;
        else if (status.includes('training')) groupedByMonth[period][lgu].training += 1;
        else if (status.includes('withdraw')) groupedByMonth[period][lgu].withdraw += 1;
      });

      const BP = Object.entries(groupedByMonth).map(([date, lgus]) => ({
        date,
        data: Object.values(lgus),
      }));

      const result = { BP };

      dispatch(setStatus({
        ...status,
        BP: result.BP,
      }));
    });
  }

  useEffect(() => {
    if (modules.includes("Business Permit")) {
      getBPLS();
    }
    if (modules.includes("Working Permit")) {
      getWP();
    }
    if (modules.includes("Barangay Clearance")) {
      getBRGY();
    }
    // eslint-disable-next-line
  }, []);

  function formatList(arr: any) {
    if (!Array.isArray(arr) || arr.length === 0) return "";
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr.join(" and ");
    return arr.slice(0, -1).join(", ") + ", and " + arr[arr.length - 1];
  }

  return (
    <div className="p-6 sm:p-2 md:p-4 max-w-[1200px] mx-auto  bg-background ">
      <FilterSection />

      {/* Main statistics */}
      <div className="grid grid-cols-3 lg:grid-cols-2 sm:grid-cols-1 gap-4  mb-6">
        <StatisticCard
          title="No. of Transaction"
          value={
            (filteredCard?.totalnewPending ?? 0) +
            (filteredCard?.totalnewPaid ?? 0) +
            (filteredCard?.totalrenewPending ?? 0) +
            (filteredCard?.totalrenewPaid ?? 0)
          }
          showInfo={`total no. of transaction on Business Permit as of ${startDate} - ${endDate}`}
        />

        <div className=' gap-4 grid col-span-2 grid-cols-3 lg:grid-cols-2  sm:grid-cols-2 '>
          <StatisticCard
            title="No. of LGU Operational"
            value={totalOperational}
            showInfo={`Total of Operational Status on ${formatList(modules)} as of ${startDate} - ${endDate}`}
          />
          <StatisticCard
            title="No. of LGU Developmental"
            value={totalDevelopmental}
            showInfo={`Total of Developmental Status on ${formatList(modules)}  as of ${startDate} - ${endDate}`}
          />
          <StatisticCard
            title="No. of LGU Withdraw"
            value={totalWithdraw}
            showInfo={`Total of Withdraw Status on ${formatList(modules)}  as of ${startDate} - ${endDate}`}
          />
        </div>
      </div>

      {/* Gender statistics */}
      <div className="grid grid-cols-5 md:grid-cols-2 lg:grid-cols-3 sm:grid-cols-2 gap-4 mb-6">
        <StatisticCard
          title="No. of Male"
          value={(filteredCard?.totalmalePaid ?? 0) + (filteredCard?.totalmalePending ?? 0)}
        />
        <StatisticCard
          title="No. of Female"
          value={(filteredCard?.totalfemalePaid ?? 0) + (filteredCard?.totalfemalePending ?? 0)}
        />
        <StatisticCard
          title="Non-Binary"
          value={
            ((filteredCard?.totalnewPending ?? 0) + (filteredCard?.totalnewPaid ?? 0) + (filteredCard?.totalrenewPending ?? 0) + (filteredCard?.totalrenewPaid ?? 0))
              - (((filteredCard?.totalmalePaid ?? 0) + (filteredCard?.totalmalePending ?? 0)) + ((filteredCard?.totalfemalePaid ?? 0) + (filteredCard?.totalfemalePending ?? 0))) < 0 ? 0 :
              ((filteredCard?.totalnewPending ?? 0) + (filteredCard?.totalnewPaid ?? 0) + (filteredCard?.totalrenewPending ?? 0) + (filteredCard?.totalrenewPaid ?? 0))
              - (((filteredCard?.totalmalePaid ?? 0) + (filteredCard?.totalmalePending ?? 0)) + ((filteredCard?.totalfemalePaid ?? 0) + (filteredCard?.totalfemalePending ?? 0)))
          }
        />
      </div>

      {/* Charts */}
      {modules.includes("Business Permit") ?
        <StatusChartComponent
          data={bpChartData?.current || []}
          raw={bpChartData?.breakdown || []}
          title="Operational vs. Developmental vs. Withdrawal (Business Permit)"
          period={`${startDate} - ${endDate}`}
        /> : null}

      {modules.includes("Working Permit") && wpChartData?.current && wpChartData?.breakdown ? (
        <StatusChartComponent
          data={wpChartData.current}
          raw={wpChartData.breakdown}
          title="Operational vs. Developmental vs. Withdrawal (Working Permit)"
          period={`${startDate} - ${endDate}`}
        />
      ) : null}

      {modules.includes("Barangay Clearance") && brgyChartData?.current && brgyChartData?.breakdown ? (
        <StatusChartComponent
          data={brgyChartData.current}
          raw={brgyChartData.breakdown}
          title="Operational vs. Developmental vs. Withdrawal (Barangay Clearance)"
          period={`${startDate} - ${endDate}`}
        />
      ) : null}

      <TransactionChart
        data={chartData3}
        title="NUMBER OF TRANSACTION PER REGION FOR RENEW APPLICATION"
        period={`${startDate} - ${endDate}`}
      />
      <TransactionChart2
        data={chartData}
        title="NUMBER OF TRANSACTION PER REGION AND GENDER"
        period={`${startDate} - ${endDate}`}
      />
    </div>
  );
};

export default DashboardPage;
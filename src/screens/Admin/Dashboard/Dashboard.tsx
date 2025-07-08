import {  useMemo, useEffect } from 'react';
import FilterSection from './components/FilterSection';
import StatisticCard from './components/StatisticCard';


import TransactionChart from './components/TransChartComponent';
import { selectCard } from '@/redux/cardSlice';
import { selectTransaction } from '@/redux/transactionSlice';
import { useSelector,useDispatch } from 'react-redux';
import { selectData} from '@/redux/dataSlice';

import axios from './../../../plugin/axios2';


import TransactionChart2 from './components/TransChartComponent2';
import { selectStatus, setStatus } from '@/redux/statusSlice';

import { parseISO, isAfter, isBefore, isEqual } from 'date-fns';
import StatusChartComponent from './components/StatusChartComponent';



const DashboardPage = () => {
  const card = useSelector(selectCard);
  const status = useSelector(selectStatus);
  const data = useSelector(selectData);
  const transactionData = useSelector(selectTransaction);
  const dispatch = useDispatch();
  

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

  // --- Add these totals ---
  const totalOperational = bpChartData?.current.reduce((sum:any, item:any) => sum + (item.operational ?? 0), 0);
  const totalDevelopmental = bpChartData?.current.reduce((sum:any, item:any) => sum + (item.developmental ?? 0), 0);
  const totalWithdraw = bpChartData?.current.reduce((sum:any, item:any) => sum + (item.withdraw ?? 0), 0);


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
  return regionMap[region] || region.toLowerCase().replace(/\s+/g, '');
}















  function getBPLS() {
    axios.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/BP1 UR Input', {
      headers: {
        Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
      }
    }).then((response) => {
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
      const groupedByMonth: Record<string, Record<string, any>> = {};
      console.log("BP records", records[0]);
      records.forEach((row: any) => {
        
        const period = row[idx.period];
        const lgu = row[idx.lgu]; // Use dictRo here
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

      // Format result as requested
      const BP = Object.entries(groupedByMonth).map(([date, lgus]) => ({
        date,
        data: Object.values(lgus),
      }));

      const result = { BP };

   

      console.log("BP result", result);


       dispatch(setStatus({
        ...status,
        BP: result.BP,
      }));
    });

    
  }

  // function getBPBC(){

  //  axios.get( `${import.meta.env.VITE_URL}/api/bc/`,).then((response)=>{

  //     console.log("BPBC response", response.data);
  //   })
      
  // }




  useEffect(() => {
    getBPLS();
  }, []);





















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
          showInfo={`total no. of transaction on Business Permit as of ${data.startDate} - ${data.endDate}`}
        />

        <div className=' gap-4 grid col-span-2 grid-cols-3 lg:grid-cols-2  sm:grid-cols-2 '>

            <StatisticCard 
          title="No. of LGU Operational"
          value={totalOperational}
          showInfo={`No. of LGU that has Operational Status on Business Permit as of ${data.startDate} - ${data.endDate}`}
        />
        <StatisticCard 
          title="No. of LGU Developmental"
          value={totalDevelopmental}
          showInfo={`No. of LGU that has Developmental Status on Business Permit as of ${data.startDate} - ${data.endDate}`}
        />
        <StatisticCard 
          title="No. of LGU Withdraw"
          value={totalWithdraw}
          showInfo={`No. of LGU that has Withdrawn Status on Business Permit as of ${data.startDate} - ${data.endDate}`}
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
            - (((filteredCard?.totalmalePaid ?? 0) + (filteredCard?.totalmalePending ?? 0)) + ((filteredCard?.totalfemalePaid ?? 0) + (filteredCard?.totalfemalePending ?? 0))) < 0 ? 0 :((filteredCard?.totalnewPending ?? 0) + (filteredCard?.totalnewPaid ?? 0) + (filteredCard?.totalrenewPending ?? 0) + (filteredCard?.totalrenewPaid ?? 0))
            - (((filteredCard?.totalmalePaid ?? 0) + (filteredCard?.totalmalePending ?? 0)) + ((filteredCard?.totalfemalePaid ?? 0) + (filteredCard?.totalfemalePending ?? 0)))
          }
        />
      </div>
      
      {/* Charts */}

          
      <StatusChartComponent 
        data={bpChartData?.current || []}
        raw={bpChartData?.breakdown || []}
        title="Operational vs. Developmental vs. Withdrawal (BPLS)"
        period={`${data.startDate} - ${data.endDate}`}
      />
      

      
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
  );
};

export default DashboardPage;
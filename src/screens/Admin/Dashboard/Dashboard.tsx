import { useState } from 'react';
import FilterSection from './components/FilterSection';
import StatisticCard from './components/StatisticCard';
import BarChartComponent from './components/BarChartComponent';
import { 
  mainStats, 
  genderStats, 
  operationalLguChartData, 
  monthlyComparisonChartData,
  transactionChartData
} from './utils/mockData';
import { StatisticData } from './utils/types';
import TransactionChart from './components/TransChartComponent2';

const DashboardPage = () => {
  const [statistics] = useState<{
    main: StatisticData[];
    gender: StatisticData[];
  }>({
    main: mainStats,
    gender: genderStats,
  });

  return (
    <div className="p-6 max-w-[1200px] mx-auto  bg-background ">
      <FilterSection />
      
      {/* Main statistics */}
      <div className="grid grid-cols-3 md:grid-cols-2 sm:grid-cols-1  gap-4 mb-6">
        {statistics.main.map((stat, index) => (
          <StatisticCard 
            key={`main-stat-${index}`}
            title={stat.title} 
            value={stat.value} 
            showInfo={stat.showInfo}
          />
        ))}
      </div>
      
      {/* Gender statistics */}
      <div className="grid grid-cols-5 md:grid-cols-2 sm:grid-cols-1 gap-4 mb-6">
        {statistics.gender.map((stat, index) => (
          <StatisticCard 
            key={`gender-stat-${index}`}
            title={stat.title} 
            value={stat.value}
          />
        ))}
      </div>
      
      {/* Charts */}
      <BarChartComponent 
        data={operationalLguChartData}
        title="NUMBER OF OPERATIONAL LGU"
        barKey1="operational"
        barKey2="developmental"
        barName1="Operational"
        barName2="Developmental"
        period="2024-12"
      />
      
      <BarChartComponent 
        data={monthlyComparisonChartData}
        title="NUMBER OF OPERATIONAL LGU AS OF MAY"
        barKey1="previous"
        barKey2="current"
        barName1="Previous Month"
        barName2="Current Month"
        period="2024-12"
      />
      <TransactionChart
        data={transactionChartData}
        title="NUMBER OF TRANSACTION PER REGION FOR NEW APPLICATION"
        period="2024-12"
      />
    </div>
  );
};

export default DashboardPage;
import React, { useState, useMemo } from 'react';
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useSelector } from 'react-redux';
import { selectData } from '@/redux/dataSlice';
import { selectCharts } from '@/redux/chartSlice';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface ComparisonChartProps {
  bpData?: any[];
  wpData?: any[];
  brgyData?: any[];
  bpcoData?: any[];
  bpbpData?: any[];
  bpRaw?: any[];
  wpRaw?: any[];
  brgyRaw?: any[];
  bpcoRaw?: any[];
  bpbpRaw?: any[];
  modules: string[];
  title: string;
  startDate: string;
  endDate: string;
}

const ComparisonChartComponent: React.FC<ComparisonChartProps> = ({
  bpData = [],
  wpData = [],
  brgyData = [],
  bpcoData = [],
  bpbpData = [],
  bpRaw = [],
  wpRaw = [],
  brgyRaw = [],
  bpcoRaw = [],
  bpbpRaw = [],
  modules,
  title,
  startDate,
  endDate,
}) => {
  const data = useSelector(selectData);
  const charts = useSelector(selectCharts);
  
  // Get chart type from Redux, defaulting to bar
  let reduxChartType: 'bar' | 'pie' = 'bar';
  if (charts.includes('Pie Graph')) reduxChartType = 'pie';
  else if (charts.includes('Bar Graph')) reduxChartType = 'bar';

  const [chartType, setChartType] = useState<'bar' | 'pie'>(reduxChartType);
  const [hidden, setHidden] = useState<boolean[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<'operational' | 'developmental' | 'withdraw'>('operational');

  // Chart type options
  const chartTypes = [
    { label: 'Bar', value: 'bar' },
    { label: 'Pie', value: 'pie' }
  ];

  // Status options
  const statusOptions = [
    { label: 'Operational', value: 'operational' },
    { label: 'Developmental', value: 'developmental' },
    { label: 'Withdraw', value: 'withdraw' }
  ];

  // Get module data based on selected chart module filter
  const getModuleData = (moduleData: any[], moduleName: string) => {
    const selectedModules = Array.isArray(data?.selectedChartModuleFilter) ? data.selectedChartModuleFilter : [];
    
    // If no filters selected or module is in selected filters
    if (selectedModules.length === 0 || selectedModules.includes(moduleName)) {
      return moduleData;
    }
    
    return [];
  };

  // Calculate comparison data: start date vs end date operational totals
  const comparisonData = useMemo(() => {
    const moduleResults: { [key: string]: { startDate: number; endDate: number } } = {};

    // Process each module type
    const processModuleData = (moduleData: any[], moduleRaw: any[], moduleName: string, shortName: string) => {
      const filteredData = getModuleData(moduleData, moduleName);
      const filteredRaw = getModuleData(moduleRaw, moduleName);
      
      if (filteredData.length > 0 && filteredRaw.length > 0) {
        let startDateTotal = 0;
        let endDateTotal = 0;

        // Find data for start date and end date from breakdown
        const startDateStr = startDate;
        const endDateStr = endDate;
        
        // Look for exact date matches in breakdown data
        const startDateEntry = filteredRaw.find((item: any) => item.date === startDateStr);
        const endDateEntry = filteredRaw.find((item: any) => item.date === endDateStr);
        
        // Calculate totals from breakdown data
        if (startDateEntry && startDateEntry.data) {
          startDateTotal = startDateEntry.data.reduce((sum: number, item: any) => 
            sum + (Number(item[selectedStatus]) || 0), 0
          );
        }
        
        if (endDateEntry && endDateEntry.data) {
          endDateTotal = endDateEntry.data.reduce((sum: number, item: any) => 
            sum + (Number(item[selectedStatus]) || 0), 0
          );
        }

        // If no exact date matches found, use the first and last dates in the range
        if (startDateTotal === 0 && endDateTotal === 0 && filteredRaw.length > 0) {
          // Sort by date and get first and last
          const sortedRaw = [...filteredRaw].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          
          if (sortedRaw[0] && sortedRaw[0].data) {
            startDateTotal = sortedRaw[0].data.reduce((sum: number, item: any) => 
              sum + (Number(item[selectedStatus]) || 0), 0
            );
          }
          
          if (sortedRaw[sortedRaw.length - 1] && sortedRaw[sortedRaw.length - 1].data) {
            endDateTotal = sortedRaw[sortedRaw.length - 1].data.reduce((sum: number, item: any) => 
              sum + (Number(item[selectedStatus]) || 0), 0
            );
          }
        }

        moduleResults[shortName] = { 
          startDate: startDateTotal, 
          endDate: endDateTotal
        };
      }
    };

    // Process all module data with their corresponding raw breakdown data
    if (modules.includes("Business Permit")) {
      processModuleData(bpData, bpRaw, "Business Permit", "Business Permit");
    }
    if (modules.includes("Working Permit")) {
      processModuleData(wpData, wpRaw, "Working Permit", "Working Permit");
    }
    if (modules.includes("Barangay Clearance")) {
      processModuleData(brgyData, brgyRaw, "Barangay Clearance", "Barangay Clearance");
    }
    if (modules.includes("Certificate of Occupancy")) {
      processModuleData(bpcoData, bpcoRaw, "Building Permit & Certificate of Occupancy", "Building Permit & Certificate of Occupancy");
    }
    if (modules.includes("Building Permit")) {
      processModuleData(bpbpData, bpbpRaw, "Building Permit", "Building Permit");
    }

    return moduleResults;
  }, [bpData, wpData, brgyData, bpcoData, bpbpData, bpRaw, wpRaw, brgyRaw, bpcoRaw, bpbpRaw, modules, startDate, endDate, data?.selectedChartModuleFilter, selectedStatus]);

  // Calculate increase data for circular charts
  const increaseData = useMemo(() => {
    return Object.entries(comparisonData).map(([module, data]) => {
      const startTotal = data.startDate || 0;
      const endTotal = data.endDate || 0;
      const increase = endTotal - startTotal;
      
      // Calculate percentage change based on different scenarios
      let percentage = 0;
      if (startTotal === 0 && endTotal > 0) {
        // If starting from 0, use 100% increase
        percentage = 100;
      } else if (startTotal > 0 && endTotal === 0) {
        // If ending at 0, use -100% decrease
        percentage = -100;
      } else if (startTotal === endTotal) {
        // No change
        percentage = 0;
      } else {
        // For all other cases, calculate absolute percentage change
        // This ensures correct percentage for both increases and decreases
        percentage = ((endTotal - startTotal) / Math.abs(startTotal)) * 100;
      }

      // Only include in results if there's actual data to show
      return {
        module,
        increase,
        percentage,
        startTotal,
        endTotal,
        absolutePercentage: Math.abs(percentage)
      };
    }).filter(item => {
      // Show the item if either:
      // 1. There's data at the start or end
      // 2. There's a change between start and end (to show items that went to 0)
      return (item.startTotal > 0 || item.endTotal > 0) || item.increase !== 0;
    });
  }, [comparisonData]);

  // Format dates for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const chartData = {
    labels: Object.keys(comparisonData),
    datasets: [
      {
        label: formatDate(startDate),
        data: Object.values(comparisonData).map(item => hidden[0] ? 0 : item.startDate),
        backgroundColor: '#ffd700',
        borderWidth: 0,
        hidden: hidden[0],
      },
      {
        label: formatDate(endDate),
        data: Object.values(comparisonData).map(item => hidden[1] ? 0 : item.endDate),
        backgroundColor: '#0047cd',
        borderWidth: 0,
        hidden: hidden[1],
      },
    ],
  };

  // Pie chart data - only 2 datasets for start and end date totals
  const pieData = {
    labels: [formatDate(startDate), formatDate(endDate)],
    datasets: [
      {
        label: `${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Data`,
        data: [
          hidden[0] ? 0 : Object.values(comparisonData).reduce((sum: number, item: any) => sum + item.startDate, 0),
          hidden[1] ? 0 : Object.values(comparisonData).reduce((sum: number, item: any) => sum + item.endDate, 0)
        ],
        backgroundColor: [
          hidden[0] ? 'transparent' : '#ffd700',
          hidden[1] ? 'transparent' : '#0047cd'
        ],
        borderColor: ['#ffd700', '#0047cd'],
        borderWidth: 1,
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // We'll use custom legend
      },
      title: {
        display: false,
      },
      datalabels: {
        display: true,
        color: 'black',
        font: {
          weight: 'bold' as const,
          size: 11,
        },
        formatter: (value: number) => {
          return value > 0 ? value : '';
        },
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            // Show the module name and both dates in the title
            const moduleKey = context[0].label;
            return `${moduleKey} `;
          },
          label: function(context: any) {
            const label = context.dataset.label || '';
            const value = context.parsed.y || context.parsed;
            const dateStr = label; // This already contains the formatted date
            return `${dateStr}: ${value} ${selectedStatus}`;
          },
          afterBody: function(context: any) {
            if (chartType === 'pie') {
              // For pie chart, get the module from the dataset label
              const datasetIndex = context[0].datasetIndex;
              const moduleKeys = Object.keys(comparisonData);
              const moduleKey = moduleKeys[datasetIndex];
              const moduleData = comparisonData[moduleKey];
              
              if (moduleData) {
                const totalIncrease = moduleData.endDate - moduleData.startDate;
                const percentageChange = moduleData.startDate > 0 ? (((moduleData.endDate - moduleData.startDate) / moduleData.startDate) * 100) : 0;
                const changeText = totalIncrease >= 0 ? 'increase' : 'decrease';
                const sign = totalIncrease >= 0 ? '+' : '';
                
                return [
                  '',
                  `${moduleKey} Module Only:`,
                  `Start Date: ${startDate} (${moduleData.startDate})`,
                  `End Date: ${endDate} (${moduleData.endDate})`,
                  '',
                  `Change: ${sign}${totalIncrease} (${sign}${percentageChange.toFixed(1)}% ${changeText})`,
                  '',
                  'Hover over other segments to see other modules'
                ];
              }
            } else {
              // For bar chart, show the specific module being hovered
              const moduleKey = context[0].label;
              const moduleData = comparisonData[moduleKey];
              
              if (moduleData) {
                const totalIncrease = moduleData.endDate - moduleData.startDate;
                const percentageChange = moduleData.startDate > 0 ? (((moduleData.endDate - moduleData.startDate) / moduleData.startDate) * 100) : 0;
                const changeText = totalIncrease >= 0 ? 'increase' : 'decrease';
                const sign = totalIncrease >= 0 ? '+' : '';
                
                return [
                  '',
                  `${moduleKey} Details:`,
                  `${formatDate(startDate)}: ${moduleData.startDate}`,
                  `${formatDate(endDate)}: ${moduleData.endDate}`,
                  `Change: ${sign}${totalIncrease} (${sign}${percentageChange.toFixed(1)}% ${changeText})`,
                  ''
                ];
              }
            }
            
            return ['', 'No data available'];
          }
        },
        displayColors: true,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: 'white',
        bodyColor: 'white',
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
      },
    },
    scales: chartType !== 'pie' ? {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 50,
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.1)',
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    } : undefined,
  };

  // Custom legend items - only 2 items for start and end date
  const legendItems = [
    {
      label: formatDate(startDate),
      color: '#ffd700',
      hidden: hidden[0] || false,
      idx: 0
    },
    {
      label: formatDate(endDate),
      color: '#0047cd',
      hidden: hidden[1] || false,
      idx: 1
    }
  ];

  const handleLegendClick = (index: number) => {
    const newHidden = [...hidden];
    newHidden[index] = !newHidden[index];
    setHidden(newHidden);
  };

  // Calculate min width for chart
  const minWidth = Math.max(400, Object.keys(comparisonData).length * 120);

  const hasData = Object.keys(comparisonData).length > 0 && 
                 Object.values(comparisonData).some(item => item.startDate > 0 || item.endDate > 0);

  if (!hasData) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-sm font-bold uppercase mb-4">{title}</h2>
        <div className="flex items-center justify-center h-96 text-gray-500">
          <div className="text-center">
            <p className="text-lg mb-2">No data available</p>
            <p className="text-sm">Please select modules or adjust your date range</p>
          </div>
        </div>
      </div>
    );
  }

  // Create half-circle progress chart component
  const CircularProgressCard = ({ item }: { item: any }) => {
    const getColorByPercentage = (percentage: number, isIncrease: boolean, startTotal: number, endTotal: number) => {
      // No change
      if (startTotal === endTotal) return '#3b82f6'; // blue
      
      // Complete changes
      if (startTotal === 0 && endTotal > 0) return '#22c55e'; // New entries (green)
      if (startTotal > 0 && endTotal === 0) return '#ef4444'; // Complete removal (red)
      
      // Percentage-based changes
      if (isIncrease) {
        if (percentage >= 100) return '#22c55e'; // green for doubling or more
        if (percentage >= 50) return '#eab308'; // yellow for significant increase
        return '#3b82f6'; // blue for moderate increase
      } else {
        if (percentage <= -100) return '#ef4444'; // red for complete loss
        if (percentage <= -50) return '#f97316'; // orange for significant decrease
        return '#3b82f6'; // blue for moderate decrease
      }
    };

    const isIncrease = item.increase >= 0;
    const color = getColorByPercentage(item.absolutePercentage, isIncrease, item.startTotal, item.endTotal);
    const displayPercentage = Math.min(item.absolutePercentage, 100);
    
    // Calculate stroke-dasharray for half circle (semicircle)
    const radius = 45;
    const halfCircumference = Math.PI * radius; // Half of 2πr
    const strokeDasharray = (displayPercentage / 100) * halfCircumference;

    return (
      <div className="bg-white p-4 rounded-lg border border-gray-200 min-w-[200px]">
        <div className="flex flex-col gap-10">

           <div className="flex items-center justify-center">
            <div className="relative  w-44  h-24">
              <svg className="w-full h-full" viewBox="0 0 100 50">
                {/* Background half circle */}
                <path
                  d="M 10 45 A 35 35 0 0 1 90 45"
                  stroke="#f3f4f6"
                  strokeWidth="15"
                  fill="transparent"
                   strokeLinecap="butt"
                />
                {/* Progress half circle */}
                <path
                  d="M 10 45 A 35 35 0 0 1 90 45"
                  stroke={color}
                  strokeWidth="15"
                  fill="transparent"
                  strokeLinecap="butt"
                  strokeDasharray={halfCircumference}
                  strokeDashoffset={halfCircumference - strokeDasharray}
                  className="transition-all duration-500 ease-in-out"
                />
              </svg>
              <div className="absolute inset-0 flex items-end justify-center pb-1">
                <div className="text-center">
                  <div className="text-lg font-bold" style={{ color }}>
                    {item.absolutePercentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-3">
            <h3 className="font-bold text-sm text-gray-900 mb-1">{item.module.toUpperCase()}</h3>
            <p className="text-xs text-gray-600 mb-1">
              An {isIncrease ? 'increase' : 'decrease'} of <span className="font-bold">{Math.abs(item.increase)}</span> {selectedStatus.toUpperCase()}s in
            </p>
            <p className="text-xs text-gray-600">
              {item.module} from <span className="font-bold">{formatDate(startDate)}</span> ( {item.startTotal}-
              {selectedStatus.toUpperCase()}s) to <span className="font-bold">{formatDate(endDate)}</span> ( {item.endTotal}-  
              {selectedStatus.toUpperCase()}s)
            </p>
          </div>
          
         
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Main Comparison Chart */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold w-[85%] uppercase">
            {chartType === "pie"
              ? `Date Comparison (Percentage) - ${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Data`
              : `Date Comparison - ${selectedStatus.charAt(0).toUpperCase() + selectedStatus.slice(1)} Data`}
          </h2>
          <div className="flex gap-4">
            {/* Status Selector */}
            <div className="flex gap-2">
              {statusOptions.map(status => (
                <button
                  key={status.value}
                  className={`px-2 py-1 rounded text-xs border ${
                    selectedStatus === status.value ? 'bg-blue-600 text-white' : 'bg-gray-100'
                  }`}
                  onClick={() => setSelectedStatus(status.value as 'operational' | 'developmental' | 'withdraw')}
                >
                  {status.label}
                </button>
              ))}
            </div>
            
            {/* Chart Type Selector */}
            <div className="flex gap-2">
              {chartTypes.map(type => (
                <button
                  key={type.value}
                  className={`px-2 py-1 rounded text-xs border ${
                    chartType === type.value ? 'bg-blue-600 text-white' : 'bg-gray-100'
                  }`}
                  onClick={() => setChartType(type.value as 'bar' | 'pie')}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Custom legend styled like your other charts */}
        <div className="flex flex-wrap gap-6 mb-2">
          {legendItems.map((item) => (
            <button
              key={item.label}
              type="button"
              className={`flex items-center gap-2 focus:outline-none ${item.hidden ? 'opacity-40' : ''}`}
              onClick={() => handleLegendClick(item.idx)}
              tabIndex={0}
              aria-pressed={!item.hidden}
            >
              <span 
                className="w-10 h-[16px]" 
                style={{
                  display: 'inline-block',
                  background: item.color as string,
                  opacity: item.hidden ? 0.4 : 1,
                  border: item.hidden ? '2px solid #ccc' : 'none',
                }} 
              />
              <span className="text-xs">{item.label}</span>
            </button>
          ))}
        </div>

        <div className="w-full overflow-x-auto">
          <div style={{ minWidth: chartType === 'pie' ? 400 : minWidth, height: 400 }} className="relative">
            {chartType === 'bar' && (
              <Bar data={chartData} options={options} plugins={[ChartDataLabels]} />
            )}
            {chartType === 'pie' && (
              <Pie data={pieData} options={options} plugins={[ChartDataLabels]} />
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mt-2">
          Comparison Period: <span className="font-semibold">{startDate} vs {endDate}</span>
        </p>
      </div>

      {/* Circular Progress Cards */}
      {increaseData.length > 0 && (
        <div className="space-y-4 bg-white p-6 rounded-lg shadow-md">
          <h3 className="text-lg font-bold text-gray-900">Module Change Analysis</h3>
          <div className="grid grid-cols-3 md:grid-cols-2 lg:grid-cols-3 sm:grid-cols-1 gap-4">
            {increaseData.map((item, index) => (
              <CircularProgressCard key={`${item.module}-${index}`} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonChartComponent;
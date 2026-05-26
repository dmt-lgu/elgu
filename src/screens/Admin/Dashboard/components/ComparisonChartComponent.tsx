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

  // Maps locationName short codes → breakdown display names (from _REGION_DISPLAY_MAP in backend)
  const LOCATION_TO_DISPLAY: Record<string, string> = {
    'I': 'Region 1', 'II': 'Region 2', 'III': 'Region 3',
    'IV-A': 'Region 4A', 'IV-B': 'MIMAROPA', 'V': 'Region 5',
    'VI': 'Region 6', 'VII': 'Region 7', 'VIII': 'Region 8',
    'IX': 'Region 9', 'X': 'Region 10', 'XI': 'Region 11',
    'XII': 'Region 12', 'XIII': 'Region 13',
    'CAR': 'CAR', 'NCR': 'NCR', 'NIR': 'NIR',
    'BARMM I': 'BARMM', 'BARMM II': 'BARMM',
  };
  
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

    // Build set of breakdown display names for the selected regions (client-side filter)
    const selectedLocations: string[] = Array.isArray(data?.locationName) ? data.locationName : [];
    const selectedDisplayNames = new Set<string>(
      selectedLocations.map((loc: string) => LOCATION_TO_DISPLAY[loc] ?? loc)
    );
    const filterByRegion = (items: any[]) =>
      selectedDisplayNames.size === 0
        ? items
        : items.filter((item: any) => selectedDisplayNames.has(item.name));

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

        // Calculate totals from breakdown data, filtered by selected regions
        if (startDateEntry && startDateEntry.data) {
          startDateTotal = filterByRegion(startDateEntry.data).reduce((sum: number, item: any) =>
            sum + (Number(item[selectedStatus]) || 0), 0
          );
        }

        if (endDateEntry && endDateEntry.data) {
          endDateTotal = filterByRegion(endDateEntry.data).reduce((sum: number, item: any) =>
            sum + (Number(item[selectedStatus]) || 0), 0
          );
        }

        // If no exact date matches found, use the first and last dates in the range
        if (startDateTotal === 0 && endDateTotal === 0 && filteredRaw.length > 0) {
          // Sort by date and get first and last
          const sortedRaw = [...filteredRaw].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          if (sortedRaw[0] && sortedRaw[0].data) {
            startDateTotal = filterByRegion(sortedRaw[0].data).reduce((sum: number, item: any) =>
              sum + (Number(item[selectedStatus]) || 0), 0
            );
          }

          if (sortedRaw[sortedRaw.length - 1] && sortedRaw[sortedRaw.length - 1].data) {
            endDateTotal = filterByRegion(sortedRaw[sortedRaw.length - 1].data).reduce((sum: number, item: any) =>
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
  }, [bpData, wpData, brgyData, bpcoData, bpbpData, bpRaw, wpRaw, brgyRaw, bpcoRaw, bpbpRaw, modules, startDate, endDate, data?.selectedChartModuleFilter, data?.locationName, selectedStatus]);

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
        formatter: (value: number, context: any) => {
          if (chartType === 'pie') {
            const dataset = context.chart.data.datasets[0];
            const total = (dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
            if (!total || value <= 0) return '';
            return `${((value / total) * 100).toFixed(1)}%`;
          }
          return value > 0 ? value : '';
        },
      },
      tooltip: {
        callbacks: {
          title: function(context: any) {
            const label = context[0].label;
            return label;
          },
          label: function(context: any) {
            const rawValue: number = context.raw ?? context.parsed ?? 0;
            if (chartType === 'pie') {
              // Compute the same percentage shown on the slice
              const dataset = context.chart.data.datasets[0];
              const total = (dataset.data as number[]).reduce((a: number, b: number) => a + b, 0);
              const pct = total > 0 ? ((rawValue / total) * 100).toFixed(1) : '0.0';
              return ` ${rawValue} ${selectedStatus} (${pct}%)`;
            }
            const datasetLabel = context.dataset.label || '';
            return ` ${datasetLabel}: ${rawValue} ${selectedStatus}`;
          },
          afterBody: function(context: any) {
            if (chartType === 'pie') {
              // dataIndex distinguishes which slice (0 = startDate, 1 = endDate)
              const dataIndex = context[0].dataIndex;
              const startTotal = Object.values(comparisonData).reduce((s, m) => s + m.startDate, 0);
              const endTotal   = Object.values(comparisonData).reduce((s, m) => s + m.endDate,   0);
              const change     = endTotal - startTotal;
              const sign       = change >= 0 ? '+' : '';
              const pctChange  = startTotal > 0 ? `${sign}${(((endTotal - startTotal) / startTotal) * 100).toFixed(1)}%` : 'N/A';
              if (dataIndex === 0) {
                return ['', `Period start total: ${startTotal}`, `Period end total:   ${endTotal}`, `Overall change: ${sign}${change} (${pctChange})`];
              }
              return ['', `Period start total: ${startTotal}`, `Period end total:   ${endTotal}`, `Overall change: ${sign}${change} (${pctChange})`];
            } else {
              const moduleKey  = context[0].label;
              const moduleData = comparisonData[moduleKey];
              if (moduleData) {
                const diff = moduleData.endDate - moduleData.startDate;
                const sign = diff >= 0 ? '+' : '';
                const pct  = moduleData.startDate > 0
                  ? `${sign}${(((moduleData.endDate - moduleData.startDate) / moduleData.startDate) * 100).toFixed(1)}%`
                  : 'N/A';
                return [
                  '',
                  `${formatDate(startDate)}: ${moduleData.startDate}`,
                  `${formatDate(endDate)}: ${moduleData.endDate}`,
                  `Change: ${sign}${diff} (${pct})`,
                ];
              }
            }
            return [];
          },
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
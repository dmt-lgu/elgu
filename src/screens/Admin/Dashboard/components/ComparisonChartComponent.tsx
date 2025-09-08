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
  loading?: boolean;
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
  loading = false
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
      processModuleData(bpcoData, bpcoRaw, "Certificate of Occupancy", "Certificate of Occupancy");
    }
    if (modules.includes("Building Permit")) {
      processModuleData(bpbpData, bpbpRaw, "Building Permit", "Building Permit");
    }

    return moduleResults;
  }, [bpData, wpData, brgyData, bpcoData, bpbpData, bpRaw, wpRaw, brgyRaw, bpcoRaw, bpbpRaw, modules, startDate, endDate, data?.selectedChartModuleFilter, selectedStatus]);

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

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-sm font-bold uppercase mb-4">{title}</h2>
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

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

  return (
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
                  selectedStatus === status.value ? 'bg-blue-600 text-white' : 'bg-background'
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
                  chartType === type.value ? 'bg-primary text-white' : 'bg-background'
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

      <p className="text-sm text-secondary-foreground mt-2">
        Comparison Period: <span className="font-semibold">{startDate} vs {endDate}</span>
      </p>
    </div>
  );
};

export default ComparisonChartComponent;

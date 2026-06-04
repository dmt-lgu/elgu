import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
import Select from 'react-select';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { useSelector } from 'react-redux';
import { selectCharts } from '@/redux/chartSlice';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

interface BarChartProps {
  data: any[];
  title: string;
  period?: string;
  startDate?: string;
  endDate?: string;
  raw?: any;
  // New props for multi-module support
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
  lcrData?: any[];
  lcrRaw?: any[];
  enewsData?: any[];
  enewsRaw?: any[];
  cedulaData?: any[];
  cedulaRaw?: any[];
  modules?: string[];
  loading?: boolean;
}

const chartTypes = [
  { label: 'Bar', value: 'bar' },
  { label: 'Line', value: 'line' },
  { label: 'Pie', value: 'pie' },
];

function aggregateData(data: any[]) {
  const map = new Map<string, { operational: number; developmental: number; withdraw: number }>();
  data.forEach(item => {
    if (!map.has(item.name)) {
      map.set(item.name, { operational: 0, developmental: 0, withdraw: 0 });
    }
    const entry = map.get(item.name)!;
    entry.operational += Number(item.operational) || 0;
    entry.developmental += Number(item.developmental) || 0;
    entry.withdraw += Number(item.withdraw) || 0;
  });
  return Array.from(map.entries()).map(([name, values]) => ({
    name,
    ...values,
  }));
}

const COLORS = ['#2563eb', '#fbbf24', '#dc2626'];

const StatusChartComponent: React.FC<BarChartProps> = ({
  
  period,
 
  // New props
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
  lcrData = [],
  lcrRaw = [],
  enewsData = [],
  enewsRaw = [],
  cedulaData = [],
  cedulaRaw = [],
  modules = [],
  loading
}) => {
  const charts = useSelector(selectCharts);

  let reduxChartType: 'bar' | 'line' | 'pie' = 'bar';
  if (charts.includes('Pie Graph')) reduxChartType = 'pie';
  else if (charts.includes('Line Graph')) reduxChartType = 'line';
  else if (charts.includes('Bar Graph')) reduxChartType = 'bar';

  const [hidden, setHidden] = useState<boolean[]>([false, false, false]);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>(reduxChartType);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false); // Track if we've initialized

  useEffect(() => {
    setChartType(reduxChartType);
  }, [reduxChartType]);

  useEffect(() => {
    // Only auto-select the first module on initial load, not when user clears selection
    if (modules.length > 0 && !hasInitialized) {
      setSelectedModules([modules[0]]);
      setHasInitialized(true);
    }
  }, [modules, hasInitialized]);

  // Combine all module data
  const combinedData = useMemo(() => {
    const combined = new Map<string, { operational: number; developmental: number; withdraw: number }>();
    
    // Add Business Permit data
    if (modules.includes("Business Permit")) {
      bpData.forEach(item => {
        const key = item.name;
        if (!combined.has(key)) {
          combined.set(key, { operational: 0, developmental: 0, withdraw: 0 });
        }
        const entry = combined.get(key)!;
        entry.operational += Number(item.operational) || 0;
        entry.developmental += Number(item.developmental) || 0;
        entry.withdraw += Number(item.withdraw) || 0;
      });
    }

    // Add Working Permit data
    if (modules.includes("Working Permit")) {
      wpData.forEach(item => {
        const key = item.name;
        if (!combined.has(key)) {
          combined.set(key, { operational: 0, developmental: 0, withdraw: 0 });
        }
        const entry = combined.get(key)!;
        entry.operational += Number(item.operational) || 0;
        entry.developmental += Number(item.developmental) || 0;
        entry.withdraw += Number(item.withdraw) || 0;
      });
    }

    // Add Barangay Clearance data
    if (modules.includes("Barangay Clearance")) {
      brgyData.forEach(item => {
        const key = item.name;
        if (!combined.has(key)) {
          combined.set(key, { operational: 0, developmental: 0, withdraw: 0 });
        }
        const entry = combined.get(key)!;
        entry.operational += Number(item.operational) || 0;
        entry.developmental += Number(item.developmental) || 0;
        entry.withdraw += Number(item.withdraw) || 0;
      });
    }

    // Add Certificate of Occupancy data
    if (modules.includes("Certificate of Occupancy")) {
      bpcoData.forEach(item => {
        const key = item.name;
        if (!combined.has(key)) {
          combined.set(key, { operational: 0, developmental: 0, withdraw: 0 });
        }
        const entry = combined.get(key)!;
        entry.operational += Number(item.operational) || 0;
        entry.developmental += Number(item.developmental) || 0;
        entry.withdraw += Number(item.withdraw) || 0;
      });
    }

    // Add Building Permit data
    if (modules.includes("Building Permit")) {
      bpbpData.forEach(item => {
        const key = item.name;
        if (!combined.has(key)) {
          combined.set(key, { operational: 0, developmental: 0, withdraw: 0 });
        }
        const entry = combined.get(key)!;
        entry.operational += Number(item.operational) || 0;
        entry.developmental += Number(item.developmental) || 0;
        entry.withdraw += Number(item.withdraw) || 0;
      });
    }

    const addData = (src: any[]) => src.forEach(item => {
      if (!combined.has(item.name)) combined.set(item.name, { operational: 0, developmental: 0, withdraw: 0 });
      const e = combined.get(item.name)!;
      e.operational   += Number(item.operational)   || 0;
      e.developmental += Number(item.developmental) || 0;
      e.withdraw      += Number(item.withdraw)      || 0;
    });

    if (modules.includes('Local Civil Registry')) addData(lcrData);
    if (modules.includes('eNews'))                addData(enewsData);
    if (modules.includes('Cedula'))               addData(cedulaData);

    return Array.from(combined.entries()).map(([name, values]) => ({ name, ...values }));
  }, [bpData, wpData, brgyData, bpcoData, bpbpData, lcrData, enewsData, cedulaData, modules]);

  // Get selected modules data for breakdown (combine multiple selections)
  const getSelectedModulesData = () => {
    if (selectedModules.length === 0) {
      return { data: combinedData, raw: null };
    }

    const combinedSelectedData = new Map<string, { operational: number; developmental: number; withdraw: number }>();
    const combinedRawData: any[] = [];

    selectedModules.forEach(module => {
      let moduleData: any[] = [];
      let moduleRaw: any[] = [];

      switch (module) {
        case 'Business Permit':
          moduleData = bpData;
          moduleRaw = bpRaw;
          break;
        case 'Working Permit':
          moduleData = wpData;
          moduleRaw = wpRaw;
          break;
        case 'Barangay Clearance':
          moduleData = brgyData;
          moduleRaw = brgyRaw;
          break;
        case 'Certificate of Occupancy':
          moduleData = bpcoData;
          moduleRaw = bpcoRaw;
          break;
        case 'Building Permit':
          moduleData = bpbpData;
          moduleRaw = bpbpRaw;
          break;
        case 'Building Permit & Certificate of Occupancy':
          moduleData = [...bpbpData, ...bpcoData];
          moduleRaw = [...bpbpRaw, ...bpcoRaw];
          break;
        case 'Local Civil Registry':
          moduleData = lcrData;
          moduleRaw = lcrRaw;
          break;
        case 'eNews':
          moduleData = enewsData;
          moduleRaw = enewsRaw;
          break;
        case 'Cedula':
          moduleData = cedulaData;
          moduleRaw = cedulaRaw;
          break;
      }

      // Combine data
      moduleData.forEach(item => {
        const key = item.name;
        if (!combinedSelectedData.has(key)) {
          combinedSelectedData.set(key, { operational: 0, developmental: 0, withdraw: 0 });
        }
        const entry = combinedSelectedData.get(key)!;
        entry.operational += Number(item.operational) || 0;
        entry.developmental += Number(item.developmental) || 0;
        entry.withdraw += Number(item.withdraw) || 0;
      });

      // Combine raw data by merging dates
      moduleRaw.forEach(rawPeriod => {
        const existingPeriod = combinedRawData.find(p => p.date === rawPeriod.date);
        if (existingPeriod) {
          // Merge data for the same date
          rawPeriod.data.forEach((item: any) => {
            const existingItem = existingPeriod.data.find((d: any) => d.name === item.name);
            if (existingItem) {
              existingItem.operational = (existingItem.operational || 0) + (Number(item.operational) || 0);
              existingItem.developmental = (existingItem.developmental || 0) + (Number(item.developmental) || 0);
              existingItem.withdraw = (existingItem.withdraw || 0) + (Number(item.withdraw) || 0);
            } else {
              existingPeriod.data.push({
                name: item.name,
                operational: Number(item.operational) || 0,
                developmental: Number(item.developmental) || 0,
                withdraw: Number(item.withdraw) || 0
              });
            }
          });
        } else {
          // Add new period
          combinedRawData.push({
            date: rawPeriod.date,
            data: rawPeriod.data.map((item: any) => ({
              name: item.name,
              operational: Number(item.operational) || 0,
              developmental: Number(item.developmental) || 0,
              withdraw: Number(item.withdraw) || 0
            }))
          });
        }
      });
    });

    const resultData = Array.from(combinedSelectedData.entries()).map(([name, values]) => ({
      name,
      ...values,
    }));

    return { data: resultData, raw: combinedRawData };
  };

  // Use combined data for chart, but selected modules data for breakdown
  const chartDataSource = combinedData;
  const { data: selectedCurrentData, raw: selectedRaw } = getSelectedModulesData();

  // Generate dynamic title based on enabled modules
  const getModuleTitle = () => {
    if (modules.length === 0) return "No Modules";
    if (modules.length === 1) return modules[0];
    if (modules.length === 2) return modules.join(" and ");
    return modules.slice(0, -1).join(", ") + ", and " + modules[modules.length - 1];
  };

  // Use the combined data directly (date filtering is handled at the source level)
  const processedData = aggregateData(chartDataSource);
  const categories = processedData.map(item => item.name);

  // Pie chart data with hidden support
  const allPieLabels = ['Operational', 'Developmental', 'Withdraw'];
  const allPieValues = [
    processedData.reduce((sum, item) => sum + (item.operational ?? 0), 0),
    processedData.reduce((sum, item) => sum + (item.developmental ?? 0), 0),
    processedData.reduce((sum, item) => sum + (item.withdraw ?? 0), 0),
  ];
  const allPieColors = COLORS;

  const pieLabels = allPieLabels.filter((_, idx) => !hidden[idx]);
  const pieValues = allPieValues.filter((_, idx) => !hidden[idx]);
  const pieColors = allPieColors.filter((_, idx) => !hidden[idx]);
  const pieTotal = pieValues.reduce((a, b) => a + b, 0);

  const pieData = {
    labels: pieLabels,
    datasets: [
      {
        data: pieValues,
        backgroundColor: pieColors,
      },
    ],
  };

  // Chart.js datasets with hidden support
  const chartData = {
    labels: categories,
    datasets: [
      {
        label: 'Operational',
        data: processedData.map(item => item.operational ?? 0),
        backgroundColor: COLORS[0],
        borderColor: COLORS[0],
        fill: false,
        hidden: hidden[0],
      },
      {
        label: 'Developmental',
        data: processedData.map(item => item.developmental ?? 0),
        backgroundColor: COLORS[1],
        borderColor: COLORS[1],
        fill: false,
        hidden: hidden[1],
      },
      {
        label: 'Withdraw',
        data: processedData.map(item => item.withdraw ?? 0),
        backgroundColor: COLORS[2],
        borderColor: COLORS[2],
        fill: false,
        hidden: hidden[2],
      },
    ],
  };

  // Custom legend items with idx and hidden
  const legendItems =
    chartType === 'pie'
      ? allPieLabels.map((label, idx) => ({
          label,
          color: COLORS[idx],
          hidden: hidden[idx],
          idx,
        }))
      : chartData.datasets.map((ds: any, idx: number) => ({
          label: ds.label,
          color: ds.backgroundColor,
          hidden: hidden[idx],
          idx,
        }));

  // Toggle dataset visibility
  const handleLegendClick = (idx: number) => {
    setHidden(prev => {
      const updated = [...prev];
      updated[idx] = !updated[idx];
      return updated;
    });
  };

  const options: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function (context: any) {
            if (chartType === 'pie') {
              const label = context.label || '';
              const value = context.raw || 0;
              const percent = pieTotal > 0 ? ((value / pieTotal) * 100).toFixed(1) : '0.0';
              return `${label}: ${value} (${percent}%)`;
            }
            return `${context.dataset.label}: ${context.raw}`;
          },
        },
      },
      datalabels: {
        anchor: chartType === 'pie' ? 'center' : 'center',
        align: chartType === 'pie' ? 'center' : 'center',
        color: '#1b1b1b',
        font: {
          weight: 'bold',
          size: 10,
        },
        formatter: (value: number, _context: any) => {
          if (chartType === 'pie') {
            if (pieTotal === 0) return '0%';
            const percent = ((value / pieTotal) * 100);
            return percent > 0 ? `${percent.toFixed(1)}%` : '';
          }
          return value > 0 ? value : '';
        },
        display: true,
      },
      title: {
        display: false,
      },
    },
    // Add this for pie chart only
    cutout: 0,
    scales:
      chartType === 'pie'
        ? {}
        : {
            x: {
              stacked: false,
              ticks: {
                autoSkip: false,
                maxRotation: 0,
                minRotation: 6,
                font: {
                  size: 12,
                },
              },
            },
            y: {
              beginAtZero: true,
              ticks: {
                font: {
                  size: 12,
                },
              },
            },
          },
  };

  // Set minWidth based on data length (e.g., 80px per bar group)
  const minWidth = Math.max(400, processedData.length * 80);

  return (
    <div className="bg-card relative flex flex-col  p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
         {loading && (
            <div className=" absolute left-0 top-0 w-full h-1 z-50 overflow-hidden rounded-t-md flex">
              <div className=' h-full w-[100%] ease-in-out animate-[moveLine_1.3s_linear_infinite] flex'>
                <div
                className="h-full "
                style={{
                  width: '30%',
                  background: '#eccb58'
                }}
              />
              <div
                className="h-full  delay-300"
                style={{
                  width: '40%',
                  background: '#b8232e'
                }}
              />
              <div
                className="h-full  delay-600"
                style={{
                  width: '50%',
                  background: '#0134b2'
                }}
              />
                
              </div>
              
           <style>
                {`
                  @keyframes moveLine {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(250%); }
                  }
                `}
              </style>
            </div>
          )}
      
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold w-[85%] uppercase">
          {chartType === "pie"
            ? `Operational vs Developmental vs Withdraw (Percentage) - ${getModuleTitle()}`
            : `Operational vs. Developmental vs. Withdrawal (${getModuleTitle()})`}
        </h2>
        <div className="flex gap-2">
          {chartTypes.map(type => (
            <button
              key={type.value}
              className={`px-2 py-1 rounded text-xs border ${
                chartType === type.value ? 'bg-primary text-white' : 'bg-background'
              }`}
              onClick={() => setChartType(type.value as 'bar' | 'line' | 'pie')}
            >
              {type.label}
            </button>
          ))}
        </div>
      </div>
      {/* Custom legend styled like ApexCharts */}
      <div className="flex flex-wrap gap-6 mb-2">
        {legendItems.map((item:any)=> (
          <button
            key={item.label}
            type="button"
            className={`flex items-center gap-2 focus:outline-none ${item.hidden ? 'opacity-40' : ''}`}
            onClick={() => handleLegendClick(item.idx)}
            tabIndex={0}
            aria-pressed={!item.hidden}
          >
            <span className=' w-10 h-[16px]' style={{
              display: 'inline-block',
              background: item.color as string,
             
              opacity: item.hidden ? 0.4 : 1,
              border: item.hidden ? '2px solid #ccc' : 'none',
            }} />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="w-full overflow-x-auto">
        <div style={{ minWidth: chartType === 'pie' ? 400 : minWidth, height: 400 }} className="relative">
          {/* Loading overlay */}
       
          
          {chartType === 'bar' && (
            <Bar data={chartData} options={options} plugins={[ChartDataLabels]} />
          )}
          {chartType === 'line' && (
            <Line data={chartData} options={options} plugins={[ChartDataLabels]} />
          )}
          {chartType === 'pie' && (
            <Pie data={pieData} options={options} plugins={[ChartDataLabels]} />
          )}
        </div>
      </div>
      {period && (
        <p className="text-sm text-secondary-foreground mt-2">
          Select Period <span className="font-semibold">{period}</span>
        </p>
      )}

      <button
            className={`px-2 py-1 rounded text-xs hover:bg-primary/20 duration-150 border flex self-end w-full mt-3 ${showBreakdown ? 'bg-primary text-white' : 'bg-background'}`}
            onClick={() => setShowBreakdown(v => !v)}
          >
            {showBreakdown ? 'Hide Breakdown ▼ ' : 'Show Breakdown ▶ '}
          </button>

      {showBreakdown && (
        <div className="mt-4">
          {/* Module Selection Dropdown */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Select Module(s) for Breakdown:</label>
            <Select
              isMulti
              value={selectedModules.map(module => ({ value: module, label: module }))}
              onChange={(selectedOptions) => {
                const values = selectedOptions ? selectedOptions.map((option: any) => option.value) : [];
                setSelectedModules(values);
              }}
              options={['Business Permit', 'Working Permit', 'Barangay Clearance', 'Building Permit & Certificate of Occupancy', 'Local Civil Registry', 'eNews', 'Cedula'].map(module => ({ value: module, label: module }))}
              placeholder="Choose modules to analyze..."
              className="text-sm z-[50]"
              classNamePrefix="react-select"
              styles={{
                control: (base, state) => ({
                  ...base,
                  borderColor: state.isFocused ? '#2162e7' : '#d1d5db',
                  boxShadow: state.isFocused ? '0 0 0 3px rgba(33, 98, 231, 0.1)' : 'none',
                  backgroundColor: '#f9fafb',
                  '&:hover': {
                    borderColor: '#2162e7'
                  }
                }),
                multiValue: (base) => ({
                  ...base,
                  backgroundColor: '#2162e7',
                }),
                multiValueLabel: (base) => ({
                  ...base,
                  color: 'white',
                }),
                multiValueRemove: (base) => ({
                  ...base,
                  color: 'white',
                  ':hover': {
                    backgroundColor: '#1d56d1',
                    color: 'white',
                  },
                }),
              }}
            />
          </div>

          {/* Instruction when no modules are selected */}
          {selectedModules.length === 0 && (
            <div className="mb-4 p-6 bg-gray-50 border border-gray-200 rounded-md text-center">
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Modules Selected</h3>
                  <p className="text-sm text-gray-600 mb-1">
                    Please select one or more modules from the dropdown above to view detailed breakdown analysis.
                  </p>
                  <p className="text-xs text-gray-500">
                    You can select multiple modules to compare and analyze combined data across different eLGU services.
                  </p>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>Business Permit</span>
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>Working Permit</span>
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  <span>Barangay Clearance</span>
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>Building Permit & COO</span>
                  <span className="w-2 h-2 bg-teal-500 rounded-full"></span>
                  <span>Local Civil Registry</span>
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>eNews</span>
                  <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                  <span>Cedula</span>
                </div>
              </div>
            </div>
          )}

          {/* Total Status Summary — derived from the same current data as the chart */}
          {selectedModules.length > 0 && selectedCurrentData && selectedCurrentData.length > 0 && (() => {
            // Sum the current (latest-per-LGU) data for the selected module(s)
            const totals = selectedCurrentData.reduce((acc: any, item: any) => ({
              operational:   acc.operational   + (Number(item.operational)   || 0),
              developmental: acc.developmental + (Number(item.developmental) || 0),
              withdraw:      acc.withdraw      + (Number(item.withdraw)      || 0),
            }), { operational: 0, developmental: 0, withdraw: 0 });

            const grandTotal = totals.operational + totals.developmental + totals.withdraw;
            const moduleText = selectedModules.length === 1 ? selectedModules[0] : `${selectedModules.length} Modules`;

            return (
              <div className="mb-4 p-4 bg-primary/5 border border-primary/20 rounded-md">
                <h3 className="text-sm font-semibold mb-3 text-primary">
                  Total Status Summary - {moduleText} 
                </h3>
                {selectedModules.length > 1 && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Combined data from: {selectedModules.join(', ')}
                  </p>
                )}
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div className="text-center p-2 bg-blue-50 rounded border">
                    <div className="font-bold text-xl text-blue-700">{totals.operational}</div>
                    <div className="text-xs text-blue-600">Operational</div>
                    <div className="text-xs text-muted-foreground">
                      {grandTotal > 0 ? `${((totals.operational / grandTotal) * 100).toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-/10 rounded border">
                    <div className="font-bold text-[#f8be24] text-xl">{totals.developmental}</div>
                    <div className="text-xs text-[#f8be24]">Developmental</div>
                    <div className="text-xs text-muted-foreground">
                      {grandTotal > 0 ? `${((totals.developmental / grandTotal) * 100).toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                  <div className="text-center p-2 bg-red-50/30 rounded border">
                    <div className="font-bold text-red-700 text-xl">{totals.withdraw}</div>
                    <div className="text-xs text-red-600"> Withdraw</div>
                    <div className="text-xs text-muted-foreground">
                      {grandTotal > 0 ? `${((totals.withdraw / grandTotal) * 100).toFixed(1)}%` : '0%'}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {showBreakdown && selectedRaw && Array.isArray(selectedRaw) && selectedModules.length > 0 && (() => {
  // Split raw by date (oldest to latest)
  const sortedRaw = [...selectedRaw].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // 2. Get all unique region names in the order of the first date
  const regionNames = sortedRaw[0]?.data.map((item: any) => item.name) || [];

  // 3. Build a lookup for each date: { [regionName]: regionData }
  const dateRegionMap = sortedRaw.map(period => {
    const map: Record<string, any> = {};
    period.data.forEach((item: any) => {
      map[item.name] = item;
    });
    return { date: period.date, map };
  });

  return (
    <div className="mt-6 overflow-x-auto">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-primary">
          Data Table - {selectedModules.length === 1 ? selectedModules[0] : `${selectedModules.length} Combined Modules`}
        </h3>
        {selectedModules.length > 1 && (
          <p className="text-xs text-muted-foreground">
            Combined data from: {selectedModules.join(', ')}
          </p>
        )}
      </div>
      <table className="min-w-full border rounded bg-card text-xs">
        <thead>
          <tr>
            <th className="px-2 py-1 border uppercase text-left bg-primary/40">Date</th>
            {regionNames.map((region:any) => (
              <th key={region} className="px-2 py-1 bg-primary/40 border uppercase text-left">
                {region}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {dateRegionMap.map((period, idx) => (
            <tr key={period.date} className={idx % 2 === 0 ? 'bg-[#2222ff08] border-b' : 'bg-[#ffffff] border-b'}>
              <td className="px-2 py-1 font-semibold"> <div className=' w-14'>{period.date}
                </div> </td>
              {regionNames.map((regionName:any) => {
                const item = period.map[regionName] || { operational: 0, developmental: 0, withdraw: 0 };
                // Find previous period's region data by region name
                const prev = dateRegionMap[idx - 1]?.map[regionName];

                const getChangeProps = (curr: number, prev?: number) => {
                  if (prev === undefined || prev === 0) return { color: "text-gray-500", arrow: "", percent: null };
                  const percent = ((curr - prev) / prev) * 100;
                  if (percent > 0) return { color: "text-green-600", arrow: "↑", percent: `(+${percent.toFixed(1)}%)` };
                  if (percent < 0) return { color: "text-red-600", arrow: "↓", percent: `(${percent.toFixed(1)}%)` };
                  return { color: "text-gray-500", arrow: "→", percent: `(0.0%)` };
                };

                const op = getChangeProps(item.operational, prev?.operational);
                const dev = getChangeProps(item.developmental, prev?.developmental);
                const wd = getChangeProps(item.withdraw, prev?.withdraw);

                return (
                 <td key={regionName} className="relative px-2 py-1 align-top cursor-pointer group">
  <div className=' w-40'>
    <span className="text-[11px]">Operational: </span>
    <span className={`font-semibold ${op.color}`}>
      {item.operational} {op.arrow}
    </span>
    {op.percent && <span className={`ml-1 text-xs ${op.color}`}>{op.percent}</span>}
  </div>
  <div>
    <span className="text-[11px]">Developmental: </span>
    <span className={`font-semibold ${dev.color}`}>
      {item.developmental} {dev.arrow}
    </span>
    {dev.percent && <span className={`ml-1 text-xs ${dev.color}`}>{dev.percent}</span>}
  </div>
  <div>
    <span className="text-[11px]">Withdraw: </span>
    <span className={`font-semibold ${wd.color}`}>
      {item.withdraw} {wd.arrow}
    </span>
    {wd.percent && <span className={`ml-1 text-xs ${wd.color}`}>{wd.percent}</span>}
  </div>

  {/* Hover info */}
  <div className="absolute bottom-[-1.5rem] z-50 left-1/2 -translate-x-1/2 text-[10px] bg-white/10 backdrop-blur-sm text-white px-2 py-1 rounded opacity-0 min-w-0 p-4 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none border border-border ">
      
      <div className=' flex gap-2 text-black justify-between w-40'>
        <p className=' text-base uppercase font-bold '>{regionName} </p>
      <p>{period.date}</p>
      </div>
             
       <div className=' w-40'>
    <span className="text-[11px] text-black">Operational: </span>
    <span className={`font-semibold ${op.color}`}>
      {item.operational} {op.arrow}
    </span>
    {op.percent && <span className={`ml-1 text-xs ${op.color}`}>{op.percent}</span>}
  </div>
  <div>
    <span className="text-[11px] text-black">Developmental: </span>
    <span className={`font-semibold ${dev.color}`}>
      {item.developmental} {dev.arrow}
    </span>
    {dev.percent && <span className={`ml-1 text-xs ${dev.color}`}>{dev.percent}</span>}
  </div>
  <div>
    <span className="text-[11px] text-black">Withdraw: </span>
    <span className={`font-semibold ${wd.color}`}>
      {item.withdraw} {wd.arrow}
    </span>
    {wd.percent && <span className={`ml-1 text-xs ${wd.color}`}>{wd.percent}</span>}
  </div>
  </div>
</td>

                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
})()}
    </div>
  );
};

export default StatusChartComponent;
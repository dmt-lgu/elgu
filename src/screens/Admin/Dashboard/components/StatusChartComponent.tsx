import React, { useState, useEffect, useMemo } from 'react';
import { Bar, Line, Pie } from 'react-chartjs-2';
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
import { parseISO, isAfter, isBefore, isEqual } from 'date-fns';

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
  startDate?: string; // Add these
  endDate?: string;
  raw?:any
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
  data,
  title,
  period,
  startDate,
  endDate,
  raw
}) => {
  const charts = useSelector(selectCharts);

  console.log(raw, 'data in status chart component');
  let reduxChartType: 'bar' | 'line' | 'pie' = 'bar';
  if (charts.includes('Pie Graph')) reduxChartType = 'pie';
  else if (charts.includes('Line Graph')) reduxChartType = 'line';
  else if (charts.includes('Bar Graph')) reduxChartType = 'bar';

  const [hidden, setHidden] = useState<boolean[]>([false, false, false]);
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>(reduxChartType);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => {
    setChartType(reduxChartType);
  }, [reduxChartType]);

  // Filter data by date range if startDate and endDate are provided
  const filteredData = useMemo(() => {
    if (!startDate || !endDate) return data;
    return data.filter(item => {
      if (!item.date) return true;
      const itemDate = parseISO(item.date);
      const start = parseISO(startDate);
      const end = parseISO(endDate);
      return (
        (isAfter(itemDate, start) || isEqual(itemDate, start)) &&
        (isBefore(itemDate, end) || isEqual(itemDate, end))
      );
    });
  }, [data, startDate, endDate]);

  const processedData = aggregateData(filteredData);
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
        anchor: chartType === 'pie' ? 'center' : 'end',
        align: chartType === 'pie' ? 'center' : 'center',
        color: '#222',
        font: {
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
    <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase">
          {chartType === "pie"
            ? `Operational vs Developmental vs Withdraw (Percentage)`
            : title}
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
        <div style={{ minWidth: chartType === 'pie' ? 400 : minWidth, height: 400 }}>
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
      {showBreakdown && raw && Array.isArray(raw) && (() => {
  // 1. Sort raw by date (oldest to latest)
  const sortedRaw = [...raw].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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
              <td className="px-2 py-1 font-semibold">{period.date}</td>
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
                  <td key={regionName} className="px-2 py-1 align-top">
                    <div>
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
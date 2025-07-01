import React, { useState, useRef } from 'react';
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
import { selectLoad } from '@/redux/loadSlice';

// Register Chart.js components
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

// Mock data
const mockTransactionChartData = [
  { name: 'CAR', paidMale: 472, paidFemale: 20, pendingMale: 0, pendingFemale: 1 },
  { name: 'Region I', paidMale: 1007, paidFemale: 449, pendingMale: 1, pendingFemale: 0 },
  { name: 'Region II', paidMale: 1106, paidFemale: 111, pendingMale: 3, pendingFemale: 6 },
  { name: 'Region III', paidMale: 971, paidFemale: 125, pendingMale: 3, pendingFemale: 3 },
  { name: 'Region IV-A', paidMale: 528, paidFemale: 46, pendingMale: 1, pendingFemale: 3 },
];

interface TransactionChartProps {
  data?: any[];
  title: string;
  period?: string;
}

const chartTypes = [
  { label: 'Bar', value: 'bar' },
  { label: 'Line', value: 'line' },
  { label: 'Pie', value: 'pie' },
];

const TransactionChart: React.FC<TransactionChartProps> = ({
  data = mockTransactionChartData,
  title,
  period
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [hidden, setHidden] = useState<boolean[]>([false, false, false, false]);
  const chartRef = useRef<any>(null);
  const labels = data.map(item => item.name);

  // For Pie chart, aggregate all values
  const pieLabels = ['Paid Male', 'Paid Female', 'Pending Male', 'Pending Female'];
  const pieValues = [
    data.reduce((sum, item) => sum + (item.paidMale ?? 0), 0),
    data.reduce((sum, item) => sum + (item.paidFemale ?? 0), 0),
    data.reduce((sum, item) => sum + (item.pendingMale ?? 0), 0),
    data.reduce((sum, item) => sum + (item.pendingFemale ?? 0), 0),
  ];
  const pieTotal = pieValues.reduce((a, b) => a + b, 0);

  const pieData = {
    labels: pieLabels,
    datasets: [
      {
        data: pieValues,
        backgroundColor: ['#0047CC', '#FFD700', '#DC2626', '#38BDF8'],
      },
    ],
  };

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Paid Male',
        data: data.map(item => item.paidMale),
        backgroundColor: '#0047CC',
        borderColor: '#0047CC',
        fill: false,
        hidden: hidden[0],
      },
      {
        label: 'Paid Female',
        data: data.map(item => item.paidFemale),
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
        fill: false,
        hidden: hidden[1],
      },
      {
        label: 'Pending Male',
        data: data.map(item => item.pendingMale),
        backgroundColor: '#DC2626',
        borderColor: '#DC2626',
        fill: false,
        hidden: hidden[2],
      },
      {
        label: 'Pending Female',
        data: data.map(item => item.pendingFemale),
        backgroundColor: '#38BDF8',
        borderColor: '#38BDF8',
        fill: false,
        hidden: hidden[3],
      },
    ],
  };

  const legendItems = chartData.datasets.map((ds, idx) => ({
    label: ds.label,
    color: ds.backgroundColor,
    hidden: hidden[idx],
    idx,
  }));

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
        display: false, // Hide built-in legend
      },
      tooltip: {
        enabled: true,
        callbacks: {
          // For pie chart, show value in tooltip
          label: function(context: any) {
            if (chartType === 'pie') {
              const label = context.label || '';
              const value = context.raw || 0;
              return `${label}: ${value}`;
            }
            // Default for bar/line
            return `${context.dataset.label}: ${context.raw}`;
          }
        }
      },
      datalabels: {
        anchor: chartType === 'pie' ? 'center' : 'end',
        align: chartType === 'pie' ? 'center' : 'center',
        color: '#222',
        font: {
          weight: 'bold' as const,
          size: 10,
        },
        // Show percentage for pie, value for others
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
    scales: chartType === 'pie'
      ? {}
      : {
          x: {
            stacked: false,
            ticks: {
              autoSkip: false,
              maxRotation: 0,
              minRotation: 6,
            },
          },
          y: {
            beginAtZero: true,
          },
        },
  };

  // Set minWidth based on data length (e.g., 120px per bar group)
  const minWidth = Math.max(600, data.length * 120);
    const loading = useSelector(selectLoad);
  return (
    <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border relative shadow-sm mb-6">
      {/* Custom clickable legend */}
      
      {loading  && (
        <div className=" absolute left-0 top-0 w-full h-1 z-0 overflow-hidden rounded-t-md flex">
          <div className=' h-full w-[100%] ease-in-out animate-[moveLineTable_4s_linear_infinite] flex'>
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
              @keyframes moveLineTable {
                0% { transform: translateX(-100%); }
                30% { transform: translateX(100%); }
                50% { transform: translateX(-100%); }
                80% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
            `}
          </style>
        </div>
      )}
        <div className="flex gap-2  justify-between">
          <p className="font-semibold">{title}</p>
          <div className=' gap-2 flex items-center'>
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

        <div className="grid grid-cols-2 m-4 gap-2 mb-2 w-max">
        {legendItems.map(item => (
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
        <div style={{ overflowX: chartType === 'pie' ? 'visible' : 'auto' }}>
          <div className="mt-5 " style={{ minWidth: chartType === 'pie' ? 400 : minWidth, height: 400 }}>
            {chartType === 'bar' && (
              <Bar ref={chartRef} data={chartData} options={options} plugins={[ChartDataLabels]} />
            )}
            {chartType === 'line' && (
              <Line ref={chartRef} data={chartData} options={options} plugins={[ChartDataLabels]} />
            )}
            {chartType === 'pie' && (
              <Pie ref={chartRef} data={pieData} options={options} plugins={[ChartDataLabels]} />
            )}
          </div>
        </div>
        {period && (
          <p className="text-sm text-secondary-foreground mt-2">
            Select Period <span className=' font-semibold'>{period}</span> 
          </p>
        )}
      </div>
  
  );
};

export default TransactionChart;
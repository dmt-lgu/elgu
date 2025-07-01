import React, { useState, useMemo } from 'react';
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

const typeOptions = [
  { label: 'Overall', value: 'overall' },
  { label: 'New', value: 'new' },
  { label: 'Renew', value: 'renew' },
];

const TransactionChart: React.FC<TransactionChartProps> = ({
  data = [],
  title,
  period
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [hidden, setHidden] = useState<boolean[]>([false, false, false, false]);
  const [txnType, setTxnType] = useState<'overall' | 'new' | 'renew'>('overall');

  // Massage data based on txnType
  const processedData = useMemo(() => {
    return data.map(item => {
      if (txnType === 'new') {
        return {
          name: item.name,
          paid: item.newPaid ?? 0,
          pending: item.newPending ?? 0,
          paideGov: item.newPaidViaEgov ?? 0,
          paidLinkBiz: item.newPaidLinkBiz ?? 0,
        };
      } else if (txnType === 'renew') {
        return {
          name: item.name,
          paid: item.renewPaid ?? 0,
          pending: item.renewPending ?? 0,
          paideGov: item.renewPaidViaEgov ?? 0,
          paidLinkBiz: item.renewPaidLinkBiz ?? 0,
        };
      } else {
        // total
        return {
          name: item.name,
          paid: (item.newPaid ?? 0) + (item.renewPaid ?? 0),
          pending: (item.newPending ?? 0) + (item.renewPending ?? 0),
          paideGov: (item.newPaidViaEgov ?? 0) + (item.renewPaidViaEgov ?? 0),
          paidLinkBiz: (item.newPaidLinkBiz ?? 0) + (item.renewPaidLinkBiz ?? 0),
        };
      }
    });
  }, [data, txnType]);

  const labels = processedData.map(item => item.name);

  // Pie chart labels and values
  const allPieLabels = ['Paid', 'Pending', 'Paid with eGovPay', 'Paid with LinkBiz'];
  const allPieValues = [
    processedData.reduce((sum, item) => sum + (item.paid ?? 0), 0),
    processedData.reduce((sum, item) => sum + (item.pending ?? 0), 0),
    processedData.reduce((sum, item) => sum + (item.paideGov ?? 0), 0),
    processedData.reduce((sum, item) => sum + (item.paidLinkBiz ?? 0), 0),
  ];
  const allPieColors = ['#0047CC', '#FFD700', '#DC2626', '#38BDF8'];

  // Filter pie data based on legend toggles
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

  // Update datasets to use hidden state
  const chartData = {
    labels,
    datasets: [
      {
        label: 'Paid',
        data: processedData.map(item => item.paid),
        backgroundColor: '#0047CC',
        borderColor: '#0047CC',
        fill: false,
        hidden: hidden[0],
      },
      {
        label: 'Pending',
        data: processedData.map(item => item.pending),
        backgroundColor: '#FFD700',
        borderColor: '#FFD700',
        fill: false,
        hidden: hidden[1],
      },
      {
        label: 'Paid with eGovPay',
        data: processedData.map(item => item.paideGov),
        backgroundColor: '#DC2626',
        borderColor: '#DC2626',
        fill: false,
        hidden: hidden[2],
      },
      {
        label: 'Paid with LinkBiz',
        data: processedData.map(item => item.paidLinkBiz),
        backgroundColor: '#38BDF8',
        borderColor: '#38BDF8',
        fill: false,
        hidden: hidden[3],
      },
    ],
  };

  // Legend items for custom legend
  const legendItems = chartData.datasets.map((ds, idx) => ({
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
        position: 'top' as const,
        display: false,
        labels: {
          color: '#222',
          maxWidth: 200,
          font: {
            weight: 'bold' as const,
            size: 12,
          },
        },
        align: 'start' as const,
        padding: 24,
      },
      tooltip: {
        enabled: true,
        callbacks: {
          label: function(context: any) {
            if (chartType === 'pie') {
              const label = context.label || '';
              const value = context.raw || 0;
              const percent = pieTotal > 0 ? ((value / pieTotal) * 100).toFixed(1) : '0.0';
              return `${label}: ${value} (${percent}%)`;
            }
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
  const minWidth = Math.max(600, processedData.length * 120);
  const loading = useSelector(selectLoad);

  return (
    <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border relative shadow-sm mb-6">
      {/* Dropdown for type selection */}
      
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
        <p className="font-semibold">
    {txnType === 'renew' && 'NUMBER OF TRANSACTION PER REGION FOR RENEW APPLICATION'}
    {txnType === 'new' && 'NUMBER OF TRANSACTION PER REGION FOR NEW APPLICATION'}
    {txnType === 'overall' && 'NUMBER OF TRANSACTION PER REGION FOR OVERALL APPLICATION'}
  </p>
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
      
      {/* Custom clickable legend */}
      <div className="grid grid-cols-4 lg:grid-cols-2 m-4 gap-2 mb-2 w-max">
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
      <div className="flex gap-2 mb-2 pt-5 pl-2 items-center">
        <label className="text-xs font-semibold">Application Type :</label>
        <select
          className="border rounded cursor-pointer px-2 py-1 text-xs"
          value={txnType}
          onChange={e => setTxnType(e.target.value as 'overall' | 'new' | 'renew')}
        >
          {typeOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div className="relative chart-legend-sticky" style={{ overflowX: chartType === 'pie' ? 'visible' : 'auto' }}>
        <div className="mt-5" style={{ minWidth: chartType === 'pie' ? 400 : minWidth, height: 400 }}>
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
          Select Period <span className=' font-semibold'>{period}</span> 
        </p>
      )}
    </div>
  );
};

export default TransactionChart;
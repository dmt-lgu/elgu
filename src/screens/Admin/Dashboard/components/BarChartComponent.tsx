import { ApexOptions } from 'apexcharts';
import React, { useState } from 'react';
import ReactApexChart from 'react-apexcharts';

interface BarChartProps {
  data: any[];
  title: string;
  barKey1: string;
  barKey2: string;
  barName1: string;
  barName2: string;
  period?: string;
}

const chartTypes = [
  { label: 'Bar', value: 'bar' },
  { label: 'Line', value: 'line' },
  { label: 'Pie', value: 'pie' },
];

function aggregateData(data: any[], barKey1: string, barKey2: string) {
  // Aggregate values by unique name
  const map = new Map<string, { [key: string]: number }>();
  data.forEach(item => {
    if (!map.has(item.name)) {
      map.set(item.name, { [barKey1]: 0, [barKey2]: 0 });
    }
    const entry = map.get(item.name)!;
    entry[barKey1] += Number(item[barKey1]) || 0;
    entry[barKey2] += Number(item[barKey2]) || 0;
  });
  return Array.from(map.entries()).map(([name, values]) => ({
    name,
    [barKey1]: values[barKey1],
    [barKey2]: values[barKey2],
  }));
}

const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  title,
  barKey1,
  barKey2,
  barName1,
  barName2,
  period
}) => {
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');

  // Aggregate and deduplicate data for the chart
  const processedData = aggregateData(data, barKey1, barKey2);
  const categories = processedData.map(item => item.name);

  // Pie chart needs a different series structure
  const pieSeries = [
    processedData.reduce((sum:any, item) => sum + (item[barKey1] ?? 0), 0),
    processedData.reduce((sum:any, item) => sum + (item[barKey2] ?? 0), 0),
  ];
  const pieLabels = [barName1, barName2];

  const series = chartType === 'pie'
    ? pieSeries
    : [
        {
          name: barName1,
          data: processedData.map(item => item[barKey1] ?? 0),
        },
        {
          name: barName2,
          data: processedData.map(item => item[barKey2] ?? 0),
        },
      ];

  const options: ApexOptions = {
    chart: {
      type: chartType,
      height: 350,
      animations: {
        dynamicAnimation: {
          enabled: true,
          speed: 350
        }
      },
      toolbar: {
        show: true,
        tools: {
          download: true,
          zoom: true,
          zoomin: true,
          zoomout: true,
          pan: true,
        }
      },
      zoom: {
        enabled: true
      }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '35%',
      },
      pie: {
        donut: {
          size: '70%'
        }
      }
    },
    
    
    xaxis: chartType !== 'pie' ? {
      categories,
      tickPlacement: 'on',
      
    } : undefined,
    yaxis: chartType !== 'pie' ? {
      min: 0,
      
    } : undefined,
    labels: chartType === 'pie' ? pieLabels : undefined,
    fill: {
      opacity: 1
    },
   
    legend: {
      position: 'top',
      horizontalAlign: 'center'
    },
    colors: ['#1e40af', '#fbbf24'],
    responsive: [{
      breakpoint: 1000,
      options: {
        chart: {
          width: '100%'
        }
      }
    }]
  };

  return (
    <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold uppercase">{chartType=="pie"?`${barName1} vs ${barName2} (Percentage)` : title }</h2>
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
      <div className="h-[400px] w-full">
        <ReactApexChart
          key={`${chartType}-${title}`} // Add key to force re-render
          options={options}
          series={series}
          type={chartType}
          height={400}
        />
      </div>
      {period && (
        <p className="text-sm text-secondary-foreground mt-2">Select Period {period}</p>
      )}
    </div>
  );
};

export default BarChartComponent;
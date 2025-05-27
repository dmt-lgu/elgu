import React from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface TransactionChartProps {
  data: any[];
  title: string;
  period?: string;
}

const TransactionChart: React.FC<TransactionChartProps> = ({
  data,
  title,
  period
}) => {
  const categories = data.map(item => item.name);

  let xaxis = {
    categories: categories,
  };
  
  const series = [
    {
      name: 'Paid',
      data: data.map(item => item.paid || 0), // Add fallback to 0
    },
    {
      name: 'Pending',
      data: data.map(item => item.pending || 0),
    },
    {
      name: 'Paid with eGovPay',
      data: data.map(item => item.paidEGov || 0),
    },
    {
      name: 'Paid with LinkBiz',
      data: data.map(item => item.paidLinkBiz || 0),
    },
  ];
  

  const options: ApexOptions = {
       chart: {
      type: 'bar',
      height: 350,
      width: '100%',
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
        columnWidth: '45%',
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['transparent'],
    },
    xaxis: {
      ...xaxis,
      tickPlacement: 'on',
      labels: {
        rotate: -45,
        trim: false,
        style: {
          fontSize: '12px'
        }
      },
    },
    
    fill: {
      opacity: 1,
    },
    
    legend: {
      position: 'bottom',
    },

    
    colors: ['#0047CC', '#FFD700', '#DC2626', '#38BDF8'],
  };

  return (
    <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
      <h2 className="text-sm font-bold uppercase mb-4">{title}</h2>
      <div className="h-[400px] w-full">
        <ReactApexChart
          options={options}
          series={series}
          type="bar"
          height={400}
          width="100%"
        />
      </div>
      {period && (
        <p className="text-sm text-secondary-foreground mt-2">Select Period {period}</p>
      )}
    </div>
  );
};

export default TransactionChart;
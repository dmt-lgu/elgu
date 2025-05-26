import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface BarChartProps {
  data: any[];
  title: string;
  barKey1: string;
  barKey2: string;
  barName1: string;
  barName2: string;
  period?: string;
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
  return (
    <div className="bg-white p-4 rounded-md shadow-sm mb-6">
      <h2 className="text-sm font-bold uppercase text-gray-800 mb-4">{title}</h2>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 'auto']} />
            <Tooltip />
            <Legend />
            <Bar dataKey={barKey1} name={barName1} fill="#0047AB" radius={[4, 4, 0, 0]} barSize={30} />
            <Bar dataKey={barKey2} name={barName2} fill="#FFD700" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {period && (
        <p className="text-sm text-gray-600 mt-2">Select Period {period}</p>
      )}
    </div>
  );
};

export default BarChartComponent;
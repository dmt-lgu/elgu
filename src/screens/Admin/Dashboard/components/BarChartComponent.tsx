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
  // Use CSS variable for text-secondary-foreground
  const textColor = 'var(--tw-prose-invert, var(--tw-text-secondary-foreground, #64748b))';

  return (
    <div className="bg-card p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
      <h2 className="text-sm font-bold uppercase  mb-4">{title}</h2>
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
            <CartesianGrid stroke={textColor} strokeDasharray="3 3" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke={textColor}
              tick={{ fill: textColor, fontFamily: 'inherit' }}
              axisLine={{ stroke: textColor }}
              tickLine={{ stroke: textColor }}
            />
            <YAxis 
              domain={[0, 'auto']} 
              stroke={textColor}
              tick={{ fill: textColor, fontFamily: 'inherit' }}
              axisLine={{ stroke: textColor }}
              tickLine={{ stroke: textColor }}
            />
            <Tooltip 
              contentStyle={{ background: 'var(--background)', color: textColor, border: '1px solid var(--border)' }}
              labelStyle={{ color: textColor, fontFamily: 'inherit' }}
              itemStyle={{ color: textColor, fontFamily: 'inherit' }}
              cursor={{ fill: 'rgba(100,116,139,0.1)' }}
            />
            <Legend 
              wrapperStyle={{ color: textColor, fontFamily: 'inherit' }}
            />
            <Bar dataKey={barKey1} name={barName1} fill="#0641cd" radius={[4, 4, 0, 0]} barSize={30} />
            <Bar dataKey={barKey2} name={barName2} fill="#FFD700" radius={[4, 4, 0, 0]} barSize={30} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      {period && (
        <p className="text-sm text-secondary-foreground mt-2">Select Period {period}</p>
      )}
    </div>
  );
};

export default BarChartComponent;
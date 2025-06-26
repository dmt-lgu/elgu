import React from 'react';
import { InfoIcon } from 'lucide-react';
import IncreasingTextAnimation from './textAnimation';
import { useSelector } from 'react-redux';
import { selectLoad } from '@/redux/loadSlice';

interface StatisticCardProps {
  title: string;
  value: string | number;
  showInfo?: string; // Tooltip text
  className?: string;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ title, value, showInfo }) => {
  const loading = useSelector(selectLoad);

  return (
    <div className={`bg-card p-4 rounded-md border border-border relative`}>
      {/* Top animated loading line */}
      {loading && (
        <div className=" absolute left-0 top-0 w-full h-1 z-0 overflow-hidden rounded-t-md flex">
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
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm text-secondary-foreground">{title}</h3>
        {showInfo && (
          <span title={showInfo}>
            <InfoIcon size={16} className="text-secondary-foreground cursor-pointer" />
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-secondary-foreground">
        <IncreasingTextAnimation text={String(value)} />
      </p>
    </div>
  );
};

export default StatisticCard;
import React from 'react';
import { InfoIcon, Building2, TrendingUp, Shield } from 'lucide-react';
import IncreasingTextAnimation from './textAnimation';
import { useSelector } from 'react-redux';
import { selectLoad2 } from '@/redux/loadSlice2';

interface StatisticCardProps {
  title: string;
  value: string | number;
  showInfo?: string; // Tooltip text
  className?: string;
}

const StatisticCard2: React.FC<StatisticCardProps> = ({ title, value, showInfo }) => {
  const loading = useSelector(selectLoad2);

  const getCardTheme = () => {
    const themes = {
      'No. of LGU Operational': {
        icon: Building2,
        iconColor: 'bg-green-600',
        accentColor: 'text-green-600',
        borderAccent: 'border-l-green-500'
      },
      'No. of LGU Developmental': {
        icon: TrendingUp,
        iconColor: 'bg-[#fcbf21]',
        accentColor: 'text-[#fcbf21]',
        borderAccent: 'border-l-[#fcbf21]'
      },
      'No. of LGU Withdraw': {
        icon: Shield,
        iconColor: 'bg-red-600',
        accentColor: 'text-red-600',
        borderAccent: 'border-l-red-500'
      }
    };

    return themes[title as keyof typeof themes] || themes['No. of LGU Operational'];
  };

  const theme = getCardTheme();
  const IconComponent = theme.icon;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 relative border-l-4 ${theme.borderAccent}`}>
      {/* Loading bar */}
      {loading && (
        <div className="absolute left-0 top-0 w-full h-1 overflow-hidden rounded-t-lg z-10">
          <div className="h-full w-full animate-[moveLine_1.3s_linear_infinite] flex">
            <div className="h-full w-[30%] bg-blue-600" />
            <div className="h-full w-[40%] bg-red-600" />
            <div className="h-full w-[50%] bg-orange-600" />
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

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-md ${theme.iconColor} text-white shadow-sm`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
            </div>
          </div>
          
          {showInfo && (
            <div className="relative group">
              <InfoIcon 
                size={14} 
                className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors duration-200" 
              />
              <div className="absolute right-0 top-5 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-20 shadow-xl">
                {showInfo}
                <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 transform rotate-45"></div>
              </div>
            </div>
          )}
        </div>

        {/* Value */}
        <div>
          <p className={`text-2xl font-bold ${theme.accentColor}`}>
            <IncreasingTextAnimation isNumber={true} text={String(value)} />
          </p>
        </div>
      </div>
    </div>
  );
};

export default StatisticCard2;
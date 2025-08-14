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
  onClick?: () => void; // Click handler
}

const StatisticCard2: React.FC<StatisticCardProps> = ({ title, value, showInfo, onClick }) => {
  const loading = useSelector(selectLoad2);

  const getCardTheme = () => {
    const themes = {
      'No. of LGU Operational': {
        icon: Building2,
        iconColor: 'bg-[#2464e8]',
        accentColor: 'text-[#2464e8]',
        borderAccent: 'border-l-[#2464e8]'
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
    <div 
      className={loading?`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 relative `:`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer duration-200 relative border-l-4 ${theme.borderAccent}`}
      onClick={onClick}
      >
      {/* Loading bar */}
      {loading && (
        <div className="absolute left-0 top-0 w-1 h-full z-0 overflow-hidden rounded-l-md flex flex-col">
          <div className='w-full h-[100%] ease-in-out animate-[moveLineVertical_1.3s_linear_infinite] flex flex-col'>
            <div
            className="w-full"
            style={{
              height: '30%',
              background: '#eccb58'
            }}
          />
          <div
            className="w-full delay-300"
            style={{
              height: '40%',
              background: '#b8232e'
            }}
          />
          <div
            className="w-full delay-600"
            style={{
              height: '50%',
              background: '#0134b2'
            }}
          />
            
          </div>
          
       <style>
            {`
              @keyframes moveLineVertical {
                0% { transform: translateY(-100%); }
                100% { transform: translateY(250%); }
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
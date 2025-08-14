import React from 'react';
import { InfoIcon, TrendingUp, Users, Activity, CreditCard } from 'lucide-react';
import IncreasingTextAnimation from './textAnimation';
import { useSelector } from 'react-redux';
import { selectLoad } from '@/redux/loadSlice';
import { selectData } from '@/redux/dataSlice';

interface StatisticCardProps {
  title: string;
  value: string | number;
  bpValue?: string | number;
  wpValue?: string | number;
  showInfo?: string; // Tooltip text
  className?: string;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ 
  title, 
  value, 
  bpValue, 
  wpValue, 
  showInfo 
}) => {
  const loading = useSelector(selectLoad);
  const data = useSelector(selectData);

  const getDisplayValue = () => {
    const filter = data.selectedCardModuleFilter;
    if (filter === 'Business Permit' && bpValue !== undefined) {
      return bpValue;
    } else if (filter === 'Working Permit' && wpValue !== undefined) {
      return wpValue;
    } else {
      // All modules or fallback - always return the combined value
      return value;
    }
  };

  const getCardTheme = () => {
    const themes = {
      'No. of Transaction': {
        icon: Activity,
        iconColor: 'bg-blue-600',
        accentColor: 'text-blue-600',
        borderAccent: 'border-l-blue-500'
      },
      'No. of Male': {
        icon: Users,
        iconColor: 'bg-blue-600',
        accentColor: 'text-blue-600',
        borderAccent: 'border-l-blue-500'
      },
      'No. of Female': {
        icon: Users,
        iconColor: 'bg-red-500',
        accentColor: 'text-red-600',
        borderAccent: 'border-l-red-500'
      },
      'No. of eGovPay': {
        icon: CreditCard,
        iconColor: 'bg-orange-500',
        accentColor: 'text-orange-600',
        borderAccent: 'border-l-orange-500'
      },
      'Non-Binary': {
        icon: Users,
        iconColor: 'bg-purple-600',
        accentColor: 'text-purple-600',
        borderAccent: 'border-l-purple-500'
      }
    };

    return themes[title as keyof typeof themes] || themes['No. of Transaction'];
  };

  const theme = getCardTheme();
  const IconComponent = theme.icon;

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 relative border-l-4 ${theme.borderAccent}`}>
      {/* Loading bar */}
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

      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-md ${theme.iconColor} text-white shadow-sm`}>
              <IconComponent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
              {data.selectedCardModuleFilter && data.selectedCardModuleFilter !== 'All' && (
                <div className="flex items-center space-x-1 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${theme.iconColor.replace('bg-', 'bg-')}`}></div>
                  <span className="text-xs text-gray-500">
                    {data.selectedCardModuleFilter}
                  </span>
                </div>
              )}
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
        <div className="flex items-baseline space-x-2">
          <p className={`text-2xl font-bold ${theme.accentColor}`}>
            <IncreasingTextAnimation isNumber={true} text={String(getDisplayValue())} />
          </p>
          <TrendingUp className="w-3 h-3 text-green-500" />
        </div>
      </div>
    </div>
  );
};

export default StatisticCard;
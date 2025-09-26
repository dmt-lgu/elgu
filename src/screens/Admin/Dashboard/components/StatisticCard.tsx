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
  bpcoValue?: string | number;
  bpbpValue?: string | number;
  brgyValue?: string | number;
  showInfo?: string; // Tooltip text
  className?: string;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ 
  title, 
  value, 
  bpValue, 
  wpValue, 
  bpcoValue,
  bpbpValue,
  brgyValue,
  showInfo 
}) => {
  const loading = useSelector(selectLoad);
  const data = useSelector(selectData);

  const getDisplayValue = () => {
    const filters = Array.isArray(data.selectedCardModuleFilter) ? data.selectedCardModuleFilter : [];
    
    // If no filters selected (All modules)
    if (filters.length === 0) {
      return value; // Show combined total of all modules
    }
    
    // Calculate sum of selected modules only
    let selectedTotal = 0;
    filters.forEach((filter: string) => {
      if (filter === 'Business Permit' && bpValue !== undefined) {
        selectedTotal += Number(bpValue);
      } else if (filter === 'Working Permit' && wpValue !== undefined) {
        selectedTotal += Number(wpValue);
      } else if (filter === 'Certificate of Occupancy' && bpcoValue !== undefined) {
        selectedTotal += Number(bpcoValue);
      } else if (filter === 'Building Permit' && bpbpValue !== undefined) {
        selectedTotal += Number(bpbpValue);
      } else if (filter === 'Barangay Clearance' && brgyValue !== undefined) {
        selectedTotal += Number(brgyValue);
      }
    });
    
    return selectedTotal;
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
    <div className={loading?`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 relative `:`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 relative border-l-4 ${theme.borderAccent}`}>
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
              {data.selectedCardModuleFilter && data.selectedCardModuleFilter !== 'All' && (
                <div className="flex items-center space-x-1 mt-0.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${theme.iconColor.replace('bg-', 'bg-')}`}></div>
                  <span className="text-xs text-gray-500">
                    {data.selectedCardModuleFilter.join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {showInfo && (
            <div className="relative group z-30 ">
              <InfoIcon 
                size={14} 
                className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors duration-200" 
              />
              <div className="absolute right-0 top-5 w-64 p-3  bg-gray-900 text-white text-xs rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-100 shadow-xl">
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
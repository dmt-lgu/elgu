import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectData, setData } from '@/redux/dataSlice';
import { BarChart3, Users, ChevronDown } from 'lucide-react';

interface ModuleFilterProps {
  title?: string;
  filterType: 'card' | 'chart';
  className?: string;
}

const ModuleFilter: React.FC<ModuleFilterProps> = ({ 
  title,
  filterType,
  className = ""
}) => {
  const data = useSelector(selectData);
  const dispatch = useDispatch();

  const handleModuleFilterChange = (selectedModule: string) => {
    const filterKey = filterType === 'card' ? 'selectedCardModuleFilter' : 'selectedChartModuleFilter';
    dispatch(setData({
      ...data,
      [filterKey]: selectedModule
    }));
  };

  const currentFilter = filterType === 'card' 
    ? data.selectedCardModuleFilter 
    : data.selectedChartModuleFilter;

  const getTitle = () => {
    if (title) return title;
    return filterType === 'card' ? 'Transaction Statistics' : 'Chart Analytics';
  };

  const getIcon = () => {
    return filterType === 'card' ? <Users className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />;
  };

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm mb-6 ${className}`}>
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-blue-600 rounded-lg text-white">
            {getIcon()}
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{getTitle()}</h3>
            <p className="text-sm text-gray-500">View data by module</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <select
              className="appearance-none bg-white border border-gray-300 rounded-md px-4 py-2 pr-10 text-sm font-medium text-gray-700 cursor-pointer
                       hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                       transition-colors duration-200 min-w-[160px]"
              value={currentFilter || 'All'}
              onChange={(e) => handleModuleFilterChange(e.target.value)}
            >
              <option value="All">All Modules</option>
              {data.modules?.includes("Business Permit") && (
                <option value="Business Permit">Business Permit</option>
              )}
              {data.modules?.includes("Working Permit") && (
                <option value="Working Permit">Working Permit</option>
              )}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </div>
          </div>
          
          {/* Module indicator */}
          
        </div>
      </div>
    </div>
  );
};

export default ModuleFilter;

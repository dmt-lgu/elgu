import { useMemo, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { X, ChevronDown } from 'lucide-react';

// Mock UI components
const Card = ({ children, className }: any) => <div className={`bg-white rounded-lg shadow ${className}`}>{children}</div>;
const CardHeader = ({ children }: any) => <div className="p-6 border-b">{children}</div>;
const CardTitle = ({ children, className }: any) => <h3 className={className}>{children}</h3>;
const CardContent = ({ children }: any) => <div className="p-6">{children}</div>;

interface TrendChartProps {
  bpResults: any[];
  wpResults: any[];
  brgyResults: any[];
  bpcoResults: any[];
  bpbpResults: any[];
  availableModules: string[];
  title?: string;
  startDate?: string;
  endDate?: string;
}

const TrendLineChart = ({ 
  bpResults, 
  wpResults, 
  brgyResults, 
  bpcoResults, 
  bpbpResults,
  availableModules,
  
  title = "TRANSACTION TREND ANALYSIS",
  startDate = "2025-01-01",
  endDate = "2025-12-31"
  
}: TrendChartProps) => {
  const [selectedModules, setSelectedModules] = useState<string[]>(availableModules);
  const [timeGranularity, setTimeGranularity] = useState<'monthly' | 'quarterly'>('monthly');
  const [dropdownOpen, setDropdownOpen] = useState(false);

 

  const moduleDataMap: Record<string, any[]> = {
    'Business Permit': bpResults,
    'Working Permit': wpResults,
    'Barangay Clearance': brgyResults,
    'Certificate of Occupancy': bpcoResults,
    'Building Permit': bpbpResults
  };

  const toggleModule = (module: string) => {
    setSelectedModules(prev => 
      prev.includes(module) 
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

  const removeModule = (module: string) => {
    setSelectedModules(prev => prev.filter(m => m !== module));
  };

  const chartData = useMemo(() => {
    const monthlyData: Record<string, any> = {};

    selectedModules.forEach(module => {
      const results = moduleDataMap[module] || [];
      
      if (!Array.isArray(results)) return;
      
      results.forEach(lgu => {
        if (!lgu || !lgu.monthlyResults || !Array.isArray(lgu.monthlyResults)) return;
        
        lgu.monthlyResults.forEach((month: any) => {
          const monthKey = month?.month;
          if (!monthKey) return;

          if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { month: monthKey, total: 0 };
          }

          let total = 0;
          
          if (module === 'Barangay Clearance') {
            total = month.totalCount || 0;
          } else if (module === 'Certificate of Occupancy') {
            total = (month.coPaid || 0) + (month.coPending || 0);
          } else if (module === 'Building Permit') {
            total = (month.buildingPaid || 0) + (month.buildingPending || 0);
          } else {
            total = (month.newPaid || 0) + 
                   (month.newPending || 0) + 
                   (month.renewPaid || 0) + 
                   (month.renewPending || 0);
          }

          // Add to total instead of keeping separate module values
          monthlyData[monthKey].total += total;
        });
      });
    });

    let dataArray = Object.values(monthlyData).sort((a: any, b: any) => {
      return a.month.localeCompare(b.month);
    });

    if (timeGranularity === 'quarterly') {
      const quarterlyData: Record<string, any> = {};
      
      dataArray.forEach((item: any) => {
        const [year, month] = item.month.split('-');
        const monthNum = parseInt(month);
        const quarter = Math.ceil(monthNum / 3);
        const quarterKey = `${year}-Q${quarter}`;

        if (!quarterlyData[quarterKey]) {
          quarterlyData[quarterKey] = { month: quarterKey, total: 0 };
        }

        quarterlyData[quarterKey].total += item.total || 0;
      });

      dataArray = Object.values(quarterlyData).sort((a: any, b: any) => {
        return a.month.localeCompare(b.month);
      });
    }

    return dataArray;
  }, [selectedModules, timeGranularity, bpResults, wpResults, brgyResults, bpcoResults, bpbpResults]);

  const formatXAxis = (value: string) => {
    if (timeGranularity === 'quarterly') {
      return value;
    }
    const [_year, month] = value.split('-');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return monthNames[parseInt(month) - 1];
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const [year, month] = label.split('-');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    const formattedLabel = timeGranularity === 'quarterly' 
      ? label 
      : `${monthNames[parseInt(month) - 1]} ${year}`;

    return (
      <div className="bg-white p-3 rounded shadow-lg border border-gray-200">
        <p className="font-semibold mb-2 text-sm text-gray-700">{formattedLabel}</p>
        <div className="flex items-center gap-2">
          <div 
            className="w-3 h-3 rounded-sm bg-blue-600" 
          />
          <span className="text-sm text-gray-600">Total Transactions:</span>
          <span className="text-sm font-semibold text-gray-800">
            {payload[0].value.toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const value = payload.total;
    
    if (value === undefined || value === null) return null;

    return (
      <g>
        <circle 
          cx={cx} 
          cy={cy} 
          r={4} 
          fill="#2563eb" 
          stroke="#fff" 
          strokeWidth={2}
        />
        <text 
          x={cx} 
          y={cy - 10} 
          textAnchor="middle" 
          fill="#1f2937" 
          fontSize={11}
          fontWeight={600}
        >
          {value.toLocaleString()}
        </text>
      </g>
    );
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-bold uppercase mb-4">{title}</CardTitle>
        
        {/* Module Selection - Dropdown Style */}
        <div className="flex md:flex-col justify-between gap-4 items-start mb-4">
          

          {/* Time Period Toggle */}
          <div className="flex flex-col conte gap-2">
            <label className="text-sm font-semibold text-gray-700">Time Period</label>
            <div className="flex gap-2 bg-gray-100 rounded p-1">
              <button
                onClick={() => setTimeGranularity('monthly')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  timeGranularity === 'monthly'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setTimeGranularity('quarterly')}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  timeGranularity === 'quarterly'
                    ? 'bg-white text-blue-600 shadow'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                Quarterly
              </button>
            </div>
          </div>

          <div className="flex-1 max-w-[50%] md:max-w-[100%]">
            <div className="flex flex-wrap justify-end gap-2 mb-3">
              {selectedModules.map(module => (
                <div 
                  key={module}
                  className="flex items-center gap-2 bg-blue-50 border border-blue-300 rounded px-3 py-1.5 text-sm"
                >
                  <span className="text-blue-700 font-medium">{module}</span>
                  <button 
                    onClick={() => removeModule(module)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-full sm:w-full flex items-center justify-between gap-2 border border-gray-300 rounded px-4 py-2 bg-white hover:bg-gray-50"
              >
                <span className="text-sm font-medium">
                  {selectedModules.length} Module{selectedModules.length !== 1 ? 's' : ''} Selected
                </span>
                <ChevronDown className="w-4 h-4" />
              </button>

              {dropdownOpen && (
                <div className="absolute z-10 mt-2 w-full sm:w-80 bg-white border border-gray-200 rounded shadow-lg">
                  <div className="p-3 border-b bg-gray-50">
                    <p className="font-semibold text-sm">All Modules</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {availableModules.map(module => (
                      <div
                        key={module}
                        onClick={() => toggleModule(module)}
                        className={`px-4 py-3 cursor-pointer hover:bg-blue-50 flex items-center justify-between ${
                          selectedModules.includes(module) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <span className="text-sm">{module}</span>
                        {selectedModules.includes(module) && (
                          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {selectedModules.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Please select at least one module to view the trend
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No data available for the selected modules
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={450}>
            <LineChart data={chartData} margin={{ top: 30, right: 30, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
              <XAxis 
                dataKey="month" 
                tickFormatter={formatXAxis}
                tick={{ fontSize: 12, fill: '#6b7280' }}
                stroke="#d1d5db"
                axisLine={{ stroke: '#d1d5db' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#6b7280' }}
                stroke="#d1d5db"
                axisLine={{ stroke: '#d1d5db' }}
                tickFormatter={(value) => value.toLocaleString()}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#2563eb"
                strokeWidth={3}
                dot={<CustomDot />}
                activeDot={{ r: 6 }}
                name="Total Transactions"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
        
        <div className="text-sm text-secondary-foreground mt-2">
          Select Period: <span className="font-semibold">{startDate} - {endDate}</span>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrendLineChart;
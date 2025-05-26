import React from 'react';
import { InfoIcon } from 'lucide-react';

interface StatisticCardProps {
  title: string;
  value: string | number;
  showInfo?: boolean;
  className?: string;
}

const StatisticCard: React.FC<StatisticCardProps> = ({ title, value, showInfo = false}) => {
  return (
    <div className={`  bg-card p-4 rounded-md border border-border  `}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-sm text-secondary-foreground">{title}</h3>
        {showInfo && <InfoIcon size={16} className="text-secondary-foreground" />}
      </div>
      <p className="text-2xl font-bold text-secondary-foreground">{value}</p>
    </div>
  );
};

export default StatisticCard;
import React from 'react';
import { getRegionCode } from '../utils/mockData';
import { Loader2 } from 'lucide-react';

interface ProgressDetail {
  currentRegion: string;
  currentIndex: number;
  totalRegions: number;
}

interface ProgressIndicatorProps {
  isLoading: boolean;
  progress: {
    [moduleKey: string]: ProgressDetail | null;
  };
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ isLoading, progress }) => {
  if (!isLoading || Object.keys(progress).length === 0) {
    return null;
  }

  const progressEntries = Object.entries(progress).filter(([, details]) => details !== null);

  return (
    <div className="fixed bottom-8 right-24 z-50 bg-slate-800/80 backdrop-blur-sm text-white rounded-lg p-3 shadow-lg max-w-xs animate-in fade-in duration-300">
      <div className="flex items-center gap-3 border-b border-slate-600 pb-2 mb-2">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        <h4 className="font-bold text-sm text-slate-100">Fetching Report Data...</h4>
      </div>
      <div className="flex flex-col gap-1.5 text-xs">
        {progressEntries.map(([moduleKey, details]) => (
          <div key={moduleKey} className="flex justify-between items-center">
            <span className="font-semibold text-slate-300">{moduleKey}:</span>
            <span className="font-mono bg-slate-700/50 text-slate-200 px-1.5 py-0.5 rounded-md text-[11px]">
              {details!.currentIndex > 0 ? (
                `${getRegionCode(details!.currentRegion)} (${details!.currentIndex}/${details!.totalRegions})`
              ) : (
                details!.currentRegion
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgressIndicator;
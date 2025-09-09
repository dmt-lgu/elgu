import React, { useState, useEffect } from 'react';
import { getRegionCode, modules } from '../utils/mockData';
// 1. I-import ang 'X' icon
import { Loader2, ChevronUp, ChevronDown, CheckCircle2, X } from 'lucide-react';
import './css/ProgressLoader.css';

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
  counts?: { [moduleKey: string]: number };
  moduleLoading?: { [moduleKey: string]: boolean };
  onModuleClick: (moduleKey: string) => void;
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ isLoading, progress, counts = {}, moduleLoading = {}, onModuleClick }) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const anyModuleLoading = Object.values(moduleLoading || {}).some(Boolean);
  const [isVisible, setIsVisible] = useState<boolean>(() => Boolean(isLoading || anyModuleLoading));

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const active = Boolean(isLoading || anyModuleLoading);
    if (active) {
      setIsVisible(true);
    } else if (isVisible && !active) {
      // If everything finished but still visible, hide after 10 seconds
      timer = setTimeout(() => setIsVisible(false), 10000);
    }
    return () => clearTimeout(timer);
  // include anyModuleLoading so visibility reacts to per-module states
  }, [isLoading, anyModuleLoading, isVisible]);
  
  // 2. Function para itago ang component kung i-klik ang 'X'
  const handleClose = () => {
    setIsVisible(false);
  };

  if (!isVisible) return null;

  // Show all modules present in the progress object, even if details are null.
  const progressEntries = Object.entries(progress);
  const showFallback = progressEntries.length === 0;
  // Determine completion per-module using moduleLoading when available.
  const allModuleKeys = progressEntries.map(([k]) => k);
  const allModulesComplete = allModuleKeys.length === 0 ? !(isLoading || anyModuleLoading) : allModuleKeys.every(k => !moduleLoading[k]);
  const isCompleted = allModulesComplete && !(isLoading || anyModuleLoading);
  progressEntries.sort(([keyA], [keyB]) => modules.indexOf(keyA) - modules.indexOf(keyB));

  const renderProgressStatus = (details?: ProgressDetail | null) => {
    if (!details) {
      return ( <div className="flex items-center gap-1 text-xs text-white"> <span>Preparing</span> <div className="fetching-loader"></div> </div> );
    }
    if (details.currentIndex === 0) {
      return ( <div className="flex items-center gap-1 text-xs text-white"> <span>Preparing</span> <div className="fetching-loader"></div> </div> );
    }
    return <>{`${getRegionCode(details.currentRegion)} (${details.currentIndex}/${details.totalRegions})`}</>;
  };


  return (
    <div className="fixed bottom-8 right-20 z-50 bg-slate-800/50 backdrop-blur-lg text-white rounded-xl shadow-2xl w-80 animate-in fade-in duration-500">
      <div className={`flex items-center gap-3 p-3 ${!isMinimized ? 'border-b border-white/10' : ''}`}>
        {isCompleted ? <CheckCircle2 className="h-6 w-6 text-green-400" /> : <Loader2 className="h-6 w-6 animate-spin text-sky-400" />}
        <div className="flex-1">
          <h4 className="font-semibold text-base text-slate-100">{isCompleted ? 'All Reports Generated!' : 'Fetching Report Data...'}</h4>
          {!isCompleted && (<p className="text-xs text-white">Fetching data across multiple regions.</p>)}
        </div>
        
        {/* 3. Container para sa mga control buttons */}
        <div className="flex items-center gap-1">
          {!isCompleted && (
            <button onClick={() => setIsMinimized(!isMinimized)} className="p-1 rounded-full text-white hover:bg-slate-700/50 hover:text-white">
              {isMinimized ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </button>
          )}

          {/* Ipakita ang close button (X) kung 'completed' na */}
          {isCompleted && (
            <button onClick={handleClose} className="p-1 rounded-full text-white hover:bg-slate-700/50 hover:text-white" aria-label="Close">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {!isMinimized && (
        <div className="p-3">
          {!isCompleted && (<p className="text-xs text-white italic text-center mb-3">Click module or region to scroll to table.</p>)}
          <div className="flex flex-col gap-3 text-sm">
            {showFallback ? (
              <div className="text-center text-sm text-white/90 italic">Waiting for report generation to start...</div>
            ) : progressEntries.sort(([a], [b]) => modules.indexOf(a) - modules.indexOf(b)).map(([moduleKey, details]) => {
              const progressPercentage = details ? (details.currentIndex / details.totalRegions) * 100 : 0;
              return (
                <div key={moduleKey} className="flex flex-col justify-between items-start w-full text-left rounded-lg p-2 bg-slate-800/20">
                  <div className="flex justify-between w-full items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span
                        onClick={() => !isCompleted && onModuleClick(moduleKey)}
                        className={`font-semibold text-slate-200 ${!isCompleted ? 'cursor-pointer hover:text-sky-300 transition-colors' : ''}`}
                      >
                        {moduleKey}
                      </span>
                      <span className="text-xs text-slate-300">({counts[moduleKey] ?? 0})</span>
                    </div>
                    <span 
                      onClick={() => !isCompleted && onModuleClick(moduleKey)}
                      className={`font-mono px-2 py-0.5 rounded-full text-[10px] ${isCompleted ? 'bg-green-500/20 text-green-300' : 'bg-slate-700/70 text-slate-300'} ${!isCompleted ? 'cursor-pointer hover:bg-slate-600 transition-colors' : ''}`}
                    >
                      {isCompleted ? 'COMPLETE' : renderProgressStatus(details)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700/50 rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${isCompleted ? 'bg-green-400' : 'bg-sky-500'}`} style={{ width: `${isCompleted ? 100 : progressPercentage}%`, transition: 'width 0.5s ease-in-out' }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressIndicator;
import React from 'react';
import '../utils/loader.css';

interface LoaderTableProps {
  message?: string;
}

const LoaderTable: React.FC<LoaderTableProps> = ({ message }) => {
  const showSkeleton = message?.toLowerCase().includes('other regions');

  if (showSkeleton) {
    return (
      <div className="w-full p-4">
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, rowIndex) => (
            <div key={rowIndex} className="grid grid-cols-6 gap-3">
              {Array.from({ length: 6 }).map((__, cellIndex) => (
                <div
                  key={cellIndex}
                  className="h-4 rounded bg-slate-200/80 animate-pulse"
                  style={{ animationDelay: `${(rowIndex + cellIndex) * 80}ms` }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className='flex flex-col items-center justify-center gap-4 py-4'>
      <div className="loader animate-pulse"></div>
      <p className='text-sm font-semibold text-slate-500 animate-pulse'>
        {message || 'Loading data, please wait...'}
      </p>
    </div>
  );
};

export default LoaderTable;

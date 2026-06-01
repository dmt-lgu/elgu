import React from 'react';
import '../utils/loader.css';

interface LoaderTableProps {
  message?: string;
}

const LoaderTable: React.FC<LoaderTableProps> = ({ message }) => {
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
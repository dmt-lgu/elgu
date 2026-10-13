import React from 'react';
import { Search, X } from 'lucide-react';
import { DEFAULT_VIEW_OPTIONS, type ReportViewOptions, type SortMode, type StatusFilter } from '../utils/reportView';

interface ReportToolbarProps {
  value: ReportViewOptions;
  onChange: (next: ReportViewOptions) => void;
}

const selectClassName = "h-9 rounded-md border border-gray-200 bg-white px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500";

const ReportToolbar: React.FC<ReportToolbarProps> = ({ value, onChange }) => {
  const isDefault = !value.search && value.status === DEFAULT_VIEW_OPTIONS.status && value.sort === DEFAULT_VIEW_OPTIONS.sort;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-sm">
      <div className="relative min-w-[220px] flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={value.search}
          onChange={e => onChange({ ...value, search: e.target.value })}
          placeholder="Search LGU..."
          aria-label="Search LGU"
          className="h-9 w-full rounded-md border border-gray-200 bg-white pl-8 pr-3 text-xs text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
        Show
        <select className={selectClassName} value={value.status} onChange={e => onChange({ ...value, status: e.target.value as StatusFilter })}>
          <option value="all">All LGUs</option>
          <option value="data">LGUs with data</option>
          <option value="errors">LGUs with errors</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
        Sort by
        <select className={selectClassName} value={value.sort} onChange={e => onChange({ ...value, sort: e.target.value as SortMode })}>
          <option value="default">Default order</option>
          <option value="name-asc">LGU name (A-Z)</option>
          <option value="name-desc">LGU name (Z-A)</option>
          <option value="issued-desc">Issued (highest first)</option>
          <option value="issued-asc">Issued (lowest first)</option>
        </select>
      </label>

      {!isDefault && (
        <button
          type="button"
          onClick={() => onChange(DEFAULT_VIEW_OPTIONS)}
          className="flex h-9 items-center gap-1 rounded-md px-2 text-xs font-semibold text-gray-600 hover:bg-gray-100"
        >
          <X className="h-3.5 w-3.5" /> Clear
        </button>
      )}
    </div>
  );
};

export default ReportToolbar;

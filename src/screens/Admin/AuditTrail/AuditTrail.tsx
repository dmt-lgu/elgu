import React, { useState, useEffect, useCallback } from 'react';
import { SearchIcon, FilterIcon, RefreshCwIcon, HistoryIcon } from 'lucide-react';
import axios from '../../../plugin/axios';

interface AuditEntry {
  id: number;
  action: 'Created' | 'Updated' | 'Deleted';
  username: string;
  timestamp: string;
  module: string;
  lgu: string;
  specific_data: string;
  updated_data: string;
}

const ACTION_COLORS: Record<string, string> = {
  Created: 'bg-green-100 text-green-700',
  Updated: 'bg-blue-100 text-blue-700',
  Deleted: 'bg-red-100 text-red-700',
};

const PAGE_SIZE = 20;
const backendUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_URL || '').replace(/\/$/, '');

const AuditTrail: React.FC = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [filterAction, setFilterAction] = useState('');
  const [filterUsername, setFilterUsername] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [search, setSearch] = useState('');

  const [appliedFilters, setAppliedFilters] = useState({
    action: '', username: '', dateFrom: '', dateTo: '', search: '',
  });

  const fetchData = useCallback(async (filters: typeof appliedFilters, currentPage: number) => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        limit: String(PAGE_SIZE),
        offset: String((currentPage - 1) * PAGE_SIZE),
      };
      if (filters.action)   params.action   = filters.action;
      if (filters.username) params.username = filters.username;
      if (filters.dateFrom) params.date_from = filters.dateFrom;
      if (filters.dateTo)   params.date_to   = filters.dateTo;
      if (filters.search)   params.username  = filters.search;

      const res = await axios.get(`${backendUrl}/api/v1/elgu/audit-trail/`, { params });
      const data = res.data;
      if (Array.isArray(data)) {
        setEntries(data);
        setTotal(data.length);
      } else {
        setEntries(data.results ?? []);
        setTotal(data.count ?? 0);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(appliedFilters, page);
  }, [appliedFilters, page, fetchData]);

  const handleSearch = () => {
    setPage(1);
    setAppliedFilters({
      action: filterAction,
      username: filterUsername,
      dateFrom: filterDateFrom,
      dateTo: filterDateTo,
      search,
    });
  };

  const handleReset = () => {
    setFilterAction('');
    setFilterUsername('');
    setFilterDateFrom('');
    setFilterDateTo('');
    setSearch('');
    setPage(1);
    setAppliedFilters({ action: '', username: '', dateFrom: '', dateTo: '', search: '' });
  };

  const formatDate = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleString('en-PH', {
      year: 'numeric', month: 'short', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Manila',
    });
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-2">
        <HistoryIcon className="w-5 h-5 text-gray-500" />
        <h1 className="text-xl font-semibold text-gray-800">Audit Trail</h1>
        <span className="ml-2 text-xs text-gray-400 font-normal">
          {total > 0 ? `${total} record${total !== 1 ? 's' : ''}` : ''}
        </span>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
        <div className="flex items-center gap-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
          <FilterIcon className="w-3.5 h-3.5" />
          <span>Advanced Search</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Action */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Action</label>
            <select
              value={filterAction}
              onChange={e => setFilterAction(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="">All Actions</option>
              <option value="Created">Created</option>
              <option value="Updated">Updated</option>
              <option value="Deleted">Deleted</option>
            </select>
          </div>

          {/* Username */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Username / Email</label>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by email..."
                value={filterUsername}
                onChange={e => setFilterUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="w-full border border-gray-200 rounded-md pl-8 pr-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>

          {/* Date From */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Date From</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Date To */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-gray-500 font-medium">Date To</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              className="border border-gray-200 rounded-md px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSearch}
            className="bg-[#2464e8] hover:bg-blue-700 text-white text-sm font-medium px-5 py-2 rounded-md transition-colors"
          >
            Search
          </button>
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            <RefreshCwIcon className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[120px]">Action</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[200px]">Username</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-[190px]">Date / Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="px-4 py-3"><div className="h-5 w-16 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-full bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-32 bg-gray-200 rounded animate-pulse" /></td>
                    <td className="px-4 py-3"><div className="h-5 w-36 bg-gray-200 rounded animate-pulse" /></td>
                  </tr>
                ))
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-gray-400">
                    <HistoryIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No audit records found.</p>
                  </td>
                </tr>
              ) : (
                entries.map(entry => (
                  <tr key={entry.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-600'}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {entry.action === 'Updated'
                        ? <>Updated <span className="font-medium">{entry.specific_data}</span> to <span className="font-medium">{entry.updated_data}</span></>
                        : entry.action === 'Created'
                        ? <>{entry.specific_data}</>
                        : <>Deleted <span className="font-medium">{entry.specific_data}</span></>
                      }
                    </td>
                    <td className="px-4 py-3 text-gray-600 truncate max-w-[200px]">{entry.username}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatDate(entry.timestamp)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm text-gray-600">
            <span>
              Page {page} of {totalPages} &nbsp;·&nbsp; {total} total
            </span>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Prev
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border border-gray-200 disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditTrail;

import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronDown } from 'lucide-react';
import { formatNumber } from '../utils/reportUtils';
import { BC, BP, WP, formatShortMonth, getIssued, getLguIssued, getNewIssued, getRenewIssued } from '../utils/reportView';

interface ReportChartsProps {
  modules: string[];
  // Per module: LGUs already filtered and de-duplicated, without error rows
  dataByModule: Record<string, any[]>;
}

const SERIES_1 = '#2a78d6';
const SERIES_2 = '#eb6834';
const AXIS_TICK = { fontSize: 11, fill: '#64748b' };
const TOP_COUNT = 10;

const compactNumber = (value: number) => new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
const shortName = (name: string) => (name.length > 28 ? `${name.slice(0, 27)}…` : name);

const ReportCharts: React.FC<ReportChartsProps> = ({ modules, dataByModule }) => {
  const [open, setOpen] = useState(false);
  const [activeModule, setActiveModule] = useState<string>(modules[0] || '');

  useEffect(() => {
    if (!modules.includes(activeModule)) setActiveModule(modules[0] || '');
  }, [modules, activeModule]);

  const hasSplit = activeModule === BP || activeModule === WP;
  const issuedLabel = activeModule === BC ? 'Total Issued' : 'License Issued';
  const lgus = dataByModule[activeModule] || [];

  const monthlyData = useMemo(() => {
    const byMonth = new Map<string, { month: string; label: string; newIssued: number; renewIssued: number; issued: number }>();
    lgus.forEach((lgu: any) => {
      (lgu.monthlyResults || []).forEach((item: any) => {
        if (!item?.month) return;
        const row = byMonth.get(item.month) || { month: item.month, label: formatShortMonth(item.month), newIssued: 0, renewIssued: 0, issued: 0 };
        row.newIssued += getNewIssued(item);
        row.renewIssued += getRenewIssued(item);
        row.issued += getIssued(activeModule, item);
        byMonth.set(item.month, row);
      });
    });
    return Array.from(byMonth.values()).sort((a, b) => a.month.localeCompare(b.month));
  }, [lgus, activeModule]);

  const topLgus = useMemo(() => (
    lgus
      .map((lgu: any) => ({ lgu: String(lgu.lgu || ''), issued: getLguIssued(activeModule, lgu) }))
      .filter(row => row.issued > 0)
      .sort((a, b) => b.issued - a.issued)
      .slice(0, TOP_COUNT)
  ), [lgus, activeModule]);

  if (modules.length === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpen(prev => !prev)}
        className="flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left shadow-sm hover:shadow-md transition-shadow duration-200"
        aria-expanded={open}
      >
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">Charts</h2>
          <p className="text-xs text-gray-500">Monthly trend and top LGUs</p>
        </div>
        <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          {modules.length > 1 && (
            <div className="mb-4 flex gap-2 overflow-x-auto">
              {modules.map(moduleKey => (
                <button
                  key={moduleKey}
                  type="button"
                  onClick={() => setActiveModule(moduleKey)}
                  className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-semibold ${moduleKey === activeModule ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                  {moduleKey}
                </button>
              ))}
            </div>
          )}

          {monthlyData.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-500">No data to chart for {activeModule} yet.</p>
          ) : (
            <div className="grid grid-cols-2 slg:grid-cols-1 gap-6">
              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">{activeModule}: {issuedLabel} per Month</h3>
                <p className="mb-2 text-xs text-gray-500">{hasSplit ? 'New and renewal licenses issued' : 'All LGUs in the report'}</p>
                <div className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barGap={2}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: '#cbd5e1' }} />
                      <YAxis tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={compactNumber} width={44} />
                      <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatNumber(Number(value))} contentStyle={{ fontSize: 12 }} />
                      {hasSplit && <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: '#334155' }} />}
                      {hasSplit ? (
                        <>
                          <Bar dataKey="newIssued" name="New" fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar dataKey="renewIssued" name="Renewal" fill={SERIES_2} radius={[4, 4, 0, 0]} maxBarSize={28} />
                        </>
                      ) : (
                        <Bar dataKey="issued" name={issuedLabel} fill={SERIES_1} radius={[4, 4, 0, 0]} maxBarSize={28} />
                      )}
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="min-w-0">
                <h3 className="text-xs font-bold uppercase tracking-wide text-gray-700">{activeModule}: Top {Math.min(TOP_COUNT, topLgus.length)} LGUs</h3>
                <p className="mb-2 text-xs text-gray-500">By {issuedLabel.toLowerCase()} for the whole period</p>
                <div className="h-[320px]">
                  {topLgus.length === 0 ? (
                    <p className="py-10 text-center text-sm text-gray-500">No LGU has issued records in this period.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topLgus} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }}>
                        <XAxis type="number" hide />
                        <YAxis type="category" dataKey="lgu" width={180} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={shortName} interval={0} />
                        <Tooltip cursor={{ fill: '#f1f5f9' }} formatter={(value: any) => formatNumber(Number(value))} contentStyle={{ fontSize: 12 }} />
                        <Bar dataKey="issued" name={issuedLabel} fill={SERIES_1} radius={[0, 4, 4, 0]} maxBarSize={18}>
                          <LabelList dataKey="issued" position="right" formatter={(value: any) => formatNumber(Number(value))} style={{ fontSize: 11, fill: '#334155' }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportCharts;

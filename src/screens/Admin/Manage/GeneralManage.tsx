import { useEffect, useMemo, useState } from 'react';
import axios from './../../../plugin/axios';
import Swal from 'sweetalert2';

const currentYear = new Date().getFullYear();
const yearOptions = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030];

const monthOptions = [
  '[01] January', '[02] February', '[03] March', '[04] April',
  '[05] May', '[06] June', '[07] July', '[08] August',
  '[09] September', '[10] October', '[11] November', '[12] December',
];

const ustatusOptions = [
  '[A] Operational', '[B] Developmental', '[C] For Training/Others', '[D] Withdraw',
];

const dictRoOptions = [
  'PMT', 'CAR', 'R1', 'R2', 'R3', 'R4A', 'R4B', 'R5',
  'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13',
  'BARMM I', 'BARMM II', 'NIR',
];

const ENDPOINTS = {
  bp1:      'api/v1/elgu/bp1/',
  wp:       'api/v1/elgu/wp/',
  bc:       'api/v1/elgu/bc/',
  bpco:     'api/v1/elgu/bpco/',
  epayment: 'api/v1/elgu/epayment/',
};

interface MergedRecord {
  key: string;
  year: number;
  month: string;
  period_id: string;
  lgu_name: string;
  bp1_ustatus: string;
  wp_ustatus: string;
  bc_ustatus: string;
  bpco_ustatus: string;
  epayment: boolean;
  egovpay_v1: boolean;
  egovpay_v2: boolean;
  ustatus: string;
  district: string;
  level: string;
  income_class: string;
  dict_ro: string;
  version: string;
  bp1_id: number | null;
  wp_id: number | null;
  bc_id: number | null;
  bpco_id: number | null;
  epayment_id: number | null;
}

function monthNum(m: string): string {
  return m.match(/\[(\d+)\]/)?.[1] ?? '';
}

function isOp(u: string): boolean {
  const s = (u || '').toLowerCase();
  return s.includes('operational') || s.includes('live');
}
function isDev(u: string): boolean { return (u || '').toLowerCase().includes('developmental'); }
function isWd(u: string):  boolean { return (u || '').toLowerCase().includes('withdraw'); }

function uBadgeClass(u: string): string {
  if (!u) return '';
  if (isOp(u)) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
  const s = u.toLowerCase();
  if (s.includes('developmental')) return 'bg-blue-100 text-blue-800 border-blue-200';
  if (s.includes('withdraw')) return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function uBadgeShort(u: string): string {
  if (!u) return '—';
  if (isOp(u)) return 'OP';
  const s = u.toLowerCase();
  if (s.includes('developmental')) return 'DEV';
  if (s.includes('withdraw')) return 'WD';
  if (s.includes('training')) return 'TRN';
  if (s.includes('pilot')) return 'PLT';
  if (s.includes('data build')) return 'DBU';
  if (s.includes('concerns')) return 'CON';
  if (s.includes('follow')) return 'FLW';
  if (s.includes('testing')) return 'TST';
  return u.replace(/^\[[^\]]+\]\s*/, '').slice(0, 4);
}

function parseVersion(v: string): { v1: boolean; v2: boolean } {
  const s = (v || '').toLowerCase();
  const v1 = s.includes('v1') || (!s.includes('v') && s.includes('1'));
  const v2 = s.includes('v2') || (!s.includes('v') && s.includes('2'));
  return { v1, v2 };
}

const UsBadge = ({ val }: { val: string }) => {
  if (!val) return <span className="text-slate-300 text-xs">—</span>;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold whitespace-nowrap ${uBadgeClass(val)}`}
      title={val}>
      {uBadgeShort(val)}
    </span>
  );
};

export default function GeneralManage() {
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_URL || '').replace(/\/$/, '');

  const [mergedRecords, setMergedRecords] = useState<MergedRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editRecord, setEditRecord] = useState<MergedRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState('');

  const [editBp1Ustatus, setEditBp1Ustatus] = useState('');
  const [editWpUstatus, setEditWpUstatus] = useState('');
  const [editBcUstatus, setEditBcUstatus] = useState('');
  const [editBpcoUstatus, setEditBpcoUstatus] = useState('');
  const [editDistrict, setEditDistrict] = useState('');
  const [editLevel, setEditLevel] = useState('');
  const [editIncomeClass, setEditIncomeClass] = useState('');
  const [editDictRo, setEditDictRo] = useState('');
  const [editVersionV1, setEditVersionV1] = useState(false);
  const [editVersionV2, setEditVersionV2] = useState(false);
  const [editEpayment, setEditEpayment] = useState(false);
  const [editEgovpayV1, setEditEgovpayV1] = useState(false);
  const [editEgovpayV2, setEditEgovpayV2] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const yearParams = selectedYears.map(y => `year=${y}`).join('&');
      const fetchList = (endpoint: string) =>
        axios.get(`${backendUrl}/${endpoint}?${yearParams}&page_size=9999`)
          .then(r => Array.isArray(r.data) ? r.data : (r.data?.results ?? []))
          .catch(() => []);

      const [bp1Data, wpData, bcData, bpcoData, epData] = await Promise.all([
        fetchList(ENDPOINTS.bp1),
        fetchList(ENDPOINTS.wp),
        fetchList(ENDPOINTS.bc),
        fetchList(ENDPOINTS.bpco),
        fetchList(ENDPOINTS.epayment),
      ]);

      const map = new Map<string, MergedRecord>();

      const getOrCreate = (key: string, year: number, month: string, lgu: string): MergedRecord => {
        if (!map.has(key)) {
          const num = monthNum(month);
          map.set(key, {
            key, year, month,
            period_id: num ? `${year}-${num.padStart(2, '0')}` : '',
            lgu_name: lgu,
            bp1_ustatus: '', wp_ustatus: '', bc_ustatus: '', bpco_ustatus: '',
            epayment: false, egovpay_v1: false, egovpay_v2: false,
            ustatus: '', district: '', level: '', income_class: '', dict_ro: '', version: '',
            bp1_id: null, wp_id: null, bc_id: null, bpco_id: null, epayment_id: null,
          });
        }
        return map.get(key)!;
      };

      const applyProfile = (rec: MergedRecord, r: any) => {
        if (!rec.ustatus     && r.ustatus)      rec.ustatus      = r.ustatus;
        if (!rec.district    && r.district)     rec.district     = r.district;
        if (!rec.level       && r.level)        rec.level        = r.level;
        if (!rec.income_class && r.income_class) rec.income_class = r.income_class;
        if (!rec.dict_ro     && r.dict_ro)      rec.dict_ro      = r.dict_ro;
        if (!rec.version     && r.version)      rec.version      = r.version;
      };

      bp1Data.forEach((r: any) => {
        const key = `${r.year}|${r.month}|${(r.lgu || '').toLowerCase().trim()}`;
        const rec = getOrCreate(key, Number(r.year), r.month, r.lgu ?? '');
        rec.bp1_ustatus = r.ustatus ?? '';
        rec.bp1_id = r.id;
        applyProfile(rec, r);
      });

      wpData.forEach((r: any) => {
        const key = `${r.year}|${r.month}|${(r.lgu || '').toLowerCase().trim()}`;
        const rec = getOrCreate(key, Number(r.year), r.month, r.lgu ?? '');
        rec.wp_ustatus = r.ustatus ?? '';
        rec.wp_id = r.id;
        applyProfile(rec, r);
      });

      bcData.forEach((r: any) => {
        const key = `${r.year}|${r.month}|${(r.lgu || '').toLowerCase().trim()}`;
        const rec = getOrCreate(key, Number(r.year), r.month, r.lgu ?? '');
        rec.bc_ustatus = r.ustatus ?? '';
        rec.bc_id = r.id;
        applyProfile(rec, r);
      });

      bpcoData.forEach((r: any) => {
        const key = `${r.year}|${r.month}|${(r.lgu || '').toLowerCase().trim()}`;
        const rec = getOrCreate(key, Number(r.year), r.month, r.lgu ?? '');
        rec.bpco_ustatus = r.ustatus ?? '';
        rec.bpco_id = r.id;
        applyProfile(rec, r);
      });

      epData.forEach((r: any) => {
        const key = `${r.year}|${r.month}|${(r.lgu_full_name || '').toLowerCase().trim()}`;
        const rec = getOrCreate(key, Number(r.year), r.month, r.lgu_full_name ?? '');
        rec.epayment    = !!r.epayment;
        rec.egovpay_v1  = !!r.egovpay_v1;
        rec.egovpay_v2  = !!r.egovpay_v2;
        rec.epayment_id = r.id;
        if (!rec.dict_ro && r.dict_ro) rec.dict_ro = r.dict_ro;
      });

      const sorted = Array.from(map.values()).sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        const ma = parseInt(monthNum(a.month) || '0', 10);
        const mb = parseInt(monthNum(b.month) || '0', 10);
        if (ma !== mb) return ma - mb;
        return a.lgu_name.localeCompare(b.lgu_name);
      });

      setMergedRecords(sorted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedYears]);
  useEffect(() => { setCurrentPage(1); }, [monthFilter, searchQuery, pageSize]);

  const filteredRecords = useMemo(() => {
    let r = mergedRecords;
    if (monthFilter.length > 0) r = r.filter(rec => monthFilter.includes(rec.month));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(rec =>
        rec.lgu_name.toLowerCase().includes(q) ||
        rec.dict_ro.toLowerCase().includes(q) ||
        (rec.district || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [mergedRecords, monthFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visible = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => ({
    operational:  filteredRecords.filter(r => isOp(r.bp1_ustatus)  || isOp(r.wp_ustatus)  || isOp(r.bc_ustatus)  || isOp(r.bpco_ustatus)).length,
    developmental: filteredRecords.filter(r => isDev(r.bp1_ustatus) || isDev(r.wp_ustatus) || isDev(r.bc_ustatus) || isDev(r.bpco_ustatus)).length,
    withdraw:     filteredRecords.filter(r => isWd(r.bp1_ustatus)   || isWd(r.wp_ustatus)  || isWd(r.bc_ustatus)  || isWd(r.bpco_ustatus)).length,
    epayment:     filteredRecords.filter(r => r.epayment).length,
    egovpay_v1:   filteredRecords.filter(r => r.egovpay_v1).length,
    egovpay_v2:   filteredRecords.filter(r => r.egovpay_v2).length,
  }), [filteredRecords]);

  const openEdit = (rec: MergedRecord) => {
    setEditRecord(rec);
    setEditBp1Ustatus(rec.bp1_ustatus);
    setEditWpUstatus(rec.wp_ustatus);
    setEditBcUstatus(rec.bc_ustatus);
    setEditBpcoUstatus(rec.bpco_ustatus);
    setEditDistrict(rec.district);
    setEditLevel(rec.level);
    setEditIncomeClass(rec.income_class);
    setEditDictRo(rec.dict_ro);
    const { v1, v2 } = parseVersion(rec.version);
    setEditVersionV1(v1);
    setEditVersionV2(v2);
    setEditEpayment(rec.epayment);
    setEditEgovpayV1(rec.egovpay_v1);
    setEditEgovpayV2(rec.egovpay_v2);
    setEditError('');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editRecord) return;
    const confirmed = await Swal.fire({
      title: 'Update Record?',
      text: `Save changes to "${editRecord.lgu_name}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Update',
      confirmButtonColor: '#2563eb',
    });
    if (!confirmed.isConfirmed) return;

    setSaving(true);
    setEditError('');

    const versionStr = [editVersionV1 && 'V1', editVersionV2 && 'V2'].filter(Boolean).join(', ');
    const profilePatch = { district: editDistrict, level: editLevel, income_class: editIncomeClass, dict_ro: editDictRo, version: versionStr };

    try {
      const patches: Promise<any>[] = [];

      if (editRecord.bp1_id !== null)
        patches.push(axios.patch(`${backendUrl}/${ENDPOINTS.bp1}${editRecord.bp1_id}/`, { ...profilePatch, ustatus: editBp1Ustatus }));
      if (editRecord.wp_id !== null)
        patches.push(axios.patch(`${backendUrl}/${ENDPOINTS.wp}${editRecord.wp_id}/`, { ...profilePatch, ustatus: editWpUstatus }));
      if (editRecord.bc_id !== null)
        patches.push(axios.patch(`${backendUrl}/${ENDPOINTS.bc}${editRecord.bc_id}/`, { ...profilePatch, ustatus: editBcUstatus }));
      if (editRecord.bpco_id !== null)
        patches.push(axios.patch(`${backendUrl}/${ENDPOINTS.bpco}${editRecord.bpco_id}/`, { ...profilePatch, ustatus: editBpcoUstatus }));

      const epPayload = {
        year: editRecord.year,
        month: editRecord.month,
        lgu_full_name: editRecord.lgu_name,
        dict_ro: editDictRo,
        epayment: editEpayment,
        egovpay_v1: editEgovpayV1,
        egovpay_v2: editEgovpayV2,
      };
      if (editRecord.epayment_id !== null)
        patches.push(axios.patch(`${backendUrl}/${ENDPOINTS.epayment}${editRecord.epayment_id}/`, epPayload));
      else
        patches.push(axios.post(`${backendUrl}/${ENDPOINTS.epayment}`, epPayload));

      await Promise.all(patches);
      setShowEditModal(false);
      fetchData();
    } catch (err: any) {
      setEditError(err?.response?.data ? JSON.stringify(err.response.data) : 'Update failed.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (rec: MergedRecord) => {
    const result = await Swal.fire({
      title: 'Delete all records for this LGU-Month?',
      html: `<strong>${rec.lgu_name}</strong><br>${rec.month.replace(/^\[\d+\]\s*/, '')} ${rec.year}<br><small style="color:#64748b">Deletes all found module and ePayment records for this LGU-month.</small>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete All',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;

    const deletes: Promise<any>[] = [];
    if (rec.bp1_id !== null)      deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.bp1}${rec.bp1_id}/`).catch(() => {}));
    if (rec.wp_id !== null)       deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.wp}${rec.wp_id}/`).catch(() => {}));
    if (rec.bc_id !== null)       deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.bc}${rec.bc_id}/`).catch(() => {}));
    if (rec.bpco_id !== null)     deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.bpco}${rec.bpco_id}/`).catch(() => {}));
    if (rec.epayment_id !== null) deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.epayment}${rec.epayment_id}/`).catch(() => {}));

    await Promise.all(deletes);
    fetchData();
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-4 sm:p-6 space-y-5">

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border border-border px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">General Summary</h1>
          <p className="text-xs text-slate-500 mt-0.5">Aggregated view of all modules (BP1, WP, BC, BPCO) and ePayment — one row per unique LGU per month.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="text-sm text-slate-500 font-medium shrink-0">Year</label>
          {yearOptions.map(y => (
            <label key={y} className="flex items-center gap-1 text-sm cursor-pointer select-none">
              <input type="checkbox" className="accent-primary"
                checked={selectedYears.includes(y)}
                onChange={e => {
                  if (e.target.checked) setSelectedYears(prev => [...prev, y].sort((a, b) => a - b));
                  else { const next = selectedYears.filter(yr => yr !== y); if (next.length > 0) setSelectedYears(next); }
                }} />
              <span className={`font-medium ${selectedYears.includes(y) ? 'text-primary' : 'text-slate-600'}`}>{y}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Summary Cards — row 1: UStatus, row 2: ePayment */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Operational',   count: summary.operational,   from: 'from-emerald-400', to: 'to-teal-400',   text: 'text-emerald-500' },
            { label: 'Developmental', count: summary.developmental, from: 'from-blue-400',    to: 'to-indigo-500', text: 'text-blue-500'    },
            { label: 'Withdraw',      count: summary.withdraw,      from: 'from-rose-400',    to: 'to-red-500',    text: 'text-rose-500'    },
          ].map(({ label, count, from, to, text }) => (
            <div key={label} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
              <div className={`h-1 bg-gradient-to-r ${from} ${to}`} />
              <div className="px-6 py-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. of LGU</p>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">{label}</p>
                <p className={`text-5xl font-black mt-3 tabular-nums leading-none ${text}`}>{count}</p>
                <p className="text-xs text-slate-400 mt-3">{monthFilter.length > 0 || searchQuery ? 'Filtered view' : `All records · ${selectedYears.join(', ')}`}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'ePayment',   count: summary.epayment,   from: 'from-emerald-400', to: 'to-teal-400',    text: 'text-emerald-500' },
            { label: 'eGovPay v1', count: summary.egovpay_v1, from: 'from-sky-400',     to: 'to-cyan-500',    text: 'text-sky-500'     },
            { label: 'eGovPay v2', count: summary.egovpay_v2, from: 'from-violet-400',  to: 'to-purple-500',  text: 'text-violet-500'  },
          ].map(({ label, count, from, to, text }) => (
            <div key={label} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
              <div className={`h-1 bg-gradient-to-r ${from} ${to}`} />
              <div className="px-6 py-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. of LGU with</p>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">{label}</p>
                <p className={`text-5xl font-black mt-3 tabular-nums leading-none ${text}`}>{count}</p>
                <p className="text-xs text-slate-400 mt-3">{monthFilter.length > 0 || searchQuery ? 'Filtered view' : `All records · ${selectedYears.join(', ')}`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">General Records</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredRecords.length !== mergedRecords.length
                  ? `${filteredRecords.length} of ${mergedRecords.length} records`
                  : `${mergedRecords.length} record${mergedRecords.length !== 1 ? 's' : ''} for ${selectedYears.join(', ')}`}
              </p>
            </div>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search LGU, RO, District…"
              className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-64 w-full" />
          </div>

          {/* Month chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">Month</span>
            <button type="button" onClick={() => { setMonthFilter([]); setCurrentPage(1); }}
              className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition ${
                monthFilter.length === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary'
              }`}>All</button>
            {monthOptions.map(opt => {
              const label = opt.replace(/^\[\d+\]\s*/, '').slice(0, 3);
              const isActive = monthFilter.includes(opt);
              return (
                <button key={opt} type="button"
                  onClick={() => { setMonthFilter(prev => isActive ? prev.filter(x => x !== opt) : [...prev, opt]); setCurrentPage(1); }}
                  className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition ${
                    isActive ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary'
                  }`}>{label}</button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-slate-700">
            <thead className="bg-slate-50 border-b border-border text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">Period ID</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">Year</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">Month</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold min-w-[160px]">LGU Name</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">BP1</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">WP</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">BC</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">BPCO</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">ePayment</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">Coverage</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">District</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">Level</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">Income Class</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">DICT RO</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">V1</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">V2</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr><td colSpan={17} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading records…
                  </div>
                </td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={17} className="px-4 py-10 text-center text-slate-400">
                  {searchQuery ? `No records match "${searchQuery}".` : `No records found for ${selectedYears.join(', ')}.`}
                </td></tr>
              ) : visible.map(r => {
                const { v1: hasV1, v2: hasV2 } = parseVersion(r.version);
                const coverageScore =
                  (r.bp1_id !== null ? 1 : 0) +
                  (r.wp_id  !== null ? 1 : 0) +
                  (r.bc_id  !== null ? 1 : 0) +
                  (r.bpco_id !== null ? 1 : 0) +
                  (r.epayment   ? 1 : 0) +
                  (r.egovpay_v1 ? 1 : 0) +
                  (r.egovpay_v2 ? 1 : 0);
                return (
                  <tr key={r.key} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono text-xs">{r.period_id || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{r.year}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">{r.month.replace(/^\[\d+\]\s*/, '')}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900 max-w-[200px] truncate" title={r.lgu_name}>{r.lgu_name || '—'}</td>
                    <td className="px-3 py-2.5 text-center"><UsBadge val={r.bp1_ustatus} /></td>
                    <td className="px-3 py-2.5 text-center"><UsBadge val={r.wp_ustatus} /></td>
                    <td className="px-3 py-2.5 text-center"><UsBadge val={r.bc_ustatus} /></td>
                    <td className="px-3 py-2.5 text-center"><UsBadge val={r.bpco_ustatus} /></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 flex-wrap">
                        {r.epayment   && <span className="inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold bg-emerald-100 text-emerald-800 border-emerald-200">EP</span>}
                        {r.egovpay_v1 && <span className="inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold bg-blue-100    text-blue-800    border-blue-200">GV1</span>}
                        {r.egovpay_v2 && <span className="inline-flex rounded-full border px-1.5 py-0.5 text-[9px] font-bold bg-violet-100  text-violet-800  border-violet-200">GV2</span>}
                        {!r.epayment && !r.egovpay_v1 && !r.egovpay_v2 && <span className="text-slate-300 text-xs">—</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center whitespace-nowrap">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold tabular-nums ${
                        coverageScore === 7 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        coverageScore >= 4  ? 'bg-blue-100    text-blue-800    border-blue-200'    :
                        coverageScore >= 1  ? 'bg-amber-100   text-amber-800   border-amber-200'   :
                                             'bg-slate-100   text-slate-500   border-slate-200'
                      }`}>
                        {coverageScore}/7
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">{r.district || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">{r.level || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">{r.income_class || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-800 text-xs">{r.dict_ro || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      {hasV1 ? <span className="text-emerald-600 font-bold text-xs">✓</span> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {hasV2 ? <span className="text-emerald-600 font-bold text-xs">✓</span> : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => openEdit(r)}
                          className="rounded-md px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition">Edit</button>
                        <button onClick={() => handleDelete(r)}
                          className="rounded-md px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">← Prev</button>
            <span className="text-sm text-slate-500 px-1">
              Page <span className="font-semibold text-slate-800">{safePage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
            </span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">Next →</button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Rows per page</span>
            <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setCurrentPage(1); }}
              className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-primary">
              {[10, 25, 50, 100].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-lg">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-900 truncate max-w-xs" title={editRecord.lgu_name}>{editRecord.lgu_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editRecord.month.replace(/^\[\d+\]\s*/, '')} {editRecord.year}</p>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)}
                className="rounded-lg border border-border px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 transition shrink-0 ml-4">✕</button>
            </div>

            <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">

              {/* Reporting Period */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Reporting Period</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Year',      val: String(editRecord.year) },
                    { label: 'Month',     val: editRecord.month.replace(/^\[\d+\]\s*/, '') },
                    { label: 'Period ID', val: editRecord.period_id },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex flex-col gap-1">
                      <span className="text-xs text-slate-500 font-medium">{label}</span>
                      <div className="rounded-lg border border-border bg-slate-100 px-3 py-2 text-sm text-slate-500 select-none">{val || '—'}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Module UStatus */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Module UStatus</p>
                {editRecord.bp1_id === null && editRecord.wp_id === null && editRecord.bc_id === null && editRecord.bpco_id === null ? (
                  <p className="text-sm text-slate-400 italic">No module records for this LGU-month.</p>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {editRecord.bp1_id !== null && (
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        BP1 UStatus
                        <select value={editBp1Ustatus} onChange={e => setEditBp1Ustatus(e.target.value)}
                          className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                          <option value="">— Select —</option>
                          {ustatusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>
                    )}
                    {editRecord.wp_id !== null && (
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        WP UStatus
                        <select value={editWpUstatus} onChange={e => setEditWpUstatus(e.target.value)}
                          className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                          <option value="">— Select —</option>
                          {ustatusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>
                    )}
                    {editRecord.bc_id !== null && (
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        BC UStatus
                        <select value={editBcUstatus} onChange={e => setEditBcUstatus(e.target.value)}
                          className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                          <option value="">— Select —</option>
                          {ustatusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>
                    )}
                    {editRecord.bpco_id !== null && (
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        BPCO UStatus
                        <select value={editBpcoUstatus} onChange={e => setEditBpcoUstatus(e.target.value)}
                          className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                          <option value="">— Select —</option>
                          {ustatusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>
                    )}
                  </div>
                )}
              </div>

              {/* LGU Profile */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">LGU Profile</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                    District
                    <input value={editDistrict} onChange={e => setEditDistrict(e.target.value)}
                      className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                    Level
                    <input value={editLevel} onChange={e => setEditLevel(e.target.value)}
                      className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                    Income Class
                    <input value={editIncomeClass} onChange={e => setEditIncomeClass(e.target.value)}
                      className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                    DICT RO
                    <select value={editDictRo} onChange={e => setEditDictRo(e.target.value)}
                      className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10">
                      <option value="">— Select —</option>
                      {dictRoOptions.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </label>
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <span className="text-sm font-medium text-slate-700">eLGU Version</span>
                    <div className="flex items-center gap-4">
                      {[
                        { label: 'V1', val: editVersionV1, set: setEditVersionV1 },
                        { label: 'V2', val: editVersionV2, set: setEditVersionV2 },
                      ].map(({ label, val, set }) => (
                        <label key={label} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="accent-primary w-4 h-4"
                            checked={val} onChange={e => set(e.target.checked)} />
                          <span className="text-sm text-slate-700 font-medium">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ePayment */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">ePayment Utilization Status</p>
                <div className="flex flex-wrap gap-3">
                  {([
                    { label: 'ePayment',   val: editEpayment,   set: setEditEpayment   },
                    { label: 'eGovPay v1', val: editEgovpayV1,  set: setEditEgovpayV1  },
                    { label: 'eGovPay v2', val: editEgovpayV2,  set: setEditEgovpayV2  },
                  ] as { label: string; val: boolean; set: (v: boolean) => void }[]).map(({ label, val, set }) => (
                    <button key={label} type="button" onClick={() => set(!val)}
                      className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all ${
                        val ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200 shadow-md'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                      }`}>
                      <span className={`w-2 h-2 rounded-full shrink-0 ${val ? 'bg-white/70' : 'bg-slate-400'}`} />
                      {label}
                      <span className="text-xs opacity-75">{val ? 'TRUE' : 'FALSE'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex flex-col gap-3 bg-slate-50/60 rounded-b-2xl">
              {editError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 break-all">{editError}</div>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition">Cancel</button>
                <button type="button" onClick={handleSaveEdit} disabled={saving}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition disabled:opacity-60">
                  {saving ? 'Saving…' : 'Update Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

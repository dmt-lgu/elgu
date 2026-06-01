import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import axios from './../../../plugin/axios';
import Swal from 'sweetalert2';

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear, currentYear + 1];

const monthOptions = [
  '[01] January', '[02] February', '[03] March', '[04] April',
  '[05] May', '[06] June', '[07] July', '[08] August',
  '[09] September', '[10] October', '[11] November', '[12] December',
];

const dictRoOptions = [
  'PMT', 'CAR', 'R1', 'R2', 'R3', 'R4A', 'R4B', 'R5',
  'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13',
  'BARMM I', 'BARMM II', 'NIR',
];

const DICT_RO_TO_REGION: Record<string, string> = {
  'CAR':      'Cordillera Administrative Region (CAR)',
  'R1':       'Region I (Ilocos Region)',
  'R2':       'Region II (Cagayan Valley)',
  'R3':       'Region III (Central Luzon)',
  'R4A':      'Region IV-A (CALABARZON)',
  'R4B':      'MIMAROPA Region',
  'R5':       'Region V (Bicol Region)',
  'R6':       'Region VI (Western Visayas)',
  'R7':       'Region VII (Central Visayas)',
  'R8':       'Region VIII (Eastern Visayas)',
  'R9':       'Region IX (Zamboanga Peninsula)',
  'R10':      'Region X (Northern Mindanao)',
  'R11':      'Region XI (Davao Region)',
  'R12':      'Region XII (SOCCSKSARGEN)',
  'R13':      'Region XIII (Caraga)',
  'BARMM I':  'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
  'BARMM II': 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
  'NIR':      'NIR',
  'R6 (NIR)': 'NIR',
  'R6(NIR)':  'NIR',
  'R7 (NIR)': 'NIR',
  'R7(NIR)':  'NIR',
  'PMT':      'National Capital Region (NCR)',
};

const HEADER_MAP: Record<string, string> = {
  ro: 'dict_ro', dict_ro: 'dict_ro', dictro: 'dict_ro', regional_office: 'dict_ro',
  region: 'region',
  lgu_full_name: 'lgu_full_name', 'lgu full name': 'lgu_full_name', lgufullname: 'lgu_full_name', lgu: 'lgu_full_name',
  report_id: 'report_id', reportid: 'report_id',
  period_id: 'period_id', periodid: 'period_id',
  year: 'year',
  month: 'month',
  epayment: 'epayment', e_payment: 'epayment',
  egovpay_v1: 'egovpay_v1', 'egovpay v1': 'egovpay_v1', egovpayv1: 'egovpay_v1',
  egovpay_v2: 'egovpay_v2', 'egovpay v2': 'egovpay_v2', egovpayv2: 'egovpay_v2',
};

const parseBool = (v: any): boolean => {
  if (typeof v === 'boolean') return v;
  return String(v).trim().toLowerCase() === 'true' || String(v).trim() === '1';
};

const monthNumFromLabel = (m: string): string => m.match(/\[(\d+)\]/)?.[1] ?? '';

const computePeriod = (year: number, month: string): string => {
  const num = monthNumFromLabel(month);
  return num ? `${year}-${num}` : '';
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur = '', inQ = false;
  const cells: string[] = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') { inQ = !inQ; }
    else if (ch === ',' && !inQ) { cells.push(cur.trim()); cur = ''; }
    else if ((ch === '\n' || ch === '\r') && !inQ) {
      cells.push(cur.trim()); cur = '';
      if (cells.some(Boolean)) rows.push([...cells]);
      cells.length = 0;
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else { cur += ch; }
  }
  cells.push(cur.trim());
  if (cells.some(Boolean)) rows.push([...cells]);
  return rows;
}

const ENDPOINT = 'api/v1/elgu/epayment/';

export default function EPaymentManage() {
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_URL || '').replace(/\/$/, '');

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
  const [searchQuery, setSearchQuery] = useState('');
  const [epaymentFilter, setEpaymentFilter] = useState<string[]>([]);
  const [monthFilter, setMonthFilter] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Form state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [dictRo, setDictRo] = useState('');
  const [region, setRegion] = useState('');
  const [lguFullName, setLguFullName] = useState('');
  const [month, setMonth] = useState('');
  const [epayment, setEpayment] = useState(false);
  const [egovpayV1, setEgovpayV1] = useState(false);
  const [egovpayV2, setEgovpayV2] = useState(false);

  // Bulk
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkError, setBulkError] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState({ completed: 0, total: 0 });
  const [bulkMonth, setBulkMonth] = useState('');
  const [bulkSearch, setBulkSearch] = useState('');
  const [bulkPreviewPage, setBulkPreviewPage] = useState(1);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const computedPeriod = useMemo(() => computePeriod(selectedYears[0] ?? currentYear, month), [selectedYears, month]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = selectedYears.map(y => `year=${y}`).join('&');
      const res = await axios.get(`${backendUrl}/${ENDPOINT}?${params}&page_size=9999`);
      setRecords(Array.isArray(res.data) ? res.data : (res.data?.results ?? []));
    } catch { setRecords([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRecords(); }, [selectedYears]);

  const resetForm = () => {
    setDictRo(''); setRegion(''); setLguFullName(''); setMonth('');
    setEpayment(false); setEgovpayV1(false); setEgovpayV2(false); setError('');
  };

  const openAdd = () => { resetForm(); setEditingId(null); setShowFormModal(true); };
  const cancelEdit = () => { setEditingId(null); setShowFormModal(false); setError(''); };

  const handleEdit = (r: any) => {
    setEditingId(r.id);
    setDictRo(r.dict_ro ?? '');
    setRegion(r.region ?? '');
    setLguFullName(r.lgu_full_name ?? '');
    setMonth(r.month ?? '');
    setEpayment(!!r.epayment);
    setEgovpayV1(!!r.egovpay_v1);
    setEgovpayV2(!!r.egovpay_v2);
    setError('');
    setShowFormModal(true);
  };

  const handleDelete = async (r: any) => {
    const result = await Swal.fire({
      title: 'Delete record?',
      text: `Remove "${r.lgu_full_name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      confirmButtonColor: '#ef4444',
    });
    if (!result.isConfirmed) return;
    await axios.delete(`${backendUrl}/${ENDPOINT}${r.id}/`);
    fetchRecords();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const confirmed = await Swal.fire({
      title: editingId ? 'Update Record?' : 'Add Record?',
      text: `${editingId ? 'Save changes to' : 'Add'} "${lguFullName}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: editingId ? 'Yes, Update' : 'Yes, Add',
      confirmButtonColor: '#2563eb',
    });
    if (!confirmed.isConfirmed) return;
    setSaving(true); setError('');
    const period = computedPeriod;
    const payload = {
      year: selectedYears[0] ?? currentYear,
      month,
      period_id: period,
      report_id: period ? `[${period}]${dictRo}` : '',
      dict_ro: dictRo,
      region: region || DICT_RO_TO_REGION[dictRo] || '',
      lgu_full_name: lguFullName,
      epayment, egovpay_v1: egovpayV1, egovpay_v2: egovpayV2,
    };
    try {
      if (editingId) await axios.put(`${backendUrl}/${ENDPOINT}${editingId}/`, payload);
      else await axios.post(`${backendUrl}/${ENDPOINT}`, payload);
      cancelEdit(); fetchRecords();
    } catch (err: any) {
      setError(err?.response?.data ? JSON.stringify(err.response.data) : 'An error occurred.');
    } finally { setSaving(false); }
  };

  const updateBulkRow = (idx: number, field: string, value: any) => {
    setBulkRows(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'dict_ro' && !next[idx].region)
        next[idx].region = DICT_RO_TO_REGION[String(value).trim()] ?? '';
      // recompute period_id and report_id when month or dict_ro changes
      const yr = next[idx].year ?? selectedYears[0] ?? currentYear;
      const m = field === 'month' ? value : next[idx].month;
      const ro = field === 'dict_ro' ? value : next[idx].dict_ro;
      const period = computePeriod(yr, m);
      next[idx].period_id = period;
      next[idx].report_id = period ? `[${period}]${ro}` : '';
      return next;
    });
  };

  const handleBulkParse = () => {
    setBulkError(''); setBulkRows([]); setBulkPreviewPage(1);
    if (!bulkText.trim()) { setBulkError('Paste some data first.'); return; }
    try {
      const rows = parseCsv(bulkText);
      if (rows.length < 2) { setBulkError('Need at least a header row and one data row.'); return; }

      let headerRowIndex = 0, bestScore = -1;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const score = rows[i].filter(c => c.toLowerCase().replace(/\s+/g, '_') in HEADER_MAP).length;
        if (score > bestScore) { bestScore = score; headerRowIndex = i; }
      }

      const rawHeaders = rows[headerRowIndex];
      const headers = rawHeaders.map(h => HEADER_MAP[h.toLowerCase().replace(/\s+/g, '_')] ?? h.toLowerCase().replace(/\s+/g, '_'));

      const yr = selectedYears[0] ?? currentYear;
      const parsed = rows.slice(headerRowIndex + 1)
        .filter(cells => cells.some(Boolean))
        .map(cells => {
          const obj: Record<string, any> = { year: yr };
          headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
          obj.epayment   = parseBool(obj.epayment);
          obj.egovpay_v1 = parseBool(obj.egovpay_v1);
          obj.egovpay_v2 = parseBool(obj.egovpay_v2);
          if (!obj.region && obj.dict_ro)
            obj.region = DICT_RO_TO_REGION[String(obj.dict_ro).trim()] ?? '';
          if (bulkMonth && !obj.month) obj.month = bulkMonth;
          // compute period_id and report_id
          const period = computePeriod(yr, obj.month ?? '');
          if (!obj.period_id) obj.period_id = period;
          if (!obj.report_id && period) obj.report_id = `[${period}]${obj.dict_ro ?? ''}`;
          return obj;
        })
        .filter(obj => obj.lgu_full_name);

      setBulkRows(parsed);
    } catch { setBulkError('Failed to parse data. Make sure it is valid CSV or tab-separated text.'); }
  };

  const handleBulkImport = async () => {
    if (bulkRows.length === 0) return;
    setBulkImporting(true);
    const BATCH = 200;
    const total = Math.ceil(bulkRows.length / BATCH);
    setBulkImportProgress({ completed: 0, total });
    try {
      for (let i = 0; i < bulkRows.length; i += BATCH) {
        await axios.post(`${backendUrl}/${ENDPOINT}`, bulkRows.slice(i, i + BATCH));
        setBulkImportProgress({ completed: Math.floor(i / BATCH) + 1, total });
      }
      setBulkText(''); setBulkRows([]); setShowBulkModal(false);
      fetchRecords();
      Swal.fire({ icon: 'success', title: 'Import complete', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      setBulkError(err?.response?.data ? JSON.stringify(err.response.data) : 'Import failed.');
    } finally { setBulkImporting(false); setBulkImportProgress({ completed: 0, total: 0 }); }
  };

  const filteredRecords = useMemo(() => {
    let r = records;
    if (epaymentFilter.length > 0) {
      r = r.filter(rec =>
        (epaymentFilter.includes('ePayment')   && rec.epayment)   ||
        (epaymentFilter.includes('eGovPay v1') && rec.egovpay_v1) ||
        (epaymentFilter.includes('eGovPay v2') && rec.egovpay_v2)
      );
    }
    if (monthFilter.length > 0) r = r.filter(rec => monthFilter.includes(rec.month));
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(rec =>
        (rec.lgu_full_name || '').toLowerCase().includes(q) ||
        (rec.dict_ro || '').toLowerCase().includes(q) ||
        (rec.region || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [records, searchQuery, epaymentFilter, monthFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visible = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => ({
    epayment:   filteredRecords.filter(r => r.epayment).length,
    egovpay_v1: filteredRecords.filter(r => r.egovpay_v1).length,
    egovpay_v2: filteredRecords.filter(r => r.egovpay_v2).length,
  }), [filteredRecords]);

  const BoolBadge = ({ val }: { val: boolean }) => (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
      val ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-slate-100 text-slate-500 border-slate-200'
    }`}>
      {val ? 'TRUE' : 'FALSE'}
    </span>
  );

  const BPP = 25;
  const bulkRowsFiltered = useMemo(() => {
    const q = bulkSearch.trim().toLowerCase();
    const indexed = bulkRows.map((row, idx) => ({ row, idx }));
    return q
      ? indexed.filter(({ row }) =>
          (row.lgu_full_name || '').toLowerCase().includes(q) ||
          (row.dict_ro || '').toLowerCase().includes(q)
        )
      : indexed;
  }, [bulkRows, bulkSearch]);
  const bpTotal = Math.max(1, Math.ceil(bulkRowsFiltered.length / BPP));
  const bpStart = (bulkPreviewPage - 1) * BPP;
  const bpSlice = bulkRowsFiltered.slice(bpStart, bpStart + BPP);

  return (
    <div className="min-h-full bg-slate-50/40 p-4 sm:p-6 space-y-5">

      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border border-border px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">ePayment Utilization</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage LGU ePayment and eGovPay adoption status per period.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => { setBulkText(''); setBulkRows([]); setBulkError(''); setBulkMonth(''); setBulkSearch(''); setShowBulkModal(true); }}
              className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
              Bulk Import
            </button>
            <button onClick={openAdd}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark transition">
              + Add New Record
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-5">
        {[
          { label: 'ePayment',   count: summary.epayment,   from: 'from-emerald-400', to: 'to-teal-400',    text: 'text-emerald-500' },
          { label: 'eGovPay v1', count: summary.egovpay_v1, from: 'from-blue-400',    to: 'to-indigo-500',  text: 'text-blue-500'    },
          { label: 'eGovPay v2', count: summary.egovpay_v2, from: 'from-violet-400',  to: 'to-purple-500',  text: 'text-violet-500'  },
        ].map(({ label, count, from, to, text }) => (
          <div key={label} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
            <div className={`h-1 bg-gradient-to-r ${from} ${to}`} />
            <div className="px-6 py-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">LGUs with</p>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">{label}</p>
              <p className={`text-5xl font-black mt-3 tabular-nums leading-none ${text}`}>{count}</p>
              <p className="text-xs text-slate-400 mt-3">{monthFilter.length > 0 || epaymentFilter.length > 0 || searchQuery ? 'Filtered view' : `All records · ${selectedYears.join(', ')}`}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">ePayment Records</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredRecords.length !== records.length
                  ? `${filteredRecords.length} of ${records.length} records for ${selectedYears.join(', ')}`
                  : `${records.length} record${records.length !== 1 ? 's' : ''} for ${selectedYears.join(', ')}`}
              </p>
            </div>
            <input value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Search LGU, RO, Region…"
              className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-60 w-full" />
          </div>
          {/* ePayment filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">ePayment</span>
            <button type="button" onClick={() => { setEpaymentFilter([]); setCurrentPage(1); }}
              className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition ${
                epaymentFilter.length === 0 ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
              }`}>
              All
            </button>
            {(['ePayment', 'eGovPay v1', 'eGovPay v2'] as const).map(opt => {
              const isActive = epaymentFilter.includes(opt);
              return (
                <button key={opt} type="button"
                  onClick={() => {
                    setEpaymentFilter(prev => isActive ? prev.filter(x => x !== opt) : [...prev, opt]);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition ${
                    isActive ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400'
                  }`}>
                  {opt}
                </button>
              );
            })}
          </div>

          {/* Month filter chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">Month</span>
            <button type="button" onClick={() => { setMonthFilter([]); setCurrentPage(1); }}
              className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition ${
                monthFilter.length === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary'
              }`}>
              All
            </button>
            {monthOptions.map(opt => {
              const label = opt.replace(/^\[\d+\]\s*/, '').slice(0, 3);
              const isActive = monthFilter.includes(opt);
              return (
                <button key={opt} type="button"
                  onClick={() => {
                    setMonthFilter(prev => isActive ? prev.filter(x => x !== opt) : [...prev, opt]);
                    setCurrentPage(1);
                  }}
                  className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition ${
                    isActive ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary'
                  }`}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm text-left text-slate-700">
            <thead className="bg-slate-50 border-b border-border text-slate-600 text-xs uppercase tracking-wide">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Period ID</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Year</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Month</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">DICT RO</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Region</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">LGU Full Name</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">ePayment</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">eGovPay v1</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">eGovPay v2</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading records…
                  </div>
                </td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                  {searchQuery ? `No records match "${searchQuery}".` : `No records found for ${selectedYears.join(', ')}.`}
                </td></tr>
              ) : visible.map(r => (
                <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{r.period_id || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{r.year || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{r.month || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-medium">{r.dict_ro || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap text-slate-600 max-w-[180px] truncate" title={r.region}>{r.region || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-900">{r.lgu_full_name || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><BoolBadge val={!!r.epayment} /></td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><BoolBadge val={!!r.egovpay_v1} /></td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><BoolBadge val={!!r.egovpay_v2} /></td>
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleEdit(r)}
                        className="rounded-md px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition">Edit</button>
                      <button onClick={() => handleDelete(r)}
                        className="rounded-md px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
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
              {[10, 25, 50, 100, 200].map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) cancelEdit(); }}>
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-lg">
            <form onSubmit={handleSubmit} className="flex flex-col">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">{editingId ? `Edit Record #${editingId}` : 'Add ePayment Record'}</h3>
                <button type="button" onClick={cancelEdit}
                  className="rounded-lg border border-border px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 transition">✕</button>
              </div>
              <div className="p-6 space-y-5 overflow-y-auto max-h-[70vh]">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Reporting Period</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                      Year
                      <div className="rounded-lg border border-border bg-slate-100 px-3 py-2 text-sm text-slate-500 select-none">{selectedYears[0] ?? currentYear}</div>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                      Month
                      <select value={month} onChange={e => setMonth(e.target.value)}
                        className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                        <option value="">— Select —</option>
                        {monthOptions.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                      Period ID
                      <div className="rounded-lg border border-border bg-slate-100 px-3 py-2 text-sm text-slate-500 select-none">
                        {computedPeriod || <span className="italic">Auto — select Year & Month</span>}
                      </div>
                    </label>
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                      Report ID
                      <div className="rounded-lg border border-border bg-slate-100 px-3 py-2 text-sm text-slate-500 select-none">
                        {computedPeriod && dictRo ? `[${computedPeriod}]${dictRo}` : <span className="italic">Auto — select Period & RO</span>}
                      </div>
                    </label>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">LGU Information</p>
                  <div className="grid gap-3">
                    <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                      LGU Full Name <span className="text-red-500">*</span>
                      <input required value={lguFullName} onChange={e => setLguFullName(e.target.value)} placeholder="e.g. Akbar, Basilan"
                        className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full" />
                    </label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        DICT RO
                        <select value={dictRo} onChange={e => { setDictRo(e.target.value); if (!region) setRegion(DICT_RO_TO_REGION[e.target.value] ?? ''); }}
                          className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                          <option value="">— Select —</option>
                          {dictRoOptions.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                        Region
                        <input value={region} onChange={e => setRegion(e.target.value)} placeholder="Auto from DICT RO"
                          className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full" />
                      </label>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">ePayment Status</p>
                  <div className="flex flex-wrap gap-3">
                    {([
                      { label: 'ePayment',   val: epayment,  set: setEpayment },
                      { label: 'eGovPay v1', val: egovpayV1, set: setEgovpayV1 },
                      { label: 'eGovPay v2', val: egovpayV2, set: setEgovpayV2 },
                    ] as const).map(({ label, val, set }) => (
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
                {error && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>}
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={cancelEdit}
                    className="rounded-lg border border-border px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition">Cancel</button>
                  <button type="submit" disabled={saving}
                    className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition disabled:opacity-60">
                    {saving ? 'Saving…' : editingId ? 'Update Record' : 'Add Record'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowBulkModal(false); }}>
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-6xl max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900">Bulk Import — ePayment</h3>
                <p className="text-xs text-slate-500 mt-0.5">Upload or paste CSV. Empty cells show an input so you can fill them before importing.</p>
              </div>
              <button type="button" onClick={() => setShowBulkModal(false)}
                className="rounded-lg border border-border px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 transition">✕</button>
            </div>

            <div className="px-6 pt-4 pb-2 shrink-0 flex flex-col gap-3">
              {/* Global month selector */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider shrink-0">Apply month to all rows:</span>
                <div className="flex flex-wrap gap-1.5">
                  {monthOptions.map(opt => {
                    const active = bulkMonth === opt;
                    return (
                      <button key={opt} type="button"
                        onClick={() => {
                          const m = active ? '' : opt;
                          setBulkMonth(m);
                          if (bulkRows.length > 0) {
                            setBulkRows(prev => prev.map(r => {
                              const period = computePeriod(r.year ?? selectedYears[0] ?? currentYear, m);
                              return { ...r, month: m, period_id: period, report_id: period ? `[${period}]${r.dict_ro ?? ''}` : '' };
                            }));
                          }
                        }}
                        className={`rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all ${
                          active ? 'bg-primary border-primary text-white shadow-sm'
                                 : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary'
                        }`}>
                        {opt.replace(/\[\d+\]\s*/, '')}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input ref={csvFileRef} type="file" accept=".csv,.tsv,.txt" className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = ev => {
                      setBulkText(ev.target?.result as string);
                      setBulkRows([]); setBulkError('');
                      setTimeout(() => document.getElementById('ep-parse-btn')?.click(), 50);
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }} />
                <button type="button" onClick={() => csvFileRef.current?.click()}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5">
                  📂 Upload CSV
                </button>
                <span className="text-xs text-slate-400">or paste directly below</span>
              </div>
              <textarea value={bulkText} onChange={e => { setBulkText(e.target.value); setBulkRows([]); setBulkError(''); }}
                rows={4} placeholder="Paste CSV/TSV with headers: RO, LGU Full Name, ePayment, eGovPay v1, eGovPay v2"
                className="w-full rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm font-mono outline-none focus:border-primary resize-y" />
              {bulkError && <p className="text-sm text-red-600">{bulkError}</p>}
            </div>

            {/* Editable preview table */}
            {bulkRows.length > 0 && (
              <div className="flex-1 overflow-auto px-6 pb-2">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                    {bulkRows.length} row{bulkRows.length !== 1 ? 's' : ''} ready
                  </span>
                  {bulkSearch.trim() && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                      {bulkRowsFiltered.length} match{bulkRowsFiltered.length !== 1 ? 'es' : ''}
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    Showing {bulkRowsFiltered.length > 0 ? bpStart + 1 : 0}–{Math.min(bpStart + BPP, bulkRowsFiltered.length)} of {bulkRowsFiltered.length}
                  </span>
                  <span className="text-xs text-slate-400 ml-1">· Empty fields are highlighted — click to fill</span>
                  <div className="ml-auto">
                    <input
                      value={bulkSearch}
                      onChange={e => { setBulkSearch(e.target.value); setBulkPreviewPage(1); }}
                      placeholder="Search LGU or RO…"
                      className="rounded-lg border border-border bg-slate-50 px-2.5 py-1 text-xs text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-44"
                    />
                  </div>
                </div>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="min-w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">#</th>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">Period ID</th>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">Year</th>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">Month</th>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">DICT RO</th>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">Region</th>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold min-w-[180px]">LGU Full Name</th>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">ePayment</th>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">eGovPay v1</th>
                        <th className="px-3 py-2 whitespace-nowrap font-semibold">eGovPay v2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {bpSlice.map(({ row, idx }, i) => {
                        const missing = !row.dict_ro || !row.lgu_full_name;
                        return (
                          <tr key={idx} className={missing ? 'bg-amber-50' : 'hover:bg-slate-50'}>
                            <td className="px-3 py-1 text-slate-400 font-mono">{bpStart + i + 1}</td>
                            <td className="px-3 py-1 text-slate-500 font-mono text-[11px]">{row.period_id || <span className="text-slate-300">—</span>}</td>
                            <td className="px-3 py-1 text-slate-600">{row.year ?? (selectedYears[0] ?? currentYear)}</td>
                            <td className="px-3 py-1">
                              {row.month
                                ? <span className="text-slate-600">{row.month}</span>
                                : <select value={row.month ?? ''} onChange={e => updateBulkRow(idx, 'month', e.target.value)}
                                    className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs outline-none focus:border-primary w-32">
                                    <option value="">— Month —</option>
                                    {monthOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>}
                            </td>
                            <td className="px-3 py-1">
                              {row.dict_ro
                                ? <span className="font-medium text-slate-800">{row.dict_ro}</span>
                                : <select value={row.dict_ro ?? ''} onChange={e => updateBulkRow(idx, 'dict_ro', e.target.value)}
                                    className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs outline-none focus:border-primary w-24">
                                    <option value="">— RO —</option>
                                    {dictRoOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>}
                            </td>
                            <td className="px-3 py-1">
                              {row.region
                                ? <span className="text-slate-600 max-w-[130px] truncate block" title={row.region}>{row.region}</span>
                                : <input value={row.region ?? ''} onChange={e => updateBulkRow(idx, 'region', e.target.value)}
                                    placeholder="Region…"
                                    className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-xs outline-none focus:border-primary w-32" />}
                            </td>
                            <td className="px-3 py-1">
                              {row.lgu_full_name
                                ? <span className="font-medium text-slate-900">{row.lgu_full_name}</span>
                                : <input value={row.lgu_full_name ?? ''} onChange={e => updateBulkRow(idx, 'lgu_full_name', e.target.value)}
                                    placeholder="LGU Full Name…"
                                    className="rounded border border-red-300 bg-red-50 px-1.5 py-0.5 text-xs outline-none focus:border-primary w-44" />}
                            </td>
                            {(['epayment', 'egovpay_v1', 'egovpay_v2'] as const).map(field => (
                              <td key={field} className="px-3 py-1">
                                <button type="button" onClick={() => updateBulkRow(idx, field, !row[field])}
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors ${
                                    row[field] ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-emerald-200'
                                               : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                  }`}>
                                  {row[field] ? 'TRUE' : 'FALSE'}
                                </button>
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {bpTotal > 1 && (
                  <div className="flex items-center gap-2 mt-2">
                    <button disabled={bulkPreviewPage === 1} onClick={() => setBulkPreviewPage(p => p - 1)}
                      className="rounded border border-border px-2.5 py-1 text-xs disabled:opacity-40">← Prev</button>
                    <span className="text-xs text-slate-500">Page {bulkPreviewPage} of {bpTotal}</span>
                    <button disabled={bulkPreviewPage === bpTotal} onClick={() => setBulkPreviewPage(p => p + 1)}
                      className="rounded border border-border px-2.5 py-1 text-xs disabled:opacity-40">Next →</button>
                  </div>
                )}
              </div>
            )}

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 bg-slate-50/60 rounded-b-2xl shrink-0">
              <button id="ep-parse-btn" type="button" onClick={handleBulkParse}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
                Parse Rows
              </button>
              <button type="button" disabled={bulkRows.length === 0 || bulkImporting} onClick={handleBulkImport}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark transition disabled:opacity-50">
                {bulkImporting
                  ? `Uploading ${bulkImportProgress.completed}/${bulkImportProgress.total}…`
                  : `Import ${bulkRows.length} row${bulkRows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

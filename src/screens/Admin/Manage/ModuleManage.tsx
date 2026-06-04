import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from './../../../plugin/axios';
import Swal from 'sweetalert2';

const moduleConfig: Record<string, { title: string; endpoint: string }> = {
  general: { title: 'General',                                      endpoint: 'api/v1/elgu/general/' },
  bp1:  { title: 'Business Permit (BP1)',                           endpoint: 'api/v1/elgu/bp1/' },
  wp:   { title: 'Working Permit (WP)',                             endpoint: 'api/v1/elgu/wp/' },
  bc:   { title: 'Barangay Clearance (BC)',                         endpoint: 'api/v1/elgu/bc/' },
  bpco: { title: 'Cert. of Occupancy & Bldg. Permit (BPCO)',        endpoint: 'api/v1/elgu/bpco/' },
  lcr:    { title: 'Local Civil Registry (LCR)',    endpoint: 'api/v1/elgu/lcr/'    },
  enews:  { title: 'eNews',                         endpoint: 'api/v1/elgu/enews/'  },
  cedula: { title: 'Cedula',                        endpoint: 'api/v1/elgu/cedula/' },
};

const currentYear = new Date().getFullYear();

const monthOptions = [
  '[01] January', '[02] February', '[03] March', '[04] April',
  '[05] May', '[06] June', '[07] July', '[08] August',
  '[09] September', '[10] October', '[11] November', '[12] December',
];

const bpStatusOptions = [
  '[1] Operational', '[2] Pilot Testing', '[3] Ongoing Data Build-up',
  '[4] For Data Build-up', '[5] For Training', '[6] With Concerns',
  '[7] To Follow-up', '[8] Withdraw',
];

const bcStatusOptions = [
  '[A] Operational', '[B] Developmental', '[C] For Training/Others', '[D] Withdraw',
];

const wpStatusOptions = [
  '[1] Operational', '[2] Ongoing Testing and Data Build-up',
  '[3] With Concerns', '[4] Withdraw', 'N/A',
];

const ustatusOptions = [
  '[A] Operational', '[B] Developmental', '[C] For Training/Others', '[D] Withdraw',
];

const progressRateOptions = ['25%', '40%', '50%', '75%', '80%', '100%'];

const dictRoOptions = [
  'PMT', 'CAR', 'R1', 'R2', 'R3', 'R4A', 'R4B', 'R5',
  'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13',
  'BARMM I', 'BARMM II',
];

const DICT_RO_TO_REGION: Record<string, string> = {
  'NCR':      'National Capital Region (NCR)',
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
};

// Normalise legacy ustatus labels to the current standard values
const USTATUS_NORMALIZE: Record<string, string> = {
  '[A] Live':        '[A] Operational',
  'Live':            '[A] Operational',
  'Operational':     '[A] Operational',
  'Developmental':   '[B] Developmental',
  'Withdraw':        '[D] Withdraw',
};

const sortLetterOptions = [
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H',
  'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R',
];

const mparOptions = ['A', 'B'];
const inputTypeOptions = ['ACCOMP', 'TARGET'];
const moaStatusOptions = [
  'No Old MOA', '2S2N', '2SDN', '2SLN', '2S0N',
  'LS2N', 'LSLN', 'LS0N', "For LGU's Signature", 'No MOA Yet', 'MOA on Hold',
];

const HEADER_MAP: Record<string, string> = {
  // lgu
  lgu: 'lgu', lgu_name: 'lgu', lguname: 'lgu',
  municipality: 'lgu', city_municipality: 'lgu',
  city: 'lgu', town: 'lgu', local_government_unit: 'lgu',
  // period
  period: 'period', period_covered: 'period', periodcovered: 'period',
  reporting_period: 'period', reportingperiod: 'period',
  quarter: 'period',
  // identifiers
  report_id: 'report_id', reportid: 'report_id',
  period_id: 'period', periodid: 'period',
  month: 'month',
  year: 'year',
  // status & progress
  status: 'status',
  progress_rate: 'progress_rate', progressrate: 'progress_rate', progress: 'progress_rate',
  ustatus: 'ustatus', u_status: 'ustatus',
  mpar: 'mpar',
  input_type: 'input_type', inputtype: 'input_type', input: 'input_type',
  moa_status: 'moa_status', moastatus: 'moa_status', moa: 'moa_status',
  version: 'version',
  // location & classification
  new_geocode: 'new_geocode', newgeocode: 'new_geocode', geocode: 'new_geocode',
  name: 'name',
  province: 'province',
  region: 'region',
  district: 'district',
  level: 'level',
  income_class: 'income_class', incomeclass: 'income_class', income: 'income_class',
  dict_ro: 'dict_ro', dictro: 'dict_ro', ro: 'dict_ro', regional_office: 'dict_ro',
  sort: 'sort',
  // epayment
  epayment: 'epayment',
  egovpay_v1: 'epayment', egovpay_v2: 'epayment',
  // narrative
  concerns: 'concerns',
  action_items: 'action_items', actionitems: 'action_items',
  other_remarks: 'other_remarks', otherremarks: 'other_remarks',
  // counts
  operational: 'operational',
  developmental: 'developmental',
  withdraw: 'withdraw',
};


const BULK_PREVIEW_COLS = ['Report ID', 'Period ID', 'LGU', 'Status', 'Progress', 'U-Status', 'DICT RO', 'MPAR', 'Sort', 'Input', 'MOA Status', 'Version'];
const BULK_PREVIEW_FIELDS = ['report_id', 'period', 'lgu', 'status', 'progress_rate', 'ustatus', 'dict_ro', 'mpar', 'sort', 'input_type', 'moa_status', 'version'];


const DATASET_HEADER_MAP: Record<string, string> = {
  lgu_full_name: 'lgu_full_name', 'lgu full name': 'lgu_full_name', lgufullname: 'lgu_full_name', lgu: 'lgu_full_name',
  loi_date: 'loi_date', 'loi date': 'loi_date', loidate: 'loi_date',
  request_date: 'request_date', 'request date': 'request_date', requestdate: 'request_date',
  completion_date: 'completion_date', 'completion date': 'completion_date', completiondate: 'completion_date',
  gcode: 'gcode', geocode: 'gcode', new_geocode: 'gcode',
  old_geocode: 'old_geocode', 'old geocode': 'old_geocode', oldgeocode: 'old_geocode',
  name: 'name',
  province: 'province',
  region: 'region',
  level: 'level',
  income_class: 'income_class', 'income class': 'income_class', incomeclass: 'income_class',
  dict_ro: 'dict_ro', 'dict ro': 'dict_ro', dictro: 'dict_ro',
  mpar: 'mpar',
  sort: 'sort',
  year: 'year',
  bpi: 'bpi',
  coi: 'coi',
  accomp_period: 'accomp_period', 'accomp period': 'accomp_period', accompperiod: 'accomp_period',
};

const DATASET_COLS = ['LGU Full Name', 'LOI Date', 'Request Date', 'Completion Date', 'GCode', 'Old Geocode', 'Name', 'Province', 'Region', 'Level', 'Income Class', 'DICT RO', 'MPAR', 'Sort', 'Year', 'BPI', 'COI', 'Accomp Period'];
const DATASET_FIELDS = ['lgu_full_name', 'loi_date', 'request_date', 'completion_date', 'gcode', 'old_geocode', 'name', 'province', 'region', 'level', 'income_class', 'dict_ro', 'mpar', 'sort', 'year', 'bpi', 'coi', 'accomp_period'];

function mergeRows(existing: any[], incoming: any[]): any[] {
  const map = new Map<string, any>();
  existing.forEach((r) => map.set(`${r.year}|${r.period}|${r.lgu}`, r));
  incoming.forEach((r) => {
    const key = `${r.year}|${r.period}|${r.lgu}`;
    map.set(key, map.has(key) ? { ...map.get(key), ...r } : r);
  });
  return Array.from(map.values());
}

function parseCsv(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  // Detect delimiter from the first line only (before any quoted newlines)
  const firstNewline = normalized.indexOf('\n');
  const firstLine = firstNewline >= 0 ? normalized.slice(0, firstNewline) : normalized;
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  // Parse character-by-character so quoted newlines stay inside their cell
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuote = false;

  for (let i = 0; i <= normalized.length; i++) {
    const ch = i < normalized.length ? normalized[i] : '\n'; // sentinel to flush last row
    if (ch === '"') {
      if (inQuote && normalized[i + 1] === '"') { cur += '"'; i++; }
      else { inQuote = !inQuote; }
    } else if (ch === delimiter && !inQuote) {
      row.push(cur.trim()); cur = '';
    } else if (ch === '\n' && !inQuote) {
      row.push(cur.trim()); cur = '';
      if (row.some((c) => c)) rows.push(row);
      row = [];
    } else {
      cur += ch;
    }
  }

  return rows;
}

function ModuleManage() {
  const { module: moduleId } = useParams();
  const config = moduleId ? moduleConfig[moduleId] : undefined;
  const backendUrl = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_URL || '').replace(/\/$/, '');

  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedYears, setSelectedYears] = useState<number[]>([currentYear]);
  const [lgu, setLgu] = useState('');
  const [region, setRegion] = useState('');
  const [province, setProvince] = useState('');
  const [name, setName] = useState('');
  const [month, setMonth] = useState('');
  const [statusField, setStatusField] = useState('');
  const [progressRate, setProgressRate] = useState('');
  const [concernsField, setConcernsField] = useState('');
  const [actionItemsField, setActionItemsField] = useState('');
  const [otherRemarksField, setOtherRemarksField] = useState('');
  const [ustatusField, setUstatusField] = useState('');
  const [mparField, setMparField] = useState('');
  const [newGeocode, setNewGeocode] = useState('');
  const [levelField, setLevelField] = useState('');
  const [incomeClass, setIncomeClass] = useState('');
  const [dictRo, setDictRo] = useState('');
  const [sortField, setSortField] = useState('');
  const [inputType, setInputType] = useState('');
  const [moaStatus, setMoaStatus] = useState('');
  const [versionField, setVersionField] = useState('');
  const [district, setDistrict] = useState('');
  const [epaymentField, setEpaymentField] = useState<string[]>([]);
  const [operational, setOperational] = useState(0);
  const [developmental, setDevelopmental] = useState(0);
  const [withdraw, setWithdraw] = useState(0);
  const [error, setError] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [bulkRows, setBulkRows] = useState<any[]>([]);
  const [bulkError, setBulkError] = useState('');
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkImportProgress, setBulkImportProgress] = useState({ completed: 0, total: 0 });
  const [bulkImportErrors, setBulkImportErrors] = useState<{ rowNum: number; lgu?: string; reportId?: string; fields: Record<string, string[]> }[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [bulkPreviewPage, setBulkPreviewPage] = useState(1);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showDatasetModal, setShowDatasetModal] = useState(false);
  const [datasetRecords, setDatasetRecords] = useState<any[]>([]);
  const [datasetLoading, setDatasetLoading] = useState(false);
  const [datasetSearch, setDatasetSearch] = useState('');
  const [datasetPage, setDatasetPage] = useState(1);
  const [datasetBulkText, setDatasetBulkText] = useState('');
  const [datasetBulkRows, setDatasetBulkRows] = useState<any[]>([]);
  const [datasetBulkError, setDatasetBulkError] = useState('');
  const [datasetBulkImporting, setDatasetBulkImporting] = useState(false);
  const [datasetBulkProgress, setDatasetBulkProgress] = useState({ completed: 0, total: 0 });
  const [datasetBulkPreviewPage, setDatasetBulkPreviewPage] = useState(1);
  const [datasetView, setDatasetView] = useState<'table' | 'import'>('table');
  const [showDatasetEditModal, setShowDatasetEditModal] = useState(false);
  const [datasetEditId, setDatasetEditId] = useState<number | null>(null);
  const [datasetEditFields, setDatasetEditFields] = useState<Record<string, string>>({});
  const [datasetEditSaving, setDatasetEditSaving] = useState(false);
  const [datasetEditError, setDatasetEditError] = useState('');
  const [lguDropdownOpen, setLguDropdownOpen] = useState(false);
  const lguComboRef = useRef<HTMLDivElement>(null);
  const csvFileRef = useRef<HTMLInputElement>(null);

  const yearOptions = useMemo(() => [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030], []);

  const statusOptions = useMemo(() => {
    if (moduleId === 'bc')  return bcStatusOptions;
    if (moduleId === 'wp')  return wpStatusOptions;
    return bpStatusOptions; // bp1, bpco, lcr all use same [1]-style options
  }, [moduleId]);

  const fetchRecords = useCallback(() => {
    if (!config || selectedYears.length === 0) return;
    setLoading(true);
    Promise.all(
      selectedYears.map((y) =>
        axios
          .get(`${backendUrl}/${config.endpoint}`, { params: { year: y } })
          .then((res) => Array.isArray(res.data) ? res.data : (res.data.results ?? []))
          .catch(() => [])
      )
    )
      .then((results) => setRecords(results.flat()))
      .finally(() => setLoading(false));
  }, [config, selectedYears, backendUrl]);

  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  useEffect(() => { setCurrentPage(1); }, [records.length, pageSize, searchQuery, statusFilter, monthFilter]);

  const isOperationalUstatus = (ustatus: string) => {
    const u = (ustatus || '').toLowerCase();
    return u.includes('operational') || u.includes('live');
  };

  const filteredRecords = useMemo(() => {
    let result = records;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          (r.lgu || '').toLowerCase().includes(q) ||
          (r.period || '').toLowerCase().includes(q) ||
          (r.name || '').toLowerCase().includes(q),
      );
    }
    if (statusFilter) {
      const filterIsOperational = isOperationalUstatus(statusFilter);
      result = result.filter((r) =>
        filterIsOperational ? isOperationalUstatus(r.ustatus) : (r.ustatus || '') === statusFilter
      );
    }
    if (monthFilter) {
      result = result.filter((r) => (r.month || '') === monthFilter);
    }
    return result;
  }, [records, searchQuery, statusFilter, monthFilter]);

  const tableSummary = useMemo(() => {
    const counts = { operational: 0, developmental: 0, withdraw: 0 };
    filteredRecords.forEach((r) => {
      const u = (r.ustatus || '').toLowerCase();
      if (isOperationalUstatus(r.ustatus)) counts.operational++;
      else if (u.includes('developmental')) counts.developmental++;
      else if (u.includes('withdraw')) counts.withdraw++;
    });
    return counts;
  }, [filteredRecords]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const visibleRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  const filteredLgusForDropdown = useMemo(() => {
    const q = lgu.toLowerCase().trim();
    const results = q
      ? datasetRecords.filter((r) => (r.lgu_full_name || '').toLowerCase().includes(q))
      : datasetRecords;
    return results.slice(0, 60);
  }, [datasetRecords, lgu]);

  const handleLguSelect = (record: any) => {
    setLgu(record.lgu_full_name ?? '');
    setName(record.name ?? '');
    setProvince(record.province ?? '');
    setRegion(record.region ?? '');
    setLevelField(record.level ?? '');
    setIncomeClass(record.income_class ?? '');
    setDictRo(record.dict_ro ?? '');
    setSortField(record.sort ?? '');
    setNewGeocode(record.gcode ?? '');
    setMparField(record.mpar ?? '');
    setDistrict(record.district ?? '');
    setLguDropdownOpen(false);
  };

  const computedPeriod = useMemo(() => {
    const yr = selectedYears[0] ?? currentYear;
    const monthNum = month.match(/\[(\d+)\]/)?.[1] ?? '';
    return monthNum ? `${yr}-${monthNum}` : '';
  }, [selectedYears, month]);

  const computedReportId = useMemo(() => {
    if (!computedPeriod || !newGeocode) return '';
    return `[${computedPeriod}]${newGeocode}`;
  }, [computedPeriod, newGeocode]);

  const DS_PAGE_SIZE = 50;
  const filteredDataset = useMemo(() => {
    if (!datasetSearch.trim()) return datasetRecords;
    const q = datasetSearch.toLowerCase();
    return datasetRecords.filter((r) => (r.lgu_full_name || r.name || '').toLowerCase().includes(q));
  }, [datasetRecords, datasetSearch]);
  const dsTotalPages = Math.max(1, Math.ceil(filteredDataset.length / DS_PAGE_SIZE));
  const safeDsPage = Math.min(datasetPage, dsTotalPages);
  const visibleDataset = useMemo(() => {
    const start = (safeDsPage - 1) * DS_PAGE_SIZE;
    return filteredDataset.slice(start, start + DS_PAGE_SIZE);
  }, [filteredDataset, safeDsPage]);

  const resetFormFields = () => {
    setMonth('');
    setLgu(''); setRegion(''); setProvince(''); setName('');
    setStatusField(''); setProgressRate(''); setConcernsField('');
    setActionItemsField(''); setOtherRemarksField('');
    setUstatusField(''); setMparField(''); setNewGeocode('');
    setLevelField(''); setIncomeClass(''); setDictRo('');
    setSortField(''); setInputType(''); setMoaStatus(''); setVersionField('');
    setDistrict(''); setEpaymentField([]);
    setOperational(0); setDevelopmental(0); setWithdraw(0);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowFormModal(false);
    setError('');
  };

  const handleEdit = (record: any) => {
    setEditingId(record.id);
    setMonth(record.month ?? '');
    setLgu(record.lgu ?? '');
    setRegion(record.region ?? '');
    setProvince(record.province ?? '');
    setName(record.name ?? '');
    setStatusField(record.status ?? '');
    setProgressRate(record.progress_rate ?? '');
    setConcernsField(record.concerns ?? '');
    setActionItemsField(record.action_items ?? '');
    setOtherRemarksField(record.other_remarks ?? '');
    setUstatusField(record.ustatus ?? '');
    setMparField(record.mpar ?? '');
    setNewGeocode(record.new_geocode ?? '');
    setLevelField(record.level ?? '');
    setIncomeClass(record.income_class ?? '');
    setDictRo(record.dict_ro ?? '');
    setSortField(record.sort ?? '');
    setInputType(record.input_type ?? '');
    setMoaStatus(record.moa_status ?? '');
    setVersionField(record.version ?? '');
    setDistrict(record.district ?? '');
    setEpaymentField(record.epayment ? String(record.epayment).split(',').map((s: string) => s.trim()).filter(Boolean) : []);
    setOperational(record.operational ?? 0);
    setDevelopmental(record.developmental ?? 0);
    setWithdraw(record.withdraw ?? 0);
    setError('');
    setShowFormModal(true);
  };

  const handleDelete = async (record: any) => {
    const result = await Swal.fire({
      title: 'Delete record?',
      text: `LGU: ${record.lgu} — Period: ${record.period}`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed || !config) return;
    try {
      await axios.delete(`${backendUrl}/${config.endpoint}${record.id}/`);
      fetchRecords();
    } catch {
      Swal.fire('Error', 'Could not delete the record.', 'error');
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!config) return;

    const confirmed = await Swal.fire({
      title: editingId ? 'Update Record?' : 'Add Record?',
      text: editingId
        ? `Save changes to "${lgu}"?`
        : `Add a new record for "${lgu}"?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: editingId ? 'Yes, Update' : 'Yes, Add',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#2563eb',
    });
    if (!confirmed.isConfirmed) return;

    setSaving(true);
    setError('');
    const payload = {
      year: selectedYears[0] ?? currentYear,
      period: computedPeriod,
      lgu,
      report_id: computedReportId,
      period_id: computedPeriod,
      month,
      status: statusField,
      progress_rate: progressRate,
      concerns: concernsField,
      action_items: actionItemsField,
      other_remarks: otherRemarksField,
      ustatus: ustatusField,
      mpar: mparField,
      new_geocode: newGeocode,
      name,
      province,
      region,
      level: levelField,
      income_class: incomeClass,
      dict_ro: dictRo,
      sort: sortField,
      input_type: inputType,
      moa_status: moaStatus,
      version: versionField,
      district,
      epayment: epaymentField.join(','),
      operational,
      developmental,
      withdraw,
    };
    try {
      if (editingId) {
        await axios.put(`${backendUrl}/${config.endpoint}${editingId}/`, payload);
      } else {
        await axios.post(`${backendUrl}/${config.endpoint}`, payload);
      }
      resetFormFields();
      cancelEdit();
      fetchRecords();
    } catch (err: any) {
      const msg = err?.response?.data
        ? JSON.stringify(err.response.data)
        : 'An error occurred. Please try again.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleBulkParse = () => {
    setBulkError('');
    setBulkRows([]);
    setBulkImportErrors([]);
    setBulkPreviewPage(1);
    if (!bulkText.trim()) { setBulkError('Paste some CSV data first.'); return; }
    try {
      const rows = parseCsv(bulkText);
      if (rows.length < 2) { setBulkError('Need at least a header row and one data row.'); return; }

      // Auto-detect the best header row among the first 10 rows by counting HEADER_MAP matches
      let headerRowIndex = 0;
      let bestScore = -1;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const score = rows[i].filter((cell) => cell.toLowerCase().replace(/\s+/g, '_') in HEADER_MAP).length;
        if (score > bestScore) { bestScore = score; headerRowIndex = i; }
      }

      const rawHeaders = rows[headerRowIndex];
      const headers = rawHeaders.map((h) => HEADER_MAP[h.toLowerCase().replace(/\s+/g, '_')] ?? h.toLowerCase().replace(/\s+/g, '_'));
      const missing = ['lgu', 'period'].filter((f) => !headers.includes(f));
      if (missing.length > 0) {
        setBulkError(
          `Required column(s) not found: ${missing.join(', ')}. ` +
          `Detected headers: [${rawHeaders.join(', ')}]. ` +
          `Make sure your CSV has columns named "lgu" and "period" (case-insensitive).`
        );
        return;
      }
      const lguIdx = headers.indexOf('lgu');
      const periodIdx = headers.indexOf('period');
      const parsed = rows
        .slice(headerRowIndex + 1)
        .filter((cells) => {
          const lguVal = (cells[lguIdx] ?? '').trim();
          const periodVal = (cells[periodIdx] ?? '').trim();
          // Skip fully blank rows and rows that look like repeated headers
          return (lguVal || periodVal) && lguVal.toLowerCase() !== 'lgu' && periodVal.toLowerCase() !== 'period';
        })
        .map((cells) => {
          const obj: Record<string, any> = { year: selectedYears[0] ?? currentYear };
          headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
          // Always coerce year to integer; fall back to selected year if unparseable
          const parsedYear = parseInt(String(obj.year), 10);
          obj.year = isNaN(parsedYear) ? (selectedYears[0] ?? currentYear) : parsedYear;
          // Truncate period to backend's 64-char limit
          if (typeof obj.period === 'string') obj.period = obj.period.slice(0, 64);
          // Normalise legacy ustatus labels (e.g. "[A] Live" → "[A] Operational")
          if (obj.ustatus) {
            obj.ustatus = USTATUS_NORMALIZE[String(obj.ustatus).trim()] ?? obj.ustatus;
          }
          // If region is blank, derive it from the DICT RO value
          if (!obj.region && obj.dict_ro) {
            obj.region = DICT_RO_TO_REGION[String(obj.dict_ro).trim()] ?? '';
          }
          return obj;
        })
        // Drop rows where period is not YYYY-MM — these are misaligned CSV rows
        // caused by unquoted commas in text fields shifting all subsequent columns.
        .filter((obj) => /^\d{4}-\d{2}$/.test(String(obj.period ?? '')));

      // Enrich each row with dataset fields (mpar, new_geocode, name, province, report_id)
      // using a case-insensitive LGU name lookup — only fills blank fields, never overwrites.
      const datasetByLgu = new Map(
        datasetRecords.map((r) => [String(r.lgu_full_name ?? '').toLowerCase().trim(), r])
      );
      const enriched = parsed.map((obj) => {
        const ds = datasetByLgu.get(String(obj.lgu ?? '').toLowerCase().trim());
        if (ds) {
          if (!obj.mpar)        obj.mpar        = ds.mpar        ?? '';
          if (!obj.new_geocode) obj.new_geocode  = ds.gcode       ?? '';
          if (!obj.name)        obj.name         = ds.name        ?? '';
          if (!obj.province)    obj.province     = ds.province    ?? '';
          if (!obj.dict_ro)     obj.dict_ro      = ds.dict_ro     ?? '';
          if (!obj.region)      obj.region       = ds.region      ?? '';
          if (!obj.income_class) obj.income_class = ds.income_class ?? '';
          if (!obj.sort)        obj.sort         = ds.sort        ?? '';
          if (!obj.level)       obj.level        = ds.level       ?? '';
        }
        // Compute report_id from period + new_geocode if still blank
        if (!obj.report_id && obj.period && obj.new_geocode) {
          obj.report_id = `[${obj.period}]${obj.new_geocode}`;
        }
        return obj;
      });
      setBulkRows(enriched);
    } catch {
      setBulkError('Failed to parse the pasted data. Make sure it is valid CSV or tab-separated text.');
    }
  };

  const handleBulkImport = async () => {
    if (!config || bulkRows.length === 0) return;
    setBulkImporting(true);
    setBulkImportErrors([]);
    setBulkError('');
    const BATCH = 200;
    const total = Math.ceil(bulkRows.length / BATCH);
    setBulkImportProgress({ completed: 0, total });
    let currentBatchStart = 0;
    try {
      for (let i = 0; i < bulkRows.length; i += BATCH) {
        currentBatchStart = i;
        const batch = bulkRows.slice(i, i + BATCH);
        await axios.post(`${backendUrl}/${config.endpoint}`, batch);
        // Optimistically merge this batch into the visible table immediately
        setRecords((prev) => mergeRows(prev, batch.filter((r) => selectedYears.includes(r.year))));
        setBulkImportProgress({ completed: Math.floor(i / BATCH) + 1, total });
      }
      setBulkText('');
      setBulkRows([]);
      setShowBulkModal(false);
      fetchRecords(); // re-sync to get server-assigned IDs
      Swal.fire({ icon: 'success', title: 'Import complete', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      const data = err?.response?.data;
      if (Array.isArray(data)) {
        const errorRows = data
          .map((rowErr, idx) => {
            const rowNum = currentBatchStart + idx + 1;
            const rowData = bulkRows[currentBatchStart + idx];
            const lgu = rowData?.lgu ?? '';
            const period = rowData?.period ?? '';
            const geocode = rowData?.new_geocode ?? '';
            const reportId = period && geocode ? `[${period}]${geocode}` : '';
            return { rowNum, lgu, reportId, fields: rowErr as Record<string, string[]> };
          })
          .filter(({ fields }) => fields && Object.keys(fields).length > 0);
        setBulkImportErrors(errorRows);
        setBulkError(
          `Import paused at row ${currentBatchStart + 1}. ` +
          `Found ${errorRows.length} row(s) with errors. Fix them and re-import — rows 1–${currentBatchStart} were already saved.`
        );
        setBulkRows(bulkRows.slice(currentBatchStart));
        setBulkPreviewPage(1);
      } else {
        setBulkError(data ? JSON.stringify(data) : 'Import failed.');
      }
    } finally {
      setBulkImporting(false);
      setBulkImportProgress({ completed: 0, total: 0 });
    }
  };

  const fetchDatasetRecords = useCallback(() => {
    if (!config) return;
    setDatasetLoading(true);
    axios
      .get(`${backendUrl}/${config.endpoint}dataset/`)
      .then((res) => setDatasetRecords(Array.isArray(res.data) ? res.data : (res.data.results ?? [])))
      .catch(() => setDatasetRecords([]))
      .finally(() => setDatasetLoading(false));
  }, [backendUrl, config]);
  useEffect(() => { fetchDatasetRecords(); }, [fetchDatasetRecords]);


  const handleDatasetBulkParse = () => {
    setDatasetBulkError('');
    setDatasetBulkRows([]);
    setDatasetBulkPreviewPage(1);
    if (!datasetBulkText.trim()) { setDatasetBulkError('Paste some CSV data first.'); return; }
    try {
      const rows = parseCsv(datasetBulkText);
      if (rows.length < 2) { setDatasetBulkError('Need at least a header row and one data row.'); return; }
      let headerRowIndex = 0;
      let bestScore = -1;
      for (let i = 0; i < Math.min(rows.length, 10); i++) {
        const score = rows[i].filter((cell) => cell.toLowerCase().replace(/\s+/g, '_') in DATASET_HEADER_MAP).length;
        if (score > bestScore) { bestScore = score; headerRowIndex = i; }
      }
      const rawHeaders = rows[headerRowIndex];
      const headers = rawHeaders.map((h) => DATASET_HEADER_MAP[h.toLowerCase().replace(/\s+/g, '_')] ?? h.toLowerCase().replace(/\s+/g, '_'));
      const parsed = rows
        .slice(headerRowIndex + 1)
        .filter((cells) => cells.some((c) => c.trim()))
        .map((cells) => {
          const obj: Record<string, any> = {};
          headers.forEach((h, i) => { obj[h] = cells[i] ?? ''; });
          const parsedYear = parseInt(String(obj.year), 10);
          if (!isNaN(parsedYear)) obj.year = parsedYear;
          return obj;
        });
      setDatasetBulkRows(parsed);
    } catch {
      setDatasetBulkError('Failed to parse the pasted data. Make sure it is valid CSV or tab-separated text.');
    }
  };

  const handleDatasetBulkImport = async () => {
    if (!config || datasetBulkRows.length === 0) return;
    setDatasetBulkImporting(true);
    const BATCH = 200;
    const total = Math.ceil(datasetBulkRows.length / BATCH);
    setDatasetBulkProgress({ completed: 0, total });
    try {
      for (let i = 0; i < datasetBulkRows.length; i += BATCH) {
        const batch = datasetBulkRows.slice(i, i + BATCH);
        await axios.post(`${backendUrl}/${config.endpoint}dataset/`, batch);
        setDatasetBulkProgress({ completed: Math.floor(i / BATCH) + 1, total });
      }
      setDatasetBulkText('');
      setDatasetBulkRows([]);
      setDatasetView('table');
      fetchDatasetRecords();
      Swal.fire({ icon: 'success', title: 'Dataset import complete', timer: 1500, showConfirmButton: false });
    } catch (err: any) {
      const msg = err?.response?.data ? JSON.stringify(err.response.data) : 'Import failed.';
      setDatasetBulkError(msg);
    } finally {
      setDatasetBulkImporting(false);
      setDatasetBulkProgress({ completed: 0, total: 0 });
    }
  };

  const openDatasetEdit = (record: any) => {
    setDatasetEditId(record.id);
    const fields: Record<string, string> = {};
    DATASET_FIELDS.forEach((f) => { fields[f] = record[f] ?? ''; });
    fields['lgu_full_name'] = record.lgu_full_name ?? '';
    setDatasetEditFields(fields);
    setDatasetEditError('');
    setShowDatasetEditModal(true);
  };

  const handleDatasetEditSubmit = async () => {
    if (!config || datasetEditId === null) return;
    setDatasetEditSaving(true);
    setDatasetEditError('');
    try {
      const payload = { ...datasetEditFields };
      const parsedYear = parseInt(String(payload.year), 10);
      if (!isNaN(parsedYear)) payload.year = String(parsedYear);
      await axios.put(`${backendUrl}/${config.endpoint}dataset/${datasetEditId}/`, payload);
      setShowDatasetEditModal(false);
      fetchDatasetRecords();
    } catch (err: any) {
      setDatasetEditError(err?.response?.data ? JSON.stringify(err.response.data) : 'Update failed.');
    } finally {
      setDatasetEditSaving(false);
    }
  };

  const handleDatasetDelete = async (record: any) => {
    if (!config) return;
    const result = await Swal.fire({
      title: 'Delete dataset record?',
      text: record.lgu_full_name,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Yes, delete',
    });
    if (!result.isConfirmed) return;
    try {
      await axios.delete(`${backendUrl}/${config.endpoint}dataset/${record.id}/`);
      fetchDatasetRecords();
    } catch {
      Swal.fire('Error', 'Could not delete the record.', 'error');
    }
  };

  if (!config) {
    return (
      <div className="rounded-2xl border border-border bg-white p-8 text-slate-900 m-6">
        <h2 className="text-xl font-semibold">Unknown module</h2>
        <p className="mt-2 text-sm text-slate-600">Please select a management module from the left navigation.</p>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50/40 p-4 sm:p-6 space-y-5">

      {/* ── Page Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white rounded-2xl border border-border px-6 py-4 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{config.title}</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage and upload records. Use the year selector to switch data sets.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-slate-500 font-medium shrink-0">Year</label>
            {yearOptions.map((y) => (
              <label key={y} className="flex items-center gap-1 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={selectedYears.includes(y)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedYears((prev) => [...prev, y].sort((a, b) => a - b));
                    } else {
                      const next = selectedYears.filter((yr) => yr !== y);
                      if (next.length > 0) setSelectedYears(next);
                    }
                  }}
                />
                <span className={`font-medium ${selectedYears.includes(y) ? 'text-primary' : 'text-slate-600'}`}>{y}</span>
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button type="button" onClick={() => setShowBulkModal(true)}
              className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
              Bulk Import
            </button>
            <button type="button" onClick={() => { setDatasetView('table'); fetchDatasetRecords(); setShowDatasetModal(true); }}
              className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
              Dataset
            </button>
            <button type="button" onClick={() => { if (editingId !== null) resetFormFields(); setEditingId(null); setError(''); setShowFormModal(true); }}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark transition">
              + Add New Record
            </button>
          </div>
        </div>
      </div>

      {/* ── UStatus Summary Cards ── */}
      <div className="grid grid-cols-3 gap-5">

        <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
          <div className="h-1 bg-gradient-to-r from-emerald-400 to-teal-400" />
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. of LGU</p>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">Operational</p>
            <p className="text-5xl font-black text-emerald-500 mt-3 tabular-nums leading-none">
              {tableSummary.operational}
            </p>
            <p className="text-xs text-slate-400 mt-3">{statusFilter || monthFilter || searchQuery ? 'Filtered view' : `All records · ${selectedYears.join(', ')}`}</p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
          <div className="h-1 bg-gradient-to-r from-blue-400 to-indigo-500" />
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. of LGU</p>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">Developmental</p>
            <p className="text-5xl font-black text-blue-500 mt-3 tabular-nums leading-none">
              {tableSummary.developmental}
            </p>
            <p className="text-xs text-slate-400 mt-3">{statusFilter || monthFilter || searchQuery ? 'Filtered view' : `All records · ${selectedYears.join(', ')}`}</p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
          <div className="h-1 bg-gradient-to-r from-rose-400 to-red-500" />
          <div className="px-6 py-5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. of LGU</p>
            <p className="text-sm font-semibold text-slate-600 mt-0.5">Withdraw</p>
            <p className="text-5xl font-black text-rose-500 mt-3 tabular-nums leading-none">
              {tableSummary.withdraw}
            </p>
            <p className="text-xs text-slate-400 mt-3">{statusFilter || monthFilter || searchQuery ? 'Filtered view' : `All records · ${selectedYears.join(', ')}`}</p>
          </div>
        </div>

      </div>

      {/* ── Bulk Import Modal ── */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowBulkModal(false); }}>
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-slate-900">Bulk Import</h3>
                <p className="text-xs text-slate-500 mt-0.5 max-w-md">Paste CSV rows (with a header row) from Excel. Large uploads are sent in batches of 200 and existing records with the same key are updated.</p>
              </div>
              <button type="button" onClick={() => setShowBulkModal(false)}
                className="ml-4 shrink-0 rounded-lg border border-border px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 transition">
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1">
              <div className="flex items-center gap-2 mb-2">
                <input
                  ref={csvFileRef}
                  type="file"
                  accept=".csv,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const text = ev.target?.result as string;
                      setBulkText(text);
                      setBulkRows([]);
                      setBulkError('');
                      setBulkImportErrors([]);
                      setBulkPreviewPage(1);
                      // auto-parse after file load
                      setTimeout(() => {
                        document.getElementById('bulk-parse-btn')?.click();
                      }, 50);
                    };
                    reader.readAsText(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => csvFileRef.current?.click()}
                  className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition flex items-center gap-1.5"
                >
                  📂 Upload CSV
                </button>
                <span className="text-xs text-slate-400">or paste directly below</span>
              </div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Paste CSV header row + data rows here, then click Parse Rows"
                className="w-full min-h-[120px] rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary resize-y"
              />
              {bulkError && <p className="mt-2 text-sm text-red-600">{bulkError}</p>}
              {bulkImportErrors.length > 0 && (
                <div className="mt-3 rounded-xl border border-red-200 bg-red-50 overflow-hidden">
                  <div className="px-4 py-2 bg-red-100 border-b border-red-200">
                    <span className="text-xs font-semibold text-red-800">
                      {bulkImportErrors.length} row(s) with validation errors — fix these in your data then re-import
                    </span>
                  </div>
                  <div className="overflow-x-auto max-h-48 overflow-y-auto">
                    <table className="min-w-full text-xs">
                      <thead className="bg-red-50 sticky top-0 border-b border-red-200">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold text-red-700 whitespace-nowrap">Row #</th>
                          <th className="px-3 py-2 text-left font-semibold text-red-700 whitespace-nowrap">LGU</th>
                          <th className="px-3 py-2 text-left font-semibold text-red-700 whitespace-nowrap">Report ID</th>
                          <th className="px-3 py-2 text-left font-semibold text-red-700">Field</th>
                          <th className="px-3 py-2 text-left font-semibold text-red-700">Error</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-red-100 bg-white">
                        {bulkImportErrors.flatMap(({ rowNum, lgu, reportId, fields }) =>
                          Object.entries(fields).map(([field, msgs], fi) => (
                            <tr key={`${rowNum}-${field}`}>
                              <td className="px-3 py-1.5 font-bold text-red-800 whitespace-nowrap align-top">
                                {fi === 0 ? `Row ${rowNum}` : ''}
                              </td>
                              <td className="px-3 py-1.5 text-red-700 whitespace-nowrap max-w-[160px] truncate align-top">
                                {fi === 0 ? (lgu || '—') : ''}
                              </td>
                              <td className="px-3 py-1.5 text-red-700 whitespace-nowrap align-top font-mono text-xs">
                                {fi === 0 ? (reportId || '—') : ''}
                              </td>
                              <td className="px-3 py-1.5 font-medium text-red-700 whitespace-nowrap align-top">{field}</td>
                              <td className="px-3 py-1.5 text-red-600">{(msgs as string[]).join(', ')}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {bulkRows.length > 0 && (() => {
                const BPP = 25;
                const bpTotal = Math.max(1, Math.ceil(bulkRows.length / BPP));
                const bpStart = (bulkPreviewPage - 1) * BPP;
                const bpSlice = bulkRows.slice(bpStart, bpStart + BPP);
                const errorByRow = new Map(bulkImportErrors.map((e) => [e.rowNum, e.fields]));
                const errorCount = bulkImportErrors.length;
                return (
                  <div className="mt-3">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                        {bulkRows.length} row{bulkRows.length !== 1 ? 's' : ''} ready
                      </span>
                      {errorCount > 0 && (
                        <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">
                          {errorCount} row{errorCount !== 1 ? 's' : ''} with errors
                        </span>
                      )}
                      <span className="text-xs text-slate-400">
                        Showing {bpStart + 1}–{Math.min(bpStart + BPP, bulkRows.length)} of {bulkRows.length}
                      </span>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-border">
                      <table className="min-w-full text-xs text-left text-slate-700">
                        <thead className="bg-slate-100 text-slate-600">
                          <tr>
                            {BULK_PREVIEW_COLS.map((h) => (<th key={h} className="px-3 py-2 whitespace-nowrap font-medium">{h}</th>))}
                            {errorCount > 0 && <th className="px-3 py-2 whitespace-nowrap font-medium text-red-700">Errors</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {bpSlice.map((row, i) => {
                            const rowNum = bpStart + i + 1;
                            const rowErrors = errorByRow.get(rowNum);
                            const hasError = !!rowErrors;
                            return (
                              <tr key={rowNum} className={hasError ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-slate-50'}>
                                {BULK_PREVIEW_FIELDS.map((field) => (
                                  <td key={field} className={`px-3 py-1.5 whitespace-nowrap max-w-[160px] truncate ${hasError ? 'text-red-700 font-medium' : ''}`}>
                                    {String(row[field] ?? '')}
                                  </td>
                                ))}
                                {errorCount > 0 && (
                                  <td className="px-3 py-1.5 min-w-[200px]">
                                    {rowErrors && (
                                      <ul className="space-y-0.5">
                                        {Object.entries(rowErrors).map(([field, msgs]) => (
                                          <li key={field} className="text-red-700">
                                            <span className="font-semibold">{field}:</span> {(msgs as string[]).join(', ')}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {bpTotal > 1 && (
                      <div className="flex items-center gap-2 mt-2">
                        <button type="button"
                          onClick={() => setBulkPreviewPage((p) => Math.max(1, p - 1))}
                          disabled={bulkPreviewPage === 1}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">
                          ← Prev
                        </button>
                        <span className="text-xs text-slate-500">
                          Page {bulkPreviewPage} of {bpTotal}
                        </span>
                        <button type="button"
                          onClick={() => setBulkPreviewPage((p) => Math.min(bpTotal, p + 1))}
                          disabled={bulkPreviewPage === bpTotal}
                          className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">
                          Next →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2 bg-slate-50/60 rounded-b-2xl">
              <button id="bulk-parse-btn" type="button" onClick={handleBulkParse}
                className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
                Parse Rows
              </button>
              <button type="button"
                disabled={bulkRows.length === 0 || bulkImporting}
                onClick={handleBulkImport}
                className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark transition disabled:opacity-50">
                {bulkImporting
                  ? `Uploading ${bulkImportProgress.completed}/${bulkImportProgress.total}…`
                  : `Import ${bulkRows.length} row${bulkRows.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dataset Modal ── */}
      {showDatasetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowDatasetModal(false); }}>
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-start justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900">LGU Dataset</h3>
                <p className="text-xs text-slate-500 mt-0.5">Master reference data for all LGUs. Use Bulk Import to upload CSV data.</p>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <button type="button"
                  onClick={() => setDatasetView(datasetView === 'table' ? 'import' : 'table')}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
                  {datasetView === 'table' ? 'Bulk Import' : '← Back to Records'}
                </button>
                <button type="button" onClick={() => setShowDatasetModal(false)}
                  className="rounded-lg border border-border px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 transition">
                  ✕
                </button>
              </div>
            </div>

            {datasetView === 'table' ? (
              <>
                <div className="px-6 py-3 border-b border-border flex items-center justify-between gap-3 shrink-0">
                  <span className="text-sm text-slate-500">
                    {filteredDataset.length !== datasetRecords.length
                      ? `${filteredDataset.length} of ${datasetRecords.length} records`
                      : `${datasetRecords.length} record${datasetRecords.length !== 1 ? 's' : ''}`}
                  </span>
                  <input
                    value={datasetSearch}
                    onChange={(e) => { setDatasetSearch(e.target.value); setDatasetPage(1); }}
                    placeholder="Search LGU name…"
                    className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-64"
                  />
                </div>
                <div className="overflow-auto flex-1">
                  <table className="min-w-full text-xs text-left text-slate-700">
                    <thead className="bg-slate-50 border-b border-border text-slate-600 uppercase tracking-wide sticky top-0">
                      <tr>
                        {DATASET_COLS.map((h) => (
                          <th key={h} className="px-3 py-2.5 whitespace-nowrap font-semibold">{h}</th>
                        ))}
                        <th className="px-3 py-2.5 whitespace-nowrap font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {datasetLoading ? (
                        <tr>
                          <td colSpan={DATASET_COLS.length + 1} className="px-4 py-10 text-center">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                              Loading dataset…
                            </div>
                          </td>
                        </tr>
                      ) : visibleDataset.length === 0 ? (
                        <tr>
                          <td colSpan={DATASET_COLS.length + 1} className="px-4 py-10 text-center text-slate-400">
                            {datasetSearch ? `No records match "${datasetSearch}".` : 'No dataset records found.'}
                          </td>
                        </tr>
                      ) : (
                        visibleDataset.map((row, i) => (
                          <tr key={row.id ?? i} className="hover:bg-slate-50/60 transition-colors">
                            {DATASET_FIELDS.map((field) => (
                              <td key={field} className="px-3 py-1.5 whitespace-nowrap max-w-[160px] truncate text-slate-700">
                                {String(row[field] ?? '—')}
                              </td>
                            ))}
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <button type="button" onClick={() => openDatasetEdit(row)}
                                  className="rounded-md px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition">
                                  Edit
                                </button>
                                <button type="button" onClick={() => handleDatasetDelete(row)}
                                  className="rounded-md px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition">
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="px-5 py-3 border-t border-border flex items-center gap-2 bg-slate-50/50 rounded-b-2xl shrink-0">
                  <button type="button" onClick={() => setDatasetPage((p) => Math.max(1, p - 1))} disabled={safeDsPage === 1}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">
                    ← Prev
                  </button>
                  <span className="text-sm text-slate-500 px-1">
                    Page <span className="font-semibold text-slate-800">{safeDsPage}</span> of <span className="font-semibold text-slate-800">{dsTotalPages}</span>
                  </span>
                  <button type="button" onClick={() => setDatasetPage((p) => Math.min(dsTotalPages, p + 1))} disabled={safeDsPage === dsTotalPages}
                    className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">
                    Next →
                  </button>
                </div>
              </>
            ) : (
              <div className="p-5 overflow-y-auto flex-1">
                <p className="text-xs text-slate-500 mb-3">
                  Paste CSV or tab-separated data with a header row. Required columns: <span className="font-medium text-slate-700">lgu_full_name</span>. Large uploads are sent in batches of 200.
                </p>
                <textarea
                  value={datasetBulkText}
                  onChange={(e) => setDatasetBulkText(e.target.value)}
                  placeholder={`LGU FULL NAME\tLOI DATE\tREQUEST DATE\tCOMPLETION DATE\tGCODE\t...`}
                  className="w-full min-h-[120px] rounded-xl border border-border bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none focus:border-primary resize-y"
                />
                {datasetBulkError && <p className="mt-2 text-sm text-red-600">{datasetBulkError}</p>}
                {datasetBulkRows.length > 0 && (() => {
                  const BPP = 25;
                  const bpTotal = Math.max(1, Math.ceil(datasetBulkRows.length / BPP));
                  const bpStart = (datasetBulkPreviewPage - 1) * BPP;
                  const bpSlice = datasetBulkRows.slice(bpStart, bpStart + BPP);
                  return (
                    <div className="mt-3">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
                          {datasetBulkRows.length} row{datasetBulkRows.length !== 1 ? 's' : ''} ready
                        </span>
                        <span className="text-xs text-slate-400">
                          Showing {bpStart + 1}–{Math.min(bpStart + BPP, datasetBulkRows.length)} of {datasetBulkRows.length}
                        </span>
                      </div>
                      <div className="overflow-x-auto rounded-xl border border-border">
                        <table className="min-w-full text-xs text-left text-slate-700">
                          <thead className="bg-slate-100 text-slate-600">
                            <tr>{DATASET_COLS.map((h) => (<th key={h} className="px-3 py-2 whitespace-nowrap font-medium">{h}</th>))}</tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {bpSlice.map((row, i) => (
                              <tr key={bpStart + i} className="hover:bg-slate-50">
                                {DATASET_FIELDS.map((field) => (
                                  <td key={field} className="px-3 py-1.5 whitespace-nowrap max-w-[140px] truncate">{String(row[field] ?? '')}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {bpTotal > 1 && (
                        <div className="flex items-center gap-2 mt-2">
                          <button type="button" onClick={() => setDatasetBulkPreviewPage((p) => Math.max(1, p - 1))} disabled={datasetBulkPreviewPage === 1}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">
                            ← Prev
                          </button>
                          <span className="text-xs text-slate-500">Page {datasetBulkPreviewPage} of {bpTotal}</span>
                          <button type="button" onClick={() => setDatasetBulkPreviewPage((p) => Math.min(bpTotal, p + 1))} disabled={datasetBulkPreviewPage === bpTotal}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">
                            Next →
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button type="button" onClick={handleDatasetBulkParse}
                    className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 transition">
                    Parse Rows
                  </button>
                  <button type="button"
                    disabled={datasetBulkRows.length === 0 || datasetBulkImporting}
                    onClick={handleDatasetBulkImport}
                    className="rounded-lg bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-dark transition disabled:opacity-50">
                    {datasetBulkImporting
                      ? `Uploading ${datasetBulkProgress.completed}/${datasetBulkProgress.total}…`
                      : `Import ${datasetBulkRows.length} row${datasetBulkRows.length !== 1 ? 's' : ''}`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Dataset Edit Modal ── */}
      {showDatasetEditModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) setShowDatasetEditModal(false); }}>
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-semibold text-slate-900">Edit Dataset Record</h3>
                <p className="text-xs text-slate-500 mt-0.5">{datasetEditFields['lgu_full_name']}</p>
              </div>
              <button type="button" onClick={() => setShowDatasetEditModal(false)}
                className="rounded-lg border border-border px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 transition">
                ✕
              </button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 sm:col-span-2">
                LGU Full Name
                <input value={datasetEditFields['lgu_full_name'] ?? ''} onChange={(e) => setDatasetEditFields((f) => ({ ...f, lgu_full_name: e.target.value }))}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
              </label>
              {(['loi_date', 'request_date', 'completion_date'] as const).map((f) => (
                <label key={f} className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  {f === 'loi_date' ? 'LOI Date' : f === 'request_date' ? 'Request Date' : 'Completion Date'}
                  <input value={datasetEditFields[f] ?? ''} onChange={(e) => setDatasetEditFields((prev) => ({ ...prev, [f]: e.target.value }))}
                    className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                </label>
              ))}
              {(['gcode', 'old_geocode', 'name', 'province', 'region', 'level', 'income_class', 'dict_ro', 'mpar', 'sort', 'year', 'bpi', 'coi', 'accomp_period'] as const).map((f) => (
                <label key={f} className="flex flex-col gap-1 text-xs font-medium text-slate-600">
                  {f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  <input value={datasetEditFields[f] ?? ''} onChange={(e) => setDatasetEditFields((prev) => ({ ...prev, [f]: e.target.value }))}
                    className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10" />
                </label>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-border flex flex-col gap-3 bg-slate-50/60 rounded-b-2xl shrink-0">
              {datasetEditError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{datasetEditError}</div>
              )}
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setShowDatasetEditModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition">
                  Cancel
                </button>
                <button type="button" onClick={handleDatasetEditSubmit} disabled={datasetEditSaving}
                  className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition disabled:opacity-60">
                  {datasetEditSaving ? 'Saving…' : 'Update Record'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Add / Edit Form Modal ── */}
      {showFormModal && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={(e) => { if (e.target === e.currentTarget) cancelEdit(); }}>
        <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
      <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            {ustatusField && (
              <span
                title={ustatusField}
                className={`shrink-0 w-3 h-3 rounded-full ring-2 ring-offset-1 ${
                  ustatusField.startsWith('[A]') ? 'bg-emerald-500 ring-emerald-300'
                  : ustatusField.startsWith('[B]') ? 'bg-blue-500 ring-blue-300'
                  : ustatusField.startsWith('[C]') ? 'bg-amber-400 ring-amber-200'
                  : ustatusField.startsWith('[D]') ? 'bg-rose-500 ring-rose-300'
                  : 'bg-slate-400 ring-slate-200'
                }`}
              />
            )}
            <div>
              <h3 className="font-semibold text-slate-900">
                {editingId ? `Edit Record #${editingId}` : 'Add New Record'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {ustatusField
                  ? <span className={`font-medium ${
                      ustatusField.startsWith('[A]') ? 'text-emerald-600'
                      : ustatusField.startsWith('[B]') ? 'text-blue-600'
                      : ustatusField.startsWith('[C]') ? 'text-amber-600'
                      : ustatusField.startsWith('[D]') ? 'text-rose-600'
                      : 'text-slate-500'
                    }`}>{ustatusField}</span>
                  : (editingId ? 'Update the fields below and click Update Record.' : 'Fill in the required fields marked with *.')}
              </p>
            </div>
          </div>
          <button type="button" onClick={cancelEdit}
            className="rounded-lg border border-border px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 transition">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto flex-1">

          {/* Reporting Period */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Reporting Period</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Report ID
                <div className="rounded-lg border border-border bg-slate-100 px-3 py-2 text-sm text-slate-500 select-none">
                  {computedReportId || <span className="italic">Auto — fill Period &amp; New Geocode</span>}
                </div>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Period ID
                <div className="rounded-lg border border-border bg-slate-100 px-3 py-2 text-sm text-slate-500 select-none">
                  {computedPeriod || <span className="italic">Auto — select Year &amp; Month</span>}
                </div>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Year
                <div className="rounded-lg border border-border bg-slate-100 px-3 py-2 text-sm text-slate-500 select-none">
                  {selectedYears[0] ?? currentYear}
                </div>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Month
                <select value={month} onChange={(e) => setMonth(e.target.value)}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                  <option value="">— Select —</option>
                  {month && !monthOptions.includes(month) && <option value={month}>{month}</option>}
                  {monthOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </label>
            </div>
          </div>

          {/* Monthly Utilization Status */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Monthly Utilization Status</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 sm:col-span-2">
                LGU Full Name <span className="text-red-500">*</span>
                <div ref={lguComboRef} className="relative">
                  <input
                    value={lgu}
                    required
                    onChange={(e) => { setLgu(e.target.value); setLguDropdownOpen(true); }}
                    onFocus={() => setLguDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setLguDropdownOpen(false), 150)}
                    placeholder={datasetRecords.length > 0 ? 'Type to search LGU…' : 'e.g. City of Manila'}
                    className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full"
                  />
                  {lguDropdownOpen && filteredLgusForDropdown.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto">
                      {filteredLgusForDropdown.map((record) => (
                        <div
                          key={record.id}
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => handleLguSelect(record)}
                          className="px-3 py-2 text-sm text-slate-800 cursor-pointer hover:bg-primary/5 hover:text-primary transition-colors"
                        >
                          {record.lgu_full_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Monthly Status
                <select value={statusField} onChange={(e) => setStatusField(e.target.value)}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                  <option value="">— Select —</option>
                  {statusField && !statusOptions.includes(statusField) && <option value={statusField}>{statusField}</option>}
                  {statusOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Progress Rate
                <select value={progressRate} onChange={(e) => setProgressRate(e.target.value)}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                  <option value="">— Select —</option>
                  {progressRate && !progressRateOptions.includes(progressRate) && <option value={progressRate}>{progressRate}</option>}
                  {progressRateOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </label>
            </div>
          </div>

          {/* LGU Profile */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">LGU Profile</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {/* U-Status toggle buttons */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">Universal Status (U-Status)</span>
                <div className="flex flex-wrap gap-2">
                  {ustatusOptions.map((opt) => {
                    const active = ustatusField === opt;
                    const colorClass =
                      opt.startsWith('[A]') ? (active ? 'bg-emerald-500 border-emerald-500 text-white shadow-emerald-200 shadow-md' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50')
                      : opt.startsWith('[B]') ? (active ? 'bg-blue-500 border-blue-500 text-white shadow-blue-200 shadow-md' : 'border-blue-300 text-blue-700 hover:bg-blue-50')
                      : opt.startsWith('[C]') ? (active ? 'bg-amber-400 border-amber-400 text-white shadow-amber-200 shadow-md' : 'border-amber-300 text-amber-700 hover:bg-amber-50')
                      : (active ? 'bg-rose-500 border-rose-500 text-white shadow-rose-200 shadow-md' : 'border-rose-300 text-rose-700 hover:bg-rose-50');
                    const dotClass =
                      opt.startsWith('[A]') ? (active ? 'bg-white/70' : 'bg-emerald-400')
                      : opt.startsWith('[B]') ? (active ? 'bg-white/70' : 'bg-blue-400')
                      : opt.startsWith('[C]') ? (active ? 'bg-white/70' : 'bg-amber-400')
                      : (active ? 'bg-white/70' : 'bg-rose-400');
                    return (
                      <button key={opt} type="button" onClick={() => setUstatusField(active ? '' : opt)}
                        className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${colorClass}`}>
                        <span className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} />
                        {opt}
                      </button>
                    );
                  })}
                  {ustatusField && !ustatusOptions.includes(ustatusField) && (
                    <button type="button" onClick={() => setUstatusField('')}
                      className="flex items-center gap-2 rounded-full border border-slate-400 bg-slate-500 px-3.5 py-1.5 text-sm font-medium text-white shadow-md shadow-slate-200 transition-all">
                      <span className="w-2 h-2 rounded-full bg-white/70 shrink-0" />
                      {ustatusField}
                    </button>
                  )}
                </div>
              </div>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                District
                <input value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. 1st District"
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Level
                <input value={levelField} onChange={(e) => setLevelField(e.target.value)} placeholder="e.g. City, Municipality"
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Income Class
                <input value={incomeClass} onChange={(e) => setIncomeClass(e.target.value)} placeholder="e.g. 1st, 2nd"
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                DICT RO
                <select value={dictRo} onChange={(e) => setDictRo(e.target.value)}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                  <option value="">— Select —</option>
                  {dictRo && !dictRoOptions.includes(dictRo) && <option value={dictRo}>{dictRo}</option>}
                  {dictRoOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </label>
              {/* eLGU Version checkboxes */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <span className="text-sm font-medium text-slate-700">eLGU Version</span>
                <div className="flex gap-3">
                  {(['v1', 'v2'] as const).map((v) => {
                    const checked = versionField === v || versionField === 'with v1 v2';
                    const onlyOther = v === 'v1' ? 'v2' : 'v1';
                    return (
                      <label key={v} className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const otherChecked = versionField === onlyOther || versionField === 'with v1 v2';
                            if (e.target.checked) {
                              setVersionField(otherChecked ? 'with v1 v2' : v);
                            } else {
                              setVersionField(otherChecked ? onlyOther : '');
                            }
                          }}
                          className="w-4 h-4 rounded border-border accent-primary"
                        />
                        <span className={`text-sm font-medium px-2 py-0.5 rounded-full border ${checked ? 'bg-primary/10 border-primary text-primary' : 'border-slate-200 text-slate-600'}`}>
                          {v.toUpperCase()}
                        </span>
                      </label>
                    );
                  })}
                  {versionField && (
                    <span className="text-xs text-slate-400 self-center">→ {versionField}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ePayment Utilization Status */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">ePayment Utilization Status</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['ePayment', 'eGovPay v1', 'eGovPay v2'] as const).map((opt) => {
                const active = epaymentField.includes(opt);
                return (
                  <button key={opt} type="button"
                    onClick={() => setEpaymentField(active ? epaymentField.filter((x) => x !== opt) : [...epaymentField, opt])}
                    className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all ${
                      active
                        ? 'bg-emerald-600 border-emerald-600 text-white shadow-emerald-200 shadow-md'
                        : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'
                    }`}>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${active ? 'bg-white/70' : 'bg-emerald-400'}`} />
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Additional Details */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Additional Details</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                New Geocode
                <input value={newGeocode} onChange={(e) => setNewGeocode(e.target.value)}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Province
                <input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="e.g. Metro Manila"
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Region
                <input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="e.g. NCR"
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Name / Municipality
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional alternate name"
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                MPAR
                <select value={mparField} onChange={(e) => setMparField(e.target.value)}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                  <option value="">— Select —</option>
                  {mparField && !mparOptions.includes(mparField) && <option value={mparField}>{mparField}</option>}
                  {mparOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                MOA Status
                <select value={moaStatus} onChange={(e) => setMoaStatus(e.target.value)}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                  <option value="">— Select —</option>
                  {moaStatus && !moaStatusOptions.includes(moaStatus) && <option value={moaStatus}>{moaStatus}</option>}
                  {moaStatusOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Input Type
                <select value={inputType} onChange={(e) => setInputType(e.target.value)}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                  <option value="">— Select —</option>
                  {inputType && !inputTypeOptions.includes(inputType) && <option value={inputType}>{inputType}</option>}
                  {inputTypeOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Sort
                <select value={sortField} onChange={(e) => setSortField(e.target.value)}
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-full">
                  <option value="">— Select —</option>
                  {sortField && !sortLetterOptions.includes(sortField) && <option value={sortField}>{sortField}</option>}
                  {sortLetterOptions.map((opt) => (<option key={opt} value={opt}>{opt}</option>))}
                </select>
              </label>
            </div>
          </div>

          {/* Narrative */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Narrative</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
            <div className="grid gap-4">
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Concerns
                <textarea value={concernsField} onChange={(e) => setConcernsField(e.target.value)} rows={2}
                  placeholder="List any concerns here…"
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-y w-full" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Action Items
                <textarea value={actionItemsField} onChange={(e) => setActionItemsField(e.target.value)} rows={2}
                  placeholder="List action items here…"
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-y w-full" />
              </label>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700">
                Other Remarks
                <textarea value={otherRemarksField} onChange={(e) => setOtherRemarksField(e.target.value)} rows={2}
                  placeholder="Any other remarks…"
                  className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 resize-y w-full" />
              </label>
            </div>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-border flex flex-col gap-3 bg-slate-50/60 rounded-b-2xl shrink-0">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{error}</div>
          )}
          <div className="flex items-center justify-between">
          <p className="text-xs text-slate-400">Fields marked <span className="text-red-500 font-bold">*</span> are required</p>
          <div className="flex items-center gap-3">
            <button type="button" onClick={cancelEdit}
              className="rounded-lg border border-border px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 transition">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white hover:bg-primary-dark transition disabled:opacity-60">
              {saving ? 'Saving…' : editingId ? 'Update Record' : 'Add Record'}
            </button>
          </div>
          </div>
        </div>
      </form>
        </div>
      </div>
      )}

      {/* ── Records Table ── */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-4 border-b border-border flex flex-col gap-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">{config.title} Records</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredRecords.length !== records.length
                  ? `${filteredRecords.length} of ${records.length} records for ${selectedYears.join(', ')}`
                  : `${records.length} record${records.length !== 1 ? 's' : ''} for ${selectedYears.join(', ')}`}
              </p>
            </div>
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search LGU, period, or name…"
              className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 sm:w-60 w-full"
            />
          </div>

          {/* UStatus chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">UStatus</span>
            {(['', ...ustatusOptions] as string[]).map((opt) => {
              const label = opt === '' ? 'All' : opt.replace(/^\[[A-Z0-9]\]\s*/, '');
              const isActive = statusFilter === opt;
              const color = opt === '' ? (isActive ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400')
                : opt.toLowerCase().includes('operational') ? (isActive ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-400')
                : opt.toLowerCase().includes('developmental') ? (isActive ? 'bg-blue-500 text-white border-blue-500' : 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400')
                : opt.toLowerCase().includes('withdraw') ? (isActive ? 'bg-red-500 text-white border-red-500' : 'bg-red-50 text-red-700 border-red-200 hover:border-red-400')
                : (isActive ? 'bg-amber-500 text-white border-amber-500' : 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400');
              return (
                <button key={opt} type="button" onClick={() => setStatusFilter(opt)}
                  className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition ${color}`}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Month chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">Month</span>
            {(['', ...monthOptions] as string[]).map((opt) => {
              const label = opt === '' ? 'All' : opt.replace(/^\[\d+\]\s*/, '').slice(0, 3);
              const isActive = monthFilter === opt;
              return (
                <button key={opt} type="button" onClick={() => setMonthFilter(opt)}
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
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Report ID</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Period ID</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Year</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Month</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">LGU Name</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">UStatus</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Progress Rate</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Concerns</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Action Items</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Other Remarks</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Status</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">MPAR</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">New Geocode</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Name</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Province</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Region</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Level</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Income Class</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">DICT RO</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Sort</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Version</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">ePayment</th>
                <th className="px-4 py-3 whitespace-nowrap font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={23} className="px-4 py-10 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Loading records…
                    </div>
                  </td>
                </tr>
              ) : visibleRecords.length === 0 ? (
                <tr>
                  <td colSpan={22} className="px-4 py-10 text-center text-slate-400">
                    {searchQuery ? `No records match "${searchQuery}".` : `No records found for ${selectedYears.join(', ')}.`}
                  </td>
                </tr>
              ) : (
                visibleRecords.map((record) => {
                  const s = (record.status || '').toLowerCase();
                  const badge = s.includes('operational')
                    ? 'bg-green-100 text-green-800 border-green-200'
                    : s.includes('developmental') || s.includes('ongoing') || s.includes('pilot')
                    ? 'bg-blue-100 text-blue-800 border-blue-200'
                    : s.includes('withdraw')
                    ? 'bg-red-100 text-red-800 border-red-200'
                    : s.includes('concern') || s.includes('follow')
                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                    : s.includes('training') || s.includes('build')
                    ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200';
                  return (
                    <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">{record.report_id || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{record.period_id || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{record.year || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{record.month || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium text-slate-900">{record.lgu || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {record.ustatus ? (() => {
                          const ubadge = isOperationalUstatus(record.ustatus)
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : (record.ustatus || '').toLowerCase().includes('developmental')
                            ? 'bg-blue-100 text-blue-800 border-blue-200'
                            : (record.ustatus || '').toLowerCase().includes('withdraw')
                            ? 'bg-red-100 text-red-800 border-red-200'
                            : (record.ustatus || '').toLowerCase().includes('training') || (record.ustatus || '').toLowerCase().includes('others')
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200';
                          return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${ubadge}`}>{record.ustatus}</span>;
                        })() : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{record.progress_rate || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">{record.concerns || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">{record.action_items || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">{record.other_remarks || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {record.status
                          ? <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${badge}`}>{record.status}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{record.mpar || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-xs text-slate-500">{record.new_geocode || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{record.name || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{record.province || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{record.region || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{record.level || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{record.income_class || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap font-medium">{record.dict_ro || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">{record.sort || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-slate-100 text-slate-600 border-slate-200">
                          {record.version || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {record.epayment ? (
                          <div className="flex flex-wrap gap-1">
                            {String(record.epayment).split(',').map((p: string) => p.trim()).filter(Boolean).map((p: string) => (
                              <span key={p} className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800 border-emerald-200">
                                {p}
                              </span>
                            ))}
                          </div>
                        ) : <span className="text-slate-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <button type="button" onClick={() => handleEdit(record)}
                            className="rounded-md px-2.5 py-1 text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition">
                            Edit
                          </button>
                          <button type="button" onClick={() => handleDelete(record)}
                            className="rounded-md px-2.5 py-1 text-xs font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition">
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-border flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">
              ← Prev
            </button>
            <span className="text-sm text-slate-500 px-1">
              Page <span className="font-semibold text-slate-800">{currentPage}</span> of <span className="font-semibold text-slate-800">{totalPages}</span>
            </span>
            <button type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition">
              Next →
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">Rows per page</span>
            <select value={pageSize} onChange={(e) => setPageSize(Number(e.target.value))}
              className="rounded-lg border border-border bg-white px-2 py-1.5 text-sm text-slate-700 outline-none focus:border-primary">
              {[10,25, 50, 100, 200].map((s) => (<option key={s} value={s}>{s}</option>))}
            </select>
          </div>
        </div>
      </div>

    </div>
  );
}

export default ModuleManage;

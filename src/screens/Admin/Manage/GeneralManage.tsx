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

const DICT_RO_TO_REGION: Record<string, string> = {
  PMT:       'National Capital Region (NCR)',
  CAR:       'Cordillera Administrative Region (CAR)',
  R1:        'Region I (Ilocos Region)',
  R2:        'Region II (Cagayan Valley)',
  R3:        'Region III (Central Luzon)',
  R4A:       'Region IV-A (CALABARZON)',
  R4B:       'MIMAROPA Region',
  R5:        'Region V (Bicol Region)',
  R6:        'Region VI (Western Visayas)',
  R7:        'Region VII (Central Visayas)',
  R8:        'Region VIII (Eastern Visayas)',
  R9:        'Region IX (Zamboanga Peninsula)',
  R10:       'Region X (Northern Mindanao)',
  R11:       'Region XI (Davao Region)',
  R12:       'Region XII (SOCCSKSARGEN)',
  R13:       'Region XIII (Caraga)',
  'BARMM I':  'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
  'BARMM II': 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)',
  NIR:       'NIR',
};

const ENDPOINTS = {
  bp1:      'api/v1/elgu/bp1/',
  wp:       'api/v1/elgu/wp/',
  bc:       'api/v1/elgu/bc/',
  bpco:     'api/v1/elgu/bpco/',
  lcr:      'api/v1/elgu/lcr/',
  enews:    'api/v1/elgu/enews/',
  cedula:   'api/v1/elgu/cedula/',
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
  region: string;
  province: string;
  lgu_name_official: string;
  mpar: string;
  new_geocode: string;
  sort: string;
  version: string;
  bp1_version: string;
  wp_version: string;
  bc_version: string;
  bpco_version: string;
  lcr_ustatus: string;
  lcr_version: string;
  lcr_id: number | null;
  enews_ustatus: string;
  enews_version: string;
  enews_id: number | null;
  cedula_ustatus: string;
  cedula_version: string;
  cedula_id: number | null;
  bp1_id: number | null;
  wp_id: number | null;
  bc_id: number | null;
  bpco_id: number | null;
  epayment_id: number | null;
}

function monthNum(m: string): string {
  return m.match(/\[(\d+)\]/)?.[1] ?? '';
}

const _MONTH_NAMES: Record<string, string> = {
  january:'01', february:'02', march:'03', april:'04',
  may:'05', june:'06', july:'07', august:'08',
  september:'09', october:'10', november:'11', december:'12',
};

function normalizeMonth(val: string): string {
  if (!val) return '';
  const bracket = val.match(/\[(\d{1,2})\]/);
  if (bracket) return bracket[1].padStart(2, '0');
  const dash = val.match(/\d{4}-(\d{1,2})/);
  if (dash) return dash[1].padStart(2, '0');
  if (/^\d{1,2}$/.test(val.trim())) return val.trim().padStart(2, '0');
  return _MONTH_NAMES[val.toLowerCase().trim()] || '';
}

function monthOptionFromNum(num: string): string {
  return monthOptions.find(m => monthNum(m) === num) ?? '';
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
  const [moduleFilter, setModuleFilter] = useState<string[]>([]);
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
  const [editBp1V1, setEditBp1V1] = useState(false);
  const [editBp1V2, setEditBp1V2] = useState(false);
  const [editWpV1, setEditWpV1] = useState(false);
  const [editWpV2, setEditWpV2] = useState(false);
  const [editBcV1, setEditBcV1] = useState(false);
  const [editBcV2, setEditBcV2] = useState(false);
  const [editBpcoV1, setEditBpcoV1] = useState(false);
  const [editBpcoV2, setEditBpcoV2] = useState(false);
  const [editLcrUstatus, setEditLcrUstatus] = useState('');
  const [editLcrV1, setEditLcrV1] = useState(false);
  const [editLcrV2, setEditLcrV2] = useState(false);
  const [editEnewsUstatus, setEditEnewsUstatus] = useState('');
  const [editEnewsV1, setEditEnewsV1] = useState(false);
  const [editEnewsV2, setEditEnewsV2] = useState(false);
  const [editCedulaUstatus, setEditCedulaUstatus] = useState('');
  const [editCedulaV1, setEditCedulaV1] = useState(false);
  const [editCedulaV2, setEditCedulaV2] = useState(false);
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

      const [bp1Data, wpData, bcData, bpcoData, lcrData, enewsData, cedulaData, epData] = await Promise.all([
        fetchList(ENDPOINTS.bp1),
        fetchList(ENDPOINTS.wp),
        fetchList(ENDPOINTS.bc),
        fetchList(ENDPOINTS.bpco),
        fetchList(ENDPOINTS.lcr),
        fetchList(ENDPOINTS.enews),
        fetchList(ENDPOINTS.cedula),
        fetchList(ENDPOINTS.epayment),
      ]);

      const map = new Map<string, MergedRecord>();

      const getOrCreate = (key: string, year: number, month: string, mNum: string, lgu: string): MergedRecord => {
        if (!map.has(key)) {
          map.set(key, {
            key, year, month,
            period_id: mNum ? `${year}-${mNum}` : '',
            lgu_name: lgu,
            bp1_ustatus: '', wp_ustatus: '', bc_ustatus: '', bpco_ustatus: '',
            epayment: false, egovpay_v1: false, egovpay_v2: false,
            ustatus: '', district: '', level: '', income_class: '', dict_ro: '',
            region: '', province: '', lgu_name_official: '', mpar: '', new_geocode: '', sort: '',
            version: '',
            bp1_version: '', wp_version: '', bc_version: '', bpco_version: '',
            lcr_ustatus: '', lcr_version: '', lcr_id: null,
            enews_ustatus: '', enews_version: '', enews_id: null,
            cedula_ustatus: '', cedula_version: '', cedula_id: null,
            bp1_id: null, wp_id: null, bc_id: null, bpco_id: null, epayment_id: null,
          });
        }
        return map.get(key)!;
      };

      const applyProfile = (rec: MergedRecord, r: any) => {
        if (!rec.ustatus           && r.ustatus)      rec.ustatus           = r.ustatus;
        if (!rec.district          && r.district)     rec.district          = r.district;
        if (!rec.level             && r.level)        rec.level             = r.level;
        if (!rec.income_class      && r.income_class) rec.income_class      = r.income_class;
        if (!rec.dict_ro           && r.dict_ro)      rec.dict_ro           = r.dict_ro;
        if (!rec.region            && r.region)       rec.region            = r.region;
        if (!rec.province          && r.province)     rec.province          = r.province;
        if (!rec.lgu_name_official && r.name)         rec.lgu_name_official = r.name;
        if (!rec.mpar              && r.mpar)         rec.mpar              = r.mpar;
        if (!rec.new_geocode       && r.new_geocode)  rec.new_geocode       = r.new_geocode;
        if (!rec.sort              && r.sort)         rec.sort              = r.sort;
        if (!rec.version           && r.version)      rec.version           = r.version;
      };

      // BP1/WP/BC/BPCO use `period` as the actual month identifier (DB unique key)
      // falling back to `month` if period is absent
      const moduleKey = (r: any) => {
        const raw = r.period || r.month || '';
        const mNum = normalizeMonth(raw);
        const display = mNum ? (monthOptionFromNum(mNum) || raw) : raw;
        const keyPart = mNum || raw;
        return { mNum, display, keyPart, lgu: (r.lgu || '').toLowerCase().trim() };
      };

      bp1Data.forEach((r: any) => {
        const { mNum, display, keyPart, lgu } = moduleKey(r);
        const key = `${r.year}|${keyPart}|${lgu}`;
        const rec = getOrCreate(key, Number(r.year), display, mNum, r.lgu ?? '');
        rec.bp1_ustatus = r.ustatus ?? '';
        rec.bp1_version = r.version ?? '';
        rec.bp1_id = r.id;
        applyProfile(rec, r);
      });

      wpData.forEach((r: any) => {
        const { mNum, display, keyPart, lgu } = moduleKey(r);
        const key = `${r.year}|${keyPart}|${lgu}`;
        const rec = getOrCreate(key, Number(r.year), display, mNum, r.lgu ?? '');
        rec.wp_ustatus = r.ustatus ?? '';
        rec.wp_version = r.version ?? '';
        rec.wp_id = r.id;
        applyProfile(rec, r);
      });

      bcData.forEach((r: any) => {
        const { mNum, display, keyPart, lgu } = moduleKey(r);
        const key = `${r.year}|${keyPart}|${lgu}`;
        const rec = getOrCreate(key, Number(r.year), display, mNum, r.lgu ?? '');
        rec.bc_ustatus = r.ustatus ?? '';
        rec.bc_version = r.version ?? '';
        rec.bc_id = r.id;
        applyProfile(rec, r);
      });

      bpcoData.forEach((r: any) => {
        const { mNum, display, keyPart, lgu } = moduleKey(r);
        const key = `${r.year}|${keyPart}|${lgu}`;
        const rec = getOrCreate(key, Number(r.year), display, mNum, r.lgu ?? '');
        rec.bpco_ustatus = r.ustatus ?? '';
        rec.bpco_version = r.version ?? '';
        rec.bpco_id = r.id;
        applyProfile(rec, r);
      });

      lcrData.forEach((r: any) => {
        const { mNum, display, keyPart, lgu } = moduleKey(r);
        const key = `${r.year}|${keyPart}|${lgu}`;
        const rec = getOrCreate(key, Number(r.year), display, mNum, r.lgu ?? '');
        rec.lcr_ustatus = r.ustatus ?? '';
        rec.lcr_version = r.version ?? '';
        rec.lcr_id = r.id;
        applyProfile(rec, r);
      });

      enewsData.forEach((r: any) => {
        const { mNum, display, keyPart, lgu } = moduleKey(r);
        const key = `${r.year}|${keyPart}|${lgu}`;
        const rec = getOrCreate(key, Number(r.year), display, mNum, r.lgu ?? '');
        rec.enews_ustatus = r.ustatus ?? '';
        rec.enews_version = r.version ?? '';
        rec.enews_id = r.id;
        applyProfile(rec, r);
      });

      cedulaData.forEach((r: any) => {
        const { mNum, display, keyPart, lgu } = moduleKey(r);
        const key = `${r.year}|${keyPart}|${lgu}`;
        const rec = getOrCreate(key, Number(r.year), display, mNum, r.lgu ?? '');
        rec.cedula_ustatus = r.ustatus ?? '';
        rec.cedula_version = r.version ?? '';
        rec.cedula_id = r.id;
        applyProfile(rec, r);
      });

      epData.forEach((r: any) => {
        const mNum = normalizeMonth(r.month || '');
        const display = mNum ? (monthOptionFromNum(mNum) || r.month || '') : (r.month || '');
        const keyPart = mNum || r.month || '';
        const lgu = (r.lgu_full_name || '').toLowerCase().trim();
        const key = `${r.year}|${keyPart}|${lgu}`;
        const rec = getOrCreate(key, Number(r.year), display, mNum, r.lgu_full_name ?? '');
        rec.epayment    = !!r.epayment;
        rec.egovpay_v1  = !!r.egovpay_v1;
        rec.egovpay_v2  = !!r.egovpay_v2;
        rec.epayment_id = r.id;
        if (!rec.dict_ro && r.dict_ro) rec.dict_ro = r.dict_ro;
      });

      const sorted = Array.from(map.values()).sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        const ma = parseInt(monthNum(a.month) || normalizeMonth(a.month) || '0', 10);
        const mb = parseInt(monthNum(b.month) || normalizeMonth(b.month) || '0', 10);
        if (ma !== mb) return ma - mb;
        return a.lgu_name.localeCompare(b.lgu_name);
      });

      setMergedRecords(sorted);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [selectedYears]);
  useEffect(() => { setCurrentPage(1); }, [monthFilter, moduleFilter, searchQuery, pageSize]);

  const filteredRecords = useMemo(() => {
    let r = mergedRecords;
    if (monthFilter.length > 0) r = r.filter(rec => monthFilter.includes(rec.month));
    if (moduleFilter.length > 0) {
      r = r.filter(rec =>
        (moduleFilter.includes('BP1')    && rec.bp1_id    !== null) ||
        (moduleFilter.includes('WP')     && rec.wp_id     !== null) ||
        (moduleFilter.includes('BC')     && rec.bc_id     !== null) ||
        (moduleFilter.includes('BPCO')   && rec.bpco_id   !== null) ||
        (moduleFilter.includes('LCR')    && rec.lcr_id    !== null) ||
        (moduleFilter.includes('eNews')  && rec.enews_id  !== null) ||
        (moduleFilter.includes('Cedula') && rec.cedula_id !== null)
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      r = r.filter(rec =>
        rec.lgu_name.toLowerCase().includes(q) ||
        rec.dict_ro.toLowerCase().includes(q) ||
        (rec.district || '').toLowerCase().includes(q)
      );
    }
    return r;
  }, [mergedRecords, monthFilter, moduleFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const visible = filteredRecords.slice((safePage - 1) * pageSize, safePage * pageSize);

  const summary = useMemo(() => {
    const mods = moduleFilter.length === 0 ? ['BP1', 'WP', 'BC', 'BPCO', 'LCR', 'eNews', 'Cedula'] : moduleFilter;
    const countFn = (fn: (u: string) => boolean) => {
      let n = 0;
      for (const r of filteredRecords) {
        if (mods.includes('BP1')    && fn(r.bp1_ustatus))    n++;
        if (mods.includes('WP')     && fn(r.wp_ustatus))     n++;
        if (mods.includes('BC')     && fn(r.bc_ustatus))     n++;
        if (mods.includes('BPCO')   && fn(r.bpco_ustatus))   n++;
        if (mods.includes('LCR')    && fn(r.lcr_ustatus))    n++;
        if (mods.includes('eNews')  && fn(r.enews_ustatus))  n++;
        if (mods.includes('Cedula') && fn(r.cedula_ustatus)) n++;
      }
      return n;
    };
    return {
      operational:   countFn(isOp),
      developmental: countFn(isDev),
      withdraw:      countFn(isWd),
      epayment:      filteredRecords.filter(r => r.epayment).length,
      egovpay_v1:    filteredRecords.filter(r => r.egovpay_v1).length,
      egovpay_v2:    filteredRecords.filter(r => r.egovpay_v2).length,
    };
  }, [filteredRecords, moduleFilter]);

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
    const bp1v  = parseVersion(rec.bp1_version);
    const wpv   = parseVersion(rec.wp_version);
    const bcv   = parseVersion(rec.bc_version);
    const bpcov = parseVersion(rec.bpco_version);
    const lcrv  = parseVersion(rec.lcr_version);
    const env   = parseVersion(rec.enews_version);
    const cdv   = parseVersion(rec.cedula_version);
    setEditBp1V1(bp1v.v1);  setEditBp1V2(bp1v.v2);
    setEditWpV1(wpv.v1);    setEditWpV2(wpv.v2);
    setEditBcV1(bcv.v1);    setEditBcV2(bcv.v2);
    setEditBpcoV1(bpcov.v1); setEditBpcoV2(bpcov.v2);
    setEditLcrUstatus(rec.lcr_ustatus);
    setEditLcrV1(lcrv.v1);  setEditLcrV2(lcrv.v2);
    setEditEnewsUstatus(rec.enews_ustatus);
    setEditEnewsV1(env.v1);  setEditEnewsV2(env.v2);
    setEditCedulaUstatus(rec.cedula_ustatus);
    setEditCedulaV1(cdv.v1); setEditCedulaV2(cdv.v2);
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

    const mkVer = (v1: boolean, v2: boolean) => [v1 && 'V1', v2 && 'V2'].filter(Boolean).join(', ');
    const sharedPatch = { district: editDistrict, level: editLevel, income_class: editIncomeClass, dict_ro: editDictRo };
    const derivedRegion = editRecord.region || DICT_RO_TO_REGION[editDictRo] || '';
    const newModuleBase = {
      year: editRecord.year,
      month: editRecord.month,
      period: editRecord.month,
      period_id: editRecord.period_id,
      report_id: editRecord.period_id ? `[${editRecord.period_id}]${editRecord.new_geocode}` : '',
      lgu: editRecord.lgu_name,
      name: editRecord.lgu_name_official || editRecord.lgu_name,
      province: editRecord.province,
      region: derivedRegion,
      mpar: editRecord.mpar,
      new_geocode: editRecord.new_geocode,
      sort: editRecord.sort,
      ...sharedPatch,
    };

    try {
      const patches: Promise<any>[] = [];

      const addModule = (endpoint: string, id: number | null, ustatus: string, version: string) => {
        if (id !== null)
          patches.push(axios.patch(`${backendUrl}/${endpoint}${id}/`, { ...sharedPatch, ustatus, version }));
        else if (ustatus)
          patches.push(axios.post(`${backendUrl}/${endpoint}`, { ...newModuleBase, ustatus, version }));
      };

      addModule(ENDPOINTS.bp1,    editRecord.bp1_id,    editBp1Ustatus,    mkVer(editBp1V1, editBp1V2));
      addModule(ENDPOINTS.wp,     editRecord.wp_id,     editWpUstatus,     mkVer(editWpV1, editWpV2));
      addModule(ENDPOINTS.bc,     editRecord.bc_id,     editBcUstatus,     mkVer(editBcV1, editBcV2));
      addModule(ENDPOINTS.bpco,   editRecord.bpco_id,   editBpcoUstatus,   mkVer(editBpcoV1, editBpcoV2));
      addModule(ENDPOINTS.lcr,    editRecord.lcr_id,    editLcrUstatus,    mkVer(editLcrV1, editLcrV2));
      addModule(ENDPOINTS.enews,  editRecord.enews_id,  editEnewsUstatus,  mkVer(editEnewsV1, editEnewsV2));
      addModule(ENDPOINTS.cedula, editRecord.cedula_id, editCedulaUstatus, mkVer(editCedulaV1, editCedulaV2));

      const epPayload = {
        year: editRecord.year,
        month: editRecord.month,
        period_id: editRecord.period_id,
        report_id: editRecord.period_id ? `[${editRecord.period_id}]${editDictRo}` : '',
        dict_ro: editDictRo,
        region: editRecord.region || DICT_RO_TO_REGION[editDictRo] || '',
        lgu_full_name: editRecord.lgu_name,
        epayment: editEpayment,
        egovpay_v1: editEgovpayV1,
        egovpay_v2: editEgovpayV2,
      };
      if (editRecord.epayment_id !== null)
        patches.push(axios.patch(`${backendUrl}/${ENDPOINTS.epayment}${editRecord.epayment_id}/`, epPayload));
      else if (editEpayment || editEgovpayV1 || editEgovpayV2)
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
    if (rec.bp1_id    !== null) deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.bp1}${rec.bp1_id}/`).catch(() => {}));
    if (rec.wp_id     !== null) deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.wp}${rec.wp_id}/`).catch(() => {}));
    if (rec.bc_id     !== null) deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.bc}${rec.bc_id}/`).catch(() => {}));
    if (rec.bpco_id   !== null) deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.bpco}${rec.bpco_id}/`).catch(() => {}));
    if (rec.lcr_id    !== null) deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.lcr}${rec.lcr_id}/`).catch(() => {}));
    if (rec.enews_id  !== null) deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.enews}${rec.enews_id}/`).catch(() => {}));
    if (rec.cedula_id !== null) deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.cedula}${rec.cedula_id}/`).catch(() => {}));
    if (rec.epayment_id !== null) deletes.push(axios.delete(`${backendUrl}/${ENDPOINTS.epayment}${rec.epayment_id}/`).catch(() => {}));

    await Promise.all(deletes);
    fetchData();
  };

  return (
    <div className="min-h-full bg-slate-50/40 p-6 md:p-4 sm:p-3 space-y-5">

      {/* Page Header */}
      <div className="flex flex-row items-start justify-between gap-3 md:flex-col bg-white rounded-2xl border border-border px-6 py-4 md:px-4 shadow-sm">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-slate-900">General Summary</h1>
          <p className="text-xs text-slate-500 mt-0.5">Aggregated view of all modules (BP1, WP, BC, BPCO) and ePayment — one row per unique LGU per month.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap md:w-full shrink-0">
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
      <div className="space-y-3">



        <div className="grid grid-cols-3 slg:grid-cols-2 sm:grid-cols-1 gap-4">
          {[
            { label: 'Operational',   count: summary.operational,   from: 'from-emerald-400', to: 'to-teal-400',   text: 'text-emerald-500' },
            { label: 'Developmental', count: summary.developmental, from: 'from-blue-400',    to: 'to-indigo-500', text: 'text-blue-500'    },
            { label: 'Withdraw',      count: summary.withdraw,      from: 'from-rose-400',    to: 'to-red-500',    text: 'text-rose-500'    },
          ].map(({ label, count, from, to, text }) => (
            <div key={label} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
              <div className={`h-1 bg-gradient-to-r ${from} ${to}`} />
              <div className="px-6 py-5 md:px-4 md:py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  {moduleFilter.length > 0 ? 'No. of Module Records' : 'No. of LGU'}
                </p>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">{label}</p>
                <p className={`text-5xl md:text-4xl font-black mt-3 tabular-nums leading-none ${text}`}>{count}</p>
                <p className="text-xs text-slate-400 mt-3">
                  {moduleFilter.length > 0
                    ? moduleFilter.join(' + ')
                    : monthFilter.length > 0 || searchQuery
                      ? 'Filtered view'
                      : `All modules · ${selectedYears.join(', ')}`}
                </p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-3 slg:grid-cols-2 sm:grid-cols-1 gap-4">
          {[
            { label: 'ePayment',   count: summary.epayment,   from: 'from-emerald-400', to: 'to-teal-400',    text: 'text-emerald-500' },
            { label: 'eGovPay v1', count: summary.egovpay_v1, from: 'from-sky-400',     to: 'to-cyan-500',    text: 'text-sky-500'     },
            { label: 'eGovPay v2', count: summary.egovpay_v2, from: 'from-violet-400',  to: 'to-purple-500',  text: 'text-violet-500'  },
          ].map(({ label, count, from, to, text }) => (
            <div key={label} className="rounded-2xl overflow-hidden bg-white shadow-sm border border-slate-100">
              <div className={`h-1 bg-gradient-to-r ${from} ${to}`} />
              <div className="px-6 py-5 md:px-4 md:py-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">No. of LGU with</p>
                <p className="text-sm font-semibold text-slate-600 mt-0.5">{label}</p>
                <p className={`text-5xl md:text-4xl font-black mt-3 tabular-nums leading-none ${text}`}>{count}</p>
                <p className="text-xs text-slate-400 mt-3">{monthFilter.length > 0 || searchQuery ? 'Filtered view' : `All records · ${selectedYears.join(', ')}`}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-2xl border border-border shadow-sm">
        <div className="px-6 py-4 md:px-4 border-b border-border flex flex-col gap-3">
          <div className="flex flex-row items-center justify-between gap-3 md:flex-col md:items-start">
            <div className="min-w-0">
              <h3 className="font-semibold text-slate-900">General Records</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {filteredRecords.length !== mergedRecords.length
                  ? `${filteredRecords.length} of ${mergedRecords.length} records`
                  : `${mergedRecords.length} record${mergedRecords.length !== 1 ? 's' : ''} for ${selectedYears.join(', ')}`}
              </p>
            </div>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search LGU, RO, District…"
              className="rounded-lg border border-border bg-slate-50 px-3 py-1.5 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 w-64 md:w-full shrink-0" />
          </div>

          {/* Module chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0">Module</span>
            <button type="button" onClick={() => { setModuleFilter([]); setCurrentPage(1); }}
              className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition ${
                moduleFilter.length === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary'
              }`}>All</button>
            {['BP1', 'WP', 'BC', 'BPCO', 'LCR', 'eNews', 'Cedula'].map(mod => {
              const isActive = moduleFilter.includes(mod);
              return (
                <button key={mod} type="button"
                  onClick={() => { setModuleFilter(prev => isActive ? prev.filter(x => x !== mod) : [...prev, mod]); setCurrentPage(1); }}
                  className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-semibold transition ${
                    isActive ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-300 hover:border-primary hover:text-primary'
                  }`}>{mod}</button>
              );
            })}
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
                  onClick={() => { setMonthFilter(isActive ? [] : [opt]); setCurrentPage(1); }}
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
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">LCR</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">eNews</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">Cedula</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">ePayment</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold text-center">Coverage</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">District</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">Level</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">Income Class</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">DICT RO</th>
                <th className="px-3 py-3 whitespace-nowrap font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr><td colSpan={18} className="px-4 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 text-slate-400">
                    <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Loading records…
                  </div>
                </td></tr>
              ) : visible.length === 0 ? (
                <tr><td colSpan={18} className="px-4 py-10 text-center text-slate-400">
                  {searchQuery ? `No records match "${searchQuery}".` : `No records found for ${selectedYears.join(', ')}.`}
                </td></tr>
              ) : visible.map(r => {
                const { v1: bp1V1, v2: bp1V2 } = parseVersion(r.bp1_version);
                const { v1: wpV1,  v2: wpV2  } = parseVersion(r.wp_version);
                const { v1: bcV1,  v2: bcV2  } = parseVersion(r.bc_version);
                const { v1: bpV1,  v2: bpV2  } = parseVersion(r.bpco_version);
                const { v1: lcrV1, v2: lcrV2 } = parseVersion(r.lcr_version);
                const { v1: enV1,  v2: enV2  } = parseVersion(r.enews_version);
                const { v1: cdV1,  v2: cdV2  } = parseVersion(r.cedula_version);
                const coverageScore =
                  (r.bp1_id    !== null ? 1 : 0) +
                  (r.wp_id     !== null ? 1 : 0) +
                  (r.bc_id     !== null ? 1 : 0) +
                  (r.bpco_id   !== null ? 1 : 0) +
                  (r.lcr_id    !== null ? 1 : 0) +
                  (r.enews_id  !== null ? 1 : 0) +
                  (r.cedula_id !== null ? 1 : 0) +
                  (r.epayment   ? 1 : 0) +
                  (r.egovpay_v1 ? 1 : 0) +
                  (r.egovpay_v2 ? 1 : 0);
                return (
                  <tr key={r.key} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-500 font-mono text-xs">{r.period_id || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{r.year}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">{r.month.replace(/^\[\d+\]\s*/, '')}</td>
                    <td className="px-3 py-2.5 font-medium text-slate-900 max-w-[200px] truncate" title={r.lgu_name}>{r.lgu_name || '—'}</td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <UsBadge val={r.bp1_ustatus} />
                        {(bp1V1 || bp1V2) && <span className="text-[8px] font-semibold text-slate-400 leading-none">{[bp1V1 && 'v1', bp1V2 && 'v2'].filter(Boolean).join(' ')}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <UsBadge val={r.wp_ustatus} />
                        {(wpV1 || wpV2) && <span className="text-[8px] font-semibold text-slate-400 leading-none">{[wpV1 && 'v1', wpV2 && 'v2'].filter(Boolean).join(' ')}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <UsBadge val={r.bc_ustatus} />
                        {(bcV1 || bcV2) && <span className="text-[8px] font-semibold text-slate-400 leading-none">{[bcV1 && 'v1', bcV2 && 'v2'].filter(Boolean).join(' ')}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <UsBadge val={r.bpco_ustatus} />
                        {(bpV1 || bpV2) && <span className="text-[8px] font-semibold text-slate-400 leading-none">{[bpV1 && 'v1', bpV2 && 'v2'].filter(Boolean).join(' ')}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <UsBadge val={r.lcr_ustatus} />
                        {(lcrV1 || lcrV2) && <span className="text-[8px] font-semibold text-slate-400 leading-none">{[lcrV1 && 'v1', lcrV2 && 'v2'].filter(Boolean).join(' ')}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <UsBadge val={r.enews_ustatus} />
                        {(enV1 || enV2) && <span className="text-[8px] font-semibold text-slate-400 leading-none">{[enV1 && 'v1', enV2 && 'v2'].filter(Boolean).join(' ')}</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <div className="inline-flex flex-col items-center gap-0.5">
                        <UsBadge val={r.cedula_ustatus} />
                        {(cdV1 || cdV2) && <span className="text-[8px] font-semibold text-slate-400 leading-none">{[cdV1 && 'v1', cdV2 && 'v2'].filter(Boolean).join(' ')}</span>}
                      </div>
                    </td>
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
                        coverageScore === 10 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
                        coverageScore >= 4  ? 'bg-blue-100    text-blue-800    border-blue-200'    :
                        coverageScore >= 1  ? 'bg-amber-100   text-amber-800   border-amber-200'   :
                                             'bg-slate-100   text-slate-500   border-slate-200'
                      }`}>
                        {coverageScore}/10
                      </span>
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">{r.district || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">{r.level || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-slate-600 text-xs">{r.income_class || '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap font-medium text-slate-800 text-xs">{r.dict_ro || '—'}</td>
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
        <div className="px-5 py-3 md:px-4 border-t border-border flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 rounded-b-2xl">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-2 bg-black/40 backdrop-blur-sm"
          onClick={e => { if (e.target === e.currentTarget) setShowEditModal(false); }}>
          <div className="bg-white rounded-2xl border border-border shadow-xl w-full max-w-lg sm:max-w-full sm:rounded-xl">
            <div className="px-6 py-4 sm:px-4 border-b border-border flex items-center justify-between">
              <div className="min-w-0">
                <h3 className="font-semibold text-slate-900 truncate" title={editRecord.lgu_name}>{editRecord.lgu_name}</h3>
                <p className="text-xs text-slate-500 mt-0.5">{editRecord.month.replace(/^\[\d+\]\s*/, '')} {editRecord.year}</p>
              </div>
              <button type="button" onClick={() => setShowEditModal(false)}
                className="rounded-lg border border-border px-2.5 py-1 text-sm text-slate-500 hover:bg-slate-50 transition shrink-0 ml-4">✕</button>
            </div>

            <div className="p-6 sm:p-4 space-y-5 overflow-y-auto max-h-[70vh] sm:max-h-[65vh]">

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

              {/* Module UStatus + Version */}
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Module UStatus</p>
                <div className="space-y-2">
                  {([
                    { id: editRecord.bp1_id,    label: 'BP1',    val: editBp1Ustatus,    set: setEditBp1Ustatus,    v1: editBp1V1,    sv1: setEditBp1V1,    v2: editBp1V2,    sv2: setEditBp1V2    },
                    { id: editRecord.wp_id,     label: 'WP',     val: editWpUstatus,     set: setEditWpUstatus,     v1: editWpV1,     sv1: setEditWpV1,     v2: editWpV2,     sv2: setEditWpV2     },
                    { id: editRecord.bc_id,     label: 'BC',     val: editBcUstatus,     set: setEditBcUstatus,     v1: editBcV1,     sv1: setEditBcV1,     v2: editBcV2,     sv2: setEditBcV2     },
                    { id: editRecord.bpco_id,   label: 'BPCO',   val: editBpcoUstatus,   set: setEditBpcoUstatus,   v1: editBpcoV1,   sv1: setEditBpcoV1,   v2: editBpcoV2,   sv2: setEditBpcoV2   },
                    { id: editRecord.lcr_id,    label: 'LCR',    val: editLcrUstatus,    set: setEditLcrUstatus,    v1: editLcrV1,    sv1: setEditLcrV1,    v2: editLcrV2,    sv2: setEditLcrV2    },
                    { id: editRecord.enews_id,  label: 'eNews',  val: editEnewsUstatus,  set: setEditEnewsUstatus,  v1: editEnewsV1,  sv1: setEditEnewsV1,  v2: editEnewsV2,  sv2: setEditEnewsV2  },
                    { id: editRecord.cedula_id, label: 'Cedula', val: editCedulaUstatus, set: setEditCedulaUstatus, v1: editCedulaV1, sv1: setEditCedulaV1, v2: editCedulaV2, sv2: setEditCedulaV2 },
                  ] as { id: number|null; label: string; val: string; set: (v:string)=>void; v1:boolean; sv1:(v:boolean)=>void; v2:boolean; sv2:(v:boolean)=>void }[])
                    .map(m => (
                      <div key={m.label} className="flex items-end gap-2">
                        <label className="flex-1 flex flex-col gap-1 min-w-0">
                          <span className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                            {m.label} UStatus
                            {m.id === null && <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-1.5 py-0.5 leading-none">NEW</span>}
                          </span>
                          <select value={m.val} onChange={e => m.set(e.target.value)}
                            className={`rounded-lg border px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 ${
                              m.id === null ? 'border-amber-200 bg-amber-50/50' : 'border-border bg-slate-50'
                            }`}>
                            <option value="">— Select —</option>
                            {ustatusOptions.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        </label>
                        <div className="flex gap-1 pb-0.5 shrink-0">
                          {([{ label: 'V1', val: m.v1, set: m.sv1 }, { label: 'V2', val: m.v2, set: m.sv2 }]).map(chip => (
                            <button key={chip.label} type="button" onClick={() => chip.set(!chip.val)}
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-bold transition ${
                                chip.val ? 'bg-primary text-white border-primary' : 'bg-white text-slate-500 border-slate-300 hover:border-primary hover:text-primary'
                              }`}>{chip.label}</button>
                          ))}
                        </div>
                      </div>
                    ))
                  }
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
                </div>
              </div>
            </div>

            <div className="px-6 py-4 sm:px-4 border-t border-border flex flex-col gap-3 bg-slate-50/60 rounded-b-2xl sm:rounded-b-xl">
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

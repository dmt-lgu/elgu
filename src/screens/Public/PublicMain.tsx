import { useState, useEffect, useMemo, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import {
  LucideLayoutDashboard,
  MenuIcon,
  XIcon,
  Monitor,
  BarChart3,
  Settings2,
  MapPin,
  Calendar,
  Filter,
  Check,
  ChevronDown,
  Building2,
  TrendingUp,
  Shield,
  CreditCard,
  Landmark,
  InfoIcon,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import eLGULogo from '../../assets/logo/lgu-logo.png';
import DictLogo from '../../assets/logo/dict-logo.png';
import axios from '../../plugin/axios';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ChartDataLabels);

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_URL || '').replace(/\/$/, '');

const ALL_MODULES = [
  'Business Permit',
  'Working Permit',
  'Barangay Clearance',
  'Certificate of Occupancy',
  'Building Permit',
];

const REGION_GROUPS = [
  ['I', 'II', 'III', 'IV-A', 'V'],
  ['CAR', 'NCR', 'VII', 'VIII'],
  ['VI', 'NIR', 'IX', 'X', 'XI', 'XII'],
  ['BARMM I', 'BARMM II', 'XIII'],
];
const ISLAND_REGION_MAP: Record<string, string[]> = {
  Luzon:    ['I', 'II', 'III', 'IV-A', 'V', 'CAR', 'NCR', 'IV-B'],
  Visayas:  ['VI', 'VII', 'VIII', 'NIR'],
  Mindanao: ['IX', 'X', 'XI', 'XII', 'XIII', 'BARMM I', 'BARMM II'],
};
const REGION_ID_MAP: Record<string, string> = {
  I: 'region1', II: 'region2', III: 'region3',
  'IV-A': 'region4a', 'IV-B': 'region4b', V: 'region5',
  VI: 'region6', VII: 'region7', VIII: 'region8',
  IX: 'region9', X: 'region10', XI: 'region11',
  XII: 'region12', XIII: 'region13',
  CAR: 'CAR', NCR: 'NCR', NIR: 'NIR',
  'BARMM I': 'BARMM1', 'BARMM II': 'BARMM2',
};

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - i));

// ── Stat card ────────────────────────────────────────────────────────────────
interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  iconBg: string;
  accent: string;
  borderAccent: string;
  loading: boolean;
  info?: string;
}

function StatCard({ title, value, icon, iconBg, accent, borderAccent, loading, info }: StatCardProps) {
  const [showTip, setShowTip] = useState(false);
  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 relative ${
        loading ? '' : `border-l-4 ${borderAccent}`
      }`}
    >
      {loading && (
        <div className="absolute left-0 top-0 w-1 h-full z-0 overflow-hidden rounded-l-md flex flex-col">
          <div className="w-full h-full ease-in-out animate-[moveLineVertical_1.3s_linear_infinite] flex flex-col">
            <div className="w-full" style={{ height: '30%', background: '#eccb58' }} />
            <div className="w-full" style={{ height: '40%', background: '#b8232e' }} />
            <div className="w-full" style={{ height: '50%', background: '#0134b2' }} />
          </div>
          <style>{`
            @keyframes moveLineVertical {
              0%   { transform: translateY(-100%); }
              100% { transform: translateY(250%);  }
            }
          `}</style>
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-md ${iconBg} text-white shadow-sm`}>{icon}</div>
            <h3 className="text-xs font-medium text-gray-600 uppercase tracking-wide">{title}</h3>
          </div>
          {info && (
            <div className="relative" onMouseEnter={() => setShowTip(true)} onMouseLeave={() => setShowTip(false)}>
              <InfoIcon size={14} className="text-gray-400 hover:text-gray-600 cursor-pointer" />
              {showTip && (
                <div className="absolute right-0 top-5 w-64 p-3 bg-gray-900 text-white text-xs rounded-lg z-50 shadow-xl">
                  {info}
                  <div className="absolute -top-1 right-4 w-2 h-2 bg-gray-900 rotate-45" />
                </div>
              )}
            </div>
          )}
        </div>
        {loading ? (
          <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
        ) : (
          <p className={`text-2xl font-bold ${accent}`}>{value.toLocaleString()}</p>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function PublicMain() {
  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filter local state
  const [selectedModules, setSelectedModules] = useState<string[]>([...ALL_MODULES]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedIslands,  setSelectedIslands]  = useState<string[]>([]);
  const [selectedYear,     setSelectedYear]      = useState<string>(String(CURRENT_YEAR));
  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isRegionOpen, setIsRegionOpen] = useState(false);
  const [isDateOpen,   setIsDateOpen]   = useState(false);

  // API state
  const [loading,        setLoading]        = useState(false);
  const [chartData,      setChartData]      = useState<Record<string, { current: any[] }>>({});
  const [epaymentCounts, setEpaymentCounts] = useState({ epayment: 0, egovpay_v1: 0, egovpay_v2: 0 });

  // Section visibility
  const [showStats, setShowStats] = useState(true);
  const [showChart, setShowChart] = useState(true);

  // Dropdown close on outside click
  const moduleRef = useRef<HTMLDivElement>(null);
  const regionRef = useRef<HTMLDivElement>(null);
  const dateRef   = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (moduleRef.current && !moduleRef.current.contains(e.target as Node)) setIsModuleOpen(false);
      if (regionRef.current && !regionRef.current.contains(e.target as Node)) setIsRegionOpen(false);
      if (dateRef.current   && !dateRef.current.contains(e.target as Node))   setIsDateOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Fetch
  const fetchData = () => {
    if (selectedModules.length === 0) return;
    setLoading(true);

    const regionIds = selectedRegions.length > 0
      ? selectedRegions.map(r => REGION_ID_MAP[r] ?? r)
      : undefined;

    axios
      .post(`${BACKEND_URL}/api/v1/elgu/ustatus-detail/`, {
        modules:      selectedModules,
        start_period: `${selectedYear}-01`,
        end_period:   `${selectedYear}-12`,
        group_by:     'region',
        regions:      regionIds,
      })
      .then(res => {
        const raw = res.data ?? {};
        const ep = raw.epayment_counts ?? { epayment: 0, egovpay_v1: 0, egovpay_v2: 0 };
        setEpaymentCounts(ep);
        const { epayment_counts: _ep, ...chartOnly } = raw;
        setChartData(chartOnly);
      })
      .catch(() => {
        setChartData({});
        setEpaymentCounts({ epayment: 0, egovpay_v1: 0, egovpay_v2: 0 });
      })
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData(); }, []);

  // Derived stat data
  const ustatus = useMemo(() => {
    const t = { operational: 0, developmental: 0, withdraw: 0 };
    for (const md of Object.values(chartData)) {
      (md.current || []).forEach((item: any) => {
        t.operational   += Number(item.operational)   || 0;
        t.developmental += Number(item.developmental) || 0;
        t.withdraw      += Number(item.withdraw)      || 0;
      });
    }
    return t;
  }, [chartData]);

  const regionRows = useMemo(() => {
    const map = new Map<string, { operational: number; developmental: number; withdraw: number }>();
    for (const md of Object.values(chartData)) {
      (md.current || []).forEach((item: any) => {
        if (!map.has(item.name)) map.set(item.name, { operational: 0, developmental: 0, withdraw: 0 });
        const e = map.get(item.name)!;
        e.operational   += Number(item.operational)   || 0;
        e.developmental += Number(item.developmental) || 0;
        e.withdraw      += Number(item.withdraw)      || 0;
      });
    }
    return Array.from(map.entries()).map(([name, v]) => ({ name, ...v }));
  }, [chartData]);

  const barChartData = {
    labels: regionRows.map(r => r.name),
    datasets: [
      { label: 'Operational',   data: regionRows.map(r => r.operational),   backgroundColor: '#2563eb' },
      { label: 'Developmental', data: regionRows.map(r => r.developmental), backgroundColor: '#fbbf24' },
      { label: 'Withdraw',      data: regionRows.map(r => r.withdraw),      backgroundColor: '#dc2626' },
    ],
  };
  const barOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
      datalabels: {
        anchor: 'center', align: 'center',
        color: '#1b1b1b',
        font: { weight: 'bold', size: 10 },
        formatter: (v: number) => (v > 0 ? v : ''),
      },
    },
    scales: {
      x: { stacked: false, ticks: { autoSkip: false, maxRotation: 0, minRotation: 6, font: { size: 11 } } },
      y: { beginAtZero: true, ticks: { font: { size: 11 } } },
    },
  };

  // Module toggle helpers
  const toggleModule = (m: string) =>
    setSelectedModules(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);

  // Region toggle helpers
  const toggleIsland = (island: string) => {
    const regions = ISLAND_REGION_MAP[island] || [];
    setSelectedIslands(prev => {
      const removing = prev.includes(island);
      setSelectedRegions(prevR =>
        removing ? prevR.filter(r => !regions.includes(r))
                 : Array.from(new Set([...prevR, ...regions]))
      );
      return removing ? prev.filter(i => i !== island) : [...prev, island];
    });
  };
  const toggleRegion = (r: string) =>
    setSelectedRegions(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]);

  const moduleLabel = selectedModules.length === 0
    ? 'Select modules'
    : `${selectedModules.length} module${selectedModules.length > 1 ? 's' : ''} selected`;
  const regionLabel = selectedRegions.length === 0
    ? 'All Regions'
    : `${selectedRegions.length} region${selectedRegions.length > 1 ? 's' : ''} selected`;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen">

      {/* ── Static sidebar (mobile-visible, desktop-hidden) ─────────────────── */}
      <aside className="md:hidden flex w-[300px] bg-card border-r border-border flex-col">
        <div className="flex justify-center items-center mt-5">
          <img src={eLGULogo} className="w-[140px]" alt="eLGU" />
        </div>
        <nav className="flex flex-col mt-10">
          <div className="flex items-center gap-2 text-white bg-[#282b30] font-medium w-full p-2 pl-10 py-5">
            <LucideLayoutDashboard className="w-5 h-5" />
            <span>Dashboard</span>
          </div>
        </nav>
        <footer className="mt-auto p-4 border-t border-border text-sm text-secondary-foreground flex flex-col gap-2 font-medium text-center items-center">
          <p>Developed by:</p>
          <img src={DictLogo} className="w-[140px] object-contain" alt="DICT" />
        </footer>
      </aside>

      {/* ── Overlay sidebar (desktop, opened via hamburger) ──────────────────── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[999] md:flex hidden">
          <div className="w-[250px] bg-card border-r border-border flex flex-col h-full">
            <div className="flex justify-between items-center mt-5 px-4">
              <img src={eLGULogo} className="w-[120px]" alt="eLGU" />
              <button className="p-2" onClick={() => setSidebarOpen(false)} aria-label="Close sidebar">
                <XIcon className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex flex-col mt-10 gap-6 ml-10">
              <div className="flex items-center gap-2 text-primary font-medium">
                <LucideLayoutDashboard className="w-5 h-5" />
                <span>Dashboard</span>
              </div>
            </nav>
            <footer className="mt-auto p-4 border-t border-border text-sm text-secondary-foreground flex flex-col gap-2 font-medium text-center items-center">
              <p>Developed by:</p>
              <img src={DictLogo} className="w-[140px] object-contain" alt="DICT" />
            </footer>
          </div>
          <div className="flex-1 bg-black bg-opacity-40" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col flex-1 overflow-hidden">

        {/* Header */}
        <header className="bg-card border-b h-[50px] border-border">
          <div className="flex justify-between items-center h-full gap-4 mr-5 px-4">
            <button
              className="hidden md:flex p-2"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open sidebar"
            >
              <MenuIcon className="w-6 h-6" />
            </button>
            <div className="flex-1 flex justify-end items-center gap-3">
              <Link
                to="/elgu/login"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm"
              >
                Login
              </Link>
            </div>
          </div>
        </header>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto bg-background p-6">

          {/* ── Filter Section ─────────────────────────────────────────────── */}
          <div className="relative bg-white border border-gray-200 rounded-md shadow-sm p-6 mb-6 z-10">

            {/* Title */}
            <div className="mb-6 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#2162e7]/10 rounded-lg flex items-center justify-center">
                  <Monitor size={20} className="text-[#2162e7]" />
                </div>
                <h1 className="text-2xl font-bold text-[#2162e7]">eLGU Services Data Monitoring Tool</h1>
                <div className="w-8 h-8 bg-[#2162e7]/10 rounded-md flex items-center justify-center">
                  <BarChart3 size={16} className="text-[#2162e7]" />
                </div>
              </div>
              <p className="text-sm text-gray-600 ml-13">
                Monitor and analyze eLGU service transactions across different regions
              </p>
            </div>

            {/* Dropdowns + Run */}
            <div className="grid grid-cols-10 lg:grid-cols-3 md:grid-cols-1 gap-2">

              {/* Module Selection */}
              <div className="flex col-span-3 flex-col" ref={moduleRef}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#2162e7]/10 rounded-md flex items-center justify-center">
                    <Settings2 size={16} className="text-[#2162e7]" />
                  </div>
                  <label className="text-sm font-semibold text-gray-800">Module Selection</label>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsModuleOpen(v => !v)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-left flex justify-between items-center hover:border-[#2162e7] hover:bg-[#2162e7]/5 transition-all shadow-sm"
                  >
                    <span className="text-sm font-medium text-gray-700">{moduleLabel}</span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isModuleOpen ? 'rotate-180 text-[#2162e7]' : ''}`} />
                  </button>
                  {isModuleOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]">
                      <div className="flex justify-between p-4 bg-gray-50 border-b border-gray-200">
                        <button onClick={() => setSelectedModules([...ALL_MODULES])} className="text-sm text-[#2162e7] font-semibold hover:bg-[#2162e7]/10 px-3 py-1 rounded-sm">Select All</button>
                        <button onClick={() => setSelectedModules([])} className="text-sm text-red-500 font-semibold hover:bg-red-50 px-3 py-1 rounded-sm">Clear All</button>
                      </div>
                      <div className="max-h-[320px] overflow-y-auto">
                        {ALL_MODULES.map(m => (
                          <label key={m} className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer group">
                            <div className="relative flex items-center">
                              <input type="checkbox" checked={selectedModules.includes(m)} onChange={() => toggleModule(m)} className="opacity-0 absolute h-5 w-5 cursor-pointer" />
                              <div className={`border-2 h-5 w-5 rounded-sm flex items-center justify-center transition-all ${selectedModules.includes(m) ? 'bg-[#2162e7] border-[#2162e7]' : 'border-gray-300 hover:border-[#2162e7]'}`}>
                                {selectedModules.includes(m) && <Check size={12} className="text-white" />}
                              </div>
                              <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-[#2162e7]">{m}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Region Selection */}
              <div className="flex col-span-4 flex-col" ref={regionRef}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#2162e7]/10 rounded-md flex items-center justify-center">
                    <MapPin size={16} className="text-[#2162e7]" />
                  </div>
                  <label className="text-sm font-semibold text-gray-800">Region Selection</label>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsRegionOpen(v => !v)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-left flex justify-between items-center hover:border-[#2162e7] hover:bg-[#2162e7]/5 transition-all shadow-sm"
                  >
                    <span className="text-sm font-medium text-gray-700">{regionLabel}</span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isRegionOpen ? 'rotate-180 text-[#2162e7]' : ''}`} />
                  </button>
                  {isRegionOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[9999]">
                      <div className="flex justify-between p-4 bg-gray-50 border-b border-gray-200">
                        <button
                          onClick={() => {
                            const all = Array.from(new Set(Object.values(ISLAND_REGION_MAP).flat()));
                            setSelectedRegions(all);
                            setSelectedIslands(Object.keys(ISLAND_REGION_MAP));
                          }}
                          className="text-sm text-[#2162e7] font-semibold hover:bg-[#2162e7]/10 px-3 py-1 rounded-sm"
                        >
                          Select All
                        </button>
                        <button
                          onClick={() => { setSelectedRegions([]); setSelectedIslands([]); }}
                          className="text-sm text-red-500 font-semibold hover:bg-red-50 px-3 py-1 rounded-sm"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="max-h-[400px] overflow-y-auto p-4">
                        <div className="mb-4">
                          <label className="text-sm font-bold text-gray-800 block mb-2">Island Groups</label>
                          <div className="flex gap-6">
                            {Object.keys(ISLAND_REGION_MAP).map(island => (
                              <label key={island} className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-[#2162e7] cursor-pointer">
                                <input type="checkbox" checked={selectedIslands.includes(island)} onChange={() => toggleIsland(island)} className="accent-[#2162e7] w-4 h-4" />
                                {island}
                              </label>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-sm font-bold text-gray-800 block mb-2">Regions</label>
                          <div className="grid grid-cols-4 gap-2">
                            {REGION_GROUPS.map((col, ci) => (
                              <div key={ci} className="flex flex-col gap-2">
                                {col.map(r => (
                                  <label key={r} className="flex items-center gap-2 text-gray-700 text-xs hover:text-[#2162e7] cursor-pointer">
                                    <input type="checkbox" checked={selectedRegions.includes(r)} onChange={() => toggleRegion(r)} className="accent-[#2162e7] w-4 h-4" />
                                    <span className="font-medium">{r}</span>
                                  </label>
                                ))}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Date Range (Year) */}
              <div className="flex col-span-2 flex-col" ref={dateRef}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-[#2162e7]/10 rounded-md flex items-center justify-center">
                    <Calendar size={16} className="text-[#2162e7]" />
                  </div>
                  <label className="text-sm font-semibold text-gray-800">Date Range</label>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setIsDateOpen(v => !v)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-md py-3 px-4 text-left flex justify-between items-center hover:border-[#2162e7] hover:bg-[#2162e7]/5 transition-all shadow-sm"
                  >
                    <span className="text-sm font-medium text-gray-700">Year: {selectedYear}</span>
                    <ChevronDown size={18} className={`text-gray-400 transition-transform duration-300 ${isDateOpen ? 'rotate-180 text-[#2162e7]' : ''}`} />
                  </button>
                  {isDateOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] p-4">
                      <p className="text-xs font-bold text-gray-700 mb-3 uppercase tracking-wide">Select Year</p>
                      <div className="flex flex-col gap-2">
                        {YEAR_OPTIONS.map(y => (
                          <label key={y} className="flex items-center gap-3 text-sm cursor-pointer text-gray-700 hover:text-[#2162e7]">
                            <input
                              type="radio"
                              checked={selectedYear === y}
                              onChange={() => { setSelectedYear(y); setIsDateOpen(false); }}
                              className="accent-[#2162e7] w-4 h-4"
                              name="year-select"
                            />
                            <span className="font-medium">{y}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Run Button */}
              <div className="flex flex-col justify-end">
                <button
                  onClick={fetchData}
                  disabled={loading || selectedModules.length === 0}
                  className={`flex items-center justify-center gap-2 px-6 text-sm py-3 font-semibold rounded-md transition-all ${
                    loading || selectedModules.length === 0
                      ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                      : 'bg-[#2162e7] text-white border border-[#2162e7] hover:bg-[#1d56d1] shadow-sm'
                  }`}
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Loading...</>
                  ) : (
                    <><Filter size={16} /> Run</>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* ── Section Visibility Toggles ─────────────────────────────────── */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setShowStats(v => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${showStats ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'}`}
            >
              {showStats ? '✓' : '○'} Statistics
            </button>
            <button
              onClick={() => setShowChart(v => !v)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${showChart ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-muted text-muted-foreground border border-border hover:bg-muted/80'}`}
            >
              {showChart ? '✓' : '○'} LGU Status
            </button>
          </div>

          {/* ── Stat Cards ─────────────────────────────────────────────────── */}
          {showStats && (
            <div className="mb-6">
              <div className="grid grid-cols-3 lg:grid-cols-2 sm:grid-cols-1 gap-4">
                <StatCard title="No. of LGU Operational"   value={ustatus.operational}   icon={<Building2 className="w-4 h-4" />} iconBg="bg-[#2464e8]" accent="text-[#2464e8]" borderAccent="border-l-[#2464e8]" loading={loading} info="Number of LGUs with Operational status for the selected modules and year" />
                <StatCard title="No. of LGU Developmental" value={ustatus.developmental} icon={<TrendingUp className="w-4 h-4" />} iconBg="bg-[#fcbf21]" accent="text-[#fcbf21]" borderAccent="border-l-[#fcbf21]" loading={loading} info="Number of LGUs in Developmental stage for the selected modules and year" />
                <StatCard title="No. of LGU Withdraw"      value={ustatus.withdraw}      icon={<Shield className="w-4 h-4" />}    iconBg="bg-red-600"    accent="text-red-600"    borderAccent="border-l-red-500"    loading={loading} info="Number of LGUs that have withdrawn for the selected modules and year" />
              </div>
              <div className="grid grid-cols-3 lg:grid-cols-2 sm:grid-cols-1 gap-4 mt-4">
                <StatCard title="No. of LGU with ePayment"   value={epaymentCounts.epayment}   icon={<CreditCard className="w-4 h-4" />} iconBg="bg-green-600"  accent="text-green-600"  borderAccent="border-l-green-500"  loading={loading} info="Number of LGUs that have adopted ePayment within the selected year" />
                <StatCard title="No. of LGU with eGovPay v1" value={epaymentCounts.egovpay_v1} icon={<Landmark className="w-4 h-4" />}   iconBg="bg-purple-600" accent="text-purple-600" borderAccent="border-l-purple-500" loading={loading} info="Number of LGUs using eGovPay v1 within the selected year" />
                <StatCard title="No. of LGU with eGovPay v2" value={epaymentCounts.egovpay_v2} icon={<Landmark className="w-4 h-4" />}   iconBg="bg-teal-600"   accent="text-teal-600"   borderAccent="border-l-teal-500"   loading={loading} info="Number of LGUs using eGovPay v2 within the selected year" />
              </div>
            </div>
          )}

          {/* ── Status Chart ───────────────────────────────────────────────── */}
          {showChart && (
            <div className="bg-card relative flex flex-col p-4 rounded-md border text-secondary-foreground border-border shadow-sm mb-6">
              {loading && (
                <div className="absolute left-0 top-0 w-full h-1 z-50 overflow-hidden rounded-t-md flex">
                  <div className="h-full w-full ease-in-out animate-[moveLine_1.3s_linear_infinite] flex">
                    <div className="h-full" style={{ width: '30%', background: '#eccb58' }} />
                    <div className="h-full" style={{ width: '40%', background: '#b8232e' }} />
                    <div className="h-full" style={{ width: '50%', background: '#0134b2' }} />
                  </div>
                  <style>{`
                    @keyframes moveLine {
                      0%   { transform: translateX(-100%); }
                      100% { transform: translateX(250%);  }
                    }
                  `}</style>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold uppercase">
                  Operational vs. Developmental vs. Withdrawal ({selectedYear})
                </h2>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-6 mb-2">
                {[['Operational', '#2563eb'], ['Developmental', '#fbbf24'], ['Withdraw', '#dc2626']].map(([label, color]) => (
                  <span key={label} className="flex items-center gap-2">
                    <span className="w-10 h-[16px] inline-block" style={{ background: color }} />
                    <span className="text-xs">{label}</span>
                  </span>
                ))}
              </div>

              {regionRows.length === 0 ? (
                <div className="h-80 flex items-center justify-center text-slate-400">
                  <div className="text-center">
                    <BarChart3 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No data. Select modules and click Run.</p>
                  </div>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <div style={{ minWidth: Math.max(400, regionRows.length * 80), height: 400 }}>
                    <Bar data={barChartData} options={barOptions} plugins={[ChartDataLabels]} />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>{/* end scrollable */}
      </div>{/* end main area */}
    </div>
  );
}

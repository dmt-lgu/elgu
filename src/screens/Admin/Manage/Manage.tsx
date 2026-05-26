import { Link, Outlet, useLocation } from 'react-router-dom';
import { BarChart3Icon } from 'lucide-react';

const navItems = [
  { path: 'general',   label: 'General',   description: 'Aggregated view of all modules + ePayment' },
  { path: 'bp1',       label: 'BP1',       description: 'Manage BP1 UR Input' },
  { path: 'wp',        label: 'WP',        description: 'Manage WP UR Input' },
  { path: 'bc',        label: 'BC',        description: 'Manage BC UR Input' },
  { path: 'bpco',      label: 'BPCO',      description: 'Manage BPCO UR Input' },
  { path: 'epayment',  label: 'ePayment',  description: 'Manage ePayment / eGovPay records' },
];

function Manage() {


  return (
    <div className="flex h-full bg-background text-slate-900">
  

      <div className="flex-1 min-w-0 bg-slate-50">
        <div className="border-b border-border bg-white px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold">Manage ELGU Module Data</h1>
              <p className="text-sm text-slate-500">Use the left menu to switch between BP1, WP, BC and BPCO records.</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Manage;

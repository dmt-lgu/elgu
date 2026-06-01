import { Outlet, } from 'react-router-dom';


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

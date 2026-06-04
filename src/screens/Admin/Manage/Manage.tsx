import { Outlet, } from 'react-router-dom';


function Manage() {


  return (
    <div className="flex h-full bg-background text-slate-900">
  

      <div className="flex-1 min-w-0 bg-slate-50">
     
        <div className="p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default Manage;

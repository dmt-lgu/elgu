import React, { useState } from 'react';

import TableReport from './table/TableReport';
import FilterSection from './components/FilterSection';


const Reports: React.FC = () => {
  const [filterState, setFilterState] = useState<any>({
    selectedModules: [],
    selectedRegions: [],
    dateRange: {
      start: null,
      end: null,
    },
  });

  return (
    <div className='p-6 max-w-[1200px] mx-auto  bg-background'>
      <FilterSection filterState={filterState} setFilterState={setFilterState} />
      <TableReport selectedRegions={filterState.selectedRegions} dateRange={filterState.dateRange} />
    </div>
  );
};

export default Reports;
import { filterTableResults as bpFilterTableResults } from '../table/BusinessPermitReport';
import { filterTableResults as wpFilterTableResults } from '../table/WorkingPermitReport';
import { filterTableResults as bcFilterTableResults } from '../table/BrgyClearanceReport';

export function getModuleFilteredResults({
  moduleKey,
  apiData,
  selectedRegions,
  selectedProvinces,
  selectedCities,
  selectedDates,
  selectedIslands,
  lguToRegion,
  dateRange,
}: {
  moduleKey: string;
  apiData: any;
  selectedRegions: string[];
  selectedProvinces: string[];
  selectedCities: string[];
  selectedDates: string[];
  selectedIslands: string[];
  lguToRegion: Record<string, string>;
  dateRange: { start: string | null; end: string | null };
}) {
  if (moduleKey === 'Business Permit') {
    return bpFilterTableResults({
      apiData,
      selectedRegions,
      selectedProvinces,
      selectedCities,
      selectedDates,
      selectedIslands,
      lguToRegion,
      dateRange,
    });
  }
  if (moduleKey === 'Working Permit') {
    return wpFilterTableResults({
      apiData,
      selectedRegions,
      selectedProvinces,
      selectedCities,
      selectedDates,
      selectedIslands,
      lguToRegion,
      dateRange,
    });
  }
  if (moduleKey === 'Barangay Clearance') {
    return bcFilterTableResults({
      apiData,
      selectedRegions,
      selectedProvinces,
      selectedCities,
      selectedDates,
      selectedIslands,
      lguToRegion,
      dateRange,
    });
  }
  return [];
}
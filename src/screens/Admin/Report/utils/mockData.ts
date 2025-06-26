import { StatisticData, ChartDataPoint } from './types';
import axios from '../../../../plugin/axios';
import { useEffect, useState } from 'react';

export const mainStats: StatisticData[] = [
  { title: 'No. of Transaction', value: '8,846', showInfo: true },
  { title: 'Operational LGU', value: '836', showInfo: true },
  { title: 'Developmental', value: '76', showInfo: true },
];

export const genderStats: StatisticData[] = [
  { title: 'No. of Male', value: '4,046' },
  { title: 'No. of Female', value: '4,800' },
  { title: 'Non-Binary', value: '0' },
];

export const operationalLguChartData: ChartDataPoint[] = [
  { name: 'CAR', operational: 21, developmental: 9 },
  { name: 'Region I', operational: 35, developmental: 22 },
  { name: 'Region II', operational: 28, developmental: 15 },
  { name: 'Region III', operational: 8, developmental: 21 },
  { name: 'Region IV-A', operational: 24, developmental: 17 },
  { name: 'Region IV-B', operational: 21, developmental: 18 },
];

export const monthlyComparisonChartData: ChartDataPoint[] = [
  { name: 'CAR', previous: 25, current: 18 },
  { name: 'Region I', previous: 15, current: 13 },
  { name: 'Region II', previous: 29, current: 26 },
  { name: 'Region III', previous: 34, current: 38 },
  { name: 'Region IV-A', previous: 19, current: 13 },
  { name: 'Region IV-B', previous: 12, current: 15 },
];

export const modules = [
  "Business Permit",
  "Building Permit",
  "Certificate of Occupancy",
  "Working Permit",
  "Barangay Clearance",
];

export const category = [
  "Operational LGUs",
  "No. of transactions",
];

export const dateRange = [
  "Day",
  "Month",
  "Year",
];

export const regions = [
  "R1","R2","R3","R4A","R4B","R5","CAR","NCR","R6","R7","R8","R9","R10","R11","R12","R13","BARMM I","BARMM II"
];

export const regionMapping: Record<string, string> = {
  "I": "region1",
  "II": "region2",
  "III": "region3",
  "IV-A": "region4a",
  "IV-B": "region4b",
  "V": "region5",
  "VI": "region6",
  "VII": "region7",
  "VIII": "region8",
  "IX": "region9",
  "X": "region10",
  "XI": "region11",
  "XII": "region12",
  "XIII": "region13",
  "CAR": "CAR",
  "NCR": "NCR",
  "NIR": "NIR",
  "BARMM": "BARMM1",
};
export const groupOfIslands = ["Luzon", "Visayas", "Mindanao"];
export const regionGroups: Record<string, string> = {
  "I": "region1",
  "II": "region2",
  "III": "region3",
  "IV-A": "region4a",
  "IV-B": "region4b",
  "V": "region5",
  "VI": "region6",
  "VII": "region7",
  "VIII": "region8",
  "IX": "region9",
  "X": "region10",
  "XI": "region11",
  "XII": "region12",
  "XIII": "region13",
  "CAR": "CAR",
  "NCR": "NCR",
  "NIR": "NIR",
  "BARMM": "BARMM1", 
};

export const regionKeyToCode: Record<string, string> = {
  region1: "R1",
  region2: "R2",
  region3: "R3",
  region4a: "R4A",
  region4b: "R4B",
  region5: "R5",
  region6: "R6",
  region7: "R7",
  region8: "R8",
  region9: "R9",
  region10: "R10",
  region11: "R11",
  region12: "R12",
  region13: "R13",
  CAR: "CAR",
  NCR: "NCR",
  NIR: "NIR",
  BARMM1: "BARMM I",
  BARMM2: "BARMM II",
};

export function getRegionCode(regionKey: string): string {
  return regionKeyToCode[regionKey] || regionKey;
}

// export const provinces = [
//   // Luzon provinces
//   "Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan", // Region I
//   "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales", // Region III
//   "Batangas", "Cavite", "Laguna", "Quezon", "Rizal", // Region IV-A
//   "Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon", // Region V
//   "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino", // Region II
//   "Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province", // CAR
//   "Metro Manila", // NCR

//   // Visayas provinces
//   "Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental", // Region VI
//   "Bohol", "Cebu", "Negros Oriental", "Siquijor", // Region VII
//   "Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte", // Region VIII
//   "Negros del Norte", // NIR

//   // Mindanao provinces
//   "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay", // Region IX
//   "Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental", // Region X
//   "Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental", // Region XI
//   "Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat", // Region XII
//   "Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur", // Region XIII
//   "Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi" // BARMM
// ];

// --- City Normalization Utilities and API Integration ---

export async function fetchProvinces(): Promise<string[]> {
  const res = await axios.get("municipality-list");
  // The keys of the returned object are the province names
  return Object.keys(res.data);
}
/**
 * Normalize a city name to "City of <name>" if it ends with " City".
 */
export function displayCityName(name: string) {
  // Already in "City of ..." format
  if (/^City of /i.test(name.trim())) return name;
  // Match "<name> City" or "<name>City" (with or without space)
  const match = name.match(/^(.+?)\s*City$/i);
  if (match) {
    return `City of ${match[1].trim()}`;
  }
  return name.trim();
}

/**
 * Normalize all city names in the API data.
 * API returns: { "Province": ["City, Province", ...], ... }
 * We want: { "Province": ["City of <name>", ...] }
 */
export function normalizeApiCities(apiCities: Record<string, string[]>): Record<string, string[]> {
  const normalized: Record<string, string[]> = {};
  for (const [province, cityList] of Object.entries(apiCities)) {
    normalized[province] = cityList.map(cityProv => {
      // Extract city name before comma if present
      const city = cityProv.split(',')[0].trim();
      return displayCityName(city);
    });
  }
  return normalized;
}

/**
 * Fetches the city/municipality list from the API and normalizes it.
 * Returns a promise resolving to the normalized cities object.
 */
export async function fetchAndNormalizeCities(): Promise<Record<string, string[]>> {
  const res = await axios.get('municipality-list');
  return normalizeApiCities(res.data);
}

/**
 * React hook to fetch and provide normalized cities data.
 * Usage:
 *   const { cities, loading, error } = useCities();
 */
export function useCities() {
  const [cities, setCities] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  
  let mounted = true;
  setLoading(true);
  fetchAndNormalizeCities()
    .then(data => {
      if (mounted) {
        setCities(data);
        setLoading(false);
      }
    })
    .catch(err => {
      if (mounted) {
        setError(err.message || 'Failed to fetch cities');
        setLoading(false);
      }
      });


  useEffect(() => {
    return () => { mounted = false; };
  }, []);

  return { cities, loading, error };
}

// --- End of city API integration ---

export const islandRegionMap: Record<string, string[]> = {
  "Luzon": ["I", "II", "III", "IV-A", "V", "CAR", "NCR"],
  "Visayas": ["VI", "VII", "VIII", "NIR"],
  "Mindanao": ["IX", "X", "XI", "XII", "XIII", "BARMM"],
};

export const regionProvinceMap: Record<string, string[]> = {
  "I": ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"],
  "II": ["Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"],
  "III": ["Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales"],
  "IV-A": ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"],
  "V": ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"],
  "CAR": ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"],
  "NCR": ["Metro Manila"],
  "VI": ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental"],
  "VII": ["Bohol", "Cebu", "Negros Oriental", "Siquijor"],
  "VIII": ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"],
  "NIR": ["Negros del Norte"],
  "IX": ["Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"],
  "X": ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"],
  "XI": ["Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental"],
  "XII": ["Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"],
  "XIII": ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"],
  "BARMM": ["Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi"]
};


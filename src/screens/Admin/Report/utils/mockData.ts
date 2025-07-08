import { StatisticData } from './types';
import axios from '../../../../plugin/axios';
import { useEffect, useState } from 'react';

export const mainStats: StatisticData[] = [
  { title: 'No. of Transaction', value: '8,846', showInfo: true },
  { title: 'Operational LGU', value: '836', showInfo: true },
  { title: 'Developmental', value: '76', showInfo: true },
];


export const modules = [
  "Business Permit",
  // "Building Permit",
  // "Certificate of Occupancy",
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
  "R1","R2","R3","R4A","R4B","R5","CAR","R6","R7","R8","R9","R10","R11","R12","R13","BARMM I","BARMM II"
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
  "BARMM1": "BARMM1",
  "BARMM2": "BARMM2",
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
  "BARMM I": "BARMM1",
  "BARMM II": "BARMM2",
};

export const regionCodeToKey: Record<string, string> = {
  "R1": "region1",
  "R2": "region2",
  "R3": "region3",
  "R4-A": "region4a",
  "R4-B": "region4b",
  "R5": "region5",
  "R6": "region6",
  "R7": "region7",
  "R8": "region8",
  "R9": "region9",
  "R10": "region10",
  "R11": "region11",
  "R12": "region12",
  "R13": "region13",
  "CAR": "CAR",
  "BARMM1": "BARMM1",
  "BARMM2": "BARMM2",
};

export const regionKeyToCode: Record<string, string> = Object.fromEntries(
  Object.entries(regionCodeToKey).map(([code, key]) => [key.toLowerCase(), code])
);


// export const provinces = [ ... ];
export function getRegionCode(regionKey: string): string {
  return regionKeyToCode[regionKey.toLowerCase()] || regionKey;
}

export async function fetchProvinces(): Promise<string[]> {
  const res = await axios.get("municipality-list");
  // The keys of the returned object are the province names
  return Object.keys(res.data);
}

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

export async function fetchAndNormalizeCities(): Promise<Record<string, string[]>> {
  const res = await axios.get('municipality-list');
  return normalizeApiCities(res.data);
}

export function useCities() {
  const [cities, setCities] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
    return () => { mounted = false; };
  }, []);

  return { cities, loading, error };
}

// --- End of city API integration ---

export const islandRegionMap: Record<string, string[]> = {
  "Luzon": ["I", "II", "III", "IV-A", "IV-B", "V", "CAR"],
  "Visayas": ["VI", "VII", "VIII"],
  "Mindanao": ["IX", "X", "XI", "XII", "XIII", "BARMM1", "BARMM2"],
};

export const regionProvinceMap: Record<string, string[]> = {
  "CAR": ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"],
  "region1": ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"],
  "region2": ["Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"],
  "region3": ["Aurora", "Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales"],
  "region4a": ["Batangas", "Cavite", "Laguna", "Quezon", "Rizal"],
  "region4b": ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"],
  "region5": ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"],
  "region6": ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental"],
  "region7": ["Bohol", "Cebu", "Negros Oriental", "Siquijor"],
  "region8": ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"],
  "region9": ["Basilan", "Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"],
  "region10": ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"],
  "region11": ["Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Oriental"],
  "region12": ["Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"],
  "region13": ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"],
  "BARMM1": ["Basilan", "Sulu", "Tawi-tawi"],
  "BARMM2": ["Maguindanao del Norte", "Maguindanao del Sur"]
};
import {
  LucideLayoutDashboard,
  BarChart3Icon,
  MenuIcon,
  XIcon,

  FileTextIcon,
  BriefcaseIcon,
  HomeIcon,
  BuildingIcon,
  Settings2Icon,
  ChevronRightIcon,
  HistoryIcon,
  LogOutIcon,
} from "lucide-react";
import DashboardProgressIndicator from './Dashboard/components/DashboardProgressIndicator';
import { useLocation, useNavigate } from "react-router-dom";
import Logo from './../../assets/logo/dict-logo.png'
import { useEffect, useRef, useState } from "react";

import eLGULogo from "./../../assets/logo/lgu-logo.png";
import { Link, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import { isCancel } from "axios";
import axios from "./../../plugin/axios";
import Swal from "sweetalert2";
import { useSelector, useDispatch } from "react-redux";
import {  setRegions } from "@/redux/regionSlice";
import { selectData } from "@/redux/dataSlice";
import { setLoad } from "@/redux/loadSlice";
import { setCard } from "@/redux/cardSlice";
import { setTransaction } from "@/redux/transactionSlice";
import { clearStorageIfNeeded, handleStorageError } from "@/lib/storageUtils";
import { setLoad2 } from '@/redux/loadSlice2';


const regionMapping = [
  { id: "region1", text: "I", municipalities: [] },
  { id: "region2", text: "II", municipalities: [] },
  { id: "region3", text: "III", municipalities: [] },
  { id: "region4a", text: "IV-A", municipalities: [] },
  { id: "region5", text: "V", municipalities: [] },
  { id: "CAR", text: "CAR", municipalities: [] },
  { id: "NCR", text: "NCR", municipalities: [] },
  { id: "region4b", text: "IV-B", municipalities: [] },
  { id: "region7", text: "VII", municipalities: [] },
  { id: "region8", text: "VIII", municipalities: [] },
  { id: "region6", text: "VI", municipalities: [] },
  { id: "NIR", text: "NIR", municipalities: [] },
  { id: "region9", text: "IX", municipalities: [] },
  { id: "region10", text: "X", municipalities: [] },
  { id: "region11", text: "XI", municipalities: [] },
  { id: "region12", text: "XII", municipalities: [] },
  { id: "BARMM1", text: "BARMM I", municipalities: [] },
  { id: "BARMM2", text: "BARMM II", municipalities: [] },
  { id: "region13", text: "XIII", municipalities: [] },
];

export const regionGroups = [
  ["I", "II", "III", "IV-A", "V"],
  ["CAR", "NCR", "VII", "VIII"],
  ["VI", "NIR", "IX", "X", "XI", "XII"],
  ["BARMM I", "BARMM II", "XIII"],
];

interface TotalResults {
  totalnewPending: number;
  totalnewPaid: number;
  totalnewPaidViaEgov: number;
  totalrenewPending: number;
  totalrenewPaid: number;
  totalrenewPaidViaEgov: number;
  totalmalePending: number;
  totalmalePaid: number;
  totalfemalePending: number;
  totalfemalePaid: number;
  totalCitizensServed: number;
  // Add totals for each module
  bpTotalnewPending?: number;
  bpTotalnewPaid?: number;
  bpTotalnewPaidViaEgov?: number;
  bpTotalrenewPending?: number;
  bpTotalrenewPaid?: number;
  bpTotalrenewPaidViaEgov?: number;
  bpTotalmalePending?: number;
  bpTotalmalePaid?: number;
  bpTotalfemalePending?: number;
  bpTotalfemalePaid?: number;
  bpTotalCitizensServed?: number;
  wpTotalnewPending?: number;
  wpTotalnewPaid?: number;
  wpTotalnewPaidViaEgov?: number;
  wpTotalrenewPending?: number;
  wpTotalrenewPaid?: number;
  wpTotalrenewPaidViaEgov?: number;
  wpTotalmalePending?: number;
  wpTotalmalePaid?: number;
  wpTotalfemalePending?: number;
  wpTotalfemalePaid?: number;
  wpTotalCitizensServed?: number;
  bpcoTotalnewPending?: number;
  bpcoTotalnewPaid?: number;
  bpcoTotalnewPaidViaEgov?: number;
  bpcoTotalrenewPending?: number;
  bpcoTotalrenewPaid?: number;
  bpcoTotalrenewPaidViaEgov?: number;
  bpcoTotalmalePending?: number;
  bpcoTotalmalePaid?: number;
  bpcoTotalfemalePending?: number;
  bpcoTotalfemalePaid?: number;
  bpcoTotalCitizensServed?: number;
  bpbpTotalnewPending?: number;
  bpbpTotalnewPaid?: number;
  bpbpTotalnewPaidViaEgov?: number;
  bpbpTotalrenewPending?: number;
  bpbpTotalrenewPaid?: number;
  bpbpTotalrenewPaidViaEgov?: number;
  bpbpTotalmalePending?: number;
  bpbpTotalmalePaid?: number;
  bpbpTotalfemalePending?: number;
  bpbpTotalfemalePaid?: number;
  bpbpTotalCitizensServed?: number;
  brgyTotalnewPending?: number;
  brgyTotalnewPaid?: number;
  brgyTotalnewPaidViaEgov?: number;
  brgyTotalrenewPending?: number;
  brgyTotalrenewPaid?: number;
  brgyTotalrenewPaidViaEgov?: number;
  brgyTotalmalePending?: number;
  brgyTotalmalePaid?: number;
  brgyTotalfemalePending?: number;
  brgyTotalfemalePaid?: number;
  brgyTotalCitizensServed?: number;
}

const mergeModuleResults = (bpResults: any[], wpResults: any[], bpcoResults: any[], bpbpResults: any[], brgyResults: any[]): any[] => {
  const mergedMap = new Map();

  // Initialize default month structure
  const createDefaultMonth = () => ({
    bpNewPending: 0,
    bpNewPaid: 0,
    bpNewPaidViaEgov: 0,
    bpRenewPending: 0,
    bpRenewPaid: 0,
    bpRenewPaidViaEgov: 0,
    bpMalePending: 0,
    bpMalePaid: 0,
    bpFemalePending: 0,
    bpFemalePaid: 0,
    wpNewPending: 0,
    wpNewPaid: 0,
    wpNewPaidViaEgov: 0,
    wpRenewPending: 0,
    wpRenewPaid: 0,
    wpRenewPaidViaEgov: 0,
    wpMalePending: 0,
    wpMalePaid: 0,
    wpFemalePending: 0,
    wpFemalePaid: 0,
    bpcoNewPending: 0,
    bpcoNewPaid: 0,
    bpcoNewPaidViaEgov: 0,
    bpcoRenewPending: 0,
    bpcoRenewPaid: 0,
    bpcoRenewPaidViaEgov: 0,
    bpcoMalePending: 0,
    bpcoMalePaid: 0,
    bpcoFemalePending: 0,
    bpcoFemalePaid: 0,
    bpbpNewPending: 0,
    bpbpNewPaid: 0,
    bpbpNewPaidViaEgov: 0,
    bpbpRenewPending: 0,
    bpbpRenewPaid: 0,
    bpbpRenewPaidViaEgov: 0,
    bpbpMalePending: 0,
    bpbpMalePaid: 0,
    bpbpFemalePending: 0,
    bpbpFemalePaid: 0,
    brgyNewPending: 0,
    brgyNewPaid: 0,
    brgyNewPaidViaEgov: 0,
    brgyRenewPending: 0,
    brgyRenewPaid: 0,
    brgyRenewPaidViaEgov: 0,
    brgyMalePending: 0,
    brgyMalePaid: 0,
    brgyFemalePending: 0,
    brgyFemalePaid: 0,
  });

  // Helper function to merge month data for a specific module
  const mergeMonthData = (existingMonth: any, newMonth: any, modulePrefix: string) => {
    return {
      ...existingMonth,
      [`${modulePrefix}NewPending`]: newMonth.newPending || 0,
      [`${modulePrefix}NewPaid`]: newMonth.newPaid || 0,
      [`${modulePrefix}NewPaidViaEgov`]: newMonth.newPaidViaEgov || 0,
      [`${modulePrefix}RenewPending`]: newMonth.renewPending || 0,
      [`${modulePrefix}RenewPaid`]: newMonth.renewPaid || 0,
      [`${modulePrefix}RenewPaidViaEgov`]: newMonth.renewPaidViaEgov || 0,
      [`${modulePrefix}MalePending`]: newMonth.malePending || 0,
      [`${modulePrefix}MalePaid`]: newMonth.malePaid || 0,
      [`${modulePrefix}FemalePending`]: newMonth.femalePending || 0,
      [`${modulePrefix}FemalePaid`]: newMonth.femalePaid || 0,
    };
  };

  // Process BP results
  bpResults.forEach(bpLgu => {
    mergedMap.set(bpLgu.lgu, {
      lgu: bpLgu.lgu,
      region: bpLgu.region,
      monthlyResults: bpLgu.monthlyResults.map((month: any) => 
        mergeMonthData({ ...createDefaultMonth(), month: month.month }, month, 'bp')
      ),
      bpTotalCitizensServed: bpLgu.totalCitizensServed || 0
    });
  });

  // Process WP results
  wpResults.forEach(wpLgu => {
    const existing = mergedMap.get(wpLgu.lgu);
    if (existing) {
      existing.monthlyResults = existing.monthlyResults.map((month: any) => {
        const wpMonth = wpLgu.monthlyResults.find((wp: any) => wp.month === month.month);
        return wpMonth ? mergeMonthData(month, wpMonth, 'wp') : month;
      });
      existing.wpTotalCitizensServed = wpLgu.totalCitizensServed || 0;
    } else {
      mergedMap.set(wpLgu.lgu, {
        lgu: wpLgu.lgu,
        region: wpLgu.region,
        monthlyResults: wpLgu.monthlyResults.map((month: any) => 
          mergeMonthData({ ...createDefaultMonth(), month: month.month }, month, 'wp')
        ),
        wpTotalCitizensServed: wpLgu.totalCitizensServed || 0
      });
    }
  });

  // Process BPCO results
  bpcoResults.forEach(bpcoLgu => {
    const existing = mergedMap.get(bpcoLgu.lgu);
    if (existing) {
      existing.monthlyResults = existing.monthlyResults.map((month: any) => {
        const bpcoMonth = bpcoLgu.monthlyResults.find((bpco: any) => bpco.month === month.month);
        return bpcoMonth ? mergeMonthData(month, bpcoMonth, 'bpco') : month;
      });
      existing.bpcoTotalCitizensServed = bpcoLgu.totalCitizensServed || 0;
    } else {
      mergedMap.set(bpcoLgu.lgu, {
        lgu: bpcoLgu.lgu,
        region: bpcoLgu.region,
        monthlyResults: bpcoLgu.monthlyResults.map((month: any) => 
          mergeMonthData({ ...createDefaultMonth(), month: month.month }, month, 'bpco')
        ),
        bpcoTotalCitizensServed: bpcoLgu.totalCitizensServed || 0
      });
    }
  });

  // Process BPBP results
  bpbpResults.forEach(bpbpLgu => {
    const existing = mergedMap.get(bpbpLgu.lgu);
    if (existing) {
      existing.monthlyResults = existing.monthlyResults.map((month: any) => {
        const bpbpMonth = bpbpLgu.monthlyResults.find((bpbp: any) => bpbp.month === month.month);
        return bpbpMonth ? mergeMonthData(month, bpbpMonth, 'bpbp') : month;
      });
      existing.bpbpTotalCitizensServed = bpbpLgu.totalCitizensServed || 0;
    } else {
      mergedMap.set(bpbpLgu.lgu, {
        lgu: bpbpLgu.lgu,
        region: bpbpLgu.region,
        monthlyResults: bpbpLgu.monthlyResults.map((month: any) => 
          mergeMonthData({ ...createDefaultMonth(), month: month.month }, month, 'bpbp')
        ),
        bpbpTotalCitizensServed: bpbpLgu.totalCitizensServed || 0
      });
    }
  });

  // Process Barangay Clearance results - BRGY has different structure (totalCount instead of detailed fields)
  brgyResults.forEach(brgyLgu => {
    const existing = mergedMap.get(brgyLgu.lgu);
    if (existing) {
      existing.monthlyResults = existing.monthlyResults.map((month: any) => {
        const brgyMonth = brgyLgu.monthlyResults.find((brgy: any) => brgy.month === month.month);
        if (brgyMonth) {
          // Map totalCount to brgy fields - BRGY data structure is different
          return {
            ...month,
            brgyNewPending: 0, // BRGY doesn't have pending data
            brgyNewPaid: brgyMonth.totalCount || 0, // Map totalCount to newPaid
            brgyNewPaidViaEgov: 0, // BRGY doesn't have eGov data
            brgyRenewPending: 0, // BRGY doesn't have renew data
            brgyRenewPaid: 0, // BRGY doesn't have renew data
            brgyRenewPaidViaEgov: 0, // BRGY doesn't have renew eGov data
            brgyMalePending: 0, // BRGY doesn't have gender data
            brgyMalePaid: 0, // BRGY doesn't have gender data
            brgyFemalePending: 0, // BRGY doesn't have gender data
            brgyFemalePaid: 0, // BRGY doesn't have gender data
            totalCount: brgyMonth.totalCount || 0, // Keep original field for reference
          };
        }
        return month;
      });
      existing.brgyTotalCitizensServed = brgyLgu.totalCitizensServed || 0;
    } else {
      mergedMap.set(brgyLgu.lgu, {
        lgu: brgyLgu.lgu,
        region: brgyLgu.region,
        monthlyResults: brgyLgu.monthlyResults.map((month: any) => ({
          ...createDefaultMonth(),
          month: month.month,
          brgyNewPending: 0, // BRGY doesn't have pending data
          brgyNewPaid: month.totalCount || 0, // Map totalCount to newPaid
          brgyNewPaidViaEgov: 0, // BRGY doesn't have eGov data
          brgyRenewPending: 0, // BRGY doesn't have renew data
          brgyRenewPaid: 0, // BRGY doesn't have renew data
          brgyRenewPaidViaEgov: 0, // BRGY doesn't have renew eGov data
          brgyMalePending: 0, // BRGY doesn't have gender data
          brgyMalePaid: 0, // BRGY doesn't have gender data
          brgyFemalePending: 0, // BRGY doesn't have gender data
          brgyFemalePaid: 0, // BRGY doesn't have gender data
          totalCount: month.totalCount || 0, // Keep original field for reference
        })),
        brgyTotalCitizensServed: brgyLgu.totalCitizensServed || 0
      });
    }
  });

  return Array.from(mergedMap.values());
};

const calculateTotals = (data: any): TotalResults => {
  const totals: TotalResults = {
    totalnewPending: 0,
    totalnewPaid: 0,
    totalnewPaidViaEgov: 0,
    totalrenewPending: 0,
    totalrenewPaid: 0,
    totalrenewPaidViaEgov: 0,
    totalmalePending: 0,
    totalmalePaid: 0,
    totalfemalePending: 0,
    totalfemalePaid: 0,
    totalCitizensServed: 0,
    // Module-specific totals
    bpTotalnewPending: 0,
    bpTotalnewPaid: 0,
    bpTotalnewPaidViaEgov: 0,
    bpTotalrenewPending: 0,
    bpTotalrenewPaid: 0,
    bpTotalrenewPaidViaEgov: 0,
    bpTotalmalePending: 0,
    bpTotalmalePaid: 0,
    bpTotalfemalePending: 0,
    bpTotalfemalePaid: 0,
    bpTotalCitizensServed: 0,
    wpTotalnewPending: 0,
    wpTotalnewPaid: 0,
    wpTotalnewPaidViaEgov: 0,
    wpTotalrenewPending: 0,
    wpTotalrenewPaid: 0,
    wpTotalrenewPaidViaEgov: 0,
    wpTotalmalePending: 0,
    wpTotalmalePaid: 0,
    wpTotalfemalePending: 0,
    wpTotalfemalePaid: 0,
    wpTotalCitizensServed: 0,
    bpcoTotalnewPending: 0,
    bpcoTotalnewPaid: 0,
    bpcoTotalnewPaidViaEgov: 0,
    bpcoTotalrenewPending: 0,
    bpcoTotalrenewPaid: 0,
    bpcoTotalrenewPaidViaEgov: 0,
    bpcoTotalmalePending: 0,
    bpcoTotalmalePaid: 0,
    bpcoTotalfemalePending: 0,
    bpcoTotalfemalePaid: 0,
    bpcoTotalCitizensServed: 0,
    bpbpTotalnewPending: 0,
    bpbpTotalnewPaid: 0,
    bpbpTotalnewPaidViaEgov: 0,
    bpbpTotalrenewPending: 0,
    bpbpTotalrenewPaid: 0,
    bpbpTotalrenewPaidViaEgov: 0,
    bpbpTotalmalePending: 0,
    bpbpTotalmalePaid: 0,
    bpbpTotalfemalePending: 0,
    bpbpTotalfemalePaid: 0,
    bpbpTotalCitizensServed: 0,
    brgyTotalnewPending: 0,
    brgyTotalnewPaid: 0,
    brgyTotalnewPaidViaEgov: 0,
    brgyTotalrenewPending: 0,
    brgyTotalrenewPaid: 0,
    brgyTotalrenewPaidViaEgov: 0,
    brgyTotalmalePending: 0,
    brgyTotalmalePaid: 0,
    brgyTotalfemalePending: 0,
    brgyTotalfemalePaid: 0,
    brgyTotalCitizensServed: 0,
  };

  data.results.forEach((lgu: any) => {
    // Sum totalCitizensServed for each module from LGU level
    if (lgu.bpTotalCitizensServed !== undefined) {
      totals.bpTotalCitizensServed! += lgu.bpTotalCitizensServed;
    }
    if (lgu.wpTotalCitizensServed !== undefined) {
      totals.wpTotalCitizensServed! += lgu.wpTotalCitizensServed;
    }
    if (lgu.bpcoTotalCitizensServed !== undefined) {
      totals.bpcoTotalCitizensServed! += lgu.bpcoTotalCitizensServed;
    }
    if (lgu.bpbpTotalCitizensServed !== undefined) {
      totals.bpbpTotalCitizensServed! += lgu.bpbpTotalCitizensServed;
    }
    if (lgu.brgyTotalCitizensServed !== undefined) {
      totals.brgyTotalCitizensServed! += lgu.brgyTotalCitizensServed;
    }
   
    lgu.monthlyResults.forEach((result: any) => {
      // Calculate combined totals
      const bpNewPending = result.bpNewPending || 0;
      const bpNewPaid = result.bpNewPaid || 0;
      const bpNewPaidViaEgov = result.bpNewPaidViaEgov || 0;
      const bpRenewPending = result.bpRenewPending || 0;
      const bpRenewPaid = result.bpRenewPaid || 0;
      const bpRenewPaidViaEgov = result.bpRenewPaidViaEgov || 0;
      const bpMalePending = result.bpMalePending || 0;
      const bpMalePaid = result.bpMalePaid || 0;
      const bpFemalePending = result.bpFemalePending || 0;
      const bpFemalePaid = result.bpFemalePaid || 0;
      


      const wpNewPending = result.wpNewPending || 0;
      const wpNewPaid = result.wpNewPaid || 0;
      const wpNewPaidViaEgov = result.wpNewPaidViaEgov || 0;
      const wpRenewPending = result.wpRenewPending || 0;
      const wpRenewPaid = result.wpRenewPaid || 0;
      const wpRenewPaidViaEgov = result.wpRenewPaidViaEgov || 0;
      const wpMalePending = result.wpMalePending || 0;
      const wpMalePaid = result.wpMalePaid || 0;
      const wpFemalePending = result.wpFemalePending || 0;
      const wpFemalePaid = result.wpFemalePaid || 0;

      const bpcoNewPending = result.bpcoNewPending || 0;
      const bpcoNewPaid = result.bpcoNewPaid || 0;
      const bpcoNewPaidViaEgov = result.bpcoNewPaidViaEgov || 0;
      const bpcoRenewPending = result.bpcoRenewPending || 0;
      const bpcoRenewPaid = result.bpcoRenewPaid || 0;
      const bpcoRenewPaidViaEgov = result.bpcoRenewPaidViaEgov || 0;
      const bpcoMalePending = result.bpcoMalePending || 0;
      const bpcoMalePaid = result.bpcoMalePaid || 0;
      const bpcoFemalePending = result.bpcoFemalePending || 0;
      const bpcoFemalePaid = result.bpcoFemalePaid || 0;

      const bpbpNewPending = result.bpbpNewPending || 0;
      const bpbpNewPaid = result.bpbpNewPaid || 0;
      const bpbpNewPaidViaEgov = result.bpbpNewPaidViaEgov || 0;
      const bpbpRenewPending = result.bpbpRenewPending || 0;
      const bpbpRenewPaid = result.bpbpRenewPaid || 0;
      const bpbpRenewPaidViaEgov = result.bpbpRenewPaidViaEgov || 0;
      const bpbpMalePending = result.bpbpMalePending || 0;
      const bpbpMalePaid = result.bpbpMalePaid || 0;
      const bpbpFemalePending = result.bpbpFemalePending || 0;
      const bpbpFemalePaid = result.bpbpFemalePaid || 0;

      const brgyNewPending = result.brgyNewPending || 0;
      const brgyNewPaid = result.brgyNewPaid || 0;
      const brgyNewPaidViaEgov = result.brgyNewPaidViaEgov || 0;
      const brgyRenewPending = result.brgyRenewPending || 0;
      const brgyRenewPaid = result.brgyRenewPaid || 0;
      const brgyRenewPaidViaEgov = result.brgyRenewPaidViaEgov || 0;
      const brgyMalePending = result.brgyMalePending || 0;
      const brgyMalePaid = result.brgyMalePaid || 0;
      const brgyFemalePending = result.brgyFemalePending || 0;
      const brgyFemalePaid = result.brgyFemalePaid || 0;

      // Combined totals - now including BPCO, BPBP and BRGY
      totals.totalnewPending += bpNewPending + wpNewPending + bpcoNewPending + bpbpNewPending + brgyNewPending;
      totals.totalnewPaid += bpNewPaid + wpNewPaid + bpcoNewPaid + bpbpNewPaid + brgyNewPaid;
      totals.totalnewPaidViaEgov += bpNewPaidViaEgov + wpNewPaidViaEgov + bpcoNewPaidViaEgov + bpbpNewPaidViaEgov + brgyNewPaidViaEgov;
      totals.totalrenewPending += bpRenewPending + wpRenewPending + bpcoRenewPending + bpbpRenewPending + brgyRenewPending;
      totals.totalrenewPaid += bpRenewPaid + wpRenewPaid + bpcoRenewPaid + bpbpRenewPaid + brgyRenewPaid;
      totals.totalrenewPaidViaEgov += bpRenewPaidViaEgov + wpRenewPaidViaEgov + bpcoRenewPaidViaEgov + bpbpRenewPaidViaEgov + brgyRenewPaidViaEgov;
      totals.totalmalePending += bpMalePending + wpMalePending + bpcoMalePending + bpbpMalePending + brgyMalePending;
      totals.totalmalePaid += bpMalePaid + wpMalePaid + bpcoMalePaid + bpbpMalePaid + brgyMalePaid;
      totals.totalfemalePending += bpFemalePending + wpFemalePending + bpcoFemalePending + bpbpFemalePending + brgyFemalePending;
      totals.totalfemalePaid += bpFemalePaid + wpFemalePaid + bpcoFemalePaid + bpbpFemalePaid + brgyFemalePaid;

      // BP specific totals
      totals.bpTotalnewPending! += bpNewPending;
      totals.bpTotalnewPaid! += bpNewPaid;
      totals.bpTotalnewPaidViaEgov! += bpNewPaidViaEgov;
      totals.bpTotalrenewPending! += bpRenewPending;
      totals.bpTotalrenewPaid! += bpRenewPaid;
      totals.bpTotalrenewPaidViaEgov! += bpRenewPaidViaEgov;
      totals.bpTotalmalePending! += bpMalePending;
      totals.bpTotalmalePaid! += bpMalePaid;
      totals.bpTotalfemalePending! += bpFemalePending;
      totals.bpTotalfemalePaid! += bpFemalePaid;

      // WP specific totals
      totals.wpTotalnewPending! += wpNewPending;
      totals.wpTotalnewPaid! += wpNewPaid;
      totals.wpTotalnewPaidViaEgov! += wpNewPaidViaEgov;
      totals.wpTotalrenewPending! += wpRenewPending;
      totals.wpTotalrenewPaid! += wpRenewPaid;
      totals.wpTotalrenewPaidViaEgov! += wpRenewPaidViaEgov;
      totals.wpTotalmalePending! += wpMalePending;
      totals.wpTotalmalePaid! += wpMalePaid;
      totals.wpTotalfemalePending! += wpFemalePending;
      totals.wpTotalfemalePaid! += wpFemalePaid;

      // BPCO specific totals
      totals.bpcoTotalnewPending! += bpcoNewPending;
      totals.bpcoTotalnewPaid! += bpcoNewPaid;
      totals.bpcoTotalnewPaidViaEgov! += bpcoNewPaidViaEgov;
      totals.bpcoTotalrenewPending! += bpcoRenewPending;
      totals.bpcoTotalrenewPaid! += bpcoRenewPaid;
      totals.bpcoTotalrenewPaidViaEgov! += bpcoRenewPaidViaEgov;
      totals.bpcoTotalmalePending! += bpcoMalePending;
      totals.bpcoTotalmalePaid! += bpcoMalePaid;
      totals.bpcoTotalfemalePending! += bpcoFemalePending;
      totals.bpcoTotalfemalePaid! += bpcoFemalePaid;

      // BPBP specific totals
      totals.bpbpTotalnewPending! += bpbpNewPending;
      totals.bpbpTotalnewPaid! += bpbpNewPaid;
      totals.bpbpTotalnewPaidViaEgov! += bpbpNewPaidViaEgov;
      totals.bpbpTotalrenewPending! += bpbpRenewPending;
      totals.bpbpTotalrenewPaid! += bpbpRenewPaid;
      totals.bpbpTotalrenewPaidViaEgov! += bpbpRenewPaidViaEgov;
      totals.bpbpTotalmalePending! += bpbpMalePending;
      totals.bpbpTotalmalePaid! += bpbpMalePaid;
      totals.bpbpTotalfemalePending! += bpbpFemalePending;
      totals.bpbpTotalfemalePaid! += bpbpFemalePaid;

      // BRGY specific totals
      totals.brgyTotalnewPending! += brgyNewPending;
      totals.brgyTotalnewPaid! += brgyNewPaid;
      totals.brgyTotalnewPaidViaEgov! += brgyNewPaidViaEgov;
      totals.brgyTotalrenewPending! += brgyRenewPending;
      totals.brgyTotalrenewPaid! += brgyRenewPaid;
      totals.brgyTotalrenewPaidViaEgov! += brgyRenewPaidViaEgov;
      totals.brgyTotalmalePending! += brgyMalePending;
      totals.brgyTotalmalePaid! += brgyMalePaid;
      totals.brgyTotalfemalePending! += brgyFemalePending;
      totals.brgyTotalfemalePaid! += brgyFemalePaid;
    });
  });

  // Calculate total citizens served across all modules
  totals.totalCitizensServed = 
    (totals.bpTotalCitizensServed || 0) + 
    (totals.wpTotalCitizensServed || 0) + 
    (totals.bpcoTotalCitizensServed || 0) + 
    (totals.bpbpTotalCitizensServed || 0) + 
    (totals.brgyTotalCitizensServed || 0);

  return totals;
};

function Admin() {



  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const data = useSelector(selectData);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Controllers for status data fetching
  // Helper function to reset first run flag (useful for testing)
  const resetFirstRun = () => {
    localStorage.setItem('elgu_first_run', '0');
    console.log('First run flag reset - will auto-trigger on next page load');
  };

  // Make resetFirstRun available globally for testing
  (window as any).resetFirstRun = resetFirstRun;

  const [progressState, setProgressState] = useState<Record<string, { currentRegion: string; currentIndex: number; totalRegions: number } | null>>({});
  const [moduleLoadingState, setModuleLoadingState] = useState<Record<string, boolean>>({});
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});
  

  function fetchRegions() {
    dispatch(setLoad(true));
    axios
      .get(`${import.meta.env.VITE_URL}/api/bp/lgu-list/`)
      .then((response) => {
        const allR6: string[] = (response.data?.['region6'] || []).filter((m: string) => typeof m === 'string');
        const allR7: string[] = (response.data?.['region7'] || []).filter((m: string) => typeof m === 'string');

        // NIR = Negros Occidental (from R6) + Negros Oriental & Siquijor (from R7)
        const nirMunis = [
          ...allR6.filter(m => m.includes('Negros Occidental')),
          ...allR7.filter(m => m.includes('Negros Oriental') || m.includes('Siquijor')),
        ];
        // Strip NIR provinces from R6 and R7 to avoid duplication
        const r6Munis = allR6.filter(m => !m.includes('Negros Occidental'));
        const r7Munis = allR7.filter(m => !m.includes('Negros Oriental') && !m.includes('Siquijor'));

        const updatedRegions = regionMapping.map((region: any) => {
          if (region.id === 'NIR') return { id: region.id, text: region.text, municipalities: nirMunis };
          if (region.id === 'region6') return { id: region.id, text: region.text, municipalities: r6Munis };
          if (region.id === 'region7') return { id: region.id, text: region.text, municipalities: r7Munis };
          return { id: region.id, text: region.text, municipalities: response.data?.[region.id] };
        });

        dispatch(setLoad(false));
        dispatch(setRegions(updatedRegions));
      })
      .catch((error) => {
        console.error("Error fetching regions:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to fetch regions. Please try again later.",
        });
      });
  }

  // Region mapping for status data
 



  // NIR is populated from R6's Negros Occidental records and R7's Negros Oriental/Siquijor
  // records, which are removed from their original region to avoid double-counting.






  const loadModulesSequentially = async () => {
    // Set loading to true at the start
    dispatch(setLoad2(true));
    
    // Small delay to prevent overwhelming the system
  
    try {
      // await getBPLS();
      // await delay(500); // 500ms delay after BPLS
      
      // await getWP();
      // await delay(500); // 500ms delay after WP
      
      // await getBRGY();
      // await delay(500); // 500ms delay after BRGY
      
      // await getBPCO();
    } catch (error) {
      console.error("Error in sequential loading:", error);
    } finally {
      // Always set loading to false at the end
      dispatch(setLoad2(false));
    }
  };

  function GetTransaction() {
    dispatch(setLoad(true));
    setIsLoading(true);

    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    const rawLocations: string[] = Array.isArray(data.real) ? data.real : [data.real];
    // NIR has no backend region — replace with its province names so the API filters by province
    const locations: string[] = (() => {
      if (!rawLocations.includes('NIR')) return rawLocations;
      const expanded = rawLocations.filter(r => r !== 'NIR');
      ['Negros Occidental', 'Negros Oriental', 'Siquijor'].forEach(p => { if (!expanded.includes(p)) expanded.push(p); });
      return expanded;
    })();
    const totalRegions = locations.length;

    // Shared mutable accumulators — each module's loop writes to its own slot.
    // JS is single-threaded so concurrent async loops don't race on these.
    const acc = {
      bp:   [] as any[],
      wp:   [] as any[],
      bpco: [] as any[],
      bpbp: [] as any[],
      brgy: [] as any[],
    };
    let totalLguCount = 0;

    // Initialize per-module progress
    const selectedModules: string[] = data.modules || [];
    const initialProgress: Record<string, { currentRegion: string; currentIndex: number; totalRegions: number } | null> = {};
    const initialModuleLoading: Record<string, boolean> = {};
    selectedModules.forEach(module => {
      initialProgress[module] = { currentRegion: 'Initializing...', currentIndex: 0, totalRegions };
      initialModuleLoading[module] = true;
    });
    setProgressState(initialProgress);
    setModuleLoadingState(initialModuleLoading);

    // Dispatch current merged snapshot to Redux after each region completes for any module.
    const dispatchSnapshot = () => {
      const mergedResults = mergeModuleResults(acc.bp, acc.wp, acc.bpco, acc.bpbp, acc.brgy);
      const updatedData = {
        results: mergedResults,
        lguCount: totalLguCount,
        dateRange: { startDate: data.startDate, endDate: data.endDate },
        bpResults: acc.bp,
        wpResults: acc.wp,
        bpcoResults: acc.bpco,
        bpbpResults: acc.bpbp,
      };
      dispatch(setCard(calculateTotals(updatedData)));

      const MAX = 1000;
      const dataToStore = {
        results: mergedResults.length > MAX ? mergedResults.slice(0, MAX) : mergedResults,
        lguCount: totalLguCount,
        dateRange: { startDate: data.startDate, endDate: data.endDate },
        totalResults: mergedResults.length,
        isPartialData: mergedResults.length > MAX,
        bpResults:   acc.bp.length   > MAX ? acc.bp.slice(0, MAX)   : acc.bp,
        wpResults:   acc.wp.length   > MAX ? acc.wp.slice(0, MAX)   : acc.wp,
        bpcoResults: acc.bpco.length > MAX ? acc.bpco.slice(0, MAX) : acc.bpco,
        bpbpResults: acc.bpbp.length > MAX ? acc.bpbp.slice(0, MAX) : acc.bpbp,
        brgyResults: acc.brgy.length > MAX ? acc.brgy.slice(0, MAX) : acc.brgy,
      };
      try {
        dispatch(setTransaction(dataToStore));
      } catch (storageError: any) {
        const handled = handleStorageError(storageError, () => {
          dispatch(setTransaction({
            ...dataToStore,
            results:     dataToStore.results.slice(0, 250),
            bpResults:   acc.bp.slice(0, 250),
            wpResults:   acc.wp.slice(0, 250),
            bpcoResults: acc.bpco.slice(0, 250),
            bpbpResults: acc.bpbp.slice(0, 250),
            brgyResults: acc.brgy.slice(0, 250),
          }));
        });
        if (!handled) console.error("Error storing data", storageError);
      }
    };

    // Fetch one module independently across all regions, updating its own progress bar.
    const fetchModuleIndependently = async (
      moduleKey: string,
      accKey: keyof typeof acc,
      apiUrl: string,
      transform?: (raw: any[]) => any[]
    ) => {
      for (let i = 0; i < locations.length; i++) {
        if (controller.signal.aborted) break;
        const region = locations[i];
        try {
          const res = await axios.post(
            apiUrl,
            { locationName: [region], startDate: data.startDate, endDate: data.endDate },
            { signal: controller.signal }
          );
          const valid = (res?.data?.results || []).filter((r: any) => !r.error);
          const processed = transform ? transform(valid) : valid;
          acc[accKey] = acc[accKey].concat(processed);
          if (res?.data?.lguCount && res.data.lguCount > totalLguCount) {
            totalLguCount = res.data.lguCount;
          }
          dispatchSnapshot();
        } catch (err: any) {
          if (err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled') break;
        }
        // Update this module's indicator independently
        setProgressState(prev => ({
          ...prev,
          [moduleKey]: { currentRegion: region, currentIndex: i + 1, totalRegions },
        }));
        setModuleCounts(prev => ({ ...prev, [moduleKey]: acc[accKey].length }));
      }
      // Mark this module done on its own schedule
      setModuleLoadingState(prev => ({ ...prev, [moduleKey]: false }));
    };

    const processAll = async () => {
      // Reset Redux before starting
      dispatch(setCard({
        totalnewPending: 0, totalnewPaid: 0, totalnewPaidViaEgov: 0,
        totalrenewPending: 0, totalrenewPaid: 0, totalrenewPaidViaEgov: 0,
        totalmalePending: 0, totalmalePaid: 0, totalfemalePending: 0, totalfemalePaid: 0,
        bpTotalnewPending: 0, bpTotalnewPaid: 0, bpTotalnewPaidViaEgov: 0,
        bpTotalrenewPending: 0, bpTotalrenewPaid: 0, bpTotalrenewPaidViaEgov: 0,
        bpTotalmalePending: 0, bpTotalmalePaid: 0, bpTotalfemalePending: 0, bpTotalfemalePaid: 0,
        wpTotalnewPending: 0, wpTotalnewPaid: 0, wpTotalnewPaidViaEgov: 0,
        wpTotalrenewPending: 0, wpTotalrenewPaid: 0, wpTotalrenewPaidViaEgov: 0,
        wpTotalmalePending: 0, wpTotalmalePaid: 0, wpTotalfemalePending: 0, wpTotalfemalePaid: 0,
        bpcoTotalnewPending: 0, bpcoTotalnewPaid: 0, bpcoTotalnewPaidViaEgov: 0,
        bpcoTotalrenewPending: 0, bpcoTotalrenewPaid: 0, bpcoTotalrenewPaidViaEgov: 0,
        bpcoTotalmalePending: 0, bpcoTotalmalePaid: 0, bpcoTotalfemalePending: 0, bpcoTotalfemalePaid: 0,
        bpbpTotalnewPending: 0, bpbpTotalnewPaid: 0, bpbpTotalnewPaidViaEgov: 0,
        bpbpTotalrenewPending: 0, bpbpTotalrenewPaid: 0, bpbpTotalrenewPaidViaEgov: 0,
        bpbpTotalmalePending: 0, bpbpTotalmalePaid: 0, bpbpTotalfemalePending: 0, bpbpTotalfemalePaid: 0,
        bpTotalCitizensServed: 0, wpTotalCitizensServed: 0, bpcoTotalCitizensServed: 0,
        bpbpTotalCitizensServed: 0, brgyTotalCitizensServed: 0, totalCitizensServed: 0,
      }));
      dispatch(setTransaction({
        results: [], lguCount: 0,
        dateRange: { startDate: data.startDate, endDate: data.endDate },
        totalResults: 0, isPartialData: false,
        bpResults: [], wpResults: [], bpcoResults: [], bpbpResults: [],
      }));

      // Build one independent promise per selected module — all run concurrently
      const modulePromises: Promise<void>[] = [];

      if (data.modules?.includes("Business Permit")) {
        modulePromises.push(fetchModuleIndependently(
          "Business Permit", "bp",
          `${import.meta.env.VITE_URL}/api/bp/transaction-count/`
        ));
      }
      if (data.modules?.includes("Working Permit")) {
        modulePromises.push(fetchModuleIndependently(
          "Working Permit", "wp",
          `${import.meta.env.VITE_URL}/api/wp/transaction-count/`
        ));
      }
      if (data.modules?.includes("Certificate of Occupancy")) {
        modulePromises.push(fetchModuleIndependently(
          "Certificate of Occupancy", "bpco",
          `${import.meta.env.VITE_URL}/api/bpco/transaction-count-co`,
          (raw) => raw.map((r: any) => ({
            ...r,
            monthlyResults: r.monthlyResults?.map((m: any) => ({
              ...m, newPaid: m.coPaid || 0, newPending: m.coPending || 0,
              coPaid: m.coPaid || 0, coPending: m.coPending || 0,
            })) || [],
            bpcoTotalCitizensServed: r.TotalCitizensServed,
          }))
        ));
      }
      if (data.modules?.includes("Building Permit")) {
        modulePromises.push(fetchModuleIndependently(
          "Building Permit", "bpbp",
          `${import.meta.env.VITE_URL}/api/bpco/transaction-count-bp`,
          (raw) => raw.map((r: any) => ({
            ...r,
            monthlyResults: r.monthlyResults?.map((m: any) => ({
              ...m,
              newPaid: m.buildingPaid || 0, newPending: m.buildingPending || 0,
              renewPaid: m.renewPaid || 0, renewPending: m.renewPending || 0,
              newPaidViaEgov: m.newPaidViaEgov || 0, renewPaidViaEgov: m.renewPaidViaEgov || 0,
              malePaid: m.malePaid || 0, malePending: m.malePending || 0,
              femalePaid: m.femalePaid || 0, femalePending: m.femalePending || 0,
              buildingPaid: m.buildingPaid || 0, buildingPending: m.buildingPending || 0,
            })) || [],
          }))
        ));
      }
      if (data.modules?.includes("Barangay Clearance")) {
        modulePromises.push(fetchModuleIndependently(
          "Barangay Clearance", "brgy",
          `${import.meta.env.VITE_URL}/api/bc/transaction-count/`
        ));
      }

      try {
        await Promise.all(modulePromises);
        dispatch(setLoad(false));
        setIsLoading(false);
        const isFirstRun = localStorage.getItem('elgu_first_run');
        if (isFirstRun === '0') localStorage.setItem('elgu_first_run', '1');
      } catch (error: any) {
        dispatch(setLoad(false));
        setIsLoading(false);
        controllerRef.current = null;
        setProgressState({});
        setModuleLoadingState({});
        if (!isCancel(error) && error.name !== "CanceledError") {
          console.error("Error fetching transaction data:", error);
          Swal.fire({ icon: "error", title: "Error", text: "Failed to fetch transaction data. Please try again later." });
        }
      }
    };

    processAll();
  }

  useEffect(() => {
    // Event listener for manual filter trigger
    const handleFilterTrigger = () => {
      if (data.locationName.length !== 0 && data.startDate && data.endDate) {
        GetTransaction();
      }
    };

    // Event listener for cancel request
    const handleCancelRequest = () => {
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
      setIsLoading(false);
      dispatch(setLoad(false));
      setProgressState({});
      setModuleLoadingState({});
    };

    // Add event listeners
    window.addEventListener('triggerFilterAPI', handleFilterTrigger);
    window.addEventListener('cancelFilterAPI', handleCancelRequest);

    // Auto-trigger on first run if data is ready
    const isFirstRun = localStorage.getItem('elgu_first_run');
    if ((isFirstRun === null || isFirstRun === '0') && data.locationName.length !== 0 && data.startDate && data.endDate) {
      
      // Small delay to ensure everything is loaded
      setTimeout(() => {
        GetTransaction();
        // Mark as no longer first run
        localStorage.setItem('elgu_first_run', '1');
      }, 1000);
    }

    // Cleanup event listeners
    return () => {
      window.removeEventListener('triggerFilterAPI', handleFilterTrigger);
      window.removeEventListener('cancelFilterAPI', handleCancelRequest);
    };
  }, [data.startDate, data.endDate, data.modules, data.locationName]); // Added data.locationName back to dependencies for auto-trigger

  useEffect(() => {
    // Initialize Google Auth first


    clearStorageIfNeeded();
  
    fetchRegions();
    
    const isFirstRun = localStorage.getItem('elgu_first_run');
    if (isFirstRun === null) {
      localStorage.setItem('elgu_first_run', '0');
    }
  }, []);

  useEffect(() => {
    // Sequential loading with delay to optimize resource usage
    loadModulesSequentially();
  }, []);
  
  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="md:hidden flex w-[300px]  bg-card border-r border-border flex-col">
          <div className="flex justify-center items-center mt-5 border-border">
            <img src={eLGULogo} className="w-[140px]" alt="" />
          </div>
          <nav className="flex flex-col mt-10  ">
            <Link
              to="/elgu/admin/dashboard"
              className={`flex items-center gap-2 ${
                location.pathname === "/elgu/admin/dashboard"
                  ? "text-white bg-[#282b30] font-medium w-full p-2  pl-10 py-5"
                  : "text-secondary-foreground w-full p-2  pl-10 py-5"
              }`}
            >
              <LucideLayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/elgu/admin/report"
              className={`flex items-center gap-2 ${
                location.pathname === "/elgu/admin/report"
                  ? "text-white bg-[#282b30] font-medium w-full p-2  pl-10 py-5 "
                  : "text-secondary-foreground w-full p-2  pl-10 py-5 "
              }`}
            >
              <BarChart3Icon className="w-5 h-5" />
              <span>Reports</span>
            </Link>
            <div className="mt-6 mx-4 border-t border-border" />
            <button
              type="button"
              onClick={() => setManageOpen((p) => !p)}
              className="mt-2 w-full flex items-center justify-between px-4 py-3 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                <Settings2Icon className="w-3.5 h-3.5" />
                <span>Manage</span>
              </div>
              <ChevronRightIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${manageOpen ? 'rotate-90' : ''}`} />
            </button>
            {manageOpen && [
              { to: '/elgu/admin/manage/general',  code: 'GEN',  label: 'General',                             Icon: FileTextIcon },
              { to: '/elgu/admin/manage/epayment', code: 'EPAY', label: 'ePayment',                          Icon: FileTextIcon },
              { to: '/elgu/admin/manage/bp1',  code: 'BP1',  label: 'Business Permit',                    Icon: FileTextIcon },
              { to: '/elgu/admin/manage/wp',   code: 'WP',   label: 'Working Permit',                     Icon: BriefcaseIcon },
              { to: '/elgu/admin/manage/bc',   code: 'BC',   label: 'Barangay Clearance',                 Icon: HomeIcon },
              { to: '/elgu/admin/manage/bpco', code: 'BPCO', label: 'Cert. of Occupancy & Bldg. Permit',  Icon: BuildingIcon },
            ].map(({ to, code, label, Icon }) => {
              const active = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`relative flex items-center gap-3 w-full pl-8 pr-3 py-3 transition-colors ${
                    active
                      ? 'bg-primary/10 text-primary font-semibold'
                      : 'text-secondary-foreground hover:bg-slate-100 hover:text-foreground'
                  }`}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary rounded-r-full" />}
                  <Icon className="w-4 h-4 shrink-0" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm leading-snug truncate">{label}</span>
                    <span className={`text-[10px] font-normal ${active ? 'text-primary/70' : 'text-slate-400'}`}>{code}</span>
                  </div>
                  {active && <ChevronRightIcon className="w-3.5 h-3.5 ml-auto shrink-0 text-primary/60" />}
                </Link>
              );
            })}
            <div className="mt-6 mx-4 border-t border-border" />
            <Link
              to="/elgu/admin/audit-trail"
              className={`flex items-center gap-2 ${
                location.pathname === "/elgu/admin/audit-trail"
                  ? "text-white bg-[#282b30] font-medium w-full p-2 pl-10 py-5"
                  : "text-secondary-foreground w-full p-2 pl-10 py-5"
              }`}
            >
              <HistoryIcon className="w-5 h-5" />
              <span>Audit Trail</span>
            </Link>
          </nav>

          <div className="mt-auto">
            <div className="px-4 pb-2">
              <button
                onClick={() => {
                  localStorage.removeItem('auth_token');
                  localStorage.removeItem('user');
                  navigate('/elgu/login');
                }}
                className="flex items-center gap-2 w-full px-4 py-2.5 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOutIcon className="w-4 h-4" />
                <span>Logout</span>
              </button>
            </div>
            <footer className="p-4 border-t border-border text-sm text-secondary-foreground flex flex-col gap-2 font-medium text-start content-center items-center">
              <p>Developed by:</p>
              <img src={Logo} className="w-[140px] object-contain" alt="" />
            </footer>
          </div>
        </aside>

        {/* Sidebar for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-[999] md:flex hidden">
            <div className="w-[250px] bg-card border-r border-border flex flex-col h-full">
              <div className="flex justify-between items-center mt-5 px-4">
                <img src={eLGULogo} className="w-[120px]" alt="" />
                <button
                  className="p-2"
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                >
                  <XIcon className="w-6 h-6" />
                </button>
              </div>
              <nav className="flex flex-col mt-10 gap-6 ml-10">
                <Link
                  to="/elgu/admin/dashboard"
                  className={`flex items-center gap-2 ${
                    location.pathname === "/elgu/admin/dashboard"
                      ? "text-primary"
                      : "text-secondary-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <LucideLayoutDashboard className="w-5 h-5" />
                  <span>Dashboard</span>
                </Link>
                <Link
                  to="/elgu/admin/report"
                  className={`flex items-center gap-2 ${
                    location.pathname === "/elgu/admin/report"
                      ? "text-primary"
                      : "text-secondary-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <BarChart3Icon className="w-5 h-5" />
                  <span>Reports</span>
                </Link>
                <div className="border-t border-border pt-2">
                  <button
                    type="button"
                    onClick={() => setManageOpen((p) => !p)}
                    className="w-full flex items-center justify-between px-2 py-2.5 rounded-lg hover:bg-slate-100 transition-colors mb-1"
                  >
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
                      <Settings2Icon className="w-3.5 h-3.5" />
                      <span>Manage</span>
                    </div>
                    <ChevronRightIcon className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${manageOpen ? 'rotate-90' : ''}`} />
                  </button>
                  {manageOpen && [
                    { to: '/elgu/admin/manage/general',  code: 'GEN',  label: 'General',                            Icon: FileTextIcon },
                    { to: '/elgu/admin/manage/epayment', code: 'EPAY', label: 'ePayment',                         Icon: FileTextIcon },
                    { to: '/elgu/admin/manage/bp1',  code: 'BP1',  label: 'Business Permit',                   Icon: FileTextIcon },
                    { to: '/elgu/admin/manage/wp',   code: 'WP',   label: 'Working Permit',                    Icon: BriefcaseIcon },
                    { to: '/elgu/admin/manage/bc',   code: 'BC',   label: 'Barangay Clearance',                Icon: HomeIcon },
                    { to: '/elgu/admin/manage/bpco', code: 'BPCO', label: 'Cert. of Occupancy & Bldg. Permit', Icon: BuildingIcon },
                  ].map(({ to, code, label, Icon }) => {
                    const active = location.pathname === to;
                    return (
                      <Link
                        key={to}
                        to={to}
                        onClick={() => setSidebarOpen(false)}
                        className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-colors mb-1 ${
                          active ? 'bg-primary/10 text-primary font-semibold' : 'text-secondary-foreground hover:bg-slate-100'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm leading-snug font-medium truncate">{label}</span>
                          <span className="text-[10px] text-slate-400">{code}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="border-t border-border mt-2 pt-2">
                  <Link
                    to="/elgu/admin/audit-trail"
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-2 py-2 px-3 rounded-lg transition-colors ${
                      location.pathname === '/elgu/admin/audit-trail'
                        ? 'text-primary font-semibold'
                        : 'text-secondary-foreground hover:bg-slate-100'
                    }`}
                  >
                    <HistoryIcon className="w-5 h-5" />
                    <span>Audit Trail</span>
                  </Link>
                </div>
                <div className="px-3 pb-2 pt-2 border-t border-border mt-2">
                  <button
                    onClick={() => {
                      localStorage.removeItem('auth_token');
                      localStorage.removeItem('user');
                      navigate('/elgu/login');
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOutIcon className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              </nav>
            </div>
            <div
              className="flex-1 bg-black bg-opacity-40"
              onClick={() => setSidebarOpen(false)}
            />
          </div>
        )}

        <div className="flex flex-col flex-1 overflow-hidden">
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
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto bg-background">
            <Outlet />
          </div>
        </div>
      </div>

  {/* Progress indicator (Dashboard only) */}
  {location.pathname === "/elgu/admin/dashboard" && (
    <DashboardProgressIndicator
      isLoading={isLoading}
      progress={progressState}
      counts={moduleCounts}
      moduleLoading={moduleLoadingState}
      onCancel={() => {
        if (controllerRef.current) {
          controllerRef.current.abort();
          controllerRef.current = null;
        }
        setIsLoading(false);
        dispatch(setLoad(false));
        setProgressState({});
        setModuleLoadingState({});
      }}
    />
  )}
    </ThemeProvider>
  );
}

export default Admin;
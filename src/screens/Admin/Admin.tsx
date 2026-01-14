import {
  LucideLayoutDashboard,
  BarChart3Icon,
  MenuIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import Logo from './../../assets/logo/dict-logo.png'
import { useEffect, useRef, useState } from "react";

import eLGULogo from "./../../assets/logo/lgu-logo.png";
import { Link, Outlet } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
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
import { setWp, selectWp } from '@/redux/wpSlice';
import { setBrgy, selectBrgy } from '@/redux/brgySlice';
import { setStatus } from '@/redux/statusSlice';
import axios2, { initializeGoogleAuth, loginWithGoogle, isGoogleAuthenticated } from "./../../plugin/axios2";

const regionMapping = [
  { id: "region1", text: "I", municipalities: [] },
  { id: "region2", text: "II", municipalities: [] },
  { id: "region3", text: "III", municipalities: [] },
  { id: "region4a", text: "IV-A", municipalities: [] },
  { id: "region5", text: "V", municipalities: [] },
  { id: "CAR", text: "CAR", municipalities: [] },
  { id: "region4b", text: "IV-B", municipalities: [] },
  { id: "region7", text: "VII", municipalities: [] },
  { id: "region8", text: "VIII", municipalities: [] },
  { id: "region6", text: "VI", municipalities: [] },
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
  ["VI", "IX", "X", "XI", "XII"],
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
      )
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
    } else {
      mergedMap.set(wpLgu.lgu, {
        lgu: wpLgu.lgu,
        region: wpLgu.region,
        monthlyResults: wpLgu.monthlyResults.map((month: any) => 
          mergeMonthData({ ...createDefaultMonth(), month: month.month }, month, 'wp')
        )
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
    } else {
      mergedMap.set(bpcoLgu.lgu, {
        lgu: bpcoLgu.lgu,
        region: bpcoLgu.region,
        monthlyResults: bpcoLgu.monthlyResults.map((month: any) => 
          mergeMonthData({ ...createDefaultMonth(), month: month.month }, month, 'bpco')
        )
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
    } else {
      mergedMap.set(bpbpLgu.lgu, {
        lgu: bpbpLgu.lgu,
        region: bpbpLgu.region,
        monthlyResults: bpbpLgu.monthlyResults.map((month: any) => 
          mergeMonthData({ ...createDefaultMonth(), month: month.month }, month, 'bpbp')
        )
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
        }))
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
  };

  data.results.forEach((lgu: any) => {
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

  return totals;
};

function Admin() {



  const location = useLocation();
  const dispatch = useDispatch();

  const data = useSelector(selectData);
  const wp = useSelector(selectWp);
  const brgy = useSelector(selectBrgy);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Controllers for status data fetching
  const bpControllerRef = useRef<AbortController | null>(null);
  const wpControllerRef = useRef<AbortController | null>(null);
  const brgyControllerRef = useRef<AbortController | null>(null);
  const bpcoControllerRef = useRef<AbortController | null>(null);

  // Helper function to reset first run flag (useful for testing)
  const resetFirstRun = () => {
    localStorage.setItem('elgu_first_run', '0');
    console.log('First run flag reset - will auto-trigger on next page load');
  };

  // Make resetFirstRun available globally for testing
  (window as any).resetFirstRun = resetFirstRun;

  const [regionStats, setRegionStats] = useState<any[]>([]);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(isGoogleAuthenticated());

  function fetchRegions() {
    dispatch(setLoad(true));
    axios
      .get(`${import.meta.env.VITE_URL}/api/bp/lgu-list/`)
      .then((response) => {
        const updatedRegions = regionMapping.map((region: any) => {
          return {
            id: region.id,
            text: region.text,
            municipalities: response.data?.[region.id],
          };
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
  const regionMap: Record<string, string> = {
    R1: "region1",
    R2: "region2", 
    R3: "region3",
    R4A: "region4a",
    R4B: "region4b",
    R5: "region5",
    R6: "region6",
    R7: "region7",
    R8: "region8",
    R9: "region9",
    R10: "region10",
    R11: "region11",
    R12: "region12",
    R13: "region13",
    CAR: "CAR",
    "BARMM I": "BARMM1",
    "BARMM II": "BARMM2",
  };

  function mapRegion(region: string): string {
    if (!region) return ''; // Handle undefined/null/empty regions
    return regionMap[region] || region.toLowerCase().replace(/\s+/g, '');
  }

  function getWP() {
    // Cancel previous request if exists
    if (wpControllerRef.current) {
      wpControllerRef.current.abort();
    }
    
    // Create new controller
    wpControllerRef.current = new AbortController();

    // Fetch both 2024 and 2025 data
    return Promise.all([
      axios2.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/WP UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: wpControllerRef.current.signal
      }),
      axios2.get('1Po3nyGoTmJ2OLRuYF1GBdfasLfaccRrumaoqIwoF6C0/values/WP UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: wpControllerRef.current.signal
      })
    ]).then((responses) => {
      const combinedGroupedByMonth: Record<string, Record<string, any>> = {};

      // Process both datasets
      responses.forEach((response) => {
        const data = response.data.values;
        const records = data.slice(3);

        // Map column indexes for easier maintenance
        const idx = {
          period: 1,
          lgu: 4,
          name: 13,
          province: 14,
          dictRo: 18,
          status: 10,
        };

        // Group by period and dictRo, and sum statuses
        records.forEach((row: any) => {
          const period = row[idx.period];
          const lgu = row[idx.lgu];
          const region = mapRegion(row[idx.dictRo]);
          const name = row[idx.name];
          const province = row[idx.province];
          const status = (row[idx.status] || '').toLowerCase();

          if (!period || !lgu || !region) return; // Skip invalid entries

          if (!combinedGroupedByMonth[period]) combinedGroupedByMonth[period] = {};
          if (!combinedGroupedByMonth[period][lgu]) {
            combinedGroupedByMonth[period][lgu] = {
              lgu,
              period,
              region,
              name,
              province,
              operational: 0,
              developmental: 0,
              withdraw: 0,
            };
          }

          // Aggregate data from both years for the same period and LGU
          if (status.includes('operational')) combinedGroupedByMonth[period][lgu].operational += 1;
          else if (status.includes('developmental')) combinedGroupedByMonth[period][lgu].developmental += 1;
          else if (status.includes('withdraw')) combinedGroupedByMonth[period][lgu].withdraw += 1;
        });
      });

      // Format result with only essential data to reduce storage size
      const WP = Object.entries(combinedGroupedByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, lgus]) => ({
          date,
          data: Object.values(lgus).map((item: any) => ({
            lgu: item.lgu,
            region: item.region,
            province: item.province,
            operational: item.operational,
            developmental: item.developmental,
            withdraw: item.withdraw,
          })),
        }));

      const result = { WP };

      dispatch(setWp({
        ...wp,
        WP: result.WP,
      }));
      
    }).catch((error) => {
      if (error.name !== 'AbortError') { // Don't log aborted requests
        console.error("Error fetching WP data:", error);
      }
    });
  }

  function getBRGY() {
    // Cancel previous request if exists
    if (brgyControllerRef.current) {
      brgyControllerRef.current.abort();
    }
    
    // Create new controller
    brgyControllerRef.current = new AbortController();

    // Fetch both 2024 and 2025 data
    return Promise.all([
      axios2.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/BC UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: brgyControllerRef.current.signal
      }),
      axios2.get('1Po3nyGoTmJ2OLRuYF1GBdfasLfaccRrumaoqIwoF6C0/values/BC UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: brgyControllerRef.current.signal
      })
    ]).then((responses) => {
      const combinedGroupedByMonth: Record<string, Record<string, any>> = {};

      // Process both datasets
      responses.forEach((response) => {
        const data = response.data.values;
        const records = data.slice(3);

        // Map column indexes for easier maintenance
        const idx = {
          period: 1,
          lgu: 4,
          name: 13,
          province: 14,
          dictRo: 18, // Use dictRo as region
          status: 10, // e.g. "Operational", "Developmental", "Training", "Withdraw"
        };

        // Group by period and dictRo, and sum statuses
        records.forEach((row: any) => {
          const period = row[idx.period];
          const lgu = row[idx.lgu];
          const region = mapRegion(row[idx.dictRo]);
          const name = row[idx.name];
          const province = row[idx.province];
          const status = (row[idx.status] || '').toLowerCase();

          if (!period || !lgu || !region) return; // Skip invalid entries

          if (!combinedGroupedByMonth[period]) combinedGroupedByMonth[period] = {};
          if (!combinedGroupedByMonth[period][lgu]) {
            combinedGroupedByMonth[period][lgu] = {
              lgu,
              period,
              region,
              name,
              province,
              operational: 0,
              developmental: 0,
              withdraw: 0,
            };
          }

          // Aggregate data from both years for the same period and LGU
          if (status.includes('operational')) combinedGroupedByMonth[period][lgu].operational += 1;
          else if (status.includes('developmental')) combinedGroupedByMonth[period][lgu].developmental += 1;
          else if (status.includes('withdraw')) combinedGroupedByMonth[period][lgu].withdraw += 1;
        });
      });

      // Format result with only essential data to reduce storage size
      const BRGY = Object.entries(combinedGroupedByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, lgus]) => ({
          date,
          data: Object.values(lgus).map((item: any) => ({
            lgu: item.lgu,
            region: item.region,
            province: item.province,
            operational: item.operational,
            developmental: item.developmental,
            withdraw: item.withdraw,
          })),
        }));

      const result = { BRGY };

      dispatch(setBrgy({
        ...brgy,
        BRGY: result.BRGY,
      }));
      
    }).catch((error) => {
      if (error.name !== 'AbortError') { // Don't log aborted requests
        console.error("Error fetching BRGY data:", error);
      }
    });
  }

  function getBPLS() {
    // Cancel previous request if exists
    if (bpControllerRef.current) {
      bpControllerRef.current.abort();
    }
    
    // Create new controller
    bpControllerRef.current = new AbortController();
    
    // Fetch both 2024 and 2025 data
    return Promise.all([
      axios2.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/BP1 UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: bpControllerRef.current.signal
      }),
      axios2.get('1Po3nyGoTmJ2OLRuYF1GBdfasLfaccRrumaoqIwoF6C0/values/BP1 UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: bpControllerRef.current.signal
      })
    ]).then((responses) => {
      const combinedGroupedByMonth: Record<string, Record<string, any>> = {};

      // Process both datasets
      responses.forEach((response) => {
        const data = response.data.values;
        const records = data.slice(3);

        // Map column indexes for easier maintenance
        const idx = {
          period: 1,
          lgu: 4,
          name: 13,
          province: 14,
          dictRo: 19, // Use dictRo as region
          status: 10, // e.g. "Operational", "Developmental", "Training", "Withdraw"
        };

        // Group by period and dictRo, and sum statuses
        records.forEach((row: any) => {
          const period = row[idx.period];
          const lgu = row[idx.lgu];
          const region = mapRegion(row[idx.dictRo]);
          const name = row[idx.name];
          const province = row[idx.province];
          const status = (row[idx.status] || '').toLowerCase();

          if (!period || !lgu || !region) return; // Skip invalid entries

          if (!combinedGroupedByMonth[period]) combinedGroupedByMonth[period] = {};
          if (!combinedGroupedByMonth[period][lgu]) {
            combinedGroupedByMonth[period][lgu] = {
              lgu,
              period,
              region,
              name,
              province,
              operational: 0,
              developmental: 0,
              withdraw: 0,
            };
          }

          // Aggregate data from both years for the same period and LGU
          if (status.includes('operational')) combinedGroupedByMonth[period][lgu].operational += 1;
          else if (status.includes('developmental')) combinedGroupedByMonth[period][lgu].developmental += 1;
          else if (status.includes('withdraw')) combinedGroupedByMonth[period][lgu].withdraw += 1;
        });
      });

      // Format result with only essential data to reduce storage size
      const BP = Object.entries(combinedGroupedByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, lgus]) => ({
          date,
          data: Object.values(lgus).map((item: any) => ({
            lgu: item.lgu,
            region: item.region,
            province: item.province,
            operational: item.operational,
            developmental: item.developmental,
            withdraw: item.withdraw,
          })),
        }));

      const result = { BP };

      dispatch(setStatus({
        BP: result.BP,
      }));
      
    }).catch((error) => {
      if (error.name !== 'AbortError') { // Don't log aborted requests
        console.error("Error fetching BP data:", error);
      }
    });
  }

  function getBPCO(){
    // Cancel previous request if exists
    if (bpcoControllerRef.current) {
      bpcoControllerRef.current.abort();
    }
    
    // Create new controller
    bpcoControllerRef.current = new AbortController();

    // Fetch both 2024 and 2025 data
    return Promise.all([
      axios2.get('18kaPQlN0_kA9i7YAD-DftbdVPZX35Qf33sVMkw_TcWc/values/BPCO UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: bpcoControllerRef.current.signal
      }),
      axios2.get('1Po3nyGoTmJ2OLRuYF1GBdfasLfaccRrumaoqIwoF6C0/values/BPCO UR Input', {
        headers: {
          Authorization: `Token ${import.meta.env.VITE_TOKEN}`,
        },
        signal: bpcoControllerRef.current.signal
      })
    ]).then((responses) => {
      const combinedGroupedByMonth: Record<string, Record<string, any>> = {};

      // Process both datasets
      responses.forEach((response) => {
        const data = response.data.values;
        const records = data.slice(3);

        // Map column indexes for easier maintenance
        const idx = {
          period: 1,
          lgu: 4,
          name: 13,
          province: 14,
          dictRo: 18, // Use dictRo as region
          status: 10, // e.g. "Operational", "Developmental", "Training", "Withdraw"
        };

        // Group by period and dictRo, and sum statuses
        records.forEach((row: any) => {
          const period = row[idx.period];
          const lgu = row[idx.lgu];
          const region = mapRegion(row[idx.dictRo]);
          const name = row[idx.name];
          const province = row[idx.province];
          const status = (row[idx.status] || '').toLowerCase();

          if (!period || !lgu || !region) return; // Skip invalid entries

          if (!combinedGroupedByMonth[period]) combinedGroupedByMonth[period] = {};
          if (!combinedGroupedByMonth[period][lgu]) {
            combinedGroupedByMonth[period][lgu] = {
              lgu,
              period,
              region,
              name,
              province,
              operational: 0,
              developmental: 0,
              withdraw: 0,
            };
          }

          // Aggregate data from both years for the same period and LGU
          if (status.includes('operational')) combinedGroupedByMonth[period][lgu].operational += 1;
          else if (status.includes('developmental')) combinedGroupedByMonth[period][lgu].developmental += 1;
          else if (status.includes('withdraw')) combinedGroupedByMonth[period][lgu].withdraw += 1;
        });
      });

      // Format result with only essential data to reduce storage size
      const BPCO = Object.entries(combinedGroupedByMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, lgus]) => ({
          date,
          data: Object.values(lgus).map((item: any) => ({
            lgu: item.lgu,
            region: item.region,
            province: item.province,
            operational: item.operational,
            developmental: item.developmental,
            withdraw: item.withdraw,
          })),
        }));

      const result = { BPCO };

      dispatch(setStatus({
        BPCO: result.BPCO,
      }));
      
    }).catch((error) => {
      if (error.name !== 'AbortError') { // Don't log aborted requests
        console.error("Error fetching BPCO data:", error);
      }
    });
  }

  const loadModulesSequentially = async () => {
    // Set loading to true at the start
    dispatch(setLoad2(true));
    
    // Small delay to prevent overwhelming the system
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    try {
      await getBPLS();
      await delay(500); // 500ms delay after BPLS
      
      await getWP();
      await delay(500); // 500ms delay after WP
      
      await getBRGY();
      await delay(500); // 500ms delay after BRGY
      
      await getBPCO();
    } catch (error) {
      console.error("Error in sequential loading:", error);
    } finally {
      // Always set loading to false at the end
      dispatch(setLoad2(false));
    }
  };

  const BATCH_SIZE = 1; // Process 1 region at a time (reverted back to original working setting)

  function GetTransaction() {
    dispatch(setLoad(true));
    setIsLoading(true);

    // Abort previous request if exists
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    // Split data.real into smaller batches
    const locations: string[] = Array.isArray(data.real) ? data.real : [data.real];
    const totalRegions = locations.length;
    const batches: string[][] = [];
    
    for (let i = 0; i < locations.length; i += BATCH_SIZE) {
      batches.push(locations.slice(i, i + BATCH_SIZE));
    }

    // Initialize results for each module
    let allBPResults: any[] = [];
    let allWPResults: any[] = [];
    let allBPCOResults: any[] = [];
    let allBPBPResults: any[] = [];
    let allBRGYResults: any[] = [];
    let totalLguCount = 0;
    let processedRegions = 0;

    const processBatch = async (batch: string[], batchIndex: number) => {
      try {
        const requests = [];
        
        // Check which modules are enabled and make appropriate API calls
        if (data.modules?.includes("Business Permit")) {
          requests.push(
            axios.post(
              `${import.meta.env.VITE_URL}/api/bp/transaction-count/`,
              {
                locationName: batch,
                startDate: data.startDate,
                endDate: data.endDate,
              },
              { signal: controller.signal }
            ).then(response => ({ type: 'bp', data: response.data }))
          );
        }

        if (data.modules?.includes("Working Permit")) {
          requests.push(
            axios.post(
              `${import.meta.env.VITE_URL}/api/wp/transaction-count/`,
              {
                locationName: batch,
                startDate: data.startDate,
                endDate: data.endDate,
              },
              { signal: controller.signal }
            ).then(response => ({ type: 'wp', data: response.data }))
          );
        }

        if (data.modules?.includes("Certificate of Occupancy")) {
          requests.push(
            axios.post(
              `${import.meta.env.VITE_URL}/api/bpco/transaction-count-co`,
              {
                locationName: batch,
                startDate: data.startDate,
                endDate: data.endDate,
              },
              { signal: controller.signal }
            ).then(response => ({ type: 'bpco', data: response.data }))
          );
        }

        if (data.modules?.includes("Building Permit")) {
          requests.push(
            axios.post(
              `${import.meta.env.VITE_URL}/api/bpco/transaction-count-bp`,
              {
                locationName: batch,
                startDate: data.startDate,
                endDate: data.endDate,
              },
              { signal: controller.signal }
            ).then(response => ({ type: 'bpbp', data: response.data }))
          );
        }

        if (data.modules?.includes("Barangay Clearance")) {
          requests.push(
            axios.post(
              `${import.meta.env.VITE_URL}/api/bc/transaction-count/`,
              {
                locationName: batch,
                startDate: data.startDate,
                endDate: data.endDate,
              },
              { signal: controller.signal }
            ).then(response => ({ type: 'brgy', data: response.data }))
          );
        }

        // Execute all requests in parallel
        const responses = await Promise.all(requests);

        // Process responses
        responses.forEach(response => {
          if (response.type === 'bp') {
            // Filter out results with errors
            const validResults = (response.data.results || []).filter((result: any) => !result.error);
            if (validResults.length < (response.data.results || []).length) {
              console.warn(`BP: Filtered out ${(response.data.results || []).length - validResults.length} results with errors`);
            }
            allBPResults = allBPResults.concat(validResults);
          } else if (response.type === 'wp') {
            // Filter out results with errors
            const validResults = (response.data.results || []).filter((result: any) => !result.error);
            if (validResults.length < (response.data.results || []).length) {
              console.warn(`WP: Filtered out ${(response.data.results || []).length - validResults.length} results with errors`);
            }
            allWPResults = allWPResults.concat(validResults);
          } else if (response.type === 'bpco') {
            // Filter out results with errors first
            const validResults = (response.data.results || []).filter((result: any) => !result.error);
            if (validResults.length < (response.data.results || []).length) {
              console.warn(`BPCO: Filtered out ${(response.data.results || []).length - validResults.length} results with errors`);
            }
            // Map coPaid → newPaid, coPending → newPending for BPCO
            const mappedResults = validResults.map((result: any) => ({
              ...result,
              monthlyResults: result.monthlyResults?.map((month: any) => ({
                ...month,
                newPaid: month.coPaid || 0,
                newPending: month.coPending || 0,
                // Keep original fields for completeness
                coPaid: month.coPaid || 0,
                coPending: month.coPending || 0
              })) || []
            }));
            allBPCOResults = allBPCOResults.concat(mappedResults);
          } else if (response.type === 'bpbp') {
            // Filter out results with errors first
            const validResults = (response.data.results || []).filter((result: any) => !result.error);
            if (validResults.length < (response.data.results || []).length) {
              console.warn(`BPBP: Filtered out ${(response.data.results || []).length - validResults.length} results with errors`);
            }
            // Map buildingPaid → newPaid, buildingPending → newPending for BPBP
            const mappedResults = validResults.map((result: any) => ({
              ...result,
              monthlyResults: result.monthlyResults?.map((month: any) => ({
                ...month,
                newPaid: month.buildingPaid || 0, // Map buildingPaid to newPaid for BPBP
                newPending: month.buildingPending || 0,
                renewPaid: month.renewPaid || 0,
                renewPending: month.renewPending || 0,
                newPaidViaEgov: month.newPaidViaEgov || 0,
                renewPaidViaEgov: month.renewPaidViaEgov || 0,
                malePaid: month.malePaid || 0,
                malePending: month.malePending || 0,
                femalePaid: month.femalePaid || 0,
                femalePending: month.femalePending || 0,
                // Keep original fields for completeness
                buildingPaid: month.buildingPaid || 0,
                buildingPending: month.buildingPending || 0
              })) || []
            }));
            allBPBPResults = allBPBPResults.concat(mappedResults);
          } else if (response.type === 'brgy') {
            // Filter out results with errors
            const validResults = (response.data.results || []).filter((result: any) => !result.error);
            if (validResults.length < (response.data.results || []).length) {
              console.warn(`BRGY: Filtered out ${(response.data.results || []).length - validResults.length} results with errors`);
            }
            // Process Barangay Clearance data - use as-is since it should already have the correct structure
            allBRGYResults = allBRGYResults.concat(validResults);
          }
          
          if (response.data.lguCount && response.data.lguCount > totalLguCount) {
            totalLguCount = response.data.lguCount;
          }
        });
        
        // Update processed regions count
        processedRegions += batch.length;

        // Merge results from all modules by LGU
        const mergedResults = mergeModuleResults(allBPResults, allWPResults, allBPCOResults, allBPBPResults, allBRGYResults);

        // Update state after each batch completion
        const updatedData = {
          results: mergedResults,
          lguCount: totalLguCount,
          dateRange: {
            startDate: data.startDate,
            endDate: data.endDate,
          },
          bpResults: allBPResults,
          wpResults: allWPResults,
          bpcoResults: allBPCOResults,
          bpbpResults: allBPBPResults
        };

        const totals = calculateTotals(updatedData);
        dispatch(setCard(totals));
        
        // Keep the full data but limit the size to prevent QuotaExceededError
        // Increased limit and using slice(0, maxResultsToStore) to keep the FIRST items, not the last ones
        const maxResultsToStore = 1000; // Increased from 500 to 1000
        const resultsToStore = mergedResults.length > maxResultsToStore 
          ? mergedResults.slice(0, maxResultsToStore) // Keep FIRST items, not last
          : mergedResults;
        
        const dataToStore = {
          results: resultsToStore,
          lguCount: totalLguCount,
          dateRange: {
            startDate: data.startDate,
            endDate: data.endDate,
          },
          totalResults: mergedResults.length,
          isPartialData: mergedResults.length > maxResultsToStore,
          bpResults: allBPResults.length > maxResultsToStore ? allBPResults.slice(0, maxResultsToStore) : allBPResults, // Keep FIRST items
          wpResults: allWPResults.length > maxResultsToStore ? allWPResults.slice(0, maxResultsToStore) : allWPResults, // Keep FIRST items
          bpcoResults: allBPCOResults.length > maxResultsToStore ? allBPCOResults.slice(0, maxResultsToStore) : allBPCOResults, // Keep FIRST items
          bpbpResults: allBPBPResults.length > maxResultsToStore ? allBPBPResults.slice(0, maxResultsToStore) : allBPBPResults, // Keep FIRST items
          brgyResults: allBRGYResults.length > maxResultsToStore ? allBRGYResults.slice(0, maxResultsToStore) : allBRGYResults  // Keep FIRST items
        };
        
        try {
          dispatch(setTransaction(dataToStore));
        } catch (error: any) {
          // Use the storage utility to handle quota errors
          const handled = handleStorageError(error, () => {
            // Fallback: try with smaller dataset - keep FIRST items, not last
            const smallerData = {
              ...dataToStore,
              results: resultsToStore.slice(0, 250), // Keep FIRST 250 items
              bpResults: allBPResults.slice(0, 250), // Keep FIRST 250 items
              wpResults: allWPResults.slice(0, 250), // Keep FIRST 250 items
              bpcoResults: allBPCOResults.slice(0, 250), // Keep FIRST 250 items
              bpbpResults: allBPBPResults.slice(0, 250), // Keep FIRST 250 items
              brgyResults: allBRGYResults.slice(0, 250)  // Keep FIRST 250 items
            };
            dispatch(setTransaction(smallerData));
          });
          
          if (!handled) {
            console.error("Error storing data", error);
            throw error;
          }
        }

        
        setRegionStats([processedRegions,totalRegions])
      } catch (error: any) {
        if (axios.isCancel(error) || error.name === "CanceledError") {
          throw error; // Re-throw cancellation errors
        } else {
          console.error(`Error in batch ${batchIndex + 1} (${batch.join(', ')}):`, error);
          throw error;
        }
      }
    };

    // Process all batches sequentially (one after another)
    const processAllBatches = async () => {
      try {
        // Clear existing data before starting
        dispatch(setCard({
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
        }));
        dispatch(setTransaction({
          results: [],
          lguCount: 0,
          dateRange: {
            startDate: data.startDate,
            endDate: data.endDate,
          },
          totalResults: 0,
          isPartialData: false,
          bpResults: [],
          wpResults: [],
          bpcoResults: [],
          bpbpResults: []
        }));

        

        for (let i = 0; i < batches.length; i++) {
          if (controller.signal.aborted) {
            throw new Error("Request was aborted");
          }
          await processBatch(batches[i], i);
        }

        dispatch(setLoad(false));
        setIsLoading(false);
        console.log(`All ${totalRegions} regions completed successfully!`);
        
        // Mark first run as complete if it was a first run
        const isFirstRun = localStorage.getItem('elgu_first_run');
        if (isFirstRun === '0') {
          localStorage.setItem('elgu_first_run', '1');
          console.log('First run completed, marked as done');
        }

      } catch (error: any) {
        dispatch(setLoad(false));
        setIsLoading(false);
        controllerRef.current = null;
        
        if (axios.isCancel(error) || error.name === "CanceledError") {
          console.warn("Transaction request was canceled.");
          // Don't show error popup for user-initiated cancellations
          return;
        } else {
          console.error("Error fetching transaction data:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to fetch transaction data. Please try again later.",
          });
        }
      }
    };

    processAllBatches();
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
      console.log("Request canceled by user");
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
    const setupGoogleAuth = async () => {
      try {
        await initializeGoogleAuth();
        setIsGoogleLoggedIn(isGoogleAuthenticated());
      } catch (error) {
        console.error("Google Auth initialization error:", error);
      }
    };

    clearStorageIfNeeded();
    setupGoogleAuth();
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
  
 const locations: string[] = Array.isArray(data.real) ? data.real : [data.real];
const totalRegions = locations.length;
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
          </nav>

           <footer className="mt-auto p-4 border-t border-border text-sm text-secondary-foreground flex flex-col gap-2 font-medium text-start content-center items-center">
               <p> Developed by:</p> 

               <img src={Logo} className=" w-[140px] object-contain" alt="" />
              </footer>
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
                {!isGoogleLoggedIn && (
                  <button
                    onClick={async () => {
                      try {
                        await loginWithGoogle();
                        setIsGoogleLoggedIn(true);
                        console.log("✓ Successfully logged in to Google");
                      } catch (error) {
                        console.error("Login failed:", error);
                      }
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm"
                  >
                    Login with Google
                  </button>
                )}
                {isGoogleLoggedIn && (
                  <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                    <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                    Google Authenticated
                  </div>
                )}
              </div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto bg-background">
            <Outlet />
          </div>
        </div>
      </div>

  {/* Floating Cancel Button (Dashboard only) */}
  {isLoading && location.pathname === "/elgu/admin/dashboard" && (
        <button
          onClick={() => {
            if (controllerRef.current) {
              controllerRef.current.abort();
              controllerRef.current = null;
            }
            setIsLoading(false);
            dispatch(setLoad(false));
            // Clear any in-progress data
            console.log("Request canceled by user");
            Swal.fire({
              icon: "info",
              title: "Canceled",
              text: "Data loading has been canceled.",
              timer: 2000,
              showConfirmButton: false
            });
          }}
          className="fixed bottom-4 text-xs right-4 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-full shadow-lg z-50"
        >
          Cancel Request ({regionStats[0] ? regionStats[0] : 0} / {totalRegions})  <Loader2Icon className="inline w-4 h-4 animate-spin ml-2" />
        </button>
      )}
    </ThemeProvider>
  );
}

export default Admin;
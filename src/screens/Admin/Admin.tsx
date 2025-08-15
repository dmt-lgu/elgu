import {
  LucideLayoutDashboard,
  BarChart3Icon,
  MenuIcon,
  XIcon,
  Loader2Icon,
} from "lucide-react";
import { useLocation } from "react-router-dom";
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
}

const mergeModuleResults = (bpResults: any[], wpResults: any[]): any[] => {
  const mergedMap = new Map();

  // Add BP results
  bpResults.forEach(bpLgu => {
    mergedMap.set(bpLgu.lgu, {
      lgu: bpLgu.lgu,
      region: bpLgu.region,
      monthlyResults: bpLgu.monthlyResults.map((month: any) => ({
        ...month,
        bpNewPending: month.newPending,
        bpNewPaid: month.newPaid,
        bpNewPaidViaEgov: month.newPaidViaEgov || 0,
        bpRenewPending: month.renewPending,
        bpRenewPaid: month.renewPaid,
        bpRenewPaidViaEgov: month.renewPaidViaEgov || 0,
        bpMalePending: month.malePending,
        bpMalePaid: month.malePaid,
        bpFemalePending: month.femalePending,
        bpFemalePaid: month.femalePaid,
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
      }))
    });
  });

  // Add WP results
  wpResults.forEach(wpLgu => {
    const existing = mergedMap.get(wpLgu.lgu);
    if (existing) {
      // Merge with existing BP data
      existing.monthlyResults = existing.monthlyResults.map((month: any) => {
        const wpMonth = wpLgu.monthlyResults.find((wp: any) => wp.month === month.month);
        if (wpMonth) {
          return {
            ...month,
            wpNewPending: wpMonth.newPending,
            wpNewPaid: wpMonth.newPaid,
            wpNewPaidViaEgov: wpMonth.newPaidViaEgov || 0,
            wpRenewPending: wpMonth.renewPending,
            wpRenewPaid: wpMonth.renewPaid,
            wpRenewPaidViaEgov: wpMonth.renewPaidViaEgov || 0,
            wpMalePending: wpMonth.malePending,
            wpMalePaid: wpMonth.malePaid,
            wpFemalePending: wpMonth.femalePending,
            wpFemalePaid: wpMonth.femalePaid,
          };
        }
        return month;
      });
    } else {
      // Create new entry for WP only
      mergedMap.set(wpLgu.lgu, {
        lgu: wpLgu.lgu,
        region: wpLgu.region,
        monthlyResults: wpLgu.monthlyResults.map((month: any) => ({
          ...month,
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
          wpNewPending: month.newPending,
          wpNewPaid: month.newPaid,
          wpNewPaidViaEgov: month.newPaidViaEgov || 0,
          wpRenewPending: month.renewPending,
          wpRenewPaid: month.renewPaid,
          wpRenewPaidViaEgov: month.renewPaidViaEgov || 0,
          wpMalePending: month.malePending,
          wpMalePaid: month.malePaid,
          wpFemalePending: month.femalePending,
          wpFemalePaid: month.femalePaid,
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

      // Combined totals
      totals.totalnewPending += bpNewPending + wpNewPending;
      totals.totalnewPaid += bpNewPaid + wpNewPaid;
      totals.totalnewPaidViaEgov += bpNewPaidViaEgov + wpNewPaidViaEgov;
      totals.totalrenewPending += bpRenewPending + wpRenewPending;
      totals.totalrenewPaid += bpRenewPaid + wpRenewPaid;
      totals.totalrenewPaidViaEgov += bpRenewPaidViaEgov + wpRenewPaidViaEgov;
      totals.totalmalePending += bpMalePending + wpMalePending;
      totals.totalmalePaid += bpMalePaid + wpMalePaid;
      totals.totalfemalePending += bpFemalePending + wpFemalePending;
      totals.totalfemalePaid += bpFemalePaid + wpFemalePaid;

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
    });
  });

  return totals;
};

function Admin() {
  const location = useLocation();
  const dispatch = useDispatch();

  const data = useSelector(selectData);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

        // Execute all requests in parallel
        const responses = await Promise.all(requests);

        // Process responses
        responses.forEach(response => {
          if (response.type === 'bp') {
            allBPResults = allBPResults.concat(response.data.results || []);
          } else if (response.type === 'wp') {
            allWPResults = allWPResults.concat(response.data.results || []);
          }
          
          if (response.data.lguCount && response.data.lguCount > totalLguCount) {
            totalLguCount = response.data.lguCount;
          }
        });
        
        // Update processed regions count
        processedRegions += batch.length;

        // Merge results from both modules by LGU
        const mergedResults = mergeModuleResults(allBPResults, allWPResults);

        // Update state after each batch completion
        const updatedData = {
          results: mergedResults,
          lguCount: totalLguCount,
          dateRange: {
            startDate: data.startDate,
            endDate: data.endDate,
          },
          bpResults: allBPResults,
          wpResults: allWPResults
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
          wpResults: allWPResults.length > maxResultsToStore ? allWPResults.slice(0, maxResultsToStore) : allWPResults  // Keep FIRST items
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
              wpResults: allWPResults.slice(0, 250)  // Keep FIRST 250 items
            };
            dispatch(setTransaction(smallerData));
          });
          
          if (!handled) {
            console.error("Error storing data", error);
            throw error;
          }
        }

        console.log(`${processedRegions}/${totalRegions} regions has done - Processing: ${batch.join(', ')}`);

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
          wpResults: []
        }));

        console.log(`Starting batch processing for ${totalRegions} regions: [${locations.join(', ')}]`);

        for (let i = 0; i < batches.length; i++) {
          if (controller.signal.aborted) {
            throw new Error("Request was aborted");
          }
          await processBatch(batches[i], i);
        }

        dispatch(setLoad(false));
        setIsLoading(false);
        console.log(`All ${totalRegions} regions completed successfully!`);

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

    // Cleanup event listeners
    return () => {
      window.removeEventListener('triggerFilterAPI', handleFilterTrigger);
      window.removeEventListener('cancelFilterAPI', handleCancelRequest);
    };
  }, [data.startDate, data.endDate, data.modules]); // Removed data.locationName from dependencies

  useEffect(() => {
    // Clear storage if needed to prevent quota errors
    clearStorageIfNeeded();
    
    fetchRegions();
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex h-screen">
        {/* Sidebar */}
        <aside className="md:hidden flex w-[300px] bg-card border-r border-border flex-col">
          <div className="flex justify-center items-center mt-5 border-border">
            <img src={eLGULogo} className="w-[140px]" alt="" />
          </div>
          <nav className="flex flex-col mt-10 gap-6 ml-10">
            <Link
              to="/elgu/admin/dashboard"
              className={`flex items-center gap-2 ${
                location.pathname === "/elgu/admin/dashboard"
                  ? "text-primary"
                  : "text-secondary-foreground"
              }`}
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
            >
              <BarChart3Icon className="w-5 h-5" />
              <span>Reports</span>
            </Link>
          </nav>
        </aside>

        {/* Sidebar for mobile */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-40 md:flex hidden">
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
              <div className="flex-1 flex justify-end">{/* Right items */}</div>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto bg-background">
            <Outlet />
          </div>
        </div>
      </div>

      {/* Floating Cancel Button */}
      {isLoading && (
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
          Cancel Request  <Loader2Icon className="inline w-4 h-4 animate-spin ml-2" />
        </button>
      )}
    </ThemeProvider>
  );
}

export default Admin;
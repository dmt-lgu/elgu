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

interface MonthlyResult {
  month: string;
  newPending: number;
  newPaid: number;
  newPaidViaEgov: number;
  renewPending: number;
  renewPaid: number;
  renewPaidViaEgov: number;
  malePending: number;
  malePaid: number;
  femalePending: number;
  femalePaid: number;
}

interface LGUData {
  lgu: string;
  monthlyResults: MonthlyResult[];
}

interface TransactionResponse {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  lguCount: number;
  results: LGUData[];
}

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
}

const calculateTotals = (data: TransactionResponse): TotalResults => {
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
  };

  data.results.forEach((lgu) => {
    lgu.monthlyResults.forEach((result) => {
      totals.totalnewPending += result.newPending;
      totals.totalnewPaid += result.newPaid;
      totals.totalnewPaidViaEgov += result.newPaidViaEgov;
      totals.totalrenewPending += result.renewPending;
      totals.totalrenewPaid += result.renewPaid;
      totals.totalrenewPaidViaEgov += result.renewPaidViaEgov;
      totals.totalmalePending += result.malePending;
      totals.totalmalePaid += result.malePaid;
      totals.totalfemalePending += result.femalePending;
      totals.totalfemalePaid += result.femalePaid;
    });
  });

  return totals;
};

function Admin() {
  const location = useLocation();
  const dispatch = useDispatch();

  const data = useSelector(selectData);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

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

  function GetTransaction() {
    dispatch(setLoad(true));
    setIsLoading(true);

    // Abort previous request if exists
    if (controllerRef.current) {
      controllerRef.current.abort();
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    axios
      .post(
        `${import.meta.env.VITE_URL}/api/bp/transaction-count/`,
        {
          locationName: data.real,
          startDate: data.startDate,
          endDate: data.endDate,
        },
        { signal: controller.signal }
      )
      .then((response) => {
        const totals = calculateTotals(response.data);
        dispatch(setCard(totals));
        dispatch(setTransaction(response.data));
        dispatch(setLoad(false));
        setIsLoading(false);
        // console.log("Total results:", totals);
      })
      .catch((error) => {
        if (axios.isCancel(error) || error.name === "CanceledError") {
          console.warn("Transaction request was canceled.");
        } else {
          console.error("Error fetching transaction data:", error);
          Swal.fire({
            icon: "error",
            title: "Error",
            text: "Failed to fetch transaction data. Please try again later.",
          });
        }
        dispatch(setLoad(false));
        setIsLoading(false);
      });
  }

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // console.log("Fetching transaction data with:", {
      //   locationName: data.locationName,
      //   startDate: data.startDate,
      //   endDate: data.endDate,
      // });
      if (data.locationName.length !== 0 && data.startDate && data.endDate) {
        GetTransaction();
      }
    }, 1400);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [data.locationName, data.startDate, data.endDate]);

  useEffect(() => {
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

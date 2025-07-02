import {  LucideLayoutDashboard, BarChart3Icon } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";

import eLGULogo from "./../../assets/logo/lgu-logo.png";
import { Link, Outlet } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import axios from "./../../plugin/axios";
import Swal from "sweetalert2";
import { useSelector, useDispatch,} from 'react-redux';
import { selectRegions, setRegions } from '@/redux/regionSlice';
import { selectData } from "@/redux/dataSlice";
import {  setLoad } from "@/redux/loadSlice";
import { setCard } from "@/redux/cardSlice";
import { setTransaction } from "@/redux/transactionSlice";


// Update the region mapping
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
  { id: "region13", text: "XIII", municipalities: [] }
];

// Add this constant for the grouped display
export const regionGroups = [
  ["I", "II", "III", "IV-A", "V"],
  ["CAR", "NCR", "VII", "VIII"],
  ["VI", "IX", "X", "XI", "XII"],
  ["BARMM I", "BARMM II", "XIII"]
];

// Add this type for better type safety
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

// Add this function to calculate totals
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
    totalfemalePaid: 0
  };

  data.results.forEach(lgu => {
    lgu.monthlyResults.forEach(result => {
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
  const regionss = useSelector(selectRegions);
  const data = useSelector(selectData);

  // Debounce ref
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  function fetchRegions() {
    dispatch(setLoad(true)); // Set loading to true

    axios.get(`${import.meta.env.VITE_URL}/api/bp/lgu-list/`)
      .then(response => {
        const updatedRegions = regionMapping.map((region:any) => {
          return  {
            id: region.id,
            text:region.text, // Use the mapped ID
            municipalities: response.data?.[region.id]
          }
        });
        console.log("Updated regions:", regionss);
        dispatch(setLoad(false));
        dispatch(setRegions(updatedRegions));
      }).catch(error => {
        console.error("Error fetching regions:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to fetch regions. Please try again later.",
        });
      });
  }

  // Update your GetTransaction function
  function GetTransaction() {

    dispatch(setLoad(true));
    axios.post(`${import.meta.env.VITE_URL}/api/bp/transaction-count/`, {
      "locationName": data.real,
      "startDate": data.startDate,
      "endDate": data.endDate
    })
      .then(response => {
        const totals = calculateTotals(response.data);
        dispatch(setCard(totals))
        dispatch(setTransaction(response.data));
        dispatch(setLoad(false)); // Set loading to false after fetching data
        console.log("Total results:", totals);
      })
      .catch(error => {
        console.error("Error fetching transaction data:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "Failed to fetch transaction data. Please try again later.",
        });
      });
  }

  useEffect(() => {
    // Clear previous debounce if exists
    if (debounceRef.current) clearTimeout(debounceRef.current);

    // Set new debounce
    debounceRef.current = setTimeout(() => {
      if (data.locationName.length != 0) {

        GetTransaction();
        
      }
      
    }, 1400); // 500ms debounce, adjust as needed

    // Cleanup on unmount
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [data]);



  useEffect(() => {
    
fetchRegions()
  }, []);



  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="flex h-screen">
        <aside className=" w-[300px] bg-card border-r border-border flex flex-col">
          <div className=" flex  justify-center items-center mt-5 border-border">
            <img
              src={eLGULogo}
              className="w-[140px] object-contain flex self-center"
              alt=""
            />
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
        <div className="flex flex-col flex-1 overflow-hidden">
          <header className=" bg-card border-b h-[50px] border-border ">
            <div className="flex justify-end items-center h-full gap-4 mr-5 ">
              {/* <div className="flex items-center gap-2 text-secondary-foreground">
                <UserCheck2Icon size={20} className=" text-secondary-foreground" />
                <span className="text-sm">Hello, (Admin)</span>
              </div> */}
              <ModeToggle />
            </div>
          </header>
          <div className="flex-1 overflow-y-auto  bg-background">
            <Outlet />
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

export default Admin;

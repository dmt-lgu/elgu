import { UserCheck2Icon, LucideLayoutDashboard, BarChart3Icon } from "lucide-react";
import { useLocation } from "react-router-dom";

import eLGULogo from "./../../assets/logo/lgu-logo.png";
import { Link, Outlet } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";
import axios from "./../../plugin/axios";
import Swal from "sweetalert2";

function Admin() {
  const location = useLocation();


  axios.get("lgu-list/")
    .then(response => {

      console.log("LGU List:", response.data);
      axios.get("municipality-list/")
        .then(regionResponse => {
          console.log("Municipality:", regionResponse.data);
          // You can store the regions in a state or context if needed
        })
        .catch(regionError => {
          Swal.fire({
            icon: "error",
            title: "Error",
            text: regionError.response?.data?.message || "Failed to fetch regions",
            showConfirmButton: false,
          });
        });
    })
    .catch(error => {
      Swal.fire({
        icon: "error",  
        title: "Error",
        text: error.response?.data?.message || "Failed to fetch LGU list",
        showConfirmButton: false,
      });
    });




  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
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
              to="/react-vite-supreme/admin/dashboard"
              className={`flex items-center gap-2 ${
                location.pathname === "/react-vite-supreme/admin/dashboard"
                  ? "text-primary"
                  : "text-secondary-foreground"
              }`}
            >
              <LucideLayoutDashboard className="w-5 h-5" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/react-vite-supreme/admin/report"
              className={`flex items-center gap-2 ${
                location.pathname === "/react-vite-supreme/admin/report"
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
              <div className="flex items-center gap-2 text-secondary-foreground">
                <UserCheck2Icon size={20} className=" text-secondary-foreground" />
                <span className="text-sm">Hello, (Admin)</span>
              </div>
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

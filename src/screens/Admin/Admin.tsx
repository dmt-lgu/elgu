import { UserCheck2Icon, LucideLayoutDashboard, BarChart3Icon } from "lucide-react";

import eLGULogo from "./../../assets/logo/lgu-logo.png";
import { Outlet } from "react-router-dom";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeProvider } from "@/components/theme-provider";

function Admin() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
    <div className="flex h-screen  ">
      <aside className=" w-[300px] bg-card border-r border-border flex flex-col">
        <div className=" flex  justify-center items-center mt-5 border-border">
          <img
            src={eLGULogo}
            className="w-[140px] object-contain flex self-center"
            alt=""
          />
        </div>
        <nav className="flex flex-col mt-10 gap-6 ml-10">
          <div className=" flex items-center gap-2 ">
            <LucideLayoutDashboard className=" text-primary w-5 h-5 " />
            <span className=" text-primary">Dashboard</span>
          </div>

          <div className=" flex items-center gap-2 ">
            <BarChart3Icon className=" w-5 h-5  text-secondary-foreground" />
            <span className="  text-secondary-foreground ">Reports</span>
          </div>
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

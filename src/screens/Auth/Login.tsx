import React, { useState } from "react";
// Import the shadcn Button component
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import eLGULogo from "./../../assets/logo/lgu-logo.png";
import { LockIcon, User2Icon, EyeIcon, EyeOffIcon } from "lucide-react"; // Import icons
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import Buildings from './../../assets/image/9cb79cee-3ea4-4187-9f1f-868c47ae.png'
// Import SweetAlert2
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";



function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // State for show/hide
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate async login
    
      setLoading(false);
      Swal.fire({
        icon: "success",
        title: "Login Successful",
        text: `Welcome, ${email}!`,
        showConfirmButton: false,
        timer: 2000,
      });
 

    navigate("/react-vite-supreme/admin");
  };

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="fixed top-4 right-4 z-50">
        <ModeToggle />
      </div>
      <div className="w-screen h-screen flex items-center justify-center bg-background">
        <img src={Buildings} className="pointer-events-none absolute w-full z-0 object-contain bottom-0" />
        <form className="w-[400px] max-w-[500px] md:w-full px-4 flex flex-col gap-2" onSubmit={handleSubmit}>
          <img src={eLGULogo} className="w-[140px] object-contain flex self-center" alt="" />
          <div className="relative flex items-center">
            <User2Icon className="absolute text-primary ml-2 mt-1 h-5 w-5" />
            <Input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="Enter your username"
              className="w-full px-3  text-secondary-foreground py-2 mt-1 pl-10"
            />
          </div>
          <div className="mb-6 relative flex items-center">
            <LockIcon className="absolute text-primary ml-2 mt-1 h-5 w-5" />
            <Input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Password"
              className="w-full px-3 text-secondary-foreground py-2 mt-1 pl-10 pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(prev => !prev)}
              className="absolute right-3 mt-1 text-gray-500"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOffIcon className="h-5 w-5" />
              ) : (
                <EyeIcon className="h-5 w-5" />
              )}
            </button>
          </div>
          <Button type="submit" className="w-full py-2" disabled={loading}>
            {loading ? "Signing In..." : "Sign In"}
          </Button>
        </form>
      </div>
    </ThemeProvider>
  );
}

export default Login;
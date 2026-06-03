import React, { useState } from "react";
import eLGULogo from "./../../assets/logo/lgu-logo.png";
import DictLogo from './../../assets/logo/dict-logo.png';
import { LockIcon, MailIcon, EyeIcon, EyeOffIcon, AlertCircleIcon } from "lucide-react";
import Buildings from './../../assets/image/9cb79cee-3ea4-4187-9f1f-868c47ae.png';
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { isAxiosError } from "axios";
import axios from "@/plugin/axios";

function parseLoginError(error: unknown): string {
  if (!isAxiosError(error)) {
    return (error as Error).message || "Login failed. Please try again.";
  }

  const status = error.response?.status;
  const data = error.response?.data;

  if (!data && !status) return "Network error. Please check your connection.";

  if (data) {
    if (data.non_field_errors?.length) return data.non_field_errors[0];
    if (data.detail)                   return data.detail;
    if (data.email?.length)            return `Email: ${data.email[0]}`;
    if (data.password?.length)         return `Password: ${data.password[0]}`;
  }

  if (status === 400) return "Invalid email or password. Please try again.";
  if (status === 401) return "Unauthorized. Please check your credentials.";
  if (status === 403) return "Your account is inactive or has been blocked.";
  if (status === 429) return "Too many login attempts. Please wait a moment and try again.";
  if (status && status >= 500) return "Server error. Please try again later.";

  return "Login failed. Please try again.";
}

function Login() {
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const loginResponse = await axios.post(`/api/v1/token/login/`, { email, password });
      const token = loginResponse.data.auth_token || loginResponse.data.token;
      if (!token) throw new Error("Login failed. No auth token was returned.");

      localStorage.setItem("auth_token", token);
      axios.defaults.headers.common["Authorization"] = `Token ${token}`;

      const userResponse = await axios.get(`/api/v1/users/me/`);
      const user = userResponse.data;
      localStorage.setItem("user", JSON.stringify(user));

      const name = [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email;
      Swal.fire({
        icon: "success",
        title: "Welcome back!",
        text: name,
        showConfirmButton: false,
        timer: 1800,
      });

      const accessLevel = user.act_lvl ?? user.acc_lvl ?? user.accLvl ?? user.access_level;
      if (accessLevel === 0) {
        navigate("/elgu/master");
      } else if (accessLevel === 1) {
        navigate("/elgu/admin");
      } else {
        navigate("/elgu/main");
      }
    } catch (err: unknown) {
      setError(parseLoginError(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center overflow-hidden relative bg-gradient-to-br from-slate-100 to-blue-50">

      {/* Background image */}
      <img
        src={Buildings}
        className="pointer-events-none select-none absolute bottom-0 w-full object-contain z-0 opacity-40"
        alt=""
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 px-8 py-10 sm:px-6 sm:py-8">

          {/* Logo + title */}
          <div className="flex flex-col items-center mb-8 gap-3">
            <img src={eLGULogo} className="w-28 object-contain" alt="eLGU Logo" />
            <div className="text-center">
              <h1 className="text-lg font-bold text-gray-900 leading-tight">eLGU Monitoring Tool</h1>
              <p className="text-xs text-gray-400 mt-0.5">Sign in to continue</p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircleIcon className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-sm text-red-700 leading-snug">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <MailIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); setError(""); }}
                  required
                  placeholder="your@email.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(""); }}
                  required
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-900 bg-gray-50 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2464e8] hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-1"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-5">
          <img src={DictLogo} className="h-20 object-contain " alt="DICT" />
        
        </div>
      </div>
    </div>
  );
}

export default Login;

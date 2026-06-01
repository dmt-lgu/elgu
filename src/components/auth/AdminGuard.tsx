import { ReactNode } from "react";
import { Navigate } from "react-router-dom";

function parseUser() {
  const stored = localStorage.getItem("user");
  if (!stored) return null;

  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

function isAdminUser(user: any) {
  const level = user?.act_lvl ?? user?.acc_lvl ?? user?.accLvl ?? user?.access_level;
  return level === 0 || level === 1;
}

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const token = localStorage.getItem("auth_token");
  const user = parseUser();

  if (!token || !user) {
    return <Navigate to="/elgu/main" replace />;
  }

  if (!isAdminUser(user)) {
    return <Navigate to="/elgu/main" replace />;
  }

  return <>{children}</>;
}

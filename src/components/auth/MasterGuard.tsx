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

interface MasterGuardProps {
  children: ReactNode;
}

export default function MasterGuard({ children }: MasterGuardProps) {
  const token = localStorage.getItem("auth_token");
  const user = parseUser();

  if (!token || !user) {
    return <Navigate to="/elgu/login" replace />;
  }

  const level = user?.act_lvl ?? user?.acc_lvl ?? user?.accLvl ?? user?.access_level;

  if (level !== 0) {
    return <Navigate to="/elgu/login" replace />;
  }

  return <>{children}</>;
}

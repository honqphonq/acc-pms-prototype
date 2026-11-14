import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { User } from "@/types";
import { SESSION_KEY } from "@/services/storage";
import { useDb } from "./useDb";
import { hasPermission, type Permission } from "@/utils/permissions";

interface AuthValue {
  user: User | null;
  login: (userId: string) => void;
  logout: () => void;
  can: (p: Permission) => boolean;
}
const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { db } = useDb();
  const [userId, setUserId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(SESSION_KEY);
    } catch {
      return null;
    }
  });
  const user = db.users.find((u) => u.id === userId) ?? null;
  const login = useCallback((id: string) => {
    localStorage.setItem(SESSION_KEY, id);
    setUserId(id);
  }, []);
  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUserId(null);
  }, []);
  const can = useCallback((p: Permission) => hasPermission(user?.role, p), [user]);
  const value = useMemo(() => ({ user, login, logout, can }), [user, login, logout, can]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

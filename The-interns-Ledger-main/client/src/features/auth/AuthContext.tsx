import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { setAccessToken } from "../../lib/api";
import { authApi, type SessionUser } from "./api";

interface AuthState {
  user: SessionUser | null;
  ready: boolean;
  login: (email: string, password: string, role?: string) => Promise<SessionUser>;
  logout: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => { // silent session restore via refresh cookie
    authApi.refresh()
      .then(({ accessToken, user }) => { setAccessToken(accessToken); setUser(user); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (email: string, password: string, role?: string) => {
    const { accessToken, user } = await authApi.login(email, password, role);
    setAccessToken(accessToken); setUser(user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout().catch(() => {});
    setAccessToken(null); setUser(null);
  }, []);

  const value = useMemo(() => ({ user, ready, login, logout }), [user, ready, login, logout]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside AuthProvider");
  return v;
}

export const portalPath = (role: string) => ({
  student: "/student", industry_supervisor: "/industry", department_supervisor: "/department", admin: "/admin",
}[role] ?? "/login");

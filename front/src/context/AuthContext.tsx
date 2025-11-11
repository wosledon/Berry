import { createContext, useContext, useMemo, useState, ReactNode } from 'react';
import { login as apiLogin } from '../services/auth';

interface AuthState {
  token?: string | null;
  userId?: string | null;
  tenantId?: string | null;
  expiresAt?: string | null;
}

interface AuthContextValue extends AuthState {
  setToken: (t: string | null) => void;
  setUserId: (u: string | null) => void;
  setTenantId: (t: string | null) => void;
  setExpiresAt: (e: string | null) => void;
  logout: () => void;
  login: (username: string, password: string, tenantId?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [userId, setUserId] = useState<string | null>(localStorage.getItem('userId'));
  const [tenantId, setTenantId] = useState<string | null>(localStorage.getItem('tenantId'));
  const [expiresAt, setExpiresAt] = useState<string | null>(localStorage.getItem('expiresAt'));

  const value = useMemo<AuthContextValue>(() => ({
    token,
    userId,
    tenantId,
    setToken: (t) => { t ? localStorage.setItem('token', t) : localStorage.removeItem('token'); setToken(t); },
    setUserId: (u) => { u ? localStorage.setItem('userId', u) : localStorage.removeItem('userId'); setUserId(u); },
    setTenantId: (t) => { t ? localStorage.setItem('tenantId', t) : localStorage.removeItem('tenantId'); setTenantId(t); },
    setExpiresAt: (e) => { e ? localStorage.setItem('expiresAt', e) : localStorage.removeItem('expiresAt'); setExpiresAt(e); },
    logout: () => { localStorage.removeItem('token'); localStorage.removeItem('userId'); localStorage.removeItem('tenantId'); localStorage.removeItem('expiresAt'); setToken(null); setUserId(null); setTenantId(null); setExpiresAt(null); },
    login: async (username: string, password: string, tId?: string) => {
      try {
        const resp = await apiLogin({ username, password, tenantId: tId });
        const tk = resp?.token ?? null;
        const uid = resp?.userId ?? null;
        const tid = resp?.tenantId ?? null;
        const exp = resp?.expiresAt ?? null;
        if (!tk || !uid) return false;
        localStorage.setItem('token', tk);
        localStorage.setItem('userId', uid);
        if (tid) localStorage.setItem('tenantId', tid);
        if (exp) localStorage.setItem('expiresAt', exp);
        setToken(tk);
        setUserId(uid);
        setTenantId(tid);
        setExpiresAt(exp);
        return true;
      } catch {
        return false;
      }
    }
  }), [token, userId, tenantId, expiresAt]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

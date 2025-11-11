import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getUserDetail } from '../services/users';

interface Value {
  permissions: string[];
  hasAny: (list: string[]) => boolean;
  hasAll: (list: string[]) => boolean;
  refresh: () => Promise<void>;
}

const Ctx = createContext<Value | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { userId } = useAuth();
  const [permissions, setPermissions] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!userId) { setPermissions([]); return; }
      try {
        const detail = await getUserDetail(userId);
        setPermissions(detail.effectivePermissions ?? []);
      } catch {
        setPermissions([]);
      }
    })();
  }, [userId]);

  const value = useMemo<Value>(() => ({
    permissions,
    hasAny: (list) => list.some(p => permissions.includes(p)),
    hasAll: (list) => list.every(p => permissions.includes(p)),
    refresh: async () => {
      if (!userId) { setPermissions([]); return; }
      const detail = await getUserDetail(userId);
      setPermissions(detail.effectivePermissions ?? []);
    }
  }), [permissions, userId]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePermissions() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('usePermissions must be used within PermissionsProvider');
  return ctx;
}

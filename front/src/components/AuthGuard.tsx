import { ReactNode, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  useEffect(() => {
    if (!token) {
      nav('/login', { replace: true, state: { from: loc.pathname } });
    }
  }, [token, nav, loc]);
  if (!token) return null;
  return <>{children}</>;
}

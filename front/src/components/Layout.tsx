import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const menus = [
  { path: '/', title: 'Dashboard' },
  { path: '/users', title: 'Users', any: ['users.view'] },
  { path: '/roles', title: 'Roles', any: ['roles.view'] },
  { path: '/permissions', title: 'Permissions', any: ['permissions.view'] },
  { path: '/audits', title: 'Audit Logs', any: ['audit.view'] }
];

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const { hasAny } = usePermissions();
  const { logout, tenantId } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const nav = useNavigate();
  const visibleMenus = useMemo(() => menus.filter(m => !m.any || hasAny(m.any)), [hasAny]);
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900 p-4 grid grid-cols-[240px_1fr] gap-4">
      <aside className="ui-card p-4 h-full">
        <div className="text-xl font-semibold mb-6">Berry Admin</div>
        <nav className="space-y-1">
          {visibleMenus.map(m => (
            <Link key={m.path} to={m.path} className={clsx(
              'block px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-slate-700',
              pathname === m.path && 'bg-gray-100 dark:bg-slate-700 font-medium'
            )}>{m.title}</Link>
          ))}
        </nav>
      </aside>
      <main className="space-y-4">
        <div className="ui-card">
          <div className="ui-card-header text-sm text-gray-600 dark:text-gray-300">
            <div className="flex items-center gap-2">
              <span className="ui-switch-btn" onClick={toggleTheme}>{isDark ? '🌙 深色' : '☀️ 浅色'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Tenant: {tenantId ?? '-'}</span>
              <button className="ui-btn" onClick={() => { logout(); nav('/login'); }}>退出</button>
            </div>
          </div>
          <div>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

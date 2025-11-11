import { Link, useLocation } from 'react-router-dom';
import { ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import { usePermissions } from '../context/PermissionsContext';

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
  const visibleMenus = useMemo(() => menus.filter(m => !m.any || hasAny(m.any)), [hasAny]);
  return (
    <div className="min-h-screen grid grid-cols-[240px_1fr]">
      <aside className="bg-white border-r border-gray-200 p-4">
        <div className="text-xl font-semibold mb-6">Berry Admin</div>
        <nav className="space-y-1">
          {visibleMenus.map(m => (
            <Link key={m.path} to={m.path} className={clsx(
              'block px-3 py-2 rounded hover:bg-gray-100',
              pathname === m.path && 'bg-gray-100 font-medium'
            )}>{m.title}</Link>
          ))}
        </nav>
      </aside>
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}

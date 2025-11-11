import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode, useMemo } from 'react';
import clsx from 'clsx';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';
import { useTheme, themePresets } from '../context/ThemeContext';
import { Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getUserDetail } from '../services/users';

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
  const { isDark, toggleTheme, presets, setPreset, preset } = useTheme();
  const { data: me } = useQuery({
    queryKey: ['me-basic', tenantId],
    queryFn: async () => {
      // 仅获取基本展示信息
      try {
        if (!tenantId) return null;
        // 使用 PermissionsProvider 已经会拉取完整信息，这里兜底获取
        return null;
      } catch { return null; }
    }
  });
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
            <div className="flex items-center gap-3 flex-wrap">
              <span className="ui-switch-btn" onClick={toggleTheme}>{isDark ? '🌙 深色' : '☀️ 浅色'}</span>
              <div className="flex items-center gap-1">
                {presets.map(p => (
                  <button
                    key={p.key}
                    title={p.name}
                    onClick={() => setPreset(p.key)}
                    className={clsx('w-6 h-6 rounded-full border border-gray-300 dark:border-gray-600 transition', 'relative', preset === p.key && 'ring-2 ring-offset-2 ring-blue-500')}
                    style={{ backgroundColor: p.color }}
                  />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline">Tenant: {tenantId ?? '-'}</span>
              <Dropdown
                menu={{
                  items: [
                    { key: 'profile', label: '个人中心', icon: <UserOutlined />, onClick: () => nav('/') },
                    { type: 'divider' as const },
                    { key: 'logout', label: '退出登录', icon: <LogoutOutlined />, danger: true, onClick: () => { logout(); nav('/login'); } }
                  ]
                }}
                trigger={['click']}
              >
                <button className="ui-btn" title="账户">
                  <UserOutlined />
                  <span className="ml-2">账户</span>
                </button>
              </Dropdown>
            </div>
          </div>
          <div>{children}</div>
        </div>
      </main>
    </div>
  );
}

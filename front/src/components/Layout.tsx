import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';
import { useTheme, themePresets } from '../context/ThemeContext';
import { Breadcrumb, Dropdown } from 'antd';
import { UserOutlined, LogoutOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getUserDetail, User } from '../services/users';

const menus = [
  { path: '/', title: 'Dashboard' },
  { path: '/users', title: 'Users', any: ['users.view'] },
  { path: '/roles', title: 'Roles', any: ['roles.view'] },
  { path: '/permissions', title: 'Permissions', any: ['permissions.view'] },
  { path: '/audits', title: 'Audit Logs', any: ['audit.view'] }
];

export function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const { hasAny } = usePermissions();
  const { logout, tenantId } = useAuth();
  const { isDark, toggleTheme, presets, setPreset, preset } = useTheme();
  // 敏感模式（仅本地记录，可扩展到全局 Context）
  const [sensitive, setSensitive] = useState<boolean>(() => localStorage.getItem('sensitive') === '1');
  const toggleSensitive = () => { const v = !sensitive; setSensitive(v); localStorage.setItem('sensitive', v ? '1' : '0'); };
  const { userId } = useAuth();
  const { data: me } = useQuery<any | null>({
    queryKey: ['me-basic', userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      try {
        const detail = await getUserDetail(userId);
        return detail;
      } catch { return null; }
    }
  });
  const nav = useNavigate();
  const visibleMenus = useMemo(() => menus.filter(m => !m.any || hasAny(m.any)), [hasAny]);
  // 头像逻辑
  const displayName = me?.user?.displayName || me?.user?.username || 'A';
  // 后端暂未提供 avatar 字段，保留扩展点
  const avatar = me?.user?.avatarUrl as string | undefined;
  const initial = displayName?.[0]?.toUpperCase() || 'A';
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-6 grid grid-cols-[220px_1fr] gap-6">
      <aside className="ui-card p-6 rounded-xl shadow-lg h-full flex flex-col">
        <div className="text-2xl font-bold mb-8 tracking-wide text-blue-600 dark:text-blue-300">Berry Admin</div>
        <nav className="space-y-2 flex-1">
          {visibleMenus.map(m => (
            <Link key={m.path} to={m.path} className={clsx(
              'block px-4 py-2 rounded-lg transition font-medium',
              'hover:bg-blue-100 dark:hover:bg-blue-900',
              pathname === m.path ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 shadow' : 'text-gray-700 dark:text-gray-200'
            )}>{t(m.title)}</Link>
          ))}
        </nav>
        {/* 去掉侧边栏底部头像/用户名展示 */}
      </aside>
      <main className="space-y-4">
        {/* 独立标题栏卡片 */}
        <div className="ui-card rounded-xl shadow px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Breadcrumb
              items={(() => {
                // 多层路由面包屑生成
                const items: Array<{ title: ReactNode }> = [];
                items.push({ title: <Link to="/">{t('Dashboard')}</Link> });
                if (!pathname || pathname === '/') return items;
                const segs = pathname.split('/').filter(Boolean);
                let acc = '';
                const guidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
                const numRe = /^\d+$/;
                const toTitle = (s: string) => {
                  const lower = s.toLowerCase();
                  if (lower === 'create' || lower === 'new') return t('Create');
                  if (lower === 'edit' || lower === 'update') return t('Edit');
                  if (guidRe.test(s) || numRe.test(s)) return t('Detail');
                  // 尝试从菜单映射
                  const menu = menus.find(m => m.path.replace(/^\//, '') === s);
                  if (menu) return t(menu.title);
                  const text = decodeURIComponent(s).replace(/[-_]+/g, ' ');
                  return text.charAt(0).toUpperCase() + text.slice(1);
                };
                segs.forEach((seg, idx) => {
                  acc += `/${seg}`;
                  const isLast = idx === segs.length - 1;
                  // 若存在完整路径匹配菜单，使用菜单名
                  const menuMatch = menus.find(m => m.path === acc);
                  const titleText = menuMatch ? t(menuMatch.title) : toTitle(seg);
                  items.push({ title: isLast ? titleText : <Link to={acc}>{titleText}</Link> });
                });
                return items;
              })()}
            />
          </div>
          <Dropdown
            menu={{
              items: [
                { key: 'profile', label: t('Personal Center'), icon: <UserOutlined />, onClick: () => nav('/') },
                {
                  key: 'appearance',
                  label: t('Switch Theme'),
                  children: [
                    { key: 'theme-toggle', label: isDark ? t('Dark') : t('Light'), onClick: toggleTheme },
                    { key: 'sensitive', label: t('Sensitive') + (sensitive ? ' ON' : ' OFF'), onClick: toggleSensitive },
                    { type: 'group' as const, label: t('Switch Color'),
                      children: presets.map(p => ({ key: `preset-${p.key}`, label: p.name, onClick: () => setPreset(p.key) }))
                    }
                  ]
                },
                { key: 'lang', label: t('Switch Language'), onClick: () => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh') },
                { type: 'divider' as const },
                { key: 'logout', label: t('Logout'), icon: <LogoutOutlined />, danger: true, onClick: () => { logout(); nav('/login'); } }
              ]
            }}
            trigger={['click']}
          >
            <button className="ui-btn flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-900 text-blue-700 dark:text-blue-200 font-medium shadow" title={t('Account')}>
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold border">{initial}</div>
              )}
              <span className="truncate max-w-[160px]">{displayName}</span>
            </button>
          </Dropdown>
        </div>
        {/* 内容卡片 */}
        <div className="ui-card rounded-xl shadow px-6 py-4">
          {children}
        </div>
      </main>
    </div>
  );
}

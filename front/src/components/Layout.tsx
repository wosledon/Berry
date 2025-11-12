import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { usePermissions } from '../context/PermissionsContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Breadcrumb, Dropdown, Drawer, Radio, Space, Button, Divider, Tooltip, Switch } from 'antd';
import { UserOutlined, LogoutOutlined, GlobalOutlined, SettingOutlined, MoonOutlined, SunOutlined, BgColorsOutlined, MenuFoldOutlined, MenuUnfoldOutlined, DashboardOutlined, TeamOutlined, CrownOutlined, KeyOutlined, FileSearchOutlined, AppstoreOutlined } from '@ant-design/icons';
import { routes } from '../config/routes';
import BerryLogo from '../assets/berry.svg';
import { useQuery } from '@tanstack/react-query';
import { getUserDetail, User } from '../services/users';

const iconByKey: Record<string, JSX.Element> = {
  dashboard: <DashboardOutlined />,
  system: <AppstoreOutlined />,
  users: <TeamOutlined />,
  roles: <CrownOutlined />,
  permissions: <KeyOutlined />,
  audits: <FileSearchOutlined />,
  settings: <SettingOutlined />,
};

const SIDEBAR_EXPANDED = 220;
const SIDEBAR_COLLAPSED = 64;
const HEADER_HEIGHT = 64;
const GUTTER = 16;

export function Layout({ children }: { children: ReactNode }) {
  const { t, i18n } = useTranslation();
  const { pathname } = useLocation();
  const { hasAny } = usePermissions();
  const { logout, tenantId } = useAuth();
  const { isDark, toggleTheme, presets, setPreset, layoutStyle, setLayoutStyle, notificationPlacement, setNotificationPlacement, sidebarCollapsed, setSidebarCollapsed, layoutMode, setLayoutMode } = useTheme();
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
  const visibleRoutes = useMemo(() => {
    const filter = (items: typeof routes) => items.map(r => ({
      ...r,
      children: r.children?.filter(c => !c.any || hasAny(c.any))
    })).filter(r => !r.any || hasAny(r.any));
    return filter(routes);
  }, [hasAny]);
  const titleMap = useMemo(() => {
    const m = new Map<string, string>();
    const walk = (items: typeof routes) => {
      items.forEach(r => {
        if (r.path) m.set(r.path, r.titleKey);
        if (r.children) walk(r.children as any);
      });
    };
    walk(routes);
    return m;
  }, []);
  // 头像逻辑
  const displayName = me?.user?.displayName || me?.user?.username || 'A';
  // 后端暂未提供 avatar 字段，保留扩展点
  const avatar = me?.user?.avatarUrl as string | undefined;
  const initial = displayName?.[0]?.toUpperCase() || 'A';
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden bg-gradient-to-br from-gray-100 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* 侧栏 */}
      <aside
        className={clsx('ui-card rounded-xl shadow-lg h-full flex flex-col fixed transition-all', sidebarCollapsed ? 'p-3' : 'p-4')}
        style={{ left: GUTTER, top: GUTTER, width: sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED, height: `calc(100vh - ${GUTTER * 2}px)` }}
      >
        <div className={clsx('mb-4', sidebarCollapsed ? 'flex justify-center' : '')}>
          {sidebarCollapsed ? (
            <img src={BerryLogo} alt="Berry" className="w-8 h-8" />
          ) : (
            <div className="text-2xl font-bold tracking-wide text-blue-600 dark:text-blue-300">Berry Admin</div>
          )}
        </div>
        <nav className="space-y-2 flex-1">
          {visibleRoutes.map(r => {
            if (!r.children || r.children.length === 0) {
              const active = pathname === r.path;
              return (
                <Tooltip placement="right" title={t(r.titleKey)} key={r.path} open={sidebarCollapsed ? undefined : false}>
                  <Link key={r.path} to={r.path} className={clsx(
                    'relative flex items-center',
                    sidebarCollapsed ? 'justify-center' : 'gap-2 px-3 py-2',
                    'rounded-lg transition font-medium',
                    'hover:bg-blue-100 dark:hover:bg-blue-900',
                    active ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 shadow' : 'text-gray-700 dark:text-gray-200'
                  )} style={sidebarCollapsed ? (active ? { outline: '2px solid var(--primary-600)' } : undefined) : (active ? { borderLeft: '3px solid var(--primary-600)' } : undefined)}>
                    <span className="text-base">{iconByKey[r.iconKey || 'dashboard']}</span>
                    {!sidebarCollapsed && <span>{t(r.titleKey)}</span>}
                  </Link>
                </Tooltip>
              );
            }
            return (
              <div key={r.path}>
                <div className={clsx('flex items-center', sidebarCollapsed ? 'justify-center' : 'gap-2 px-3 py-2', 'text-gray-400')}>
                  <span className="text-base">{iconByKey[r.iconKey || 'system']}</span>
                  {!sidebarCollapsed && <span className="font-semibold">{t(r.titleKey)}</span>}
                </div>
                <div className={clsx('mt-1 space-y-1', sidebarCollapsed ? 'hidden' : 'block')}>
                  {r.children.map(c => {
                    const active = pathname === c.path;
                    return (
                      <Link key={c.path} to={c.path} className={clsx(
                        'relative flex items-center gap-2 px-3 py-2 ml-6 rounded-lg transition',
                        'hover:bg-blue-100 dark:hover:bg-blue-900',
                        active ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 shadow' : 'text-gray-700 dark:text-gray-200'
                      )} style={active ? { borderLeft: '3px solid var(--primary-600)' } : undefined}>
                        <span className="text-base">{iconByKey[c.iconKey || 'settings']}</span>
                        <span className="text-sm">{t(c.titleKey)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>
        <div className={clsx('pt-2', sidebarCollapsed ? 'flex justify-center' : 'block')}>
          <Tooltip placement="right" title={t('Theme Settings')} open={sidebarCollapsed ? undefined : false}>
            <Button type="text" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} />
          </Tooltip>
        </div>
      </aside>

      {/* 标题栏 */}
      <div
        className="ui-card rounded-xl shadow px-4 py-2 flex items-center justify-between fixed transition-all"
        style={{ left: (sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) + GUTTER * 2, right: GUTTER, top: GUTTER, height: HEADER_HEIGHT }}
      >
          <div className="flex items-center gap-2">
            <Button
              type="text"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={t('Toggle Sidebar')}
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            />
            <Breadcrumb
              items={(() => {
                // 多层路由面包屑生成
                const items: Array<{ title: ReactNode }> = [];
                items.push({ title: <Link to="/">{t('menu.dashboard')}</Link> });
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
                  const titleKey = titleMap.get(`/${s}`);
                  if (titleKey) return t(titleKey);
                  const text = decodeURIComponent(s).replace(/[-_]+/g, ' ');
                  return text.charAt(0).toUpperCase() + text.slice(1);
                };
                segs.forEach((seg, idx) => {
                  acc += `/${seg}`;
                  const isLast = idx === segs.length - 1;
                  // 若存在完整路径匹配菜单，使用菜单名
                  const titleKey2 = titleMap.get(acc);
                  const titleText = titleKey2 ? t(titleKey2) : toTitle(seg);
                  items.push({ title: isLast ? titleText : <Link to={acc}>{titleText}</Link> });
                });
                return items;
              })()}
            />
          </div>
          <div className="flex items-center gap-1">
            {/* 主题明暗切换 */}
            <Button type="text" onClick={toggleTheme} title={t('Switch Theme')} icon={isDark ? <MoonOutlined /> : <SunOutlined />} />
            {/* 语言切换 */}
            <Button type="text" onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')} title={t('Switch Language')} icon={<GlobalOutlined />} />
            {/* 设置入口已移动到侧栏底部 */}

            {/* 账号下拉，仅保留个人中心与退出 */}
            <Dropdown
            menu={{
              items: [
                { key: 'profile', label: t('Personal Center'), icon: <UserOutlined />, onClick: () => nav('/') },
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
      </div>
      {/* 设置抽屉 */}
      <Drawer title={t('Theme Settings')} open={settingsOpen} onClose={() => setSettingsOpen(false)} width={380}>
        <div className="space-y-4">
          <div>
            <div className="mb-2 font-medium">{t('Color Preset')}</div>
            <Space wrap>
              {presets.map(p => (
                <Button key={p.key} shape="round" icon={<BgColorsOutlined />} onClick={() => setPreset(p.key)} style={{ background: p.color, color: '#fff' }}>
                  {p.name}
                </Button>
              ))}
            </Space>
          </div>
          <Divider />
          <div>
            <div className="mb-2 font-medium">{t('Layout Style')}</div>
            <Radio.Group value={layoutStyle} onChange={e => setLayoutStyle(e.target.value)}>
              <Radio.Button value="comfortable">{t('Comfortable')}</Radio.Button>
              <Radio.Button value="compact">{t('Compact')}</Radio.Button>
            </Radio.Group>
          </div>
          <Divider />
          <div>
            <div className="mb-2 font-medium">{t('Layout Mode')}</div>
            <Radio.Group value={layoutMode} onChange={e => setLayoutMode(e.target.value)}>
              <Radio.Button value="side">{t('Side')}</Radio.Button>
              <Radio.Button value="top">{t('Top')}</Radio.Button>
              <Radio.Button value="mix">{t('Mix')}</Radio.Button>
            </Radio.Group>
          </div>
          <Divider />
          <div>
            <div className="mb-2 font-medium">{t('Notification Placement')}</div>
            <Radio.Group value={notificationPlacement} onChange={e => setNotificationPlacement(e.target.value)}>
              <Radio.Button value="topLeft">TopLeft</Radio.Button>
              <Radio.Button value="topRight">TopRight</Radio.Button>
              <Radio.Button value="bottomLeft">BottomLeft</Radio.Button>
              <Radio.Button value="bottomRight">BottomRight</Radio.Button>
            </Radio.Group>
          </div>
          <Divider />
          <div className="flex items-center justify-between">
            <div className="font-medium">{t('Sensitive')}</div>
            <Switch checked={sensitive} onChange={toggleSensitive} />
          </div>
          <Divider />
          <div>
            <div className="mb-2 font-medium">{t('Preview')}</div>
            <div className="rounded-lg border p-3" style={{ borderColor: 'var(--primary-600)' }}>
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full" style={{ background: 'var(--primary-600)' }} />
                <div className="text-sm">{t('Primary Color')}</div>
              </div>
              <div className="mt-3 flex items-center gap-8">
                <Button type="primary" size={layoutStyle === 'compact' ? 'small' : 'middle'}>
                  {t('Sample Button')}
                </Button>
                <div className={clsx('rounded-md bg-gray-100 dark:bg-slate-700', layoutStyle === 'compact' ? 'px-2 py-1' : 'px-3 py-2')}>
                  {t('Card Padding')}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Drawer>

      {/* 内容区域：固定布局，内部滚动，统一边距 */}
      <main className="absolute transition-all" style={{ left: (sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) + GUTTER * 2, right: GUTTER, top: HEADER_HEIGHT + GUTTER * 2, bottom: GUTTER, overflow: 'auto' }}>
          <div className={clsx('ui-card rounded-xl shadow', layoutStyle === 'compact' ? 'px-4 py-3' : 'px-6 py-4', 'min-h-full')}>
            {children}
          </div>
      </main>
    </div>
  );
}

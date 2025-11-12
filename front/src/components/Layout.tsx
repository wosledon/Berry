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
  // 菜单渲染辅助函数
  function renderSidebarMenu(routesList: typeof visibleRoutes) {
    return (
      <>
        {routesList.map(r => {
          if (!r.children || r.children.length === 0) {
            const active = pathname === r.path;
            return (
              <Link key={r.path} to={r.path} className={clsx(
                'relative flex items-center gap-2 px-3 py-2 rounded-lg transition',
                'hover:bg-blue-100 dark:hover:bg-blue-900',
                active ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 shadow' : 'text-gray-700 dark:text-gray-200'
              )} style={active ? { borderLeft: '3px solid var(--primary-600)' } : undefined}>
                <span className="text-base">{iconByKey[r.iconKey || 'settings']}</span>
                <span className="text-sm">{t(r.titleKey)}</span>
              </Link>
            );
          }
          // 有子菜单分组（如系统配置）
          return (
            <div key={r.path}>
              <div className={clsx('flex items-center cursor-pointer gap-2 px-3 py-2 text-gray-400')}
                title={t(r.titleKey)}
              >
                <span className="text-base">{iconByKey[r.iconKey || 'settings']}</span>
                <span className="font-semibold">{t(r.titleKey)}</span>
              </div>
              <div className="mt-1 space-y-1 ml-6">
                {Array.isArray(r.children) && r.children.map((c: any) => {
                  const active = pathname === c.path;
                  return (
                    <Link key={c.path} to={c.path} className={clsx(
                      'relative flex items-center gap-2 px-3 py-2 rounded-lg transition',
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
      </>
    );
  }

  // 侧栏组件
  function Sidebar({ top = GUTTER, height = `calc(100vh - ${GUTTER * 2}px)`, menu }: { top?: number; height?: string; menu: ReactNode }) {
    return (
      <aside
        className={clsx('ui-card rounded-xl shadow-lg h-full flex flex-col fixed transition-all', sidebarCollapsed ? 'p-3' : 'p-4')}
        style={{ left: GUTTER, top, width: sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED, height }}
      >
        <div className={clsx('mb-4', sidebarCollapsed ? 'flex justify-center' : '')}>
          {sidebarCollapsed ? (
            <img src={BerryLogo} alt="Berry" className="w-8 h-8" />
          ) : (
            <div className="text-2xl font-bold tracking-wide text-blue-600 dark:text-blue-300">Berry Admin</div>
          )}
        </div>
        <nav className="space-y-2 flex-1">
          {menu}
        </nav>
        <div className={clsx('pt-2', sidebarCollapsed ? 'flex justify-center' : 'block')}>
          <Tooltip placement="right" title={t('Theme Settings')} open={sidebarCollapsed ? undefined : false}>
            <Button type="text" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)} />
          </Tooltip>
        </div>
      </aside>
    );
  }

  // 标题栏组件
  function Header({ showBreadcrumb = true, showToggle = true }: { showBreadcrumb?: boolean; showToggle?: boolean }) {
    return (
      <div
        className="ui-card rounded-xl shadow px-4 py-2 flex items-center justify-between fixed transition-all"
        style={{
          left: (sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) + GUTTER * 2,
          right: GUTTER,
          top: GUTTER,
          height: HEADER_HEIGHT
        }}
      >
        <div className="flex items-center gap-2">
          {showToggle && (
            <Button
              type="text"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={t('Toggle Sidebar')}
              icon={sidebarCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            />
          )}
          {showBreadcrumb && (
            <Breadcrumb
              items={(() => {
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
                  const titleKey = titleMap.get(`/${s}`);
                  if (titleKey) return t(titleKey);
                  const text = decodeURIComponent(s).replace(/[-_]+/g, ' ');
                  return text.charAt(0).toUpperCase() + text.slice(1);
                };
                segs.forEach((seg, idx) => {
                  acc += `/${seg}`;
                  const isLast = idx === segs.length - 1;
                  const titleKey2 = titleMap.get(acc);
                  const titleText = titleKey2 ? t(titleKey2) : toTitle(seg);
                  items.push({ title: isLast ? titleText : <Link to={acc}>{titleText}</Link> });
                });
                return items;
              })()}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button type="text" onClick={toggleTheme} title={t('Switch Theme')} icon={isDark ? <MoonOutlined /> : <SunOutlined />} />
          <Button type="text" onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')} title={t('Switch Language')} icon={<GlobalOutlined />} />
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
    );
  }

  // 系统分组侧栏菜单渲染（仅 mix 模式）
  function renderSystemSidebarMenu(systemGroup: any, systemCollapsed: boolean, toggleSystemCollapsed: () => void) {
    return (
      <div>
        <div className={clsx('flex items-center cursor-pointer', sidebarCollapsed ? 'justify-center' : 'gap-2 px-3 py-2', 'text-gray-400')}
          onClick={toggleSystemCollapsed}
          title={t(systemGroup.titleKey)}
        >
          <span className="text-base">{iconByKey[systemGroup.iconKey || 'system']}</span>
          {!sidebarCollapsed && <span className="font-semibold">{t(systemGroup.titleKey)}</span>}
          {!sidebarCollapsed && <span className="ml-auto text-xs">{systemCollapsed ? '+' : '-'}</span>}
        </div>
        <div className={clsx('mt-1 space-y-1', sidebarCollapsed ? 'hidden' : systemCollapsed ? 'hidden' : 'block')}>
          {Array.isArray(systemGroup.children) && systemGroup.children.map((c: any) => {
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
  }

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
  // 顶部导航模式下系统菜单展开
  const [topSystemOpen, setTopSystemOpen] = useState(false);
  // 侧栏系统分组折叠状态（mix 模式）
  const [systemCollapsed, setSystemCollapsed] = useState(() => {
    return localStorage.getItem('systemCollapsed') === '1';
  });
  const toggleSystemCollapsed = () => {
    const v = !systemCollapsed;
    setSystemCollapsed(v);
    localStorage.setItem('systemCollapsed', v ? '1' : '0');
  };

  // MainContent 组件
  const MainContent = ({ top, withSidebar = true }: { top?: number; withSidebar?: boolean } = {}) => (
    <main className="absolute transition-all" style={{
      left: withSidebar ? ((sidebarCollapsed ? SIDEBAR_COLLAPSED : SIDEBAR_EXPANDED) + GUTTER * 2) : GUTTER,
      right: GUTTER,
      top: top || (HEADER_HEIGHT + GUTTER * 2),
      bottom: GUTTER,
      overflow: 'auto'
    }}>
      <div className={clsx('ui-card rounded-xl shadow', layoutStyle === 'compact' ? 'px-4 py-3' : 'px-6 py-4', 'min-h-full')}>
        {children}
      </div>
    </main>
  );

  // SettingsDrawer 组件
  const SettingsDrawer = () => (
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
  );

  // 顶部导航渲染
  function renderTopNav() {
    return (
      <header className="ui-card rounded-xl shadow flex items-center justify-between fixed left-0 right-0 top-0 h-16 px-6 z-20" style={{ background: 'var(--primary-600)' }}>
        <div className="flex items-center gap-4">
          <img src={BerryLogo} alt="Berry" className="w-8 h-8" />
          <nav className="flex items-center gap-2">
            {visibleRoutes.map(r => {
              if (!r.children || r.children.length === 0) {
                return (
                  <Link key={r.path} to={r.path} className={clsx(
                    'text-white px-3 py-2 rounded-lg font-medium',
                    pathname === r.path ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-10'
                  )}>{t(r.titleKey)}</Link>
                );
              }
              // 系统配置分组
              return (
                <div key={r.path} className="relative">
                  <Button type="text" className={clsx('text-white font-semibold px-3 py-2', topSystemOpen ? 'bg-white bg-opacity-20' : 'hover:bg-white hover:bg-opacity-10')} onClick={() => setTopSystemOpen(v => !v)}>
                    {t(r.titleKey)}
                  </Button>
                  {topSystemOpen && (
                    <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-lg min-w-[160px] z-30">
                      {r.children.map(c => (
                        <Link key={c.path} to={c.path} className={clsx(
                          'block px-4 py-2 text-gray-700 hover:bg-blue-50',
                          pathname === c.path ? 'bg-blue-100 text-blue-700' : ''
                        )}>{t(c.titleKey)}</Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <Button type="text" onClick={toggleTheme} title={t('Switch Theme')} className="text-white hover:bg-white hover:bg-opacity-10" icon={isDark ? <MoonOutlined /> : <SunOutlined />} />
          <Button type="text" onClick={() => i18n.changeLanguage(i18n.language === 'zh' ? 'en' : 'zh')} title={t('Switch Language')} className="text-white hover:bg-white hover:bg-opacity-10" icon={<GlobalOutlined />} />
          <Button type="text" onClick={() => setSettingsOpen(true)} title={t('Theme Settings')} className="text-white hover:bg-white hover:bg-opacity-10" icon={<SettingOutlined />} />
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
            <button className="ui-btn flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-blue-700 font-medium shadow" title={t('Account')}>
              {avatar ? (
                <img src={avatar} alt="avatar" className="w-6 h-6 rounded-full object-cover border" />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold border">{initial}</div>
              )}
              <span className="truncate max-w-[160px]">{displayName}</span>
            </button>
          </Dropdown>
        </div>
      </header>
    );
  }
  // 分支渲染
  if (layoutMode === 'top') {
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-gray-100 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        {renderTopNav()}
        <MainContent top={HEADER_HEIGHT + GUTTER} withSidebar={false} />
        <SettingsDrawer />
      </div>
    );
  }

  // 混合布局模式：顶部导航+侧栏（仅系统分组有子菜单时显示侧栏）
  if (layoutMode === 'mix') {
    // 查找系统分组（假定 key 为 'system'）
    const systemGroup = visibleRoutes.find(r => r.iconKey === 'system' || r.path === '/system');
    const hasSystemChildren = systemGroup && Array.isArray(systemGroup.children) && systemGroup.children.length > 0;
    // 如果没有系统分组子菜单，回退到 side
    if (!hasSystemChildren) {
      // 直接渲染 side 分支
      return (
        <div className="h-screen w-screen bg-gradient-to-br from-gray-100 to-blue-50 dark:from-slate-900 dark:to-slate-800">
          <Sidebar menu={renderSidebarMenu(visibleRoutes)} />
          <Header />
          <MainContent />
          <SettingsDrawer />
        </div>
      );
    }
    // 正常 mix 分支渲染
    return (
      <div className="h-screen w-screen bg-gradient-to-br from-gray-100 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        {renderTopNav()}
        <Sidebar
          top={HEADER_HEIGHT + GUTTER}
          height={`calc(100vh - ${HEADER_HEIGHT + GUTTER * 2}px)`}
          menu={renderSystemSidebarMenu(systemGroup, systemCollapsed, toggleSystemCollapsed)}
        />
        <MainContent />
        <SettingsDrawer />
      </div>
    );
  }

  // side 分支渲染（默认）
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-gray-100 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Sidebar menu={renderSidebarMenu(visibleRoutes)} />
      <Header />
      <MainContent />
      <SettingsDrawer />
    </div>
  );
}

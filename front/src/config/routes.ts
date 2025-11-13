import type { ReactNode } from 'react';

export type RouteItem = {
  path: string;
  titleKey: string; // i18n key, e.g. 'menu.dashboard'
  iconKey?: 'dashboard' | 'system' | 'users' | 'roles' | 'permissions' | 'audits' | 'settings';
  any?: string[]; // permission any-of
  children?: RouteItem[];
};

export const routes: RouteItem[] = [
  { path: '/', titleKey: 'menu.dashboard', iconKey: 'dashboard' },
  {
    path: '/system',
    titleKey: 'menu.system',
    iconKey: 'system',
    children: [
      { path: '/menus', titleKey: 'menu.menus', iconKey: 'settings', any: ['menus.view'] },
      { path: '/tenants', titleKey: 'menu.tenants', iconKey: 'settings', any: ['tenants.view'] },
      { path: '/users', titleKey: 'menu.users', iconKey: 'users', any: ['users.view'] },
      { path: '/roles', titleKey: 'menu.roles', iconKey: 'roles', any: ['roles.view'] },
      { path: '/permissions', titleKey: 'menu.permissions', iconKey: 'permissions', any: ['permissions.view'] },
      { path: '/audits', titleKey: 'menu.audits', iconKey: 'audits', any: ['audit.view'] },
    ],
  },
];

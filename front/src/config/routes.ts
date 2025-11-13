import type { ReactNode } from 'react';

// 路由配置 (Route Configuration)
// 此文件定义前端静态路由，主要供管理员使用 (This defines static routes for admins)
// 普通用户菜单从后端动态拉取 (Normal users get menus dynamically from backend)
export type RouteItem = {
  path: string; // 路由路径 (Route path)
  titleKey: string; // i18n 键，用于菜单显示 (i18n key for menu display)
  iconKey?: 'dashboard' | 'system' | 'users' | 'roles' | 'permissions' | 'audits' | 'settings' | 'menus' | 'tenants'; // 图标键 (Icon key)
  any?: string[]; // 所需权限之一 (Any of these permissions required)
  children?: RouteItem[]; // 子路由 (Child routes)
};

export const routes: RouteItem[] = [
  { path: '/', titleKey: 'menu.dashboard', iconKey: 'dashboard' }, // 仪表板 (Dashboard)
  {
    path: '/system', // 系统管理分组 (System management group)
    titleKey: 'menu.system',
    iconKey: 'system',
    children: [
      { path: '/users', titleKey: 'menu.users', iconKey: 'users', any: ['users.view'] }, // 用户管理 (User management)
      { path: '/roles', titleKey: 'menu.roles', iconKey: 'roles', any: ['roles.view'] }, // 角色管理 (Role management)
      { path: '/permissions', titleKey: 'menu.permissions', iconKey: 'permissions', any: ['permissions.view'] }, // 权限管理 (Permission management)
      { path: '/menus', titleKey: 'menu.menus', iconKey: 'menus', any: ['menus.view'] }, // 菜单管理 (Menu management)
      { path: '/tenants', titleKey: 'menu.tenants', iconKey: 'tenants', any: ['tenants.view'] }, // 租户管理 (Tenant management)
      { path: '/audits', titleKey: 'menu.audits', iconKey: 'audits', any: ['audit.view'] }, // 审计日志 (Audit logs)
    ],
  },
];

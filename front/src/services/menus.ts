import { apiClient } from './openapi';
import type { components, paths } from '../types/api';

// 菜单项类型 (Menu item type)
export type MenuItem = components['schemas']['Menu'];

// 上报菜单项类型 (Report menu item type for importing)
export type ReportMenuItem = { name: string; path: string; icon?: string | null; order?: number | null; permission?: string | null; parentPath?: string | null };

// 分页结果类型 (Paged result type)
export interface PagedResult<T> { items: T[]; total: number; page: number; size: number }

// 获取菜单列表 (Get paginated menu list)
export async function listMenus(params: paths['/api/Menus/List']['get']['parameters']['query']): Promise<PagedResult<MenuItem>> {
  const { data, error } = await apiClient.GET('/api/Menus/List', { params: { query: params } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 创建菜单 (Create a new menu)
export async function createMenu(payload: MenuItem): Promise<MenuItem> {
  const { data, error } = await apiClient.POST('/api/Menus/Create', { body: payload });
  if (error) throw error;
  const content = (data as any)?.['application/json'] ?? (data as any);
  return content as MenuItem;
}

// 更新菜单 (Update an existing menu)
export async function updateMenu(id: string, payload: MenuItem): Promise<MenuItem> {
  const { data, error } = await apiClient.PUT('/api/Menus/Update/{id}', { params: { path: { id } }, body: payload });
  if (error) throw error;
  const content = (data as any)?.['application/json'] ?? (data as any);
  return content as MenuItem;
}

// 删除菜单 (Delete a menu)
export async function deleteMenu(id: string): Promise<void> {
  const { error } = await apiClient.DELETE('/api/Menus/Delete/{id}', { params: { path: { id } } });
  if (error) throw error;
}

// 导入菜单 (Import menus from static routes)
// 注意：此端点可能在类型生成时未包含，需重启后端确认 Swagger 暴露 (Note: This endpoint may not be in generated types until backend restart)
export async function importMenus(items: ReportMenuItem[]): Promise<{ added: number; updated: number }> {
  // 使用 any 绕过类型检查，直到类型生成包含此端点 (Use any to bypass type check until types include this endpoint)
  const { data, error } = await (apiClient as any).POST('/api/Menus/Import', { body: items });
  if (error) throw error;
  const content = (data as any)?.['application/json'] ?? (data as any);
  return content as { added: number; updated: number };
}

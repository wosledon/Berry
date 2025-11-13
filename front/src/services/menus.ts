import { apiClient } from './openapi';
import type { components, paths } from '../types/api';

export type MenuItem = components['schemas']['Menu'];
export type ReportMenuItem = { name: string; path: string; icon?: string | null; order?: number | null; permission?: string | null; parentPath?: string | null };

export interface PagedResult<T> { items: T[]; total: number; page: number; size: number }

export async function listMenus(params: paths['/api/Menus/List']['get']['parameters']['query']): Promise<PagedResult<MenuItem>> {
  const { data, error } = await apiClient.GET('/api/Menus/List', { params: { query: params } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

export async function createMenu(payload: MenuItem): Promise<MenuItem> {
  const { data, error } = await apiClient.POST('/api/Menus/Create', { body: payload });
  if (error) throw error;
  const content = (data as any)?.['application/json'] ?? (data as any);
  return content as MenuItem;
}

export async function updateMenu(id: string, payload: MenuItem): Promise<MenuItem> {
  const { data, error } = await apiClient.PUT('/api/Menus/Update/{id}', { params: { path: { id } }, body: payload });
  if (error) throw error;
  const content = (data as any)?.['application/json'] ?? (data as any);
  return content as MenuItem;
}

export async function deleteMenu(id: string): Promise<void> {
  const { error } = await apiClient.DELETE('/api/Menus/Delete/{id}', { params: { path: { id } } });
  if (error) throw error;
}

// Import menus reported from static routes (admin-only). Endpoint: POST /api/Menus/Import
export async function importMenus(items: ReportMenuItem[]): Promise<{ added: number; updated: number }> {
  // The OpenAPI types may not include this endpoint until regenerated; cast path to any to allow compile until then.
  const { data, error } = await (apiClient as any).POST('/api/Menus/Import', { body: items });
  if (error) throw error;
  const content = (data as any)?.['application/json'] ?? (data as any);
  return content as { added: number; updated: number };
}

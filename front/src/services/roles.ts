import { apiClient } from './openapi';
import type { components, paths } from '../types/api';

export type Role = components['schemas']['Role'];

// 角色列表
export async function listRoles(params: paths['/api/Roles/List']['get']['parameters']['query']) {
  const { data, error } = await apiClient.GET('/api/Roles/List', { params: { query: params } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 角色明细
export async function getRoleDetail(id: string) {
  const { data, error } = await apiClient.GET('/api/Roles/Detail/{id}', { params: { path: { id } } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

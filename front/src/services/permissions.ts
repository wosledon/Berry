import { apiClient } from './openapi';
import type { components, paths } from '../types/api';

export type Permission = components['schemas']['Permission'];

// 权限列表
export async function listPermissions(params: paths['/api/Permissions/Get']['get']['parameters']['query']) {
  const { data, error } = await apiClient.GET('/api/Permissions/Get', { params: { query: params } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 权限 upsert
export async function upsertPermission(name: string, permission: Permission) {
  const { data, error } = await apiClient.PUT('/api/Permissions/Upsert/{name}', { params: { path: { name } }, body: permission });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 权限同步
export async function syncPermissions() {
  const { data, error } = await apiClient.POST('/api/Permissions/Sync/sync', {});
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 软删除权限（后端无明确删除接口，使用 Upsert 标记 isDeleted）
export async function softDeletePermission(name: string) {
  return upsertPermission(name, { name, isDeleted: true } as Permission);
}

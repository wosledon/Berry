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

// 创建角色
export async function createRole(payload: Role) {
  const { data, error } = await apiClient.POST('/api/Roles/Create', { body: payload });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 更新角色
export async function updateRole(id: string, payload: Role) {
  const { data, error } = await apiClient.PUT('/api/Roles/Update/{id}', { params: { path: { id } }, body: payload });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 删除角色
export async function deleteRole(id: string) {
  const { data, error } = await apiClient.DELETE('/api/Roles/Delete/{id}', { params: { path: { id } } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 绑定权限
export async function bindRolePermissions(id: string, permissionIds: string[]) {
  const { data, error } = await apiClient.POST('/api/Roles/BindPermissions/{id}/permissions', { params: { path: { id } }, body: permissionIds });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 解绑权限
export async function unbindRolePermissions(id: string, permissionIds: string[]) {
  const { data, error } = await apiClient.DELETE('/api/Roles/UnbindPermissions/{id}/permissions', { params: { path: { id } }, body: permissionIds as any });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

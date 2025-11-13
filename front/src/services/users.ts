import { apiClient } from './openapi';
import type { components, paths } from '../types/api';

export type User = components['schemas']['User'];

// 用户列表
export async function listUsers(params: paths['/api/Users/List']['get']['parameters']['query']) {
  const { data, error } = await apiClient.GET('/api/Users/List', { params: { query: params } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 用户明细
export async function getUserDetail(id: string) {
  const { data, error } = await apiClient.GET('/api/Users/Detail/{id}', { params: { path: { id } } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 创建用户
export async function createUser(payload: User) {
  const { data, error } = await apiClient.POST('/api/Users/Create', { body: payload });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 更新用户
export async function updateUser(id: string, payload: User) {
  const { data, error } = await apiClient.PUT('/api/Users/Update/{id}', { params: { path: { id } }, body: payload });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 删除用户
export async function deleteUser(id: string) {
  const { data, error } = await apiClient.DELETE('/api/Users/Delete/{id}', { params: { path: { id } } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 绑定角色
export async function bindUserRoles(id: string, roleIds: string[]) {
  const { data, error } = await apiClient.POST('/api/Users/BindRoles/{id}/roles', { params: { path: { id } }, body: roleIds });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 解绑角色
export async function unbindUserRoles(id: string, roleIds: string[]) {
  const { data, error } = await apiClient.DELETE('/api/Users/UnbindRoles/{id}/roles', { params: { path: { id } }, body: roleIds as any });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 重置密码（后端自定义端点，使用 fetch 兜底）
export async function resetPassword(id: string) {
  const resp = await fetch(`/api/Users/ResetPassword/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
  if (!resp.ok) throw new Error('reset failed');
  return await resp.json().catch(() => ({}));
}

// 设置密码
export async function setPassword(id: string, password: string) {
  const resp = await fetch(`/api/Users/SetPassword/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
  if (!resp.ok) throw new Error('set failed');
  return await resp.json().catch(() => ({}));
}

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

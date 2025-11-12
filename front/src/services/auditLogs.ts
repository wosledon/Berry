

import { apiClient } from './openapi';
import type { paths } from '../types/api';

// swagger 未生成 AuditLog 类型，需手动定义
export interface AuditLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  elapsedMs: number;
  createdAt: string;
  ip?: string;
  userAgent?: string;
  isDeleted?: boolean;
}

// 审计日志列表
export async function listAuditLogs(params: paths['/api/AuditLogs/Get']['get']['parameters']['query']) {
  const { data, error } = await apiClient.GET('/api/AuditLogs/Get', { params: { query: params } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 设置保留策略（删除早于 keepDays 的日志）
export async function retentionDelete(keepDays: number) {
  const { data, error } = await apiClient.DELETE('/api/AuditLogs/Retention/retention', { params: { query: { keepDays } } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 批量删除（软/硬由后端决定，此处按接口对接）
export async function bulkDeleteAuditLogs(ids: string[]) {
  const { data, error } = await apiClient.DELETE('/api/AuditLogs/BulkDelete', { body: ids as any });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 按日期清理（删除早于 before 的日志）
export async function purgeAuditLogs(before: string) {
  const { data, error } = await apiClient.DELETE('/api/AuditLogs/Purge/purge', { params: { query: { before } } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

// 按ID清理
export async function purgeByIdsAuditLogs(ids: string[]) {
  const { data, error } = await apiClient.POST('/api/AuditLogs/PurgeByIds/purge', { body: ids });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

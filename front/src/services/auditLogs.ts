

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

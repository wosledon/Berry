import http from './http';

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

export async function listAuditLogs(page = 1, size = 20, method?: string, status?: number) {
  const params: any = { page, size };
  if (method) params.method = method;
  if (status) params.status = status;
  const resp = await http.get('/audit-logs', { params });
  return resp.data as { items: AuditLog[]; total: number; page: number; size: number };
}

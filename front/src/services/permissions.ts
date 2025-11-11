import http from './http';

export interface Permission { id: string; name: string; description?: string; createdAt?: string; isDeleted?: boolean }

export async function listPermissions(page = 1, size = 20, search?: string) {
  const resp = await http.get('/permissions', { params: { page, size, search } });
  return resp.data as { items: Permission[]; total: number; page: number; size: number };
}

export async function upsertPermission(name: string, description?: string) {
  const resp = await http.put(`/permissions/${encodeURIComponent(name)}`, { description });
  return resp.data as Permission;
}

export async function syncPermissions() {
  const resp = await http.post('/permissions/sync');
  return resp.data as { added: number; updated: number };
}

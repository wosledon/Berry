import http from './http';

export interface Role { id: string; name: string; description?: string }

export async function listRoles(page = 1, size = 20, search?: string) {
  const resp = await http.get('/roles', { params: { page, size, search } });
  return resp.data as { items: Role[]; total: number; page: number; size: number };
}

export async function getRoleDetail(id: string) {
  const resp = await http.get<{ role: Role; permissions: string[] }>(`/roles/${id}`);
  return resp.data;
}

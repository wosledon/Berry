import http from './http';

export interface Tenant {
  id?: string;
  tenantId?: string;
  name?: string;
  description?: string;
  isDeleted?: boolean;
  isDisabled?: boolean;
  createdAt?: string;
}

export interface PagedResult<T> { items: T[]; total: number; page: number; size: number }

export async function listTenants(params: { page?: number; size?: number; search?: string }): Promise<PagedResult<Tenant>> {
  const { data } = await http.get('/Tenants/List', { params });
  return data;
}

export async function createTenant(payload: Tenant): Promise<Tenant> {
  const { data } = await http.post('/Tenants/Create', payload);
  return data;
}

export async function updateTenant(id: string, payload: Tenant): Promise<Tenant> {
  const { data } = await http.put(`/Tenants/Update/${id}`, payload);
  return data;
}

export async function deleteTenant(id: string): Promise<void> {
  await http.delete(`/Tenants/Delete/${id}`);
}

export async function listAllTenants(): Promise<Tenant[]> {
  try {
    const { data } = await http.get('/Tenants/List', { params: { page: 1, size: 1000 } });
    return data?.items ?? [];
  } catch {
    return [{ tenantId: 'public', name: 'Public' } as Tenant];
  }
}

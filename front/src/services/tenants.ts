import { apiClient } from './openapi';
import type { components, paths } from '../types/api';

export interface Tenant {
  tenantId?: string | null;
  name?: string | null;
  description?: string | null;
  isDeleted?: boolean;
  isDisabled?: boolean;
  createdAt?: string | null;
}

export interface PagedResult<T> { items: T[]; total: number; page: number; size: number }

export async function listTenants(params: paths['/api/Tenants/List']['get']['parameters']['query']): Promise<PagedResult<Tenant>> {
  const { data, error } = await apiClient.GET('/api/Tenants/List', { params: { query: params } });
  if (error) throw error;
  return (data as any)?.['application/json'] ?? (data as any);
}

export async function createTenant(payload: components['schemas']['CreateTenantRequest']): Promise<Tenant> {
  const { data, error } = await apiClient.POST('/api/Tenants/Create', { body: payload });
  if (error) throw error;
  const content = (data as any)?.['application/json'] ?? (data as any);
  return content as components['schemas']['TenantDto'];
}

export async function updateTenant(id: string, payload: components['schemas']['UpdateTenantRequest']): Promise<Tenant> {
  const { data, error } = await apiClient.PUT('/api/Tenants/Update/{id}', { params: { path: { id } }, body: payload });
  if (error) throw error;
  const content = (data as any)?.['application/json'] ?? (data as any);
  return content as components['schemas']['TenantDto'];
}

export async function deleteTenant(id: string): Promise<void> {
  const { error } = await apiClient.DELETE('/api/Tenants/Delete/{id}', { params: { path: { id } } });
  if (error) throw error;
}

export async function listAllTenants(): Promise<Tenant[]> {
  try {
    const { data, error } = await apiClient.GET('/api/Tenants/List', { params: { query: { page: 1, size: 1000 } } });
    if (error) throw error;
    const content = (data as any)?.['application/json'] ?? (data as any);
    return content?.items ?? [];
  } catch {
    return [{ tenantId: 'public', name: 'Public' } as Tenant];
  }
}

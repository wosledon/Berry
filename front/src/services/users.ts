import http from './http';

export interface User {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  createdAt?: string;
  isDeleted?: boolean;
}

export interface Paged<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

export async function listUsers(page = 1, size = 20, search?: string, extra?: { roleId?: string; hasPermission?: string; includeDeleted?: boolean }) {
  const resp = await http.get<Paged<User>>('/users', { params: { page, size, search, ...extra } });
  return resp.data;
}

export async function getUserDetail(id: string) {
  const resp = await http.get<{ user: User; roles: any[]; directPermissions: string[]; effectivePermissions: string[] }>(`/Users/Detail/${id}`);
  return resp.data;
}

import http from './http';

export interface MenuItem {
  id?: string;
  parentId?: string | null;
  name?: string;
  path?: string;
  icon?: string;
  order?: number;
  permission?: string;
  isDeleted?: boolean;
  createdAt?: string;
}

export interface PagedResult<T> { items: T[]; total: number; page: number; size: number }

export async function listMenus(params: { page?: number; size?: number; search?: string }): Promise<PagedResult<MenuItem>> {
  const { data } = await http.get('/Menus/List', { params });
  return data;
}

export async function createMenu(payload: MenuItem): Promise<MenuItem> {
  const { data } = await http.post('/Menus/Create', payload);
  return data;
}

export async function updateMenu(id: string, payload: MenuItem): Promise<MenuItem> {
  const { data } = await http.put(`/Menus/Update/${id}`, payload);
  return data;
}

export async function deleteMenu(id: string): Promise<void> {
  await http.delete(`/Menus/Delete/${id}`);
}

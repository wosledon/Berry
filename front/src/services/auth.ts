import { apiClient } from './openapi';
import type { components, paths } from '../types/api';

export type LoginRequest = components['schemas']['LoginRequest'];
export type LoginResponse = components['schemas']['LoginResponse'];

// 路径 key 匹配 swagger 生成："/api/Auth/login"
export async function login(data: LoginRequest): Promise<LoginResponse> {
  // openapi-fetch 泛型：<路径字符串, 方法>
  const { data: resp, error } = await apiClient.POST('/api/Auth/login', { body: data });
  if (error) throw error;
  const content = (resp as any)?.['application/json'] || (resp as any)?.['text/json'] || (resp as any)?.['text/plain'] || resp;
  return content as LoginResponse;
}

// 注册（后端未在 openapi 中声明，采用 fetch 进行调用）
export async function register(payload: { username: string; password: string; tenantId: string; displayName?: string; email?: string; }) {
  const resp = await fetch('/api/Auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!resp.ok) throw new Error('register failed');
  return await resp.json().catch(()=>({}));
}

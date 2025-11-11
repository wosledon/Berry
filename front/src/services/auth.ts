import http from './http';

interface LoginRequest { username: string; password: string; tenantId?: string }
interface LoginResponse { token: string; userId: string; tenantId?: string }

export async function login(data: LoginRequest) {
  // 后端需实现 /api/auth/login 返回 { token, userId, tenantId }
  const resp = await http.post<LoginResponse>('/auth/login', data);
  return resp.data;
}

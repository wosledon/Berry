import axios from 'axios';
import { getAuthState } from './local';

const instance = axios.create({
  baseURL: '/api',
  timeout: 15000
});

instance.interceptors.request.use(cfg => {
  const auth = getAuthState();
  if (auth?.token) cfg.headers['Authorization'] = `Bearer ${auth.token}`;
  if (auth?.tenantId) cfg.headers['X-Tenant'] = auth.tenantId;
  return cfg;
});

instance.interceptors.response.use(r => r, err => {
  if (err.response?.status === 401) {
    // 统一跳转登录
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
  return Promise.reject(err);
});

export default instance;

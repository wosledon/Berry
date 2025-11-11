import createClient from 'openapi-fetch';
// 需要先运行 npm run gen:api 生成此类型定义
import type { paths } from '../types/api';

export const apiClient = createClient<paths>({
  baseUrl: '/api',
});

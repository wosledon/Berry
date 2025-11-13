# Berry 前端开发详细指南

## 概述

Berry 框架的前端基于 React 18 + TypeScript + Vite 构建，采用现代前端技术栈，支持国际化、类型安全 API 调用、组件化开发。本指南将帮助开发者快速上手前端开发。

## 环境要求

- Node.js 18+
- npm 或 yarn 或 pnpm
- VS Code (推荐安装 TypeScript、React 相关扩展)

## 项目结构

```
front/
├── public/                    # 静态资源
├── src/
│   ├── components/           # 通用组件
│   │   ├── common/          # 基础组件
│   │   ├── layout/          # 布局组件
│   │   └── business/        # 业务组件
│   ├── pages/               # 页面组件
│   ├── services/            # API 服务层
│   ├── hooks/               # 自定义 Hooks
│   ├── utils/               # 工具函数
│   ├── types/               # TypeScript 类型定义
│   ├── locales/             # 国际化文件
│   ├── styles/              # 样式文件
│   ├── App.tsx              # 应用入口
│   ├── main.tsx             # 主入口文件
│   └── vite-env.d.ts        # Vite 类型定义
├── package.json             # 项目配置
├── tsconfig.json            # TypeScript 配置
├── vite.config.ts           # Vite 配置
└── tailwind.config.js       # Tailwind CSS 配置
```

## 核心技术栈

### React 18
- 使用新特性：Concurrent Features、Automatic Batching
- 函数组件 + Hooks 模式

### TypeScript
- 严格类型检查
- 接口定义和类型推断

### Vite
- 快速构建和热重载
- ESModule 原生支持

### Ant Design
- 企业级 UI 组件库
- 主题定制和国际化支持

### TanStack Query
- 服务端状态管理
- 缓存和同步机制

### React Router v6
- 声明式路由
- 嵌套路由和代码分割

## 开发流程

### 1. 环境设置

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 2. 创建页面组件

```tsx
// src/pages/Dashboard.tsx
import React from 'react';
import { Card, Row, Col, Statistic } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/services/dashboard';

const Dashboard: React.FC = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats
  });

  return (
    <div>
      <h1>仪表板</h1>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="用户总数"
              value={data?.userCount || 0}
              loading={isLoading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="订单总数"
              value={data?.orderCount || 0}
              loading={isLoading}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
```

### 3. 创建业务组件

```tsx
// src/components/business/UserTable.tsx
import React from 'react';
import { Table, Button, Space } from 'antd';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userApi } from '@/services/user';
import type { User } from '@/types/user';

const UserTable: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: users, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: userApi.getUsers
  });

  const deleteMutation = useMutation({
    mutationFn: userApi.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });

  const columns = [
    {
      title: '用户名',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '邮箱',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: User) => (
        <Space size="middle">
          <Button type="link">编辑</Button>
          <Button
            type="link"
            danger
            onClick={() => deleteMutation.mutate(record.id)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={users}
      loading={isLoading}
      rowKey="id"
    />
  );
};

export default UserTable;
```

### 4. API 服务层

```typescript
// src/services/user.ts
import { apiClient } from './apiClient';
import type { User, CreateUserDto, UpdateUserDto } from '@/types/user';

export const userApi = {
  getUsers: () =>
    apiClient.GET('/api/users', {}),

  getUser: (id: number) =>
    apiClient.GET('/api/users/{id}', { params: { path: { id } } }),

  createUser: (data: CreateUserDto) =>
    apiClient.POST('/api/users', { body: data }),

  updateUser: (id: number, data: UpdateUserDto) =>
    apiClient.PUT('/api/users/{id}', { params: { path: { id } }, body: data }),

  deleteUser: (id: number) =>
    apiClient.DELETE('/api/users/{id}', { params: { path: { id } } }),
};
```

### 5. 自定义 Hooks

```typescript
// src/hooks/useAuth.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/services/auth';
import type { LoginDto } from '@/types/auth';

export const useAuth = () => {
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      queryClient.setQueryData(['auth', 'user'], data.user);
    }
  });

  const logout = () => {
    localStorage.removeItem('token');
    queryClient.clear();
  };

  return {
    login: loginMutation.mutate,
    logout,
    isLoggingIn: loginMutation.isPending,
    loginError: loginMutation.error,
  };
};
```

### 6. 工具函数

```typescript
// src/utils/format.ts
export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(amount);
};
```

## 路由配置

```typescript
// src/routes/index.tsx
import { createBrowserRouter } from 'react-router-dom';
import Layout from '@/components/layout/Layout';
import Dashboard from '@/pages/Dashboard';
import UserManagement from '@/pages/UserManagement';
import Login from '@/pages/Login';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'users',
        element: <UserManagement />,
      },
      {
        path: 'products',
        lazy: () => import('@/pages/ProductManagement'),
      },
    ],
  },
]);
```

## 国际化配置

```typescript
// src/locales/zh-CN.json
{
  "common": {
    "save": "保存",
    "cancel": "取消",
    "delete": "删除",
    "edit": "编辑"
  },
  "user": {
    "username": "用户名",
    "email": "邮箱",
    "role": "角色"
  }
}

// src/locales/en-US.json
{
  "common": {
    "save": "Save",
    "cancel": "Cancel",
    "delete": "Delete",
    "edit": "Edit"
  },
  "user": {
    "username": "Username",
    "email": "Email",
    "role": "Role"
  }
}
```

## 样式管理

### Tailwind CSS

```tsx
// 直接在组件中使用
<div className="bg-blue-500 text-white p-4 rounded-lg shadow-md">
  <h2 className="text-xl font-bold">标题</h2>
  <p className="mt-2">内容</p>
</div>
```

### 自定义样式

```css
/* src/styles/custom.css */
.custom-button {
  @apply bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-2 rounded-md;
  transition: all 0.3s ease;
}

.custom-button:hover {
  @apply from-blue-600 to-purple-600 scale-105;
}
```

## 状态管理

### 全局状态 (Zustand)

```typescript
// src/stores/userStore.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

interface UserState {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  clearUser: () => void;
}

export const useUserStore = create<UserState>()(
  devtools(
    persist(
      (set) => ({
        currentUser: null,
        setCurrentUser: (user) => set({ currentUser: user }),
        clearUser: () => set({ currentUser: null }),
      }),
      {
        name: 'user-storage',
      }
    ),
    {
      name: 'user-store',
    }
  )
);
```

## 测试

### 组件测试

```tsx
// src/components/__tests__/UserTable.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserTable from '../UserTable';

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

test('renders user table', async () => {
  const queryClient = createTestQueryClient();

  render(
    <QueryClientProvider client={queryClient}>
      <UserTable />
    </QueryClientProvider>
  );

  await waitFor(() => {
    expect(screen.getByText('用户名')).toBeInTheDocument();
  });
});
```

### Hook 测试

```tsx
// src/hooks/__tests__/useAuth.test.tsx
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuth } from '../useAuth';

test('login mutation', async () => {
  const queryClient = createTestQueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );

  const { result } = renderHook(() => useAuth(), { wrapper });

  act(() => {
    result.current.login({ username: 'test', password: 'test' });
  });

  expect(result.current.isLoggingIn).toBe(true);
});
```

## 构建和部署

### 构建配置

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
```

### Docker 部署

```dockerfile
FROM node:18-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 最佳实践

1. **组件设计**：保持组件单一职责，使用组合而非继承
2. **性能优化**：使用 React.memo、useMemo、useCallback 避免不必要的重渲染
3. **类型安全**：充分利用 TypeScript，定义严格的接口
4. **错误处理**：使用 Error Boundary 处理组件错误
5. **代码分割**：使用 React.lazy 和 Suspense 实现代码分割
6. **可访问性**：遵循 WCAG 指南，确保应用可访问

## 常见问题

### Q: 如何处理 API 错误？

A: 使用 TanStack Query 的 error 处理机制，或创建全局错误处理 Hook。

### Q: 如何实现主题切换？

A: 使用 CSS 变量和 React Context 管理主题状态。

### Q: 如何优化大型列表的性能？

A: 使用虚拟化列表库如 react-window，或实现分页和无限滚动。

---

[返回开发文档](README.md)
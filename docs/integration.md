# Berry 对接与使用指南

本文档面向集成方与开发者，详细说明如何对接 Berry 后端 API、进行前端二次开发，以及常见集成场景。

## 目录
- [后端 API 对接](#后端-api-对接)
  - [认证与授权](#认证与授权)
  - [多租户处理](#多租户处理)
  - [权限管理](#权限管理)
  - [菜单管理](#菜单管理)
  - [用户与租户管理](#用户与租户管理)
  - [审计日志](#审计日志)
- [前端二次开发](#前端二次开发)
  - [项目结构](#项目结构)
  - [添加新页面](#添加新页面)
  - [集成新 API](#集成新 API)
  - [自定义菜单](#自定义菜单)
  - [国际化](#国际化)
  - [主题与样式](#主题与样式)
- [常见集成场景](#常见集成场景)
  - [企业级应用集成](#企业级应用集成)
  - [第三方认证](#第三方认证)
  - [自定义业务模块](#自定义业务模块)
- [部署与运维](#部署与运维)
- [故障排查](#故障排查)

## 后端 API 对接

Berry 后端基于 ASP.NET Core (.NET 8)，提供 RESTful API，通过 Swagger/OpenAPI 文档化。所有 API 均支持 JWT 认证和多租户上下文。

### 认证与授权

#### 登录
- **端点**: `POST /api/Auth/login`
- **请求体**:
  ```json
  {
    "username": "admin",
    "password": "password",
    "tenantId": "public"
  }
  ```
- **响应**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userId": "user-id",
    "tenantId": "public",
    "expiresAt": "2023-12-31T23:59:59Z"
  }
  ```
- **使用**: 将 `token` 存储在客户端，后续请求在 `Authorization: Bearer <token>` 头中携带。

#### 注册
- **端点**: `POST /api/Auth/register`
- **请求体**:
  ```json
  {
    "username": "newuser",
    "password": "password123",
    "tenantId": "public",
    "displayName": "New User",
    "email": "user@example.com"
  }
  ```
- **注意**: 注册成功后可直接登录。

#### 权限检查
- 控制器方法使用 `[Permission("resource.action")]` 特性。
- 前端应在 UI 中根据用户 `effectivePermissions` 隐藏/禁用无权限操作。

### 多租户处理

- **请求头**: `X-Tenant: <tenantId>`
- **租户解析顺序**: 请求头 > JWT Claim > 配置默认。
- **系统租户**: `SystemTenant` 实体不受租户过滤，用于跨租户管理。
- **集成建议**: 在客户端存储当前租户 ID，每次请求自动附加 `X-Tenant` 头。

### 权限管理

#### 权限同步
- 启动时自动扫描 `[Permission]` 特性，同步到数据库。
- 支持分组和去重。

#### 用户权限
- **获取用户详情**: `GET /api/Users/{id}`
- **授予权限**: `POST /api/Users/{id}/permissions`
- **撤销权限**: `DELETE /api/Users/{id}/permissions`

#### 角色管理
- **角色列表**: `GET /api/Roles/List`
- **绑定角色**: `POST /api/Users/{id}/roles`

### 菜单管理

#### 菜单导入（上报）
- **端点**: `POST /api/Menus/Import`
- **请求体**:
  ```json
  [
    {
      "name": "用户管理",
      "path": "/users",
      "icon": "team",
      "order": 1,
      "permission": "users.view",
      "parentPath": null
    }
  ]
  ```
- **逻辑**: 按 `Path` 幂等 Upsert，第一轮更新基本信息，第二轮设置 `ParentId`（优先 `ParentPath`，否则推断）。

#### 菜单查询
- **端点**: `GET /api/Menus/List?page=1&size=20&search=keyword`
- **响应**: `{ items: [...], total: 100, page: 1, size: 20 }`

### 用户与租户管理

#### 用户 CRUD
- **列表**: `GET /api/Users/List`
- **创建**: `POST /api/Users/Create`
- **更新**: `PUT /api/Users/{id}`
- **删除**: `DELETE /api/Users/{id}`
- **密码管理**: `POST /api/Users/{id}/SetPassword` 或 `ResetPassword`

#### 租户 CRUD
- **列表**: `GET /api/Tenants/List`
- **创建**: `POST /api/Tenants/Create`
- **更新**: `PUT /api/Tenants/{id}`
- **删除**: `DELETE /api/Tenants/{id}`

### 审计日志

- **查询**: `GET /api/AuditLogs/List`
- **字段**: 用户、租户、操作、资源、结果、耗时、IP、UA。

## 前端二次开发

前端基于 React + TypeScript + Vite，采用模块化架构，支持快速定制。

### 项目结构

```
front/src/
  components/     # 通用组件 (Layout, PagedTable 等)
  pages/          # 页面组件
  services/       # API 服务 (openapi-fetch 客户端)
  config/         # 配置 (routes.ts)
  context/        # React Context (Auth, Permissions, Theme)
  hooks/          # 自定义 Hooks
  locales/        # 国际化资源
  types/          # 类型定义 (从 OpenAPI 生成)
```

### 添加新页面

1. **创建页面组件**:
   ```tsx
   // src/pages/NewPage.tsx
   import { useTranslation } from 'react-i18next';
   
   export function NewPage() {
     const { t } = useTranslation();
     return <div>{t('newPage.title')}</div>;
   }
   ```

2. **添加路由**:
   ```typescript
   // src/config/routes.ts
   export const routes: RouteItem[] = [
     // ... existing
     { path: '/new', titleKey: 'newPage.title', iconKey: 'settings', any: ['new.view'] }
   ];
   ```

3. **添加权限守卫**:
   ```tsx
   // src/pages/App.tsx
   import { PermissionGuard } from '../components/PermissionGuard';
   
   <Route path="/new" element={<PermissionGuard any={["new.view"]}><NewPage /></PermissionGuard>} />
   ```

4. **添加国际化**:
   ```json
   // src/locales/zhCn.json
   {
     "newPage": {
       "title": "新页面"
     }
   }
   ```

### 集成新 API

1. **后端添加端点** (例如 `GET /api/New/List`)

2. **生成类型**:
   ```bash
   npm run gen:api
   ```

3. **创建服务**:
   ```typescript
   // src/services/new.ts
   import { apiClient } from './openapi';
   
   export async function listNew(params: { page: number; size: number }) {
     const { data } = await apiClient.GET('/api/New/List', { params: { query: params } });
     return data;
   }
   ```

4. **在组件中使用**:
   ```tsx
   import { useQuery } from '@tanstack/react-query';
   import { listNew } from '../services/new';
   
   const { data } = useQuery({ queryKey: ['new'], queryFn: listNew });
   ```

### 自定义菜单

- **静态菜单**: 编辑 `routes.ts`，管理员可见。
- **动态菜单**: 后端管理菜单，前端自动拉取（普通用户）。
- **上报菜单**: 管理员点击“上报菜单”同步静态路由到后端。

### 国际化

- **添加文案**: 在 `locales/*.json` 中添加键值对。
- **使用**: `const { t } = useTranslation(); t('key')`
- **切换语言**: `i18n.changeLanguage('zh' | 'en')`

### 主题与样式

- **主题切换**: 使用 `useTheme` Context，支持暗色/亮色。
- **样式**: Tailwind CSS + Ant Design，组件使用 `ui-card` 等类。
- **自定义**: 编辑 `tailwind.config.js` 或 `src/styles/index.css`。

## 常见集成场景

### 企业级应用集成

- **步骤**:
  1. 配置多租户：设置 `X-Tenant` 头。
  2. 集成认证：使用 `/api/Auth/login` 获取 JWT。
  3. 同步权限：根据业务需求授予用户权限。
  4. 自定义菜单：上报业务菜单到后端。

### 第三方认证

- **扩展 AuthController**: 添加 OAuth2 端点。
- **JWT 增强**: 在 Token 中添加第三方用户信息。

### 自定义业务模块

- **后端**: 添加新 Controller，继承 `ApiControllerBase`，使用 `[Permission]`。
- **前端**: 添加页面、服务、路由，生成 OpenAPI 类型。

## 部署与运维

- **后端**: Docker 构建，暴露 5099 端口。
- **前端**: `npm run build`，静态文件部署到 Nginx/Apache。
- **数据库**: PostgreSQL 生产环境，SQLite 开发。
- **监控**: 集成 OpenTelemetry (未来)。

## 故障排查

- **401 Unauthorized**: 检查 JWT Token 和 `X-Tenant` 头。
- **403 Forbidden**: 确认用户权限。
- **API 类型缺失**: 重启后端，执行 `npm run gen:api`。
- **菜单不显示**: 检查权限和租户上下文。

---

如需更多细节，请参考 `docs/architecture.md` 或提交 Issue。
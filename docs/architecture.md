# Berry 前后端架构与开发指南

本文档面向项目贡献者与集成方，聚焦“可落地”的工程细节：后端模块组成、认证与权限、菜单混合策略、OpenAPI 类型生成、开发运行与常见问题排查。

## 总览
- 后端：ASP.NET Core (.NET 8)，EF Core（软删/多租户过滤），JWT 认证，RBAC 权限，Swagger/OpenAPI。
- 前端：React + TypeScript + Vite + Ant Design + TanStack Query + i18next，使用 openapi-fetch 基于 Swagger 自动生成类型化客户端。
- 菜单策略：管理员使用静态 routes.ts 并可“一键上报菜单”写入服务端；普通用户启动时从服务端拉取“可见菜单树”（基于权限）动态构建导航。

## 后端结构与模块
- Host: `src/Berry.Host`（API 控制器、路由：`api/[controller]/[action]`）
- 基础设施: `src/Berry.Infrastructure`（DbContext、实体、配置）
- 模块：`Berry.Modules.*`（Rbac/Tenant/Audit/Caching/Messaging 等）
- 共享：`Berry.Shared`（安全、租户上下文、工具）

关键控制器（节选）：
- AuthController（`/api/Auth/login|register`）登录/注册，返回 JWT。
- UsersController（`/api/Users/*`）用户分页、详情、角色/权限绑定、管理密码：
  - `POST /api/Users/ResetPassword/{id}` 重置（置空哈希）
  - `POST /api/Users/SetPassword/{id}` 设置新密码（长度校验）
- TenantsController（`/api/Tenants/*`）租户分页/增删改。
- MenusController（`/api/Menus/*`）菜单分页/增删改与导入：
  - `POST /api/Menus/Import` 从静态路由批量上报（按 Path 幂等 Upsert，第二轮设置 ParentId，若未提供 ParentPath 则基于 path 推断 `/a/b/c -> /a/b`）。

权限与多租户：
- `[Permission("xxx")]` 声明式标注，启动时扫描同步到权限表（去重）。
- 多租户通过 `ITenantContextAccessor` 注入，过滤器作用于大多数实体；`SystemTenant` 作为系统级实体不受租户过滤影响（用于登录时的租户校验）。

## 前端结构与要点
- 入口：`front/src/main.tsx`，应用壳 `components/Layout.tsx`。
- 路由表：`front/src/config/routes.ts`（仅管理员使用；用于“上报菜单”）
- 服务端 API：`front/src/services/*` 统一通过 `openapi-fetch` 客户端调用（`services/openapi.ts`）。
- 国际化：`front/src/locales`，`useTranslation()` 在 UI 中取文案。
- 权限守卫：`usePermissions.hasAny()` + 路由/菜单过滤。

混合菜单策略（Hybrid）：
- 管理员（拥有 `menus.manage`）
  - 使用静态 `routes.ts` 渲染左侧导航。
  - 可点击“上报菜单”，将静态路由扁平化后调用 `POST /api/Menus/Import` 批量 Upsert。
- 普通用户
  - 启动时调用 `GET /api/Menus/List?page=1&size=1000` 获取全量菜单；
  - 以 `ParentId` 组装为树，按 `order` → `name` 排序；
  - 仅保留当前用户具备权限的菜单项（`permission` 为空表示公开菜单）。

## OpenAPI 类型生成与使用
前端使用 `openapi-typescript` 从后端 Swagger 生成 TS 类型，并由 `openapi-fetch` 生成带类型的 API 客户端。

- 生成命令（已写入 `front/package.json`）：
  - `npm run gen:api`（默认读取 `http://localhost:5099/swagger/v1/swagger.json`）
- 客户端声明：`src/services/openapi.ts`
  - `createClient<paths>({ baseUrl: '/' })`，依赖 Vite 代理将 `/api` 转发到后端端口。
- 端点调用示例：
  - `apiClient.GET('/api/Menus/List', { params: { query: { page: 1, size: 20 } } })`
- 注意：新增/调整后端端点（如 `POST /api/Menus/Import`）后，请先重启后端以让 Swagger 暴露该端点，再执行 `npm run gen:api` 以更新前端类型。

## 开发与运行
后端（默认端口 5099）：
- 使用 VS Code/Visual Studio 启动 `Berry.Host` 或在命令行构建运行。
- 本地数据库默认 SQLite；首次启动会自动迁移并种子：系统租户、管理员角色/权限等。

前端（默认端口 5173）：
- `cd front && npm install && npm run dev`
- Vite 代理：`/api` → `http://localhost:5099`
- 环境变量：`front/.env.development`

登录与注册：
- 登录：`POST /api/Auth/login`，Body: `{ username, password, tenantId }`
- 注册：`POST /api/Auth/register`，注册成功会创建用户并返回用户信息。
- 前端将把 `X-Tenant` 附在请求头（从登录返回或本地选择），并携带 `Authorization: Bearer <token>`。

## Swagger 与上报菜单
- Swagger UI：`http://localhost:5099/swagger`。
- Menus Import 出现在 `/api/Menus/Import`（注意 Host 控制器使用 `api/[controller]/[action]` 模板，`[HttpPost]` 即可暴露为 `/Import`）。
- 上报规则：
  1) 第一轮：按 `Path` Upsert（Name/Icon/Order/Permission 同步）；
  2) 第二轮：设置 `ParentId`：优先使用传入 `ParentPath`；若为空，则根据自身 `Path` 自动推断父级路径。

## 常见问题排查（FAQ）
- 构建失败：后端 DLL 被占用（MSB3027/MSB3021）。
  - 原因：正在运行的进程（如 `Berry.Host`/`Berry.Sample`）锁定了输出文件。
  - 处理：停止运行的进程（VS/调试器/命令行），再重新构建；必要时清理输出后再编译。
- 前端类型缺少 `POST /api/Menus/Import`：
  - 先重启后端，确认 Swagger 已显示该端点；
  - 然后执行 `npm run gen:api` 重新生成类型。

## 约定与规范
- 路由模板：`api/[controller]/[action]`（除 AuthController 使用 `api/[controller]`）。
- 分页参数：`page`（>=1）、`size`（1~200），返回 `{ items, total, page, size }`。
- 权限字段：`Permission`（为空表示公共菜单/资源）。
- 排序：统一按 `order` 升序，再按 `name` 升序。

---
如需更深入的设计背景与路线图，请参考 `docs/design.md`。
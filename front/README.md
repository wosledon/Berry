# Berry 前端（React + Vite）

使用 React + TypeScript + Vite + Ant Design 构建的管理端模板，已对接 Berry 后端的认证、多租户、RBAC、菜单管理等接口，并通过 openapi-fetch 基于 Swagger 自动生成类型化客户端。

## 功能与要点
- 页面：Dashboard、Users、Roles、Permissions、Menus、Tenants、Audit Logs
- 权限守卫：`usePermissions.hasAny()` 与路由/菜单过滤联动
- 认证：`/api/Auth/login` 与 `/api/Auth/register`，携带 `Authorization: Bearer` 与 `X-Tenant`
- 混合菜单（Hybrid）：
  - 管理员使用静态 `routes.ts`（并可一键“上报菜单”到后端）
  - 普通用户启动时从后端拉取菜单并动态构建导航
- 国际化：`react-i18next`，文案在 `src/locales`
- OpenAPI：`openapi-typescript` + `openapi-fetch`，强类型 API 调用

## 开发运行
```bash
npm install
npm run dev
```
访问: http://localhost:5173

确保后端运行在 http://localhost:5099（Vite 通过代理将 /api 转发到后端）。

## OpenAPI 类型生成
- 生成命令：`npm run gen:api`
- 依赖地址：`http://localhost:5099/swagger/v1/swagger.json`
- 注意：新增后端端点（如 `POST /api/Menus/Import`）后需先重启后端以更新 Swagger，再执行本命令。

## 目录结构
```
front/
  package.json
  vite.config.mts
  src/
    config/routes.ts        # 静态路由（管理员使用）
    components/Layout.tsx   # 应用壳与混合菜单渲染
    pages/*                 # 页面组件
    services/*              # 使用 openapi-fetch 的 API 客户端
    context/*               # Auth / Permissions / Theme
    locales/*               # i18n 资源
```

## 常见问题
- 生成类型缺少某个端点：确认 Swagger 已显示该端点，若无请重启后端；然后执行 `npm run gen:api`。
- 请求 401：检查是否已通过登录获取 Token，或 `X-Tenant` 是否正确。

---
版本：0.2.0

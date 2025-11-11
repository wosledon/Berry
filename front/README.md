# Berry 前端模板

基于 React + TypeScript + Vite + Tailwind 的管理端脚手架，对接 Berry 后端内置接口（Users / Roles / Permissions / AuditLogs）。

## 功能点
- 页面：Dashboard、Users、Roles、Permissions、Audit Logs
- 权限守卫：`<PermissionGuard all|any>` 基于用户详情接口的 effectivePermissions
- Mock 登录：仅设置 `userId` 进入（后续接 JWT）
- 请求封装：Axios 拦截器附加 Token / 租户 Header
- 分页示例：列表页 20 条一页
- 权限管理：同步、Upsert 描述

## 开发运行
```bash
npm install
npm run dev
```
访问: http://localhost:5173

确保后端运行在 http://localhost:5099。

## 后续可扩展
- 接入真实认证：登录获取 JWT → 存储 token → 请求头自动附加
- 菜单权限动态生成：根据 `permissions` 过滤菜单数组
- 表格抽象：统一分页、搜索、列定义
- 国际化：接入 i18n（例如 react-i18next）
- OpenAPI 自动类型生成：使用 `openapi-typescript` + 代码生成 API Client

## 目录结构
```
front/
  package.json
  vite.config.ts
  src/
    pages/* 页面组件
    components/* 布局/守卫
    context/* Auth / Permissions 上下文
    services/* API 调用封装
    styles/* 全局样式
```

## 认证占位
当前后端尚未启用 JWT，权限过滤依赖后端返回的用户详情。若后端添加认证后：
1. 增加 /login 接口返回 token
2. AuthContext 存储 token 并附加 Authorization 头
3. 401 拦截器统一跳转 /login

## 租户支持
通过在 localStorage 存放 `tenantId`（未来登录返回），拦截器设置 `X-Tenant` 头。

---
> 初始版本：0.1.0

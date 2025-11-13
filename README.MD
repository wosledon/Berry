
<div align="center">
	<img src="front/src/assets/berry.svg" alt="Berry" width="72" height="72" />
	<h1>Berry</h1>
	<p>面向企业的一体化 Web 开发生态：.NET 后端 + React 前端，内置多租户、RBAC、审计、菜单管理、OpenAPI 类型生成。</p>
</div>

## 功能概览
- 后端：ASP.NET Core (.NET 8)、EF Core、JWT 认证、RBAC、Swagger/OpenAPI
- 前端：React + TypeScript + Vite + Ant Design + TanStack Query + i18n
- 混合菜单：管理员静态路由 + 一键上报；普通用户动态拉取菜单构建导航
- OpenAPI：基于 Swagger 自动生成类型，使用 openapi-fetch 进行类型安全调用

## 快速开始
1) 启动后端（默认端口 5099）
- 使用 VS/VS Code 运行 `src/Berry.Host`
- 首次启动自动迁移并种子数据（系统租户、权限等）

2) 启动前端（默认端口 5173）
```bash
cd front
npm install
npm run dev
```
浏览器访问 http://localhost:5173

3) 生成 API 类型（可选，但推荐）
```bash
cd front
npm run gen:api
```
注意：如新增了后端端点（例如 `POST /api/Menus/Import`），需先重启后端以让 Swagger 暴露该端点，然后再执行类型生成。

## 关键能力
- 多租户：请求头 `X-Tenant` 解析；系统租户不受租户过滤影响
- 权限：控制器以 `[Permission("...")]` 声明；启动时自动同步权限表并去重
- 菜单管理：
	- 管理员在前端可“上报菜单”（静态 routes.ts → `POST /api/Menus/Import`），服务端按 Path 幂等 Upsert
	- 普通用户登录后拉取可见菜单，按 `ParentId` 组装树与排序
- 认证：`/api/Auth/login` 与 `/api/Auth/register`，返回 JWT；前端携带 `Authorization: Bearer` 与 `X-Tenant`

## 文档
- 架构与开发指南：`docs/architecture.md`
- 设计背景与路线图：`docs/design.md`

## 常见问题（FAQ）
- 前端类型缺少端点：
	- 确认 Swagger 已暴露该端点（重启后端），然后执行 `npm run gen:api`

## 许可证
MIT


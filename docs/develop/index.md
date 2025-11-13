# Berry 开发文档

本文档面向开发者，详细介绍 Berry 框架的架构、引入方式以及开发指南，帮助您快速上手并高效开发企业级应用。

## 目录
- [框架介绍](#框架介绍)
  - [核心理念](#核心理念)
  - [技术架构](#技术架构)
  - [主要特性](#主要特性)
- [框架引入](#框架引入)
  - [后端引入](#后端引入)
  - [前端引入](#前端引入)
  - [环境配置](#环境配置)
- [开发指南](#开发指南)
  - [后端开发](#后端开发)
  - [前端开发](#前端开发)
  - [数据库与迁移](#数据库与迁移)
  - [测试与调试](#测试与调试)
- [最佳实践](#最佳实践)
- [常见问题](#常见问题)

## 框架介绍

### 核心理念

Berry 是一个现代化的企业级 Web 应用框架，专为快速构建可扩展、多租户的后台管理系统而设计。它秉承以下核心理念：

- **一体化**: 前后端深度集成，OpenAPI 自动生成类型，确保类型安全和开发效率。
- **模块化**: 后端采用模块化架构，支持按需装配功能，避免单体应用的问题。
- **可扩展**: 插件化设计，允许无缝集成第三方服务和自定义扩展。
- **企业级**: 内置多租户、RBAC、审计等企业必备功能，开箱即用。
- **开发者友好**: 提供完整的开发工具链、文档和示例，降低学习成本。

### 技术架构

Berry 采用经典的分层架构：

```
┌─────────────────┐
│   前端 (React)   │ ← UI 层，负责用户交互
├─────────────────┤
│   API 层 (ASP.NET Core) │ ← RESTful API，业务逻辑
├─────────────────┤
│   领域层 (Domain) │ ← 业务规则、实体、领域服务
├─────────────────┤
│   基础设施层 (Infrastructure) │ ← 数据访问、缓存、消息队列
└─────────────────┘
```

- **后端**: ASP.NET Core (.NET 8) + EF Core + 模块化设计
- **前端**: React 18 + TypeScript + Vite + Ant Design
- **数据**: 支持 SQLite (开发) 和 PostgreSQL (生产)
- **通信**: OpenAPI + Swagger + JWT 认证

### 主要特性

- **多租户支持**: 逻辑隔离，支持租户级配置和数据隔离
- **权限管理**: 基于角色的访问控制 (RBAC)，细粒度权限控制
- **菜单系统**: 混合菜单策略，支持静态和动态菜单
- **审计日志**: 完整的操作审计，支持查询和导出
- **国际化**: 支持多语言切换 (中文/英文)
- **主题系统**: 暗色/亮色主题，响应式设计
- **类型安全**: OpenAPI 自动生成 TypeScript 类型
- **开发工具**: 热重载、Swagger UI、结构化日志

## 框架引入

### 后端引入

#### 1. 创建 ASP.NET Core 项目

```bash
dotnet new webapi -n MyBerryApp
cd MyBerryApp
```

#### 2. 添加 Berry 包引用

```bash
# 添加核心包
dotnet add package Berry.Host
dotnet add package Berry.Modules.Rbac
dotnet add package Berry.Modules.Tenant
dotnet add package Berry.Modules.Audit
# 根据需要添加其他模块
```

#### 3. 配置 Program.cs

```csharp
using Berry.Host;

var builder = WebApplication.CreateBuilder(args);

// 添加 Berry 服务
builder.Services.AddBerry(builder.Configuration);

// 配置数据库 (SQLite 用于开发)
builder.Services.AddDbContext<BerryDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

// 使用 Berry 中间件
app.UseBerry();

app.Run();
```

#### 4. 配置 appsettings.json

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Data Source=berry.db"
  },
  "Jwt": {
    "Key": "YourSecretKeyHere",
    "Issuer": "berry.dev",
    "Audience": "berry.clients",
    "ExpiresMinutes": 120
  },
  "Seed": {
    "TenantId": "public",
    "AdminUsername": "admin",
    "AdminPassword": "Admin123!"
  }
}
```

#### 5. 运行应用

```bash
dotnet run
```

访问 `http://localhost:5000/swagger` 查看 API 文档。

### 前端引入

#### 1. 创建 React 项目

```bash
npm create vite@latest my-berry-app -- --template react-ts
cd my-berry-app
```

#### 2. 安装依赖

```bash
npm install antd @ant-design/icons react-router-dom @tanstack/react-query openapi-fetch openapi-typescript i18next react-i18next clsx
```

#### 3. 配置 Vite 代理

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
});
```

#### 4. 生成 API 类型

```bash
# 生成 TypeScript 类型
npx openapi-typescript http://localhost:5000/swagger/v1/swagger.json -o src/types/api.ts
```

#### 5. 配置应用入口

```typescript
// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

#### 6. 创建基础布局

```typescript
// src/App.tsx
import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </Layout>
  );
}

export default App;
```

### 环境配置

#### 开发环境
- 使用 SQLite 数据库
- 启用 Swagger UI
- 开发模式下的热重载

#### 生产环境
- 使用 PostgreSQL
- 配置 JWT 密钥
- 设置 CORS 策略
- 启用 HTTPS

## 开发指南

### 后端开发

#### 添加新控制器

```csharp
using Berry.Host.Controllers;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Mvc;

namespace MyApp.Controllers;

[ApiController]
[Route("api/[controller]/[action]")]
public class ProductsController : ApiControllerBase
{
    [HttpGet]
    [Permission("products.view")]
    public async Task<ActionResult<object>> List()
    {
        // 实现业务逻辑
        return Ok(new { items = new[] { "Product1", "Product2" } });
    }
}
```

#### 添加权限

在控制器方法上使用 `[Permission("resource.action")]` 特性，框架会自动同步到权限表。

#### 自定义模块

```csharp
// 创建自定义模块
public class MyModule : IModule
{
    public void ConfigureServices(IServiceCollection services)
    {
        // 注册服务
    }

    public void ConfigureApplication(WebApplication app)
    {
        // 配置中间件
    }
}
```

### 前端开发

#### 添加新页面

```typescript
// src/pages/Products.tsx
import { useQuery } from '@tanstack/react-query';
import { listProducts } from '../services/products';

export function Products() {
  const { data } = useQuery({ queryKey: ['products'], queryFn: listProducts });

  return (
    <div>
      <h1>产品列表</h1>
      {/* 渲染产品列表 */}
    </div>
  );
}
```

#### 添加路由

```typescript
// src/config/routes.ts
export const routes: RouteItem[] = [
  // ... 现有路由
  { path: '/products', titleKey: 'menu.products', iconKey: 'appstore', any: ['products.view'] }
];
```

#### 使用 API 服务

```typescript
// src/services/products.ts
import { apiClient } from './openapi';

export async function listProducts() {
  const { data } = await apiClient.GET('/api/Products/List');
  return data;
}
```

#### 权限守卫

```typescript
import { PermissionGuard } from '../components/PermissionGuard';

<Route path="/products" element={
  <PermissionGuard any={["products.view"]}>
    <Products />
  </PermissionGuard>
} />
```

### 数据库与迁移

#### 创建迁移

```bash
dotnet ef migrations add InitialCreate
dotnet ef database update
```

#### 种子数据

在 `Program.cs` 中配置种子数据：

```csharp
builder.Services.AddBerry(options => {
    options.SeedAdmin = true;
    options.SeedPermissions = true;
});
```

### 测试与调试

#### 单元测试

```csharp
[Fact]
public void Test_Product_Creation()
{
    // 测试代码
}
```

#### 集成测试

```csharp
public class ProductsControllerTests : IClassFixture<WebApplicationFactory<Program>>
{
    // 测试控制器
}
```

#### 调试技巧

- 使用 Swagger UI 测试 API
- 查看结构化日志
- 使用浏览器开发者工具调试前端
- 使用 EF Core 日志查看 SQL 查询

## 最佳实践

### 后端最佳实践

- 使用依赖注入管理服务生命周期
- 遵循 SOLID 原则设计类
- 使用异步方法处理 I/O 操作
- 合理使用缓存减少数据库压力
- 编写单元测试覆盖业务逻辑

### 前端最佳实践

- 使用 TypeScript 确保类型安全
- 遵循组件化设计原则
- 使用 React Query 管理服务器状态
- 实现错误边界处理异常
- 编写集成测试验证用户流程

### 安全最佳实践

- 始终验证用户输入
- 使用 HTTPS 传输敏感数据
- 定期轮换 JWT 密钥
- 实施最小权限原则
- 启用审计日志监控异常活动

## 常见问题

### 框架引入问题

**Q: 引入 Berry 后应用无法启动**
A: 检查依赖包版本兼容性，确保 .NET 8 和 Node.js 18+

**Q: API 类型生成失败**
A: 确保后端服务正在运行，Swagger 端点可访问

### 开发问题

**Q: 权限不生效**
A: 检查用户角色分配和权限特性配置，重启应用同步权限

**Q: 菜单不显示**
A: 确认用户权限，检查菜单配置和路由设置

**Q: 数据库连接失败**
A: 验证连接字符串，检查数据库服务状态

### 部署问题

**Q: 生产环境配置**
A: 使用环境变量配置敏感信息，启用 HTTPS

**Q: 性能优化**
A: 启用缓存、数据库索引、CDN 加速静态资源

---

如需更多详细信息，请参考 [架构文档](../architecture.md) 和 [集成指南](../integration.md)。

<div align="center">
	<img src="front/src/assets/berry.svg" alt="Berry" width="72" height="72" />
	<h1>Berry</h1>
	<p>面向企业的一体化 Web 开发生态：.NET 后端 + React 前端，内置多租户、RBAC、审计、菜单管理、OpenAPI 类型生成。</p>
	<p>
		<a href="#功能特性">功能特性</a> •
		<a href="#快速开始">快速开始</a> •
		<a href="#架构设计">架构设计</a> •
		<a href="#文档">文档</a> •
		<a href="#贡献">贡献</a> •
		<a href="#许可证">许可证</a>
	</p>
</div>

## 关于 Berry

Berry 是一个现代化的企业级 Web 应用框架，专为快速构建可扩展、多租户的后台管理系统而设计。它结合了 .NET 后端的强大能力和 React 前端的灵活性，提供开箱即用的认证、权限、菜单管理等核心功能，同时支持高度定制和扩展。

### 核心理念
- **一体化**: 前后端深度集成，OpenAPI 自动生成类型，确保类型安全。
- **模块化**: 后端采用模块化架构，支持按需装配功能。
- **可扩展**: 插件化设计，允许无缝集成第三方服务。
- **企业级**: 内置多租户、RBAC、审计等企业必备功能。

## 功能特性

### 🔐 认证与授权
- JWT 令牌认证，支持登录和注册
- 基于角色的访问控制 (RBAC)
- 细粒度权限管理，支持资源-动作模型
- 权限自动同步与去重

### 🏢 多租户支持
- 逻辑隔离的多租户架构
- 请求头解析租户上下文
- 系统租户管理，支持跨租户操作

### 📋 菜单管理
- 混合菜单策略：管理员静态路由 + 动态拉取
- 一键上报菜单功能，支持多级菜单
- 权限驱动的菜单过滤与排序

### 📊 审计与日志
- 完整的操作审计日志
- 结构化日志输出，支持多种 Sink
- 性能监控与错误追踪

### 🎨 前端体验
- 响应式设计，支持暗色/亮色主题
- 国际化支持 (中文/英文)
- 现代化 UI 组件库 (Ant Design)
- 类型安全的 API 调用

### 🔧 开发友好
- OpenAPI 自动生成 TypeScript 类型
- 热重载开发环境
- 完整的 Swagger 文档
- 单元测试与集成测试支持

## 快速开始

### 作为 NuGet 包使用

如果您想在现有项目中使用 Berry 的模块，可以通过 NuGet 安装：

```bash
# 安装核心包
dotnet add package Berry.Shared
dotnet add package Berry.Infrastructure

# 安装功能模块 (按需选择)
dotnet add package Berry.Modules.Rbac
dotnet add package Berry.Modules.Tenant
dotnet add package Berry.Modules.Audit
dotnet add package Berry.Modules.Caching
dotnet add package Berry.Modules.Messaging
```

### 从源码构建

#### 系统要求
- .NET 8 SDK
- Node.js 18+
- PostgreSQL 或 SQLite (开发用)

#### 安装与运行

1. **克隆仓库**
   ```bash
   git clone https://github.com/wosledon/Berry.git
   cd Berry
   ```

2. **启动后端**
   ```bash
   # 使用 VS Code 或 Visual Studio 运行 src/Berry.Host
   # 或命令行：
   cd samples/Berry.Sample
   dotnet run --urls http://localhost:5099
   ```
   首次启动会自动创建数据库并种子数据。

3. **启动前端**
   ```bash
   cd front
   npm install
   npm run dev
   ```
   浏览器访问: http://localhost:5173

4. **生成 API 类型 (推荐)**
   ```bash
   cd front
   npm run gen:api
   ```

#### 默认账户
- 用户名: `admin`
- 密码: `Admin123!`
- 租户: `public`

## RAG 模块与示例

本仓库包含一个轻量级的 RAG（检索增强生成）演示与模块实现，用于演示如何将向量检索整合到业务中：

- 模块文档: `docs/develop/rag.md`（说明 Ingest/Query 流程、配置项与扩展点）
- 本地示例: `demos/RAGDemo` 包含完整的 demo 程序、Tokenizer/ONNX 模型与 InMemory 向量存储实现。

快速使用说明（演示）:

1. 下载 MiniLM 模型与 tokenizer 到 `demos/RAGDemo/models/all-MiniLM-L6-v2`（或使用仓库已包含的模型文件夹）。
2. 进入 demo 目录并运行：

```powershell
cd demos/RAGDemo
dotnet run --project RAGDemo.csproj
```

3. 使用 Swagger 或调用 API:

- `POST /api/ingest` 上传或摄入文档
- `GET  /api/search?query=你的查询&minScore=0.3` 执行检索

注意：
- 如果你在迁移或改动 tokenizer/embedding 实现后，请重新摄入（re-ingest）文档以确保向量一致性。
- demo 中包含 tokenizer.json 和 vocab.txt，优先使用 tokenizer.json 能最大程度还原训练时的 tokenization 行为。

如需将 RAG 集成到你的宿主程序，请阅读 `docs/develop/rag.md` 并在 DI 中替换 `IEmbeddingProvider` / `IVectorStore`。

## 架构设计

### 后端架构
```
src/
├── Berry.Host/           # ASP.NET Core 宿主
├── Berry.Infrastructure/ # EF Core 数据访问
├── Berry.Modules/        # 功能模块
│   ├── Rbac/            # 角色权限
│   ├── Tenant/          # 多租户
│   ├── Audit/           # 审计日志
│   ├── Caching/         # 缓存
│   └── Messaging/       # 消息队列
└── Berry.Shared/        # 共享组件
```

### 前端架构
```
front/src/
├── components/          # UI 组件
├── pages/              # 页面组件
├── services/           # API 服务
├── config/             # 配置
├── context/            # React Context
├── hooks/              # 自定义 Hooks
├── locales/            # 国际化
└── types/              # 类型定义
```

### 技术栈
| 组件 | 技术 |
|------|------|
| 后端框架 | ASP.NET Core (.NET 8) |
| ORM | Entity Framework Core |
| 数据库 | PostgreSQL / SQLite |
| 前端框架 | React 18 + TypeScript |
| 构建工具 | Vite |
| UI 库 | Ant Design |
| 状态管理 | TanStack Query |
| 样式 | Tailwind CSS |
| 国际化 | react-i18next |

## 文档

- [架构与开发指南](docs/architecture.md) - 详细的技术架构和开发流程
- [对接与使用指南](docs/integration.md) - API 对接和二次开发教程
- [设计文档](docs/design.md) - 设计理念和路线图
- [NuGet 包管理](docs/nuget-management.md) - 版本控制和包发布指南

## 贡献

欢迎贡献！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 开发规范
- 遵循 C# 和 TypeScript 编码规范
- 为新功能添加单元测试
- 更新相关文档
- 确保 CI 通过

## 常见问题 (FAQ)

### API 类型缺失
**问题**: 前端类型定义缺少某些端点
**解决**: 重启后端确保 Swagger 更新，然后执行 `npm run gen:api`

### 权限相关
**问题**: 用户无法访问某些功能
**解决**: 检查用户角色和权限分配，确认前端权限守卫配置

### 数据库连接
**问题**: 无法连接数据库
**解决**: 检查连接字符串，确认数据库服务运行

## 路线图

- [ ] OpenTelemetry 集成
- [ ] GraphQL 支持
- [ ] 微服务扩展
- [ ] AI 增强功能
- [ ] 移动端适配

## 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

<div align="center">
	<p>⭐ 如果这个项目对你有帮助，请给我们一个 Star！</p>
	<p>🐛 发现问题？<a href="https://github.com/wosledon/Berry/issues">提交 Issue</a></p>
	<p>💬 讨论交流？<a href="https://github.com/wosledon/Berry/discussions">GitHub Discussions</a></p>
</div>
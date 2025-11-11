# CHANGELOG

采用语义化版本规范 (Semantic Versioning)。格式: `MAJOR.MINOR.PATCH`。

## [0.3.0] - 2025-11-11
### Changed
- 约定优于配置：默认仅扫描入口程序集(调用 `AddBerry()` 的应用程序)，开发者自定义模块将被自动发现与加载
- `BerryOptions` 新增 `ScanEntryAssemblyOnly`(默认 true)，仅在设置为 false 时才应用跨程序集扫描
- `AssemblyPrefixes` 由必需前缀(原默认 "Berry.") 调整为可选过滤(默认空列表)，避免命名强耦合
- `ModuleManager` 调整扫描逻辑：优先入口程序集，必要时按前缀过滤加载其他已加载程序集
 - 内置模块清单显式注册：新增 `UseBuiltinModules`(默认 true) + 内置模块类型集合减少反射扫描成本

### Added
- 文档: 新增 `docs/quick-start.md`，提供零配置接入、常见用法与 FAQ
- 示例: `samples/Berry.Sample` 新增 `Modules/CustomBusinessModule.cs`(非 Berry 命名空间)，验证自动发现
 - 日志增强：启动时输出 Options 与注册的内置模块数量，便于诊断行为

### Notes / Migration Guide
- 若此前依赖 `AssemblyPrefixes = ["Berry."]` 的行为，迁移建议：
   1) 保持默认 `ScanEntryAssemblyOnly = true`，将业务模块放在应用项目或其引用的入口程序集内，或
   2) 设置 `ScanEntryAssemblyOnly = false`，并在 `AssemblyPrefixes` 中添加你的业务前缀(如 `"MyApp."`)
- 无需再以 `Berry.*` 命名，命名空间可自由选择
 - 可通过 `ExcludedModules.Add(typeof(AuditModule))` 等方式屏蔽默认内置模块；若希望完全手动控制，设置 `UseBuiltinModules = false` 并使用 `AddBerryModule<T>` 指定

## [0.2.0] - 2025-11-10
### Changed - 重大架构调整
- **框架与应用分离**：Berry.Host 不再是完整应用，改为扩展方法库（`AddBerry()` / `UseBerry()`）
- Berry.Host 从 `Sdk="Microsoft.NET.Sdk.Web"` 改为 `Sdk="Microsoft.NET.Sdk"`，移除业务代码与配置
- 新增 `samples/Berry.Sample` 作为示例应用，演示如何使用框架

### Added
- EF Core 基础设施：`Berry.Infrastructure` 项目，包含 `BerryDbContext`、`BaseEntity`、`AuditLog`、`Permission` 实体
- 数据模块：`DataModule` 自动注册 DbContext（支持 SQLite / PostgreSQL）
- 审计持久化：`IAuditLogWriter` 与 `EfCoreAuditLogWriter`，审计日志写入数据库
- 租户解析扩展：支持子域名解析（`tenant.example.com` → `tenant`）
- 框架扩展方法：`IServiceCollection.AddBerry()` 与 `WebApplication.UseBerry()`

### Migration Guide
1. 移除对 `Berry.Host` 的 Web 项目引用
2. 应用项目引用 `Berry.Host`（作为库）+ 需要的模块项目
3. 在 Program.cs 中使用：
   ```csharp
   using Berry.Host;
   builder.Services.AddBerry(builder.Configuration);
   app.UseBerry();
   ```

## [0.1.0] - 2025-11-10
### Added
- 初始框架骨架：`IModule` 装配机制，Host 项目与模块扫描按 Order 加载。
- 模块：Caching (内存/Redis 降级)、Messaging (内存 Channels)、Tenant (Header + Claim 解析)、RBAC (权限特性扫描日志)、Audit (审计中间件)。
- Shared 抽象：缓存、消息总线、权限特性扫描、租户上下文。
- Serilog、Swagger、HealthChecks 基础集成。
- 示例控制器 `UsersController` + 权限特性。

### Notes
- 处于 Phase 1（核心框架雏形）完成状态。
- 尚未引入持久化与多租户配额、审计落库、OpenTelemetry。

## [Unreleased]
### Planned (Phase 2)
- EF Core 引入：基础数据模型 (User / Role / Permission / Tenant / AuditLog)。
- 审计日志持久化与异步缓冲。
- 租户解析扩展：域名子域策略，数据库租户配置加载。
- 菜单与权限差异比对（占位）。

### Future Phases
- Phase 3: OpenTelemetry + 指标与告警策略。
- Phase 4: 性能优化（读写分离 PoC、热点缓存策略完善、消息死信队列）。
- Phase 5: GraphQL / gRPC / 插件/AI 增强。

---
更新流程：
1. 每次完成一个里程碑在 CHANGELOG 新增版本段落。
2. 未发布功能记录在 Unreleased 区块，发布后移动到对应版本。
3. 重大架构调整需在 Notes 中执行迁移说明与兼容性提示。

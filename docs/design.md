# Berry 架构设计文档

本文档定义 Berry 框架的总体技术架构、模块划分、核心能力与扩展机制，指导后续实现与演进。Berry 面向「高性能 / 可扩展 / 易集成」的企业级 Web & 前后端一体化解决方案。

## 1. 设计目标与原则

### 1.1 目标
1. 高性能：低延迟响应，支持水平扩展；缓存与异步消息削峰填谷。
2. 可扩展：模块化+约定优于配置，允许按需装配功能；插件化支持后续增量能力（监控、报表、AI 增强等）。
3. 易用性：最小侵入集成到现有 ASP.NET Core；前后端脚手架统一；自动生成 OpenAPI 文档与前端类型。
4. 可观测：内置结构化日志、分布式追踪、指标暴露；辅助故障定位与容量规划。
5. 安全性：完善的 RBAC + 多租户隔离 + 最小权限原则 + 审计日志。
6. 稳健性：对外部依赖（Redis/RabbitMQ）具备降级与自愈策略。

### 1.2 架构原则
- 分层清晰（Core Domain / Application / Infrastructure / Interface）。
- 依赖倒置：业务依赖抽象接口，具体实现可替换（缓存、消息、存储）。
- 横切关注点（日志、权限、租户、审计）通过中间件 + 过滤器 + AOP（动态代理或源生成）统一处理。
- 数据模型单一事实来源（EF Core），必要时通过仓储 + 读写分离（未来可扩展 CQRS）。
- 模块独立生命周期：初始化（Configure）、激活（Start）、关闭（Stop）。

## 2. 技术栈与运行时环境

| 类别 | 技术 | 说明 |
| ---- | ---- | ---- |
| 语言 | C# (.NET 8/9) | 使用最新 LTS/Current；框架功能需兼容 8+ |
| Web 框架 | ASP.NET Core | 最小宿主模型，使用原生中间件管线 |
| 数据库 | SQLite / PostgreSQL | Dev/单机用 SQLite；生产推荐 PostgreSQL |
| ORM | Entity Framework Core | 统一数据访问；支持迁移、种子数据 |
| 前端 | React + TypeScript + Vite + TailwindCSS | 快速开发 + 组件化 + 原子化样式 + 圆角卡片风格, 也包括主题切换 |
| 缓存 | Redis / 内存 (MemoryCache) | 读写热点、分布式锁、会话；断路&降级 |
| 消息队列 | RabbitMQ / 内存 Channel | 事件驱动、异步任务；降级到 Channel + 背压控制 |
| 日志 | Serilog | 多 Sink (Console, File, Seq, Elastic 可扩展) |
| 文档 | OpenAPI + Swagger UI | 自动生成 + 权限标注 |
| 配置 | Options + 分层配置 (appsettings.* + 环境变量 + Secret) | 支持多租户覆盖 |
| 安全 | JWT + RBAC + 多租户上下文 | 统一鉴权中间件 |
| 观测 | OpenTelemetry (后续) | Trace/Metric/Log 统一链路 |

## 3. 分层与模块划分

```
┌──────────────────────────────────┐
│            Interface Layer       │ ← API Controllers / GraphQL(可选) / SignalR / 前端静态资源
├──────────────────────────────────┤
│           Application Layer      │ ← UseCases(服务) / DTO / 事务脚本 / 缓存策略 / 授权检查
├──────────────────────────────────┤
│             Domain Layer         │ ← 聚合根 / 实体 / 值对象 / 域事件 / 领域服务
├──────────────────────────────────┤
│         Infrastructure Layer     │ ← EFCore / Redis / MQ / 外部服务适配 / 文件 / 邮件
└──────────────────────────────────┘
				↑            ↓ 通过接口抽象 (Ports & Adapters)
```

### 3.1 核心模块列表
- Identity & Access（身份与访问）
- Tenant（多租户）
- RBAC（角色/权限/资源）
- Organization（组织结构）
- Menu（菜单与前端路由结构）
- Audit（审计日志）
- Caching（缓存策略与降级）
- Messaging（消息与事件总线）
- Logging（日志聚合与结构化）
- Observability（可观测扩展）
- Frontend UI（前端应用壳 + 组件库）
- Common（跨模块工具：时钟、ID生成、加密、规范性验证）

### 3.2 目录结构建议（示例）
```
src/
	Berry.Host/                # 框架启动扩展（AddBerry / UseBerry）
	Berry.Infrastructure/      # 数据访问基础设施（EF Core / DbContext）
	Berry.Modules.Identity/    # 用户/认证
	Berry.Modules.Rbac/        # 角色、权限、策略
	Berry.Modules.Tenant/      # 多租户上下文与隔离
	Berry.Modules.Organization/# 组织机构
	Berry.Modules.Menu/        # 菜单与路由
	Berry.Modules.Audit/       # 审计日志
	Berry.Modules.Caching/     # 缓存抽象与实现
	Berry.Modules.Messaging/   # 消息发布订阅、集成事件
	Berry.Modules.Logging/     # 日志与追踪封装
	Berry.Modules.Observability/# 可观测（OTel）
	Berry.Shared/              # 通用基础设施与 Abstractions
samples/
	Berry.Sample/              # 完整示例应用（ASP.NET Core）
tests/
	...                        # 单元/集成/契约测试
```

**架构原则**：
- src/ 下为纯框架组件，通过 NuGet 分发，不包含具体业务
- samples/ 演示框架使用方式，包含完整 Web 应用
- 应用通过 `builder.Services.AddBerry(config)` 和 `app.UseBerry()` 集成框架

## 4. 关键横切能力

### 4.1 配置管理
- 使用 `IOptions<T>` 与后置验证 (`ValidateOnStart`)。
- 环境分层：`appsettings.json` → `appsettings.{Environment}.json` → 环境变量 → 用户密钥。
- 多租户覆盖：在租户初始化时加载租户级配置（缓存 TTL、队列并发、功能开关）。

### 4.2 依赖注入与模块启动流程
- 每个模块暴露 `IModule` 接口：`ConfigureServices(IServiceCollection)`、`ConfigureApplication(WebApplication)`。
- 主机启动时扫描 `Berry.Modules.*` 程序集自动注册。
- 支持模块间依赖声明（拓扑排序加载）。

### 4.3 缓存策略与降级
- 缓存抽象接口：`ICacheProvider`，实现：`RedisCacheProvider`、`MemoryCacheProvider`。
- 健康探测失败或连接异常次数超过阈值 → 切换到内存实现，开启周期性重试恢复。
- 支持模式：直读缓存、写穿、读写回、批量预热、分布式锁（基于 Redis）。
- Key 规范：`{Tenant}:{Domain}:{Entity}:{Id}`；TTL 按类型配置。

### 4.4 消息队列与事件驱动
- 抽象接口：`IMessageBus` / `IEventPublisher` / `IEventHandler<T>`。
- 实现：`RabbitMqBus`、`InMemoryChannelBus`（基于 `System.Threading.Channels`）。
- 降级策略：MQ 连接故障 → 切换内存通道；持久化需求降级后标记为“非持久事件”，提示运营。
- 模式：命令消息、事件发布订阅、延迟任务（可扩展死信队列）。

### 4.5 日志与审计
- Serilog：结构化字段（CorrelationId、TenantId、UserId、Module、ElapsedMs）。
- 审计日志：中间件 + ActionFilter 捕获：用户、租户、操作、资源、结果、耗时、IP、UA。
- 审计数据持久化：写数据库 + 可选异步队列缓冲。

### 4.6 安全与权限
- 身份认证：JWT (Access Token + Refresh Token)，后续可扩展 OAuth2/OpenID Connect。
- RBAC 模型：`User` ↔ `RoleGroup` ↔ `Role` ↔ `Permission(Resource + Action)`。
- 权限发现：启动时反射 Controller/Action 标注的特性（如 `[Permission("User:Create")]`），同步至权限表并比对差异。
- 授权中间件：解析租户、用户、角色，合并权限集（含显式拒绝规则）。
- 菜单与前端路由：基于权限动态生成；前端拉取用户可见菜单树。

### 4.7 多租户
- 租户上下文解析顺序：请求 Header (`X-Tenant`)、域名子域、JWT Claim。
- 数据隔离：逻辑隔离（同库加租户字段）初期；可规划物理隔离（不同 Schema/库）。
- 缓存与消息命名空间包含 `TenantId` 前缀。
- 资源配额：每租户缓存限额、消息并发、用户上限（扩展表）。

### 4.8 可观测性 (Observability)
- Trace：HTTP 请求 → 应用服务 → 仓储/外部组件，传递 CorrelationId。
- Metric：请求耗时分布、缓存命中率、队列长度、数据库慢查询、失败总量。
- Log 级别动态调整：远程配置或管理后台切换（写入集中配置源）。

### 4.9 错误处理与健壮性
- 全局异常中间件：统一返回标准错误结构（`traceId`、`code`、`message`、`details`）。
- 分层重试策略：
	- 基础设施级（Redis/MQ）：指数退避 + 熔断标记 + 半开探测。
	- 应用服务级：使用 Polly（可后续加入）。
- 灰度与功能开关：模块读取 `IFeatureFlagProvider`，支持租户级开关。

## 5. 数据模型概要 (核心表结构逻辑概述)

| 模块 | 关键实体 | 描述 |
| ---- | -------- | ---- |
| Identity | User, UserProfile | 用户账号与扩展属性 |
| RBAC | Role, RoleGroup, Permission, ResourceAction | 权限与资源动作映射 |
| Tenant | Tenant, TenantSetting | 租户基本信息与配置覆盖 |
| Organization | OrgUnit | 组织树结构（ParentId/Level/Path）|
| Menu | MenuItem | 菜单/路由/权限点绑定 |
| Audit | AuditLog | 审计记录（操作上下文）|

数据规范：统一使用雪花/ULID 作为主键（`Id`），软删除字段（`IsDeleted`）、并发控制（`RowVersion`），审计字段（`CreatedAt/CreatedBy/UpdatedAt/UpdatedBy`），多租户字段（`TenantId`）。

## 6. 关键流程示例

### 6.1 用户请求生命周期
1. 进入 Kestrel → 中间件：Correlation → 租户解析 → 身份认证 → 授权 → 模块路由。
2. 应用层服务执行业务：读缓存命中则直接返回；未命中 → 仓储查询 → 写入缓存。
3. 触发领域事件（如用户创建）→ 发布到消息总线（RabbitMQ 或内存）→ 异步处理（发送欢迎邮件、审计扩展）。
4. 响应包装统一结构 + 记录审计日志 + 结构化日志输出。

### 6.2 权限刷新流程
1. 启动阶段扫描所有带权限特性的 Action。
2. 与数据库权限表对比：新增插入、缺失标记失效（或软删除）、手工移除的保留策略。
3. 缓存权限映射：`PermissionName -> Id`，用于快速授权校验。

### 6.3 降级切换流程（Redis 示例）
1. 定时健康检查失败计数超过阈值。
2. 触发熔断：标记当前 Provider = Memory；记录告警事件。
3. 后台恢复任务尝试重连成功 → 回切 Redis → 重新预热关键缓存 Key。

## 7. 性能与扩展策略
- 分页与筛选统一：限制最大页大小；大数据导出异步化（消息任务）。
- 热点数据：前置批量预热 + TTL 分层（短 TTL 高刷新、长 TTL 稳定）。
- 消息处理：消费者使用并发通道 + 限流（租户级）+ 死信队列规划。
- 可选读写分离：仓储接口抽象可扩展到查询（Dapper）与写（EF Core）。
- 前端性能：路由懒加载、组件拆分、Tailwind JIT、API 类型自动生成（OpenAPI → TypeScript）。

## 8. 安全与合规
- 输入验证：应用层 DTO 注解 + FluentValidation（后续）。
- XSS/CSRF：前端编码、后端使用 JWT（无状态）避免 CSRF；必要时双重提交策略。
- 加密与敏感数据：密码使用 PBKDF2/Argon2（可配置），敏感字段（如邮箱）可选加密列。
- 审计与合规：关键操作（权限变更、租户配置修改）强制审计；支持保留策略（定期归档）。

## 9. DevOps 与部署
- 构建：多阶段 Docker（还原→构建→发布），前后端分离构建镜像或统一整合静态资源。
- 配置：使用环境变量注入 Redis/MQ/PostgreSQL 连接；支持 Helm/Kubernetes 部署（后续 Chart）。
- 迁移：应用启动前自动执行 EF Core Migration（可开关）。
- 健康检查：`/health` 分层报告（DB、Redis、MQ、缓存模式）；Prometheus 拉取指标。
- 日志聚合：集中到 Seq/ELK；Trace 输出到 Jaeger/Tempo。

## 10. 测试策略
- 单元测试：领域模型与服务逻辑（无外部依赖）。
- 集成测试：使用内存 WebApplicationFactory + SQLite 内存库 + 内存消息。
- 契约测试：OpenAPI 校验客户端生成类型；权限特性扫描结果与预期比对。
- 负载测试（后续）：基于 k6 / bombardier 针对热点接口与消息消费链路。

## 11. 演进路线 (Roadmap)
| 阶段 | 里程碑 | 描述 |
| ---- | ------ | ---- |
| Phase 1 | 核心框架雏形 | 模块加载、身份认证、RBAC 权限扫描、缓存/消息降级 |
| Phase 2 | 多租户与审计 | 租户上下文、审计日志落库与查询、前端菜单动态化 |
| Phase 3 | 可观测完善 | OpenTelemetry 集成、指标仪表板、告警策略 |
| Phase 4 | 性能优化 | 热点缓存策略、异步队列扩展、读写分离 PoC |
| Phase 5 | 生态扩展 | GraphQL / gRPC / AI 增强建议、插件系统 |

## 12. 风险与缓解
| 风险 | 影响 | 缓解策略 |
| ---- | ---- | -------- |
| 外部依赖不可用 | 性能/功能下降 | 降级 + 重试 + 熔断 + 监控告警 |
| 权限膨胀管理复杂 | 安全漏洞 | 自动扫描 + 差异报告 + 审计回溯 |
| 多租户隔离不足 | 数据串租风险 | 提前规划物理隔离路径 + 加强测试 |
| 缓存失效雪崩 | 大量回源压力 | TTL 随机抖动 + 热点预热 + 限流 |
| 消息积压 | 延迟增大 | 队列监控 + 动态扩容消费者 + 死信分析 |

## 13. 非功能性需求 (NFR)
- 延迟：P95 接口响应 < 200ms（初期目标）。
- 可用性：核心服务年可用性 99.9%。
- 可维护性：模块独立测试覆盖率 > 70%。
- 可扩展性：新增模块不修改核心宿主，仅注册装配。
- 可观测性：Trace 覆盖率 > 90% 关键链路。

## 14. 术语表
- 租户 (Tenant)：业务隔离单元。
- RBAC：基于角色的访问控制模型。
- 熔断 (Circuit Breaker)：在连续失败时快速失败并等待恢复的模式。
- 审计日志 (Audit Log)：记录用户行为和系统重要事件的不可抵赖数据。

## 15. 附录
- 代码生成：后续可添加 Source Generator 提取权限特性与生成前端常量。
- 插件机制：通过扫描实现 `IPlugin` 接口的程序集并注册扩展管道。
- 灰度策略：在多租户配置里为少量租户开启新功能以验证稳定性。

---
本文档为动态演进文档，随着实现细节与业务需求变化需持续更新版本号与变更日志。
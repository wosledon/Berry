# 示例文档：Berry框架知识库

Berry是一个现代化的企业级Web应用框架，专为快速构建可扩展、多租户的后台管理系统而设计。

## 核心理念

Berry秉承以下核心理念：

1. **一体化**：前后端深度集成，OpenAPI自动生成类型，确保类型安全和开发效率。
2. **模块化**：后端采用模块化架构，支持按需装配功能，避免单体应用的问题。
3. **可扩展**：插件化设计，允许无缝集成第三方服务和自定义扩展。
4. **企业级**：内置多租户、RBAC、审计等企业必备功能，开箱即用。

## 技术架构

Berry采用经典的分层架构：

- **前端**：React + Vite + TypeScript，提供现代化的用户界面
- **后端**：ASP.NET Core (.NET 8) + EF Core，提供强大的API支持
- **数据库**：支持SQLite、PostgreSQL、MySQL等多种数据库
- **缓存**：支持内存缓存和Redis分布式缓存
- **消息**：内置消息总线，支持模块间通信

## 主要模块

### 1. Berry.Host
框架核心，提供模块管理、中间件配置等基础功能。

### 2. Berry.Infrastructure
基础设施模块，包含数据库上下文、实体定义等。

### 3. Berry.Modules.Rbac
基于角色的访问控制模块，提供完整的权限管理功能：
- 用户管理
- 角色管理
- 权限定义
- 菜单管理

### 4. Berry.Modules.Audit
审计日志模块，自动记录所有API调用：
- 请求路径
- 请求参数
- 响应结果
- 执行时间
- 用户信息

### 5. Berry.Modules.Tenant
多租户模块，支持租户隔离：
- 租户管理
- 数据隔离
- 租户切换

### 6. Berry.Modules.Caching
缓存模块，支持多种缓存策略：
- 内存缓存（适合单机）
- Redis缓存（适合分布式）

### 7. Berry.Modules.Messaging
消息模块，提供模块间通信：
- 基于Channel的内存消息总线
- 支持发布/订阅模式

### 8. Berry.Modules.VectorStore
向量存储模块，支持语义检索：
- 向量嵌入
- 余弦相似度计算
- TopK检索

### 9. Berry.Modules.Rag
检索增强生成模块，提供智能问答能力：
- 文档分块
- 语义检索
- 对话记忆

## 快速开始

### 安装

```bash
# 克隆仓库
git clone https://github.com/wosledon/Berry.git

# 进入目录
cd Berry

# 还原依赖
dotnet restore

# 构建
dotnet build
```

### 运行示例

```bash
# 运行基础示例
cd samples/Berry.Sample
dotnet run

# 运行RAG示例
cd samples/Berry.RagDemo
dotnet run
```

## 开发指南

### 创建自定义模块

1. 实现IModule接口
2. 在ConfigureServices中注册服务
3. 在ConfigureApplication中配置中间件

示例：

```csharp
public class MyModule : IModule
{
    public string Name => "MyModule";
    public int Order => 100;

    public void ConfigureServices(IServiceCollection services, IConfiguration config)
    {
        services.AddScoped<IMyService, MyService>();
    }

    public void ConfigureApplication(WebApplication app)
    {
        app.UseMiddleware<MyMiddleware>();
    }
}
```

### 使用RBAC权限

```csharp
[Permission("user:read", "查看用户")]
public async Task<ActionResult<User>> GetUser(string id)
{
    // 实现逻辑
}
```

### 使用缓存

```csharp
public class MyService
{
    private readonly ICacheProvider _cache;

    public async Task<Data> GetDataAsync(string key)
    {
        return await _cache.GetOrSetAsync(
            key,
            async () => await LoadFromDatabaseAsync(key),
            TimeSpan.FromMinutes(5));
    }
}
```

### 使用消息总线

```csharp
// 发布消息
await _messageBus.PublishAsync("user.created", new UserCreatedEvent { UserId = userId });

// 订阅消息
_messageBus.Subscribe<UserCreatedEvent>("user.created", async evt =>
{
    // 处理事件
});
```

## 部署

### Docker部署

```bash
# 构建镜像
docker build -t berry-app .

# 运行容器
docker run -p 5000:8080 berry-app
```

### 生产配置

在appsettings.Production.json中配置：

```json
{
  "ConnectionStrings": {
    "Default": "Server=prod-db;Database=berry;..."
  },
  "Caching": {
    "Provider": "Redis",
    "Redis": {
      "Configuration": "redis:6379"
    }
  }
}
```

## 性能优化

1. **启用缓存**：使用Redis分布式缓存
2. **数据库优化**：添加适当索引，使用连接池
3. **异步处理**：使用后台任务处理耗时操作
4. **负载均衡**：使用Nginx或云负载均衡器

## 安全建议

1. **使用HTTPS**：生产环境必须启用HTTPS
2. **强密码策略**：配置密码复杂度要求
3. **JWT过期时间**：设置合理的Token过期时间
4. **审计日志**：启用审计模块记录所有操作
5. **输入验证**：使用数据注解验证用户输入

## 常见问题

### Q: 如何切换数据库？
A: 修改appsettings.json中的ConnectionStrings，运行迁移命令。

### Q: 如何扩展权限系统？
A: 继承默认实现或替换IPermissionProvider。

### Q: 如何集成第三方登录？
A: 使用ASP.NET Core Identity的外部认证提供程序。

## 社区与支持

- GitHub: https://github.com/wosledon/Berry
- 文档: docs/develop/index.md
- 问题反馈: GitHub Issues

## 许可证

MIT License - 详见LICENSE文件

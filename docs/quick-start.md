# Berry 框架快速入门

## 核心理念

**约定优于配置** - 开发者无需关心框架内部实现,按约定编写代码即可自动集成。

---

## 1. 零配置启动

### 最小化 Program.cs

```csharp
using Berry.Host;

var builder = WebApplication.CreateBuilder(args);

// 一行代码启动框架 - 自动发现当前项目的所有模块
builder.Services.AddBerry(builder.Configuration);

var app = builder.Build();

// 应用所有模块的中间件
app.UseBerry();

app.Run();
```

### 工作原理

- **内置模块显式注册**: 默认启用 `UseBuiltinModules=true`，框架自动实例化并注册内置模块清单：`Data / Tenant / Caching / Messaging / RBAC / Audit`
- **自动发现业务模块**: `AddBerry()` 默认扫描**入口程序集**（你的应用），无需 `Berry.` 前缀命名
- **可扩展**: 需要跨多个类库时可将 `ScanEntryAssemblyOnly=false` 并使用 `AssemblyPrefixes` 过滤
- **可禁用**: 任意内置模块都可通过 `ExcludedModules.Add(typeof(XXXModule))` 排除

---

## 2. 创建自定义模块

### 步骤 1: 实现 IModule 接口

```csharp
using Berry.Shared.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MyApp.Modules;

public class PaymentModule : IModule
{
    public string Name => "Payment";
    public int Order => 100; // 控制加载顺序,数字越小越先加载

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        // 注册服务
        services.AddScoped<IPaymentService, PaymentService>();
    }

    public void ConfigureApplication(WebApplication app)
    {
        // 配置中间件或路由
        app.MapPost("/api/payments", async (IPaymentService service) => 
        {
            // 业务逻辑
        });
    }
}
```

### 步骤 2: 无需额外配置

模块会**自动注册**,无需在 `Program.cs` 中手动调用。

---

## 3. 使用框架内置功能

### 缓存 (ICacheProvider)

```csharp
public class UserService
{
    private readonly ICacheProvider _cache;

    public UserService(ICacheProvider cache) => _cache = cache;

    public async Task<User?> GetUserAsync(string id)
    {
        // 自动降级: Redis 失败时回退到内存缓存
        return await _cache.GetAsync<User>($"user:{id}");
    }

    public async Task SaveUserAsync(User user)
    {
        await _cache.SetAsync($"user:{user.Id}", user, TimeSpan.FromMinutes(10));
    }
}
```

### 消息总线 (IMessageBus)

```csharp
// 定义事件
public record OrderCreatedEvent(string OrderId, decimal Amount) : IEvent;

// 发布事件
public class OrderService
{
    private readonly IMessageBus _bus;

    public async Task CreateOrderAsync(Order order)
    {
        // 业务逻辑
        await _bus.PublishAsync(new OrderCreatedEvent(order.Id, order.Total));
    }
}

// 订阅事件
public class NotificationModule : IModule
{
    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        var bus = services.BuildServiceProvider().GetRequiredService<IMessageBus>();
        bus.SubscribeAsync<OrderCreatedEvent>(async evt => 
        {
            // 发送通知逻辑
        });
    }
}
```

### 多租户 (TenantContext)

```csharp
public class TenantAwareService
{
    public void ProcessData()
    {
        // 自动从请求头/子域名/JWT 解析租户
        var tenantId = TenantContext.Current;
        Console.WriteLine($"当前租户: {tenantId}");
    }
}
```

### RBAC 权限 (PermissionAttribute)

```csharp
[ApiController]
[Route("api/users")]
public class UsersController : ControllerBase
{
    [HttpGet]
    [Permission("User:Read")] // 自动扫描并注册到权限表
    public IActionResult GetUsers() => Ok(new[] { "Alice", "Bob" });

    [HttpPost]
    [Permission("User:Create")]
    public IActionResult CreateUser([FromBody] User user) => Created("", user);
}
```

---

## 4. 配置文件 (appsettings.json)

```json
{
  "Database": {
    "Provider": "Sqlite",
    "ConnectionStrings": {
      "Default": "Data Source=App_Data/myapp.db"
    }
  },
  "Caching": {
    "Provider": "Memory",
    "Redis": {
      "ConnectionString": "localhost:6379"
    }
  }
}
```

---

## 5. 高级配置 (可选)

### 场景 1: 扫描其他程序集

如果你的模块分散在多个类库中(如 `MyApp.Core`, `MyApp.Plugins`),需要显式配置:

```csharp
builder.Services.AddBerry(builder.Configuration, options =>
{
    options.ScanEntryAssemblyOnly = false; // 扫描所有已加载程序集
    options.AssemblyPrefixes.Add("MyApp."); // 过滤前缀
});
```

### 场景 2: 排除特定模块

```csharp
builder.Services.AddBerry(builder.Configuration, options =>
{
    options.ExcludedModules.Add(typeof(AuditModule)); // 禁用审计模块
});
```

### 场景 3: 手动注册模块

```csharp
builder.Services.AddBerryModule<CustomModule>(builder.Configuration);
```

---

## 6. 目录结构示例

```
MyApp/
├── Program.cs              # 只需调用 AddBerry() 和 UseBerry()
├── Modules/
│   ├── PaymentModule.cs    # 自动注册
│   └── ShippingModule.cs   # 自动注册
├── Controllers/
│   └── OrdersController.cs # 使用 [Permission] 标记
├── Services/
│   └── OrderService.cs     # 注入 ICacheProvider/IMessageBus
└── appsettings.json
```

---

## 7. 常见问题

### Q: 必须使用 Berry. 前缀命名吗?

**不需要**。默认配置会自动扫描你的应用程序集,命名空间可以是 `MyApp.*` 或任意名称。

### Q: 如何知道哪些模块被加载了?

查看日志输出,框架会记录:
```
[INF] Discovered 5 modules.
[DBG] Registered module: Payment (Order: 100)
```

### Q: 可以不使用某些内置模块吗?

可以,通过 `ExcludedModules` 配置排除:
```csharp
options.ExcludedModules.Add(typeof(RbacModule));

### 场景 4: 禁用内置模块总体注册流程

```csharp
builder.Services.AddBerry(builder.Configuration, options =>
{
    options.UseBuiltinModules = false; // 不自动注册内置模块
});
```

此时你可以手动注册：

```csharp
builder.Services.AddBerryModule<DataModule>(builder.Configuration);
builder.Services.AddBerryModule<CachingModule>(builder.Configuration);
// ... 其他需要的模块
```
```

### Q: 框架对性能有影响吗?

- 模块扫描仅在启动时执行一次
- 运行时开销仅包含中间件调用(纳秒级)
- 缓存/消息总线默认使用内存,无网络开销

---

## 8. 下一步

- 📘 阅读 [架构设计文档](design.md)
- 🔍 查看 [示例项目](../samples/Berry.Sample)
- 📝 查阅 [变更日志](CHANGELOG.md)
- 🛠️ 扩展 [自定义中间件](design.md#65-自定义中间件)

# Berry 后端开发详细指南

## 概述

Berry 框架的后端基于 ASP.NET Core (.NET 8) 构建，采用模块化架构设计，支持 RBAC 权限管理、多租户、审计日志、缓存和消息队列等企业级功能。本指南将帮助开发者快速上手后端开发。

## 环境要求

- .NET 8.0 SDK
- Visual Studio 2022 或 VS Code
- SQL Server / PostgreSQL / MySQL (根据配置)
- Git

## 项目结构

```
src/
├── Berry.Admin/                 # 管理后台 API
│   ├── Controllers/            # API 控制器
│   ├── Services/               # 业务服务层
│   ├── Repositories/           # 数据访问层
│   └── Models/                 # 数据模型
├── Berry.Core/                 # 核心模块
│   ├── Domain/                 # 领域层
│   ├── Application/            # 应用层
│   ├── Infrastructure/         # 基础设施层
│   └── Interfaces/             # 接口定义
├── Berry.Modules/              # 功能模块
│   ├── RBAC/                   # 权限管理模块
│   ├── Tenant/                 # 多租户模块
│   ├── Audit/                  # 审计模块
│   ├── Caching/                # 缓存模块
│   └── Messaging/              # 消息队列模块
└── Berry.Shared/               # 共享组件
```

## 核心模块介绍

### 1. RBAC 权限管理模块

- **功能**：角色-based 权限控制，支持菜单权限、操作权限
- **关键类**：
  - `Role` - 角色实体
  - `Permission` - 权限实体
  - `UserRole` - 用户角色关联
- **使用方式**：
  ```csharp
  [Authorize(Policy = "AdminOnly")]
  public class AdminController : ControllerBase
  {
      // 仅管理员可访问
  }
  ```

### 2. 多租户模块

- **功能**：支持多租户数据隔离
- **实现方式**：租户过滤器 + 软删除
- **配置**：
  ```csharp
  services.AddTenantSupport(options =>
  {
      options.DefaultTenantId = "default";
      options.EnableSoftDelete = true;
  });
  ```

### 3. 审计模块

- **功能**：自动记录数据变更历史
- **支持操作**：创建、更新、删除
- **查询方式**：
  ```csharp
  var auditLogs = await _auditService.GetAuditLogsAsync(entityType, entityId);
  ```

### 4. 缓存模块

- **支持**：内存缓存、Redis 分布式缓存
- **使用**：
  ```csharp
  [Cache(Duration = 300)] // 缓存 5 分钟
  public async Task<List<User>> GetUsersAsync()
  {
      return await _userRepository.GetAllAsync();
  }
  ```

### 5. 消息队列模块

- **支持**：RabbitMQ、Azure Service Bus
- **使用**：
  ```csharp
  await _messagePublisher.PublishAsync("user.created", userData);
  ```

## 开发流程

### 1. 创建新模块

1. 在 `Berry.Modules` 下创建新文件夹
2. 实现领域实体、仓储接口、服务接口
3. 在基础设施层实现具体仓储和服务
4. 在应用层实现业务逻辑
5. 添加控制器提供 API 接口

### 2. 添加实体

```csharp
public class Product : BaseEntity
{
    public string Name { get; set; }
    public string Description { get; set; }
    public decimal Price { get; set; }
    public int CategoryId { get; set; }
    
    // 导航属性
    public Category Category { get; set; }
}
```

### 3. 创建仓储

```csharp
public interface IProductRepository : IRepository<Product>
{
    Task<IEnumerable<Product>> GetByCategoryAsync(int categoryId);
}

public class ProductRepository : BaseRepository<Product>, IProductRepository
{
    public async Task<IEnumerable<Product>> GetByCategoryAsync(int categoryId)
    {
        return await _dbSet.Where(p => p.CategoryId == categoryId).ToListAsync();
    }
}
```

### 4. 实现服务

```csharp
public interface IProductService
{
    Task<ProductDto> CreateAsync(CreateProductDto dto);
    Task<ProductDto> UpdateAsync(int id, UpdateProductDto dto);
    Task DeleteAsync(int id);
}

public class ProductService : IProductService
{
    private readonly IProductRepository _productRepository;
    private readonly IUnitOfWork _unitOfWork;

    public ProductService(IProductRepository productRepository, IUnitOfWork unitOfWork)
    {
        _productRepository = productRepository;
        _unitOfWork = unitOfWork;
    }

    public async Task<ProductDto> CreateAsync(CreateProductDto dto)
    {
        var product = new Product
        {
            Name = dto.Name,
            Description = dto.Description,
            Price = dto.Price,
            CategoryId = dto.CategoryId
        };

        await _productRepository.AddAsync(product);
        await _unitOfWork.SaveChangesAsync();

        return _mapper.Map<ProductDto>(product);
    }
}
```

### 5. 添加控制器

```csharp
[ApiController]
[Route("api/[controller]")]
public class ProductsController : ControllerBase
{
    private readonly IProductService _productService;

    public ProductsController(IProductService productService)
    {
        _productService = productService;
    }

    [HttpPost]
    [Authorize]
    public async Task<ActionResult<ProductDto>> Create(CreateProductDto dto)
    {
        var result = await _productService.CreateAsync(dto);
        return CreatedAtAction(nameof(Get), new { id = result.Id }, result);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProductDto>> Get(int id)
    {
        var product = await _productService.GetByIdAsync(id);
        if (product == null) return NotFound();
        return product;
    }
}
```

## 数据迁移

使用 EF Core 进行数据库迁移：

```bash
# 添加迁移
dotnet ef migrations add InitialCreate

# 更新数据库
dotnet ef database update
```

## 测试

### 单元测试

```csharp
[TestClass]
public class ProductServiceTests
{
    [TestMethod]
    public async Task CreateAsync_ValidData_ReturnsProductDto()
    {
        // Arrange
        var dto = new CreateProductDto { Name = "Test Product" };
        
        // Act
        var result = await _productService.CreateAsync(dto);
        
        // Assert
        Assert.IsNotNull(result);
        Assert.AreEqual(dto.Name, result.Name);
    }
}
```

### 集成测试

```csharp
[TestClass]
public class ProductsControllerTests : TestBase
{
    [TestMethod]
    public async Task Get_ReturnsProduct_WhenExists()
    {
        // Arrange
        var product = await CreateTestProductAsync();
        
        // Act
        var response = await _client.GetAsync($"/api/products/{product.Id}");
        
        // Assert
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<ProductDto>();
        Assert.AreEqual(product.Name, result.Name);
    }
}
```

## 部署

### Docker 部署

```dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Berry.Admin/Berry.Admin.csproj", "Berry.Admin/"]
RUN dotnet restore "Berry.Admin/Berry.Admin.csproj"
COPY . .
WORKDIR "/src/Berry.Admin"
RUN dotnet build "Berry.Admin.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "Berry.Admin.csproj" -c Release -o /app/publish

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Berry.Admin.dll"]
```

### IIS 部署

1. 发布应用：`dotnet publish -c Release`
2. 配置 IIS 站点指向发布目录
3. 设置应用池为 .NET CLR 版本：无托管代码

## 最佳实践

1. **依赖注入**：使用构造函数注入，避免静态依赖
2. **异步编程**：所有 I/O 操作使用 async/await
3. **异常处理**：使用全局异常过滤器统一处理
4. **日志记录**：使用结构化日志记录关键信息
5. **配置管理**：敏感信息使用环境变量或密钥管理
6. **性能优化**：合理使用缓存，避免 N+1 查询问题

## 常见问题

### Q: 如何添加新的权限？

A: 在权限枚举中添加新值，然后在数据库中更新权限数据，最后在控制器方法上添加相应的授权特性。

### Q: 多租户如何工作？

A: 框架通过租户过滤器自动为查询添加租户条件，确保数据隔离。租户 ID 从 JWT token 或请求头中获取。

### Q: 如何自定义审计字段？

A: 继承 `BaseEntity` 类并添加自定义审计属性，然后在审计模块中配置相应的映射。

---

[返回开发文档](README.md)
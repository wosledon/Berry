# Berry API 开发和集成指南

## 概述

Berry 框架采用 OpenAPI/Swagger 规范生成类型安全的 API 客户端，支持自动化的 API 文档生成和客户端代码生成。本指南介绍如何开发 API 接口以及如何在前端集成这些 API。

## OpenAPI 配置

### 后端配置

在 `Program.cs` 中配置 Swagger：

```csharp
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new OpenApiInfo
    {
        Title = "Berry API",
        Version = "v1",
        Description = "Berry 框架 API 文档"
    });

    // 添加 JWT Bearer 认证
    options.AddSecurityDefinition("Bearer", new OpenSecurityScheme
    {
        Description = "JWT Authorization header using the Bearer scheme",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.Http,
        Scheme = "bearer"
    });

    options.AddSecurityRequirement(new OpenSecurityRequirement
    {
        {
            new OpenSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });

    // 包含 XML 注释
    var xmlFile = $"{Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    options.IncludeXmlComments(xmlPath);
});
```

### 控制器文档

```csharp
/// <summary>
/// 用户管理控制器
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class UsersController : ControllerBase
{
    /// <summary>
    /// 获取用户列表
    /// </summary>
    /// <param name="page">页码</param>
    /// <param name="size">每页大小</param>
    /// <returns>用户列表</returns>
    [HttpGet]
    [Authorize]
    [ProducesResponseType(typeof(PagedResult<UserDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<ActionResult<PagedResult<UserDto>>> GetUsers(
        [FromQuery] int page = 1,
        [FromQuery] int size = 10)
    {
        var result = await _userService.GetPagedAsync(page, size);
        return Ok(result);
    }

    /// <summary>
    /// 创建用户
    /// </summary>
    /// <param name="dto">用户创建数据</param>
    /// <returns>创建的用户</returns>
    [HttpPost]
    [Authorize(Policy = "AdminOnly")]
    [ProducesResponseType(typeof(UserDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserDto>> CreateUser(CreateUserDto dto)
    {
        var result = await _userService.CreateAsync(dto);
        return CreatedAtAction(nameof(GetUser), new { id = result.Id }, result);
    }
}
```

## API 版本控制

### URL 路径版本控制

```csharp
[ApiController]
[Route("api/v{version:apiVersion}/[controller]")]
[ApiVersion("1.0")]
[ApiVersion("2.0")]
public class UsersController : ControllerBase
{
    [HttpGet]
    [MapToApiVersion("1.0")]
    public async Task<ActionResult<UserDtoV1>> GetUsersV1() { ... }

    [HttpGet]
    [MapToApiVersion("2.0")]
    public async Task<ActionResult<UserDtoV2>> GetUsersV2() { ... }
}
```

### 配置版本

```csharp
builder.Services.AddApiVersioning(options =>
{
    options.DefaultApiVersion = new ApiVersion(1, 0);
    options.AssumeDefaultVersionWhenUnspecified = true;
    options.ReportApiVersions = true;
});
```

## 错误处理

### 全局异常过滤器

```csharp
public class GlobalExceptionFilter : IExceptionFilter
{
    private readonly ILogger<GlobalExceptionFilter> _logger;

    public GlobalExceptionFilter(ILogger<GlobalExceptionFilter> logger)
    {
        _logger = logger;
    }

    public void OnException(ExceptionContext context)
    {
        _logger.LogError(context.Exception, "Unhandled exception occurred");

        var response = new ErrorResponse
        {
            Message = "An error occurred while processing your request",
            Details = context.Exception.Message
        };

        if (context.Exception is ValidationException validationEx)
        {
            context.Result = new BadRequestObjectResult(new
            {
                Message = "Validation failed",
                Errors = validationEx.Errors
            });
        }
        else if (context.Exception is UnauthorizedAccessException)
        {
            context.Result = new UnauthorizedResult();
        }
        else
        {
            context.Result = new ObjectResult(response)
            {
                StatusCode = StatusCodes.Status500InternalServerError
            };
        }

        context.ExceptionHandled = true;
    }
}
```

### 自定义中间件

```csharp
public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;

    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception");

            await HandleExceptionAsync(context, ex);
        }
    }

    private static async Task HandleExceptionAsync(HttpContext context, Exception exception)
    {
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse
        {
            Message = "Internal server error",
            TraceId = context.TraceIdentifier
        };

        context.Response.StatusCode = exception switch
        {
            ValidationException => StatusCodes.Status400BadRequest,
            UnauthorizedAccessException => StatusCodes.Status401Unauthorized,
            KeyNotFoundException => StatusCodes.Status404NotFound,
            _ => StatusCodes.Status500InternalServerError
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}
```

## 认证和授权

### JWT 认证

```csharp
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"],
            ValidAudience = builder.Configuration["Jwt:Audience"],
            IssuerSigningKey = new SymmetricSecurityKey(
                Encoding.UTF8.GetBytes(builder.Configuration["Jwt:Key"]))
        };
    });
```

### 基于策略的授权

```csharp
builder.Services.AddAuthorization(options =>
{
    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));

    options.AddPolicy("CanManageUsers", policy =>
        policy.RequireClaim("permission", "users.manage"));

    options.AddPolicy("DepartmentManager", policy =>
        policy.RequireAssertion(context =>
            context.User.HasClaim(c =>
                c.Type == "department" &&
                c.Value == context.User.FindFirst("department")?.Value)));
});
```

### 自定义授权处理器

```csharp
public class PermissionRequirement : IAuthorizationRequirement
{
    public string Permission { get; }

    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }
}

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    private readonly IUserPermissionService _permissionService;

    public PermissionAuthorizationHandler(IUserPermissionService permissionService)
    {
        _permissionService = permissionService;
    }

    protected override async Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        var userId = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            return;
        }

        var hasPermission = await _permissionService.HasPermissionAsync(
            int.Parse(userId), requirement.Permission);

        if (hasPermission)
        {
            context.Succeed(requirement);
        }
    }
}
```

## OpenAPI 客户端生成

### 使用 OpenAPI Generator

```bash
# 生成 TypeScript 客户端
npx openapi-generator-cli generate \
  -i http://localhost:5000/swagger/v1/swagger.json \
  -g typescript-fetch \
  -o ./src/generated-api \
  --additional-properties=typescriptThreePlus=true
```

### 使用 openapi-fetch

```typescript
// src/services/apiClient.ts
import createClient from 'openapi-fetch';
import type { paths } from './api/schema'; // 生成的类型

export const apiClient = createClient<paths>({
  baseUrl: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.use({
  onRequest: ({ request }) => {
    const token = localStorage.getItem('token');
    if (token) {
      request.headers.set('Authorization', `Bearer ${token}`);
    }
    return request;
  },
  onResponse: ({ response }) => {
    if (response.status === 401) {
      // 处理未授权
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return response;
  },
});
```

## API 集成模式

### 1. 直接 API 调用

```typescript
// src/services/userService.ts
import { apiClient } from './apiClient';

export const userService = {
  async getUsers(params?: { page?: number; size?: number }) {
    const { data, error } = await apiClient.GET('/api/users', {
      params: { query: params }
    });

    if (error) throw error;
    return data;
  },

  async createUser(userData: CreateUserDto) {
    const { data, error } = await apiClient.POST('/api/users', {
      body: userData
    });

    if (error) throw error;
    return data;
  }
};
```

### 2. 使用 TanStack Query

```typescript
// src/hooks/useUsers.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/services/userService';

export const useUsers = (params?: UserQueryParams) => {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () => userService.getUsers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: userService.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
};
```

### 3. 自定义 Hook 封装

```typescript
// src/hooks/useApi.ts
import { useState, useCallback } from 'react';
import { apiClient } from '@/services/apiClient';

export const useApi = <TData, TParams extends Record<string, any> = {}>(
  apiCall: (params?: TParams) => Promise<TData>
) => {
  const [data, setData] = useState<TData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const execute = useCallback(async (params?: TParams) => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall(params);
      setData(result);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  return { data, loading, error, execute };
};
```

## 文件上传

### 单文件上传

```csharp
[HttpPost("upload")]
[Authorize]
public async Task<ActionResult<FileUploadResult>> UploadFile(IFormFile file)
{
    if (file == null || file.Length == 0)
        return BadRequest("No file uploaded");

    var fileName = Guid.NewGuid().ToString() + Path.GetExtension(file.FileName);
    var filePath = Path.Combine(_uploadPath, fileName);

    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    return Ok(new FileUploadResult
    {
        FileName = fileName,
        OriginalName = file.FileName,
        Size = file.Length,
        Url = $"/uploads/{fileName}"
    });
}
```

### 多文件上传

```csharp
[HttpPost("upload-multiple")]
[Authorize]
public async Task<ActionResult<List<FileUploadResult>>> UploadFiles(List<IFormFile> files)
{
    var results = new List<FileUploadResult>();

    foreach (var file in files)
    {
        if (file.Length > 0)
        {
            var result = await ProcessFileUpload(file);
            results.Add(result);
        }
    }

    return Ok(results);
}
```

### 前端文件上传

```typescript
// src/components/FileUpload.tsx
import React, { useCallback } from 'react';
import { Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';

const FileUpload: React.FC = () => {
  const handleUpload: UploadProps['customRequest'] = useCallback(async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('file', file as File);

    try {
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        onSuccess?.(result);
        message.success('文件上传成功');
      } else {
        throw new Error('上传失败');
      }
    } catch (error) {
      onError?.(error as Error);
      message.error('文件上传失败');
    }
  }, []);

  return (
    <Upload customRequest={handleUpload}>
      <Button icon={<UploadOutlined />}>选择文件</Button>
    </Upload>
  );
};
```

## API 测试

### 使用 Swagger UI

启动应用后访问 `http://localhost:5000/swagger` 可以查看和测试 API。

### 单元测试

```csharp
[TestClass]
public class UsersControllerTests : TestBase
{
    [TestMethod]
    public async Task GetUsers_ReturnsOkResult()
    {
        // Arrange
        var client = Factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/users");

        // Assert
        response.EnsureSuccessStatusCode();
        var users = await response.Content.ReadFromJsonAsync<List<UserDto>>();
        Assert.IsNotNull(users);
    }

    [TestMethod]
    public async Task CreateUser_ValidData_ReturnsCreated()
    {
        // Arrange
        var client = Factory.CreateClient();
        var userData = new CreateUserDto
        {
            Username = "testuser",
            Email = "test@example.com",
            Password = "password123"
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/users", userData);

        // Assert
        Assert.AreEqual(HttpStatusCode.Created, response.StatusCode);
        var createdUser = await response.Content.ReadFromJsonAsync<UserDto>();
        Assert.AreEqual(userData.Username, createdUser.Username);
    }
}
```

### 集成测试

```typescript
// src/__tests__/api/users.test.ts
import { apiClient } from '@/services/apiClient';

describe('Users API', () => {
  test('should get users list', async () => {
    const { data, error } = await apiClient.GET('/api/users', {});

    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should create user', async () => {
    const userData = {
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123'
    };

    const { data, error } = await apiClient.POST('/api/users', {
      body: userData
    });

    expect(error).toBeUndefined();
    expect(data).toBeDefined();
    expect(data.username).toBe(userData.username);
  });
});
```

## 性能优化

### 响应压缩

```csharp
builder.Services.AddResponseCompression(options =>
{
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(
        new[] { "application/json" });
});

app.UseResponseCompression();
```

### 缓存

```csharp
builder.Services.AddOutputCache(options =>
{
    options.AddBasePolicy(builder =>
        builder.Expire(TimeSpan.FromMinutes(10)));
});

app.UseOutputCache();
```

```csharp
[HttpGet]
[OutputCache(Duration = 300)] // 缓存 5 分钟
public async Task<ActionResult<List<ProductDto>>> GetProducts()
{
    return await _productService.GetAllAsync();
}
```

### 分页

```csharp
public class PagedResult<T>
{
    public IEnumerable<T> Items { get; set; }
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling(TotalCount / (double)PageSize);
}

[HttpGet]
public async Task<ActionResult<PagedResult<UserDto>>> GetUsers(
    [FromQuery] int page = 1,
    [FromQuery] int size = 10)
{
    var result = await _userService.GetPagedAsync(page, size);
    return Ok(result);
}
```

## 安全考虑

1. **输入验证**：使用数据注解和 FluentValidation
2. **SQL 注入防护**：使用参数化查询
3. **XSS 防护**：对用户输入进行编码
4. **CSRF 防护**：使用 AntiForgeryToken
5. **速率限制**：实现 API 速率限制
6. **日志记录**：记录敏感操作

## 监控和日志

### 结构化日志

```csharp
_logger.LogInformation("User {UserId} performed action {Action} on resource {ResourceId}",
    userId, action, resourceId);
```

### 健康检查

```csharp
builder.Services.AddHealthChecks()
    .AddDbContextCheck<ApplicationDbContext>()
    .AddRedis(redisConnectionString);

app.MapHealthChecks("/health");
```

### 指标收集

```csharp
builder.Services.AddApplicationInsightsTelemetry();
```

---

[返回开发文档](README.md)
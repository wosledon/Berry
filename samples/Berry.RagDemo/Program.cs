using Berry.Embeddings.MiniLmL6v2;
using Berry.Host;
using Berry.Modules.Rag;
using Berry.Modules.Rbac; // 用于排除RBAC模块
using Berry.Modules.VectorStore; // 确认向量存储模块可被扫描
using Microsoft.OpenApi.Models;
using Serilog;

var builder = WebApplication.CreateBuilder(args);

// Serilog配置
builder.Host.UseSerilog((ctx, lc) => lc
    .ReadFrom.Configuration(ctx.Configuration)
    .Enrich.FromLogContext()
    .WriteTo.Console());

// Swagger
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo 
    { 
        Title = "Berry RAG Demo API", 
        Version = "v1",
        Description = "演示Berry RAG功能：文档上传、向量检索、知识问答"
    });
});

builder.Services.AddControllers();

// Berry 框架核心：直接传入配置委托（AddBerry 内部创建 BerryOptions，不读取 Configure<BerryOptions>）
builder.Services.AddBerry(builder.Configuration, options =>
{
    options.UseBuiltinModules = true;                 // 注册内置模块（排除 RBAC）
    options.EnableAutoDiscovery = true;               // 启用自动发现以加载 RAG/VectorStore 模块
    options.ScanEntryAssemblyOnly = false;            // 扫描所有已加载程序集
    options.AssemblyPrefixes.Add("Berry.Modules");    // 仅扫描 Berry.Modules.* 前缀 (Rag/VectorStore 在此范围内)
    options.ExcludedModules.Add(typeof(RbacModule));  // 排除 RBAC 模块，避免 HostedService 生命周期冲突
});

// 注册MiniLM嵌入服务
builder.Services.AddMiniLmEmbeddings();

// 配置RAG选项
builder.Services.Configure<RagOptions>(options =>
{
    options.MaxRetrieve = 5;
    options.SimilarityThreshold = 0.7;
    options.EnableConversationMemory = false; // 简化示例，不启用对话记忆
});

var app = builder.Build();

// 启用Swagger（所有环境）
app.UseSwagger();
app.UseSwaggerUI(c =>
{
    c.SwaggerEndpoint("/swagger/v1/swagger.json", "Berry RAG Demo API v1");
    c.RoutePrefix = string.Empty; // 根路径直接访问Swagger
});

app.UseSerilogRequestLogging();

app.UseRouting();

// Berry 中间件（仍然启用通用中间件：审计 / 租户，如已被成功注册）
app.UseBerry();

app.MapControllers();

app.MapGet("/api/info", () => Results.Ok(new 
{ 
    name = "Berry RAG Demo",
    version = "1.0.0",
    description = "基于Berry框架的RAG检索增强生成演示",
    features = new[]
    {
        "文档上传与分块",
        "MiniLM-L6-v2向量嵌入",
        "内存向量存储",
        "语义检索TopK",
        "对话记忆管理"
    }
}));

app.MapGet("/api/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }));

app.Run();

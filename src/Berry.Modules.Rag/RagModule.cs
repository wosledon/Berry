using Berry.Shared.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Berry.Modules.Rag;

public sealed class RagModule : IModule
{
    public string Name => "RAG";
    public int Order => 60; // after messaging/caching

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.Configure<RagOptions>(configuration.GetSection("Rag"));
        services.AddSingleton<IConversationMemory, InMemoryConversationMemory>();
        services.AddSingleton<IRagMetrics, InMemoryRagMetrics>();
        services.AddSingleton<IChunker>(_ => new SimpleChunker());
        // Embedding Provider 可扩展：如果配置指定 Onnx 模式且模型存在则外部可替换；此处仍默认使用 InMemoryEmbeddingProvider
        if (!services.Any(sd => sd.ServiceType == typeof(IEmbeddingProvider)))
        {
            services.AddSingleton<IEmbeddingProvider, InMemoryEmbeddingProvider>();
        }
        services.AddSingleton<IRagService, DefaultRagService>();
        // 用户可通过 DI 替换 Chunker / Memory / Embedding / VectorStore / Metrics
    }

    public void ConfigureApplication(WebApplication app)
    {
        // 可添加端点或不处理
    }
}

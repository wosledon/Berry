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
        services.AddSingleton<IRagService, DefaultRagService>();
        // 用户可通过 DI 替换 Chunker / Memory / Embedding / VectorStore / Metrics
    }

    public void ConfigureApplication(WebApplication app)
    {
        // 可添加端点或不处理
    }
}

using Berry.Shared.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Berry.Modules.VectorStore;

public sealed class VectorStoreModule : IModule
{
    public string Name => "VectorStore";
    public int Order => 50; // before Rag

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddSingleton<IVectorStore, InMemoryVectorStore>();
        // 仅内存实现，外部可自行覆盖 IEmbeddingProvider / IVectorStore
        services.AddSingleton<IEmbeddingProvider, InMemoryEmbeddingProvider>();
    }

    public void ConfigureApplication(WebApplication app)
    {
    }
}

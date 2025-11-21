using Berry.Abstractions.Embeddings;
using Microsoft.Extensions.DependencyInjection;

namespace Berry.Embeddings.MiniLmL6v2;

/// <summary>
/// MiniLM-L6-v2 嵌入模块
/// 注册具体实现到 DI 容器
/// </summary>
public static class MiniLmEmbeddingsServiceCollectionExtensions
{
    public static IServiceCollection AddMiniLmEmbeddings(this IServiceCollection services)
    {
        services.AddSingleton<IEmbeddingModelResolver, DirectoryScanningModelResolver>();
        services.AddSingleton<IEmbeddingTokenizer, TokenizerBridge>();
        services.AddSingleton<IEmbeddingProvider, MiniLmEmbeddingProvider>();
        return services;
    }
}

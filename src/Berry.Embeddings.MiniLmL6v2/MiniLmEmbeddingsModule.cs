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
        // 使用无领域增强的 tokenizer（仅基于 vocab + 基础 CJK 拆分）
        services.AddSingleton<IEmbeddingTokenizer, TokenizerBridge>();
        services.AddSingleton<IEmbeddingProvider, MiniLmEmbeddingProvider>();
        return services;
    }
}

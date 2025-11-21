using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;

namespace Berry.Abstractions.Embeddings;

/// <summary>
/// 嵌入向量提供者抽象 - 核心接口
/// </summary>
public interface IEmbeddingProvider
{
    /// <summary>
    /// 嵌入维度
    /// </summary>
    int Dimension { get; }
    
    /// <summary>
    /// 单文本嵌入
    /// </summary>
    Task<float[]> EmbedAsync(string text, CancellationToken ct = default);
    
    /// <summary>
    /// 批量文本嵌入（可选实现，默认循环调用 EmbedAsync）
    /// </summary>
    Task<float[][]> EmbedBatchAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        var tasks = new List<Task<float[]>>();
        foreach (var text in texts)
        {
            tasks.Add(EmbedAsync(text, ct));
        }
        return Task.WhenAll(tasks);
    }
}

/// <summary>
/// 嵌入模型信息描述
/// </summary>
public sealed record EmbeddingModelInfo(
    string ModelDirectory,
    string? ModelFilePath,
    string? TokenizerFilePath,
    int EmbeddingDimension,
    int MaxTokenLength,
    string PoolingStrategy);

/// <summary>
/// 模型资源解析器 - 负责定位模型文件与配置
/// </summary>
public interface IEmbeddingModelResolver
{
    EmbeddingModelInfo ResolveModel(IConfiguration config);
}

/// <summary>
/// 分词结果
/// </summary>
public sealed record TokenizedInput(
    IReadOnlyList<long> InputIds,
    IReadOnlyList<long> AttentionMask,
    IReadOnlyList<long>? TokenTypeIds = null);

/// <summary>
/// 文本分词器抽象
/// </summary>
public interface IEmbeddingTokenizer
{
    /// <summary>
    /// 分词并返回完整输入（input_ids, attention_mask, token_type_ids）
    /// </summary>
    Task<TokenizedInput> TokenizeAsync(string text, int maxTokens, CancellationToken ct = default);
    
    /// <summary>
    /// 批量分词（可选实现，默认循环调用 TokenizeAsync）
    /// </summary>
    async Task<IReadOnlyList<TokenizedInput>> TokenizeBatchAsync(IReadOnlyList<string> texts, int maxTokens, CancellationToken ct = default)
    {
        var tasks = new List<Task<TokenizedInput>>();
        foreach (var text in texts)
        {
            tasks.Add(TokenizeAsync(text, maxTokens, ct));
        }
        var results = await Task.WhenAll(tasks);
        return results;
    }
}

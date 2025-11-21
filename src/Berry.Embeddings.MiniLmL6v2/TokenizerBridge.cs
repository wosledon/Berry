using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Berry.Abstractions.Embeddings;
using Microsoft.Extensions.Logging;

namespace Berry.Embeddings.MiniLmL6v2;

/// <summary>
/// 基于简化分词的桥接 (降级实现)
/// 生产环境应使用完整的 HuggingFace Tokenizer
/// </summary>
public class TokenizerBridge : IEmbeddingTokenizer
{
    private readonly ILogger<TokenizerBridge> _logger;
    private readonly string? _tokenizerPath;
    private readonly bool _useFallback = true; // 始终使用降级模式

    public TokenizerBridge(ILogger<TokenizerBridge> logger, IEmbeddingModelResolver resolver, Microsoft.Extensions.Configuration.IConfiguration config)
    {
        _logger = logger;
        var modelInfo = resolver.ResolveModel(config);
        _tokenizerPath = Path.Combine(modelInfo.ModelDirectory, "tokenizer.json");

        _logger.LogWarning("TokenizerBridge 使用简化分词实现，建议集成完整的 HuggingFace Tokenizer: {Path}", _tokenizerPath);
    }

    public Task<TokenizedInput> TokenizeAsync(string text, int maxTokens, CancellationToken ct = default)
    {
        return Task.FromResult(FallbackTokenize(text, maxTokens));
    }

    public async Task<IReadOnlyList<TokenizedInput>> TokenizeBatchAsync(IReadOnlyList<string> texts, int maxTokens, CancellationToken ct = default)
    {
        return texts.Select(t => FallbackTokenize(t, maxTokens)).ToArray();
    }

    private static TokenizedInput FallbackTokenize(string text, int maxLength)
    {
        // 简化分词: 按单词和字符边界分割
        var tokens = Regex.Split(text, @"(\W+)").Where(s => !string.IsNullOrWhiteSpace(s)).ToArray();
        int len = Math.Min(tokens.Length, maxLength);
        var inputIds = Enumerable.Range(0, len).Select(i => (long)i).ToArray();
        var attentionMask = Enumerable.Repeat(1L, len).ToArray();
        return new TokenizedInput(inputIds, attentionMask, null);
    }
}

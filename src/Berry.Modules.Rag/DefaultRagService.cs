using Berry.Abstractions.Embeddings;
using Berry.Modules.VectorStore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.IO;
using System;
using System.Linq;
using System.Collections.Generic;

namespace Berry.Modules.Rag;

internal sealed class DefaultRagService : IRagService
{
    private readonly IVectorStore _vectorStore;
    private readonly IEmbeddingProvider _embeddingProvider;
    private readonly IConversationMemory _memory;
    private readonly IRagMetrics _metrics;
    private readonly IChunker _chunker;
    private readonly RagOptions _options;
    private readonly ILogger<DefaultRagService> _logger;
    private readonly Dictionary<string, float[]> _embeddingCache = new();
    private readonly object _cacheLock = new();

    public DefaultRagService(
        IVectorStore vectorStore,
        IEmbeddingProvider embeddingProvider,
        IConversationMemory memory,
        IRagMetrics metrics,
        IChunker chunker,
        IOptions<RagOptions> options,
        ILogger<DefaultRagService> logger)
    {
        _vectorStore = vectorStore;
        _embeddingProvider = embeddingProvider;
        _memory = memory;
        _metrics = metrics;
        _chunker = chunker;
        _options = options.Value;
        _logger = logger;
    }

    public async Task<RagQueryResult> QueryAsync(string userId, string query, CancellationToken cancellationToken = default)
    {
        _metrics.IncrementQuery();
        float[] embedding;
        bool cacheHit = false;
        lock(_cacheLock)
        {
            if(_embeddingCache.TryGetValue(query,out var emb))
            {
                embedding = emb; cacheHit = true; _metrics.IncrementCacheHit();
            }
            else embedding = Array.Empty<float>();
        }
        if(!cacheHit)
        {
            embedding = await _embeddingProvider.EmbedAsync(query, cancellationToken).ConfigureAwait(false);
            lock(_cacheLock){ _embeddingCache[query]= embedding; }
        }
        // Hybrid 检索：扩大初始候选并执行词汇重排序
        var vectorThreshold = _options.EnableHybrid ? Math.Min(_options.SimilarityThreshold, 0.15) : _options.SimilarityThreshold;
        int candidateK = _options.EnableHybrid ? _options.MaxRetrieve * _options.HybridCandidateMultiplier : _options.MaxRetrieve;
        var initial = await _vectorStore.SearchAsync(embedding, candidateK, vectorThreshold, cancellationToken).ConfigureAwait(false);
        IReadOnlyList<Berry.Modules.VectorStore.RetrievedChunk> retrieved;
        if (_options.EnableHybrid && initial.Count > 0)
        {
            var queryTokens = ExtractTokens(query);
            var scored = new List<Berry.Modules.VectorStore.RetrievedChunk>(initial.Count);
            foreach (var chunk in initial)
            {
                var docTokens = ExtractTokens(chunk.Content);
                int overlap = 0;
                foreach (var tk in queryTokens) if (docTokens.Contains(tk)) overlap++;
                double boost = overlap * _options.LexicalPerTokenBoost;
                if (overlap > 0 && queryTokens.Count > 0 && overlap == queryTokens.Count)
                {
                    boost += _options.LexicalExactBoost; // 全部覆盖的强加分
                }
                if (overlap == 0) boost -= _options.PenaltyNoLexical;
                var combined = new Berry.Modules.VectorStore.RetrievedChunk
                {
                    Id = chunk.Id,
                    Content = chunk.Content,
                    Score = chunk.Score + boost
                };
                scored.Add(combined);
            }
            retrieved = scored
                .OrderByDescending(r => r.Score)
                .Take(_options.MaxRetrieve)
                .Where(r => r.Score >= _options.SimilarityThreshold * 0.5) // 最终保留底线分数 (降低门槛防止全被过滤)
                .ToList();
        }
        else
        {
            retrieved = initial;
        }
        if (retrieved.Count == 0) _metrics.IncrementRetrievalMiss();

        // 可选：维护会话历史，纯检索场景只追加，不参与打分
        if (_options.EnableConversationMemory)
        {
            _memory.Append(userId, "user", query);
            // 不追加 assistant，因为没有生成答案
        }
        return new RagQueryResult(retrieved, cacheHit);
    }

    // 简易词汇分词：空白 + 标点 + 中文单字 + 中文整串
    private static HashSet<string> ExtractTokens(string text)
    {
        var set = new HashSet<string>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(text)) return set;
        var raw = System.Text.RegularExpressions.Regex.Split(text.Trim(), "[\r\n\t ]+");
        var punct = new System.Text.RegularExpressions.Regex("([\\p{P}])", System.Text.RegularExpressions.RegexOptions.Compiled);
        foreach (var part in raw)
        {
            if (string.IsNullOrWhiteSpace(part)) continue;
            var segs = punct.Split(part).Where(s => !string.IsNullOrWhiteSpace(s));
            foreach (var seg in segs)
            {
                if (IsAllCjk(seg))
                {
                    set.Add(seg);
                    foreach (var ch in seg) set.Add(ch.ToString());
                }
                else
                {
                    set.Add(seg.ToLowerInvariant());
                }
            }
        }
        return set;
    }
    private static bool IsAllCjk(string s)
    {
        if (string.IsNullOrEmpty(s)) return false;
        foreach (var ch in s) if (!(ch >= '\u4e00' && ch <= '\u9fff')) return false;
        return true;
    }

    public async Task IngestAsync(string content, string? externalId = null, CancellationToken cancellationToken = default)
    {
        var chunks = _chunker.Chunk(content);
        foreach (var chunk in chunks)
        {
            var embedding = await _embeddingProvider.EmbedAsync(chunk, cancellationToken).ConfigureAwait(false);
            await _vectorStore.UpsertAsync(new VectorDocument
            {
                Id = (externalId ?? Guid.NewGuid().ToString("N")) + ":" + Guid.NewGuid().ToString("N"),
                Content = chunk,
                Embedding = embedding
            }, cancellationToken).ConfigureAwait(false);
        }
    }
    public async Task BulkIngestDirectoryAsync(string directory, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(directory) || !Directory.Exists(directory)) return;
        var files = Directory.GetFiles(directory, "*.*", SearchOption.TopDirectoryOnly)
            .Where(f => f.EndsWith(".txt", StringComparison.OrdinalIgnoreCase)
                     || f.EndsWith(".md", StringComparison.OrdinalIgnoreCase)
                     || f.EndsWith(".markdown", StringComparison.OrdinalIgnoreCase));
        foreach (var file in files)
        {
            cancellationToken.ThrowIfCancellationRequested();
            string content;
            try { content = await File.ReadAllTextAsync(file, cancellationToken).ConfigureAwait(false); }
            catch { continue; }
            await IngestAsync(content, Path.GetFileName(file), cancellationToken).ConfigureAwait(false);
        }
    }
    public RagStats GetStats() => _metrics.Snapshot();
}

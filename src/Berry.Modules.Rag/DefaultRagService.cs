using Berry.Modules.VectorStore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

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
    private readonly Dictionary<string,IReadOnlyList<float>> _embeddingCache = new();
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
        IReadOnlyList<float> embedding;
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
            embedding = await _embeddingProvider.GetEmbeddingAsync(query, cancellationToken).ConfigureAwait(false);
            lock(_cacheLock){ _embeddingCache[query]= embedding; }
        }
        var retrieved = await _vectorStore.SearchAsync(embedding, _options.MaxRetrieve, _options.SimilarityThreshold, cancellationToken).ConfigureAwait(false);
        if (retrieved.Count == 0) _metrics.IncrementRetrievalMiss();

        // 可选：维护会话历史，纯检索场景只追加，不参与打分
        if (_options.EnableConversationMemory)
        {
            _memory.Append(userId, "user", query);
            // 不追加 assistant，因为没有生成答案
        }
        return new RagQueryResult(retrieved, cacheHit);
    }

    public async Task IngestAsync(string content, string? externalId = null, CancellationToken cancellationToken = default)
    {
        var chunks = _chunker.Chunk(content);
        foreach (var chunk in chunks)
        {
            var embedding = await _embeddingProvider.GetEmbeddingAsync(chunk, cancellationToken).ConfigureAwait(false);
            await _vectorStore.UpsertAsync(new VectorDocument
            {
                Id = (externalId ?? Guid.NewGuid().ToString("N")) + ":" + Guid.NewGuid().ToString("N"),
                Content = chunk,
                Embedding = embedding
            }, cancellationToken).ConfigureAwait(false);
        }
    }
    public RagStats GetStats() => _metrics.Snapshot();
}

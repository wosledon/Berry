using Berry.Modules.VectorStore;

namespace Berry.Modules.Rag;

public interface IRagService
{
    Task<RagQueryResult> QueryAsync(string userId, string query, CancellationToken cancellationToken = default);
    Task IngestAsync(string content, string? externalId = null, CancellationToken cancellationToken = default);
    RagStats GetStats();
}

// 纯检索结果，仅返回 TopK 与缓存命中标记
public sealed record RagQueryResult(IReadOnlyList<RetrievedChunk> Contexts, bool WasCached = false);
public sealed record RagStats(int TotalQueries, int CacheHits, int RetrievalMisses);

namespace Berry.Modules.Rag;

// 保留 Metrics 用于监控 RAG 检索行为
public interface IRagMetrics
{
    void IncrementQuery();
    void IncrementCacheHit();
    void IncrementRetrievalMiss();
    RagStats Snapshot();
}

public sealed class InMemoryRagMetrics : IRagMetrics
{
    private int _totalQueries;
    private int _cacheHits;
    private int _retrievalMisses;
    public void IncrementQuery() => Interlocked.Increment(ref _totalQueries);
    public void IncrementCacheHit() => Interlocked.Increment(ref _cacheHits);
    public void IncrementRetrievalMiss() => Interlocked.Increment(ref _retrievalMisses);
    public RagStats Snapshot() => new(_totalQueries,_cacheHits,_retrievalMisses);
}

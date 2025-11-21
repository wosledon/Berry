using Berry.Abstractions.Embeddings;

namespace Berry.Modules.VectorStore;

public interface IVectorStore
{
    Task UpsertAsync(VectorDocument doc, CancellationToken ct = default);
    Task<IReadOnlyList<RetrievedChunk>> SearchAsync(IReadOnlyList<float> embedding, int topK, double threshold, CancellationToken ct = default);
}

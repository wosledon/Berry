namespace Berry.Modules.VectorStore;

public sealed class InMemoryVectorStore : IVectorStore
{
    private readonly List<VectorDocument> _docs = new();
    private readonly object _lock = new();

    public Task UpsertAsync(VectorDocument doc, CancellationToken ct = default)
    {
        lock (_lock)
        {
            var existing = _docs.FindIndex(d => d.Id == doc.Id);
            if (existing >= 0) _docs[existing] = doc; else _docs.Add(doc);
        }
        return Task.CompletedTask;
    }

    public Task<IReadOnlyList<RetrievedChunk>> SearchAsync(IReadOnlyList<float> embedding, int topK, double threshold, CancellationToken ct = default)
    {
        List<RetrievedChunk> results;
        lock (_lock)
        {
            results = _docs.Select(d => new RetrievedChunk
            {
                Id = d.Id,
                Content = d.Content,
                Score = Cosine(d.Embedding, embedding)
            })
            .Where(r => r.Score >= threshold)
            .OrderByDescending(r => r.Score)
            .Take(topK)
            .ToList();
        }
        return Task.FromResult<IReadOnlyList<RetrievedChunk>>(results);
    }

    private static double Cosine(IReadOnlyList<float> a, IReadOnlyList<float> b)
    {
        if (a.Count == 0 || b.Count == 0 || a.Count != b.Count) return 0;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.Count; i++)
        {
            dot += a[i] * b[i];
            na += a[i] * a[i];
            nb += b[i] * b[i];
        }
        var denom = Math.Sqrt(na) * Math.Sqrt(nb);
        return denom == 0 ? 0 : dot / denom;
    }
}

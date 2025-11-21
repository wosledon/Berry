namespace Berry.Modules.VectorStore;

public sealed class VectorDocument
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public IReadOnlyList<float> Embedding { get; set; } = Array.Empty<float>();
}

public sealed class RetrievedChunk
{
    public string Id { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public double Score { get; set; }
}

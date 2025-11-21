using System.Security.Cryptography;
using System.Text;
using Berry.Abstractions.Embeddings;

namespace Berry.Modules.VectorStore;

/// <summary>简易占位 Embedding Provider：将文本哈希展开为固定维度。</summary>
public sealed class InMemoryEmbeddingProvider : IEmbeddingProvider
{
    private const int Dim = 64;
    public int Dimension => Dim;

    public Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        using var sha = SHA256.Create();
        var bytes = sha.ComputeHash(Encoding.UTF8.GetBytes(text));
        var floats = new float[Dim];
        for (int i = 0; i < Dim; i++)
        {
            floats[i] = bytes[i % bytes.Length] / 255f;
        }
        return Task.FromResult(floats);
    }
}

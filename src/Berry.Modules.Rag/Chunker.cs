namespace Berry.Modules.Rag;

public interface IChunker
{
    IEnumerable<string> Chunk(string content);
}

public sealed class SimpleChunker : IChunker
{
    private readonly int _maxChars;
    public SimpleChunker(int maxChars = 800) => _maxChars = maxChars;
    public IEnumerable<string> Chunk(string content)
    {
        if (string.IsNullOrWhiteSpace(content)) yield break;
        if (content.Length <= _maxChars) { yield return content; yield break; }
        int idx = 0;
        while (idx < content.Length)
        {
            int take = Math.Min(_maxChars, content.Length - idx);
            yield return content.Substring(idx, take);
            idx += take;
        }
    }
}

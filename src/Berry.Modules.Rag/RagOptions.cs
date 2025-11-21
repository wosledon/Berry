namespace Berry.Modules.Rag;

public sealed class RagOptions
{
    /// <summary>最大检索的候选文档数量</summary>
    public int MaxRetrieve { get; set; } = 8;
    /// <summary>向量相似度阈值</summary>
    public double SimilarityThreshold { get; set; } = 0.75;
    /// <summary>默认是否开启内存记忆</summary>
    public bool EnableConversationMemory { get; set; } = true;
}

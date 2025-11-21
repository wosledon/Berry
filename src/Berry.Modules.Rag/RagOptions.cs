namespace Berry.Modules.Rag;

public sealed class RagOptions
{
    /// <summary>最大检索的候选文档数量</summary>
    public int MaxRetrieve { get; set; } = 8;
    /// <summary>向量相似度阈值</summary>
    public double SimilarityThreshold { get; set; } = 0.30; // 降低默认阈值以提高中文召回
    /// <summary>默认是否开启内存记忆</summary>
    public bool EnableConversationMemory { get; set; } = true;
    /// <summary>是否启用混合(向量+词汇)检索重排序</summary>
    public bool EnableHybrid { get; set; } = true;
    /// <summary>混合检索时向量初始候选扩展倍数 (最终再截断到 MaxRetrieve)</summary>
    public int HybridCandidateMultiplier { get; set; } = 3;
    /// <summary>词汇重叠每个token的加分 (叠加)</summary>
    public double LexicalPerTokenBoost { get; set; } = 0.02;
    /// <summary>完整中文或精确短语出现的额外一次性加分</summary>
    public double LexicalExactBoost { get; set; } = 0.10;
    /// <summary>无任何词汇重叠时的惩罚分 (从向量分数中扣除)</summary>
    public double PenaltyNoLexical { get; set; } = 0.05;
}

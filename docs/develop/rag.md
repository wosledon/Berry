# Berry RAG 模块使用指南

`Berry.Modules.Rag` 提供一个精简的检索增强生成（RAG）“检索”层，仅做 TopK 相似向量检索，不再包含 LLM、奖励/惩罚、外部 Embedding Provider 自动选择等逻辑。当前架构要点：

- 向量存储：`InMemoryVectorStore` 默认实现（可通过 DI 外部替换为其他存储）。
- Embedding Provider：仅内存哈希占位 `InMemoryEmbeddingProvider`（可外部重写为真实模型）。
- 文档分块：`IChunker` 在 Ingest 时切分长文本（默认按固定长度）。
- 会话记忆：`IConversationMemory` 可选，仅用于记录用户查询（不生成答案）。
- 统计：`IRagMetrics` 提供查询次数、缓存命中、检索未命中统计。
- 缓存：查询向量（Embedding）内存缓存，减少重复计算。

## 安装

添加包（发布后）：

```bash
dotnet add package Berry.Modules.VectorStore
dotnet add package Berry.Modules.Rag
```

## 配置

在 `appsettings.json` 中添加（可选）：

```json
{
  "Rag": {
    "MaxRetrieve": 8,
    "SimilarityThreshold": 0.75,
    "EnableConversationMemory": true
  }
}
```

## 注册模块

框架会自动发现模块；或在自定义宿主中手动：

```csharp
builder.Services.AddOptions(); // 确保 Options 可用
// 模块扫描会调用 RagModule / VectorStoreModule 的 ConfigureServices
```

## 基本使用

```csharp
public class QaController : ControllerBase
{
    private readonly IRagService _rag;
    public QaController(IRagService rag) => _rag = rag;

    [HttpPost("ingest")]
    public async Task<IActionResult> Ingest([FromBody] string text)
    {
        await _rag.IngestAsync(text);
        return Ok();
    }

    [HttpGet("query")]
    public async Task<IActionResult> Query([FromQuery] string q, [FromQuery] string user)
    {
        var resp = await _rag.QueryAsync(user, q);
        return Ok(resp);
    }
}
```

## 覆盖 EmbeddingProvider / VectorStore（自定义实现）

实现接口并在 DI 中覆盖：

```csharp
public class MyEmbeddingProvider : IEmbeddingProvider
{
    public Task<IReadOnlyList<float>> GetEmbeddingAsync(string text, CancellationToken ct = default)
    {
        // 调用真实模型
        var vec = /* ... */ new float[512];
        return Task.FromResult<IReadOnlyList<float>>(vec);
    }
}

public class MyVectorStore : IVectorStore
{
    public Task UpsertAsync(VectorDocument doc, CancellationToken ct = default) { /*...*/ return Task.CompletedTask; }
    public Task<IReadOnlyList<RetrievedChunk>> SearchAsync(IReadOnlyList<float> embedding, int topK, double threshold, CancellationToken ct = default)
    { /*...*/ return Task.FromResult<IReadOnlyList<RetrievedChunk>>(Array.Empty<RetrievedChunk>()); }
}

// 在 Program.cs
builder.Services.AddSingleton<IEmbeddingProvider, MyEmbeddingProvider>();
builder.Services.AddSingleton<IVectorStore, MyVectorStore>();
```

## 奖励 / 惩罚策略与 LLM

已移除，不在精简检索模式中使用；可以通过外部服务在获得 `Contexts` 后自行生成答案或做评分。

## 替换会话记忆

实现 `IConversationMemory` 接口：

```csharp
public class RedisConversationMemory : IConversationMemory
{
    // 伪代码：使用 Redis 保存历史
    public void Append(string userId, string role, string content) { /* ... */ }
    public IReadOnlyList<(string role, string content)> GetHistory(string userId, int max = 10) { /* ... */ return Array.Empty<(string,string)>(); }
}

builder.Services.AddSingleton<IConversationMemory, RedisConversationMemory>();
```

## Ingest 与 Query 流程

1. 调用 `IngestAsync`：原始文本 -> Chunker 分块 -> 每块 Embedding -> Upsert 进向量库
2. 调用 `QueryAsync`：查询 -> Embedding（缓存） -> 向量检索 -> 返回 TopK `RetrievedChunk` 列表与是否缓存命中标记
3. 若启用记忆，只记录用户查询（不生成回答）

返回对象：

```csharp
public sealed record RagQueryResult(IReadOnlyList<RetrievedChunk> Contexts, bool WasCached = false);
```

统计：

```csharp
public sealed record RagStats(int TotalQueries, int CacheHits, int RetrievalMisses);
var stats = _rag.GetStats();
```

## 扩展到真实 LLM（可选外部集成）

在控制器中拿到 `RagQueryResult.Contexts` 后自行构造 Prompt 调用外部 LLM；不在本模块内处理。

## 打包

若发布为 NuGet，请确保 `Directory.Build.props` 版本提升后执行 CI。模块已设置 `<IsPackable>true>`。

## 后续改进建议

- 更智能的 Chunker（语义/句子/Markdown 结构）
- 多字段向量（标题、标签、正文）与加权检索
- Hybrid 检索（BM25 + 向量融合）
- Embedding 过期策略与定期重算
- 分布式向量存储（Milvus / Qdrant / PostgreSQL pgvector）
- 外部答案生成与评分反馈管线 (RLHF / RLAIF) 可在外围实现

---
如需更多示例，可结合 `Berry.Sample` 添加演示控制器并扩展真实 Provider / LLM。

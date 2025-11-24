# Embeddings 模块说明

Berry Embeddings 采用分层架构，将抽象接口与具体实现分离：
- **`Berry.Abstractions.Embeddings`**: 纯接口定义，供所有模块引用
- **`Berry.Embeddings.MiniLmL6v2`**: MiniLM-L6-v2 参考实现（含模型资源文件）

## 目标
- 允许外部以 **自定义资源包** 实现不同模型（如BERT、sentence-transformers等）接入，无需修改核心代码
- 提供可替换的 **模型定位**、**分词器** 与 **嵌入提供者** 实现
- 保留轻量降级策略（SHA256哈希），在非生产或资源缺失情况下仍可运行检索逻辑

## 包结构

### Berry.Abstractions.Embeddings
核心抽象层，定义所有扩展点：
- `IEmbeddingProvider`: 文本嵌入接口（单文本/批量）
- `IEmbeddingModelResolver`: 模型定位与元数据解析
- `IEmbeddingTokenizer`: 文本分词接口
- `EmbeddingModelInfo`: 模型元数据记录
- `TokenizedInput`: 分词结果记录

### Berry.Embeddings.MiniLmL6v2
MiniLM-L6-v2 默认实现包：
- `MiniLmEmbeddingProvider`: ONNX推理引擎，支持批处理与SHA256降级
- `TokenizerBridge`: 简化分词器（可替换为完整HuggingFace Tokenizers）
- `DirectoryScanningModelResolver`: 文件系统模型扫描
- `all-MiniLM-L6-v2/`: 模型资源文件（model.onnx, tokenizer.json等16个文件）

## 关键接口

| 接口/类型 | 包 | 说明 |
| ---- | ---- | ---- |
| `IEmbeddingProvider` | Berry.Abstractions.Embeddings | 核心嵌入接口：`EmbedAsync(string)` → float[], `EmbedBatchAsync(texts)` → float[][] |
| `IEmbeddingModelResolver` | Berry.Abstractions.Embeddings | 解析模型目录、文件路径、维度、最大长度、池化策略 |
| `IEmbeddingTokenizer` | Berry.Abstractions.Embeddings | 文本分词接口，输出 `TokenizedInput` |
| `EmbeddingModelInfo` | Berry.Abstractions.Embeddings | 模型元数据记录：(ModelDirectory, ModelFilePath, TokenizerFilePath, Dimension, MaxTokenLength, PoolingStrategy) |
| `TokenizedInput` | Berry.Abstractions.Embeddings | 分词结果记录：(InputIds, AttentionMask, TokenTypeIds?) |
| `MiniLmEmbeddingProvider` | Berry.Embeddings.MiniLmL6v2 | 默认实现：ONNX推理 + SHA256降级 |
| `DirectoryScanningModelResolver` | Berry.Embeddings.MiniLmL6v2 | 文件系统扫描模型资源 |
| `TokenizerBridge` | Berry.Embeddings.MiniLmL6v2 | 简化分词器（可替换） |

## 默认解析逻辑 (DirectoryScanningModelResolver)
1. `EmbeddingModel:Directory` 未配置时使用 `<程序集目录>/all-MiniLM-L6-v2`
2. 优先 `model.onnx`；否则挑选第一个 `*.onnx` 文件
3. `tokenizer.json` 存在则启用 tokenizer；否则使用简化分词
4. 维度默认 `384` (`EmbeddingModel:Dimension` 可覆盖)
5. 最大长度默认 `512` (`EmbeddingModel:MaxTokenLength` 可覆盖)
6. 池化策略默认 `mean`；可配置为 `cls`：`EmbeddingModel:PoolingStrategy`

## 配置示例
```jsonc
{
  "EmbeddingModel": {
    "Directory": "D:/models/all-MiniLM-L6-v2", // 可选；缺省为程序集目录
    "Dimension": "384",      // 可选，默认384
    "MaxTokenLength": "512", // 可选，默认512
    "PoolingStrategy": "mean" // 可选：mean 或 cls，默认mean
  }
}
```

## 扩展方式

### 方式1: 创建自定义嵌入提供者（推荐）
仅需引用 `Berry.Abstractions.Embeddings` 包：

```csharp
using Berry.Abstractions.Embeddings;

public class BertEmbeddingProvider : IEmbeddingProvider
{
    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        // 使用BERT模型生成嵌入
        return await YourBertInference(text, ct);
    }

    public async Task<float[][]> EmbedBatchAsync(
        IReadOnlyList<string> texts, 
        CancellationToken ct = default)
    {
        // 批量推理以提升性能
        return await YourBertBatchInference(texts, ct);
    }
}
```

在VectorStore模块中注册（替换默认实现）：
```csharp
// VectorStoreModule.cs
services.AddSingleton<IEmbeddingProvider, BertEmbeddingProvider>();
```

### 方式2: 使用MiniLM但替换分词器
```csharp
using Berry.Abstractions.Embeddings;

public class HuggingFaceTokenizer : IEmbeddingTokenizer
{
    private readonly Tokenizers.Tokenizer _tokenizer;

    public HuggingFaceTokenizer(IEmbeddingModelResolver resolver, IConfiguration config)
    {
        var modelInfo = resolver.ResolveModel(config);
        _tokenizer = Tokenizers.Tokenizer.FromFile(modelInfo.TokenizerFilePath!);
    }

    public async Task<TokenizedInput> TokenizeAsync(
        string text, 
        int maxTokens, 
        CancellationToken ct = default)
    {
        var encoding = await _tokenizer.EncodeAsync(text, maxTokens);
        return new TokenizedInput(
            encoding.Ids,
            encoding.AttentionMask,
            encoding.TypeIds
        );
    }

    public async Task<IReadOnlyList<TokenizedInput>> TokenizeBatchAsync(
        IReadOnlyList<string> texts,
        int maxTokens,
        CancellationToken ct = default)
    {
        var encodings = await _tokenizer.EncodeBatchAsync(texts, maxTokens);
        return encodings.Select(e => new TokenizedInput(
            e.Ids, e.AttentionMask, e.TypeIds
        )).ToList();
    }
}
```

注册方式：
```csharp
services.AddSingleton<IEmbeddingTokenizer, HuggingFaceTokenizer>();
```

### 方式3: 替换模型定位逻辑
从远程存储加载模型：
```csharp
public class AzureBlobModelResolver : IEmbeddingModelResolver
{
    public EmbeddingModelInfo ResolveModel(IConfiguration config)
    {
        // 从Azure Blob下载模型到本地缓存
        var localPath = DownloadFromAzureBlob(config["EmbeddingModel:BlobUrl"]);
        
        return new EmbeddingModelInfo(
            ModelDirectory: localPath,
            ModelFilePath: Path.Combine(localPath, "model.onnx"),
            TokenizerFilePath: Path.Combine(localPath, "tokenizer.json"),
            EmbeddingDimension: 384,
            MaxTokenLength: 512,
            PoolingStrategy: "mean"
        );
    }
}
```

### 方式4: 创建完整的自定义嵌入包
参考 `Berry.Embeddings.MiniLmL6v2` 创建自己的实现包：
```
Berry.Embeddings.MyModel/
├── Berry.Embeddings.MyModel.csproj  # 引用Berry.Abstractions.Embeddings
├── MyModelEmbeddingProvider.cs      # 实现IEmbeddingProvider
├── MyModelResolver.cs               # 实现IEmbeddingModelResolver
├── MyTokenizer.cs                   # 实现IEmbeddingTokenizer
├── MyModelModule.cs                 # 扩展方法注册服务
└── models/                          # 模型资源文件
    ├── model.onnx
    ├── tokenizer.json
    └── ...
```

扩展方法示例：
```csharp
public static class MyModelExtensions
{
    public static IServiceCollection AddMyModelEmbeddings(this IServiceCollection services)
    {
        services.AddSingleton<IEmbeddingProvider, MyModelEmbeddingProvider>();
        services.AddSingleton<IEmbeddingModelResolver, MyModelResolver>();
        services.AddSingleton<IEmbeddingTokenizer, MyTokenizer>();
        return services;
    }
}
```

## 回退策略
- 当模型或 tokenizer 文件缺失，`MiniLmEmbeddingProvider` 自动启用 **SHA256哈希降级嵌入**
- 哈希向量通过确定性扩展生成384维向量并归一化为单位长度，保证与向量检索余弦/点乘兼容
- 降级模式在日志中显示警告信息
- **仅用于开发/验证流程，不适合真实语义检索生产场景**

## 使用步骤

### 方式1: 使用默认MiniLM实现
1. 引用 `Berry.Embeddings.MiniLmL6v2` 包（已包含模型资源）
2. 在VectorStore模块或Rag模块中引用并注册：
```csharp
using Berry.Embeddings.MiniLmL6v2;

// 注册MiniLM嵌入服务（如不注册则使用VectorStore的InMemoryEmbeddingProvider）
services.AddMiniLmEmbeddings();
```
3. 配置模型路径（可选）：
```jsonc
{
  "EmbeddingModel": {
    "Directory": "D:/custom-path/all-MiniLM-L6-v2"
  }
}
```

### 方式2: 使用自定义实现
1. 仅引用 `Berry.Abstractions.Embeddings` 包
2. 实现 `IEmbeddingProvider` 接口
3. 在VectorStore模块中注册：
```csharp
services.AddSingleton<IEmbeddingProvider, YourCustomProvider>();
```
| 需求 | 当前状态 | 可改进方向 |
| ---- | ---- | ---- |
| 包结构 | ✅ 已分离抽象与实现 | - |
| 批量嵌入 | ✅ 已实现 `EmbedBatchAsync` | 可优化批处理大小与并发策略 |
| 多量化模型选择 | 简化为固定优先顺序 | 可添加枚举 + 优先级策略（qint8 vs fp32） |
| Tokenizer 实现 | 简化版（空格分词） | 可集成完整 HuggingFace Tokenizers.DotNet |
| 文档加载管道 | 分散在 Rag Service | 可抽象 IDocumentLoader + 事件钩子 |
| Chunk 策略 | 简单按长度 | 引入句子分割 + 重叠窗口 + 语义切分策略 |
| 评估指标 | 基础缓存命中 | 添加嵌入延迟、批处理吞吐、模型加载耗时统计 |
| 向量存储过滤 | 基础 TopK | 增加标签/元数据过滤、时间窗口、评分阈值动态调优 |
| 模型热更新 | 不支持 | 通过文件监控或版本化 Resolver 动态替换模型 |
| 多模型路由 | 不支持 | 增加策略根据领域/语言选择不同模型 Provider |

## 架构优势

### 关注点分离
- **抽象层**（Berry.Abstractions.Embeddings）：定义契约，所有业务模块仅依赖抽象
- **实现层**（Berry.Embeddings.*）：具体模型实现，可独立升级、替换、多版本共存
- **业务层**（VectorStore/Rag）：专注业务逻辑，不关心嵌入实现细节

### 扩展性
- **零修改扩展**：新增模型实现无需修改现有代码
- **多实现共存**：可同时注册多个Provider并动态选择
- **版本控制**：模型包可独立版本化管理

### 可测试性
- 业务代码可使用Mock IEmbeddingProvider轻松进行单元测试
- 集成测试可使用轻量哈希降级模式，无需真实模型文件

## 与 RAGDemo 差异 / 改进方向

## 最佳实践建议
- **生产环境**: 避免使用降级哈希模式；确保模型和 tokenizer 文件齐全
- **模型管理**: 将模型资源与应用版本对齐，配置 CI/CD 在构建阶段完成打包或下载
- **性能优化**: 使用 `EmbedBatchAsync` 批量嵌入以提升吞吐量，减少单文本调用开销
- **缓存策略**: 使用分层缓存（向量缓存 + 检索结果缓存）提升整体性能
- **依赖管理**: 业务模块仅引用 `Berry.Abstractions.Embeddings`，避免直接依赖具体实现
- **测试策略**: 单元测试使用Mock Provider，集成测试可用哈希降级模式跳过模型加载

## 错误处理建议
- **MiniLM默认行为**: 模型初始化失败时记录 Warning 并继续降级运行，不抛出致命异常
- **自定义实现**: 可选择在关键模型缺失时抛出异常中止启动，确保生产质量
- **配置验证**: 启动时验证模型路径存在性，提前发现配置错误

## 包依赖关系
```
Berry.Host / Berry.Sample
    └─> Berry.Modules.VectorStore
            └─> Berry.Abstractions.Embeddings
    └─> Berry.Embeddings.MiniLmL6v2 (可选)
            └─> Berry.Abstractions.Embeddings
            └─> Microsoft.ML.OnnxRuntime 1.19.0
```

**关键点**:
- VectorStore/Rag 模块只依赖抽象包
- 具体嵌入实现包（如MiniLmL6v2）独立引用，可按需选择
- 应用程序决定使用哪个具体实现

---
如需增强批量嵌入性能、多模型路由或完整HuggingFace Tokenizer集成，请直接说明。
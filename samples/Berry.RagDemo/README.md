# Berry RAG Demo

基于Berry框架的RAG（检索增强生成）演示项目，展示如何使用Berry的嵌入、向量存储和RAG模块构建智能问答系统。

## 功能特性

- ✅ **文档上传与分块**: 自动将长文档切分为合适大小的片段
- ✅ **语义嵌入**: 使用MiniLM-L6-v2模型生成384维向量
- ✅ **向量检索**: 基于余弦相似度的语义检索
- ✅ **智能问答**: 检索相关片段并提供答案
- ✅ **对话记忆**: 支持多轮对话上下文
- ✅ **REST API**: 完整的RESTful API接口

## 技术栈

- **ASP.NET Core 8.0**: Web框架
- **Berry.Modules.VectorStore**: 向量存储模块
- **Berry.Modules.Rag**: RAG检索模块
- **Berry.Embeddings.MiniLmL6v2**: MiniLM-L6-v2嵌入模型
- **ONNX Runtime**: 模型推理引擎
- **Swagger/OpenAPI**: API文档

## 快速开始

### 1. 构建项目

```bash
cd samples/Berry.RagDemo
dotnet restore
dotnet build
```

### 2. 运行应用

```bash
dotnet run
```

应用将在 `http://localhost:5000` 启动，Swagger UI 可访问根路径。

### 3. 使用API

#### 3.1 上传文档

```bash
curl -X POST http://localhost:5000/api/rag/documents \
  -H "Content-Type: application/json" \
  -d '{
    "documentId": "doc1",
    "documentName": "Berry框架介绍",
    "content": "Berry是一个现代化的企业级Web应用框架，专为快速构建可扩展、多租户的后台管理系统而设计。它采用模块化架构，支持按需装配功能。框架提供了完整的RBAC权限管理、审计日志、缓存、消息等企业必备功能。",
    "chunkSize": 200,
    "chunkOverlap": 20
  }'
```

响应示例：
```json
{
  "documentId": "doc1",
  "documentName": "Berry框架介绍",
  "chunkCount": 2,
  "chunkIds": ["chunk-001", "chunk-002"],
  "processingTimeMs": 156.23,
  "message": "文档上传并索引成功"
}
```

#### 3.2 语义检索

```bash
curl -X POST http://localhost:5000/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Berry框架有哪些功能？",
    "topK": 3
  }'
```

响应示例：
```json
{
  "query": "Berry框架有哪些功能？",
  "results": [
    {
      "content": "框架提供了完整的RBAC权限管理、审计日志、缓存、消息等企业必备功能。",
      "score": 0.856,
      "metadata": {
        "documentId": "doc1",
        "documentName": "Berry框架介绍"
      }
    }
  ],
  "processingTimeMs": 45.67
}
```

#### 3.3 知识问答

```bash
curl -X POST http://localhost:5000/api/rag/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "什么是Berry框架？",
    "topK": 3
  }'
```

响应示例：
```json
{
  "question": "什么是Berry框架？",
  "answer": "基于文档内容，最相关的信息如下：\n\nBerry是一个现代化的企业级Web应用框架，专为快速构建可扩展、多租户的后台管理系统而设计。",
  "context": [
    "Berry是一个现代化的企业级Web应用框架...",
    "它采用模块化架构..."
  ],
  "processingTimeMs": 78.90
}
```

#### 3.4 对话问答

```bash
curl -X POST http://localhost:5000/api/rag/chat \
  -H "Content-Type: application/json" \
  -d '{
    "conversationId": "conv-123",
    "message": "Berry有哪些模块？",
    "topK": 3
  }'
```

#### 3.5 获取统计信息

```bash
curl http://localhost:5000/api/rag/stats
```

响应示例：
```json
{
  "totalChunks": 15,
  "storageType": "InMemory",
  "embeddingModel": "MiniLM-L6-v2",
  "embeddingDimension": 384
}
```

#### 3.6 清空数据

```bash
curl -X DELETE http://localhost:5000/api/rag/clear
```

## API端点

| 方法 | 端点 | 说明 |
|------|------|------|
| POST | `/api/rag/documents` | 上传文档并建立索引 |
| POST | `/api/rag/search` | 语义检索 |
| POST | `/api/rag/ask` | 知识问答 |
| POST | `/api/rag/chat` | 对话问答（带记忆） |
| DELETE | `/api/rag/chat/{conversationId}` | 清空对话历史 |
| GET | `/api/rag/stats` | 获取统计信息 |
| DELETE | `/api/rag/clear` | 清空所有数据 |
| GET | `/api/info` | 应用信息 |
| GET | `/api/health` | 健康检查 |

## 配置说明

在 `appsettings.json` 中配置：

```json
{
  "EmbeddingModel": {
    "Dimension": "384",
    "MaxTokenLength": "512",
    "PoolingStrategy": "mean"
  },
  "Rag": {
    "DefaultTopK": 5,
    "DefaultChunkSize": 500,
    "DefaultChunkOverlap": 50,
    "EnableConversationMemory": true,
    "MaxConversationTurns": 10
  }
}
```

## 架构说明

### 模块依赖

```
Berry.RagDemo
├── Berry.Host (核心框架)
├── Berry.Abstractions.Embeddings (嵌入抽象)
├── Berry.Embeddings.MiniLmL6v2 (MiniLM实现)
├── Berry.Modules.VectorStore (向量存储)
└── Berry.Modules.Rag (RAG检索)
```

### 数据流

1. **文档上传**: 
   - 文档内容 → 分块 → 嵌入 → 向量存储

2. **检索流程**:
   - 查询 → 嵌入 → 向量检索 → 返回TopK结果

3. **问答流程**:
   - 问题 → 检索相关片段 → 构建上下文 → 生成答案

## 扩展建议

### 1. 集成真实LLM

当前答案生成是简化版，可集成OpenAI、Azure OpenAI或本地LLM：

```csharp
// 使用OpenAI生成答案
var completion = await openAiClient.GetChatCompletionsAsync(
    new ChatCompletionsOptions
    {
        Messages = {
            new ChatMessage(ChatRole.System, "你是一个知识问答助手"),
            new ChatMessage(ChatRole.User, $"基于以下上下文回答问题：\n\n{context}\n\n问题：{question}")
        }
    });
```

### 2. 添加文档来源追踪

在metadata中记录更多信息：

```csharp
new Dictionary<string, object>
{
    ["documentId"] = documentId,
    ["chunkIndex"] = index,
    ["sourceFile"] = fileName,
    ["author"] = author,
    ["createTime"] = createTime
}
```

### 3. 支持多种文档格式

添加文档解析器：

```csharp
// PDF解析
using iText.Kernel.Pdf;
var pdfReader = new PdfReader(stream);
var content = ExtractTextFromPdf(pdfReader);

// Word解析
using DocumentFormat.OpenXml.Packaging;
var wordDoc = WordprocessingDocument.Open(stream, false);
var content = ExtractTextFromWord(wordDoc);
```

### 4. 持久化向量存储

替换InMemory存储为持久化方案：

```csharp
// 使用Milvus
services.AddSingleton<IVectorStore, MilvusVectorStore>();

// 使用Qdrant
services.AddSingleton<IVectorStore, QdrantVectorStore>();

// 使用PostgreSQL + pgvector
services.AddSingleton<IVectorStore, PostgresVectorStore>();
```

### 5. 优化分块策略

实现更智能的分块：

```csharp
// 基于句子边界分块
var chunks = SmartChunker.ChunkBySentence(content, maxSize: 500);

// 基于语义分块
var chunks = SemanticChunker.Chunk(content, embedder);
```

## 性能优化

1. **批量嵌入**: 使用 `EmbedBatchAsync` 处理多个文档片段
2. **缓存策略**: 缓存频繁查询的嵌入向量
3. **异步处理**: 大文档上传使用后台任务处理
4. **并发控制**: 限制并发嵌入请求数量

## 故障排查

### 模型加载失败

检查模型文件是否存在：
```bash
ls src/Berry.Embeddings.MiniLmL6v2/all-MiniLM-L6-v2/
```

查看日志中的警告信息，如果使用SHA256降级模式，检索效果会下降。

### 内存占用过高

InMemory存储不适合大量数据，考虑：
- 使用持久化向量数据库
- 定期清理旧数据
- 限制单个文档大小

## 许可证

MIT License

## 相关资源

- [Berry框架文档](../../docs/develop/index.md)
- [RAG模块说明](../../docs/develop/rag.md)
- [Embeddings模块说明](../../docs/develop/embeddings.md)

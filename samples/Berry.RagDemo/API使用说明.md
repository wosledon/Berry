# Berry RAG Demo API 使用说明

## 启动应用

```powershell
cd d:\repos\github\Berry\samples\Berry.RagDemo
dotnet run
```

应用将监听在 `http://localhost:5000`，访问根路径即可查看 Swagger 文档。

## API 端点说明

### 1. 文档上传（推荐使用文件上传）

#### 📁 上传单个文件
```http
POST /api/rag/upload-file
Content-Type: multipart/form-data

file: [选择文件]
```

**支持的文件类型**:
- `.txt` - 纯文本文件
- `.md`, `.markdown` - Markdown 文档
- `.json` - JSON 文件
- `.xml` - XML 文件
- `.csv` - CSV 文件

**示例（使用 curl）**:
```bash
curl -X POST http://localhost:5000/api/rag/upload-file \
  -F "file=@document.txt"
```

**示例（使用 PowerShell）**:
```powershell
$file = Get-Item "document.txt"
$form = @{ file = $file }
Invoke-RestMethod -Uri "http://localhost:5000/api/rag/upload-file" `
  -Method POST -Form $form
```

#### 📁 批量上传多个文件
```http
POST /api/rag/upload-files
Content-Type: multipart/form-data

files: [选择多个文件]
```

**示例（使用 curl）**:
```bash
curl -X POST http://localhost:5000/api/rag/upload-files \
  -F "files=@doc1.txt" \
  -F "files=@doc2.md" \
  -F "files=@doc3.json"
```

#### 📝 上传 JSON 格式的文档内容
```http
POST /api/rag/documents
Content-Type: application/json

{
  "documentId": "doc001",
  "documentName": "示例文档",
  "content": "文档内容..."
}
```

### 2. 语义检索

```http
POST /api/rag/search
Content-Type: application/json

{
  "query": "Berry框架有什么特性？",
  "topK": 5
}
```

### 3. 知识问答

```http
POST /api/rag/ask
Content-Type: application/json

{
  "question": "Berry框架使用什么嵌入模型？",
  "topK": 3
}
```

### 4. 获取统计信息

```http
GET /api/rag/stats
```

### 5. 批量上传服务器目录（仅用于开发/测试）

```http
POST /api/rag/bulk-ingest-directory
Content-Type: application/json

{
  "directory": "D:\\Documents"
}
```

**⚠️ 注意**: 此接口用于从服务器本地目录批量导入文件，生产环境不建议使用。

## PowerShell 测试示例

```powershell
# 1. 上传文档文件
$file = Get-Item "sample-document.md"
$uploadResponse = Invoke-RestMethod `
    -Uri "http://localhost:5000/api/rag/upload-file" `
    -Method POST `
    -Form @{ file = $file }
Write-Host "上传成功: $($uploadResponse.documentId)"

# 2. 检索测试
$searchBody = @{
    query = "Berry框架的核心特性"
    topK = 3
} | ConvertTo-Json

$searchResult = Invoke-RestMethod `
    -Uri "http://localhost:5000/api/rag/search" `
    -Method POST `
    -ContentType "application/json" `
    -Body $searchBody

Write-Host "检索结果:"
$searchResult.results | ForEach-Object {
    Write-Host "  - Score: $($_.score)"
    Write-Host "    Content: $($_.content.Substring(0, 100))..."
}

# 3. 问答测试
$askBody = @{
    question = "Berry框架的主要功能是什么？"
    topK = 2
} | ConvertTo-Json

$askResult = Invoke-RestMethod `
    -Uri "http://localhost:5000/api/rag/ask" `
    -Method POST `
    -ContentType "application/json" `
    -Body $askBody

Write-Host "`n问答结果:"
Write-Host $askResult.answer
```

## 使用 Swagger UI

访问 `http://localhost:5000` 即可看到 Swagger UI 界面：

1. **上传文件**: 在 `/api/rag/upload-file` 端点，点击 "Try it out"
2. 点击 "Choose File" 选择要上传的文本文件
3. 点击 "Execute" 执行上传
4. 查看返回的 `documentId`

## 常见问题

### Q: 为什么不能上传 PDF 或 Word 文件？
A: 当前版本仅支持纯文本格式，如需支持 PDF/Word，需要额外集成文档解析库。

### Q: 上传的文件大小限制是多少？
A: 默认 ASP.NET Core 的限制是 30MB，可在 `appsettings.json` 中调整。

### Q: 如何清空已上传的所有文档？
A: 当前使用内存存储，重启应用即可清空。未来版本可添加清空端点。

### Q: 支持哪些语言的文档？
A: MiniLM-L6-v2 模型支持多语言，包括中文、英文等常见语言。

## 技术架构

- **嵌入模型**: MiniLM-L6-v2 (384维向量)
- **向量存储**: 内存存储 (InMemoryVectorStore)
- **分块策略**: 简单分块器 (默认 800 字符)
- **检索算法**: 余弦相似度

## 扩展建议

1. **持久化存储**: 集成 Qdrant、Milvus 或 PostgreSQL pgvector
2. **文档解析**: 添加 PdfPig、DocX 等库支持更多格式
3. **LLM 集成**: 集成 OpenAI/Azure OpenAI 生成答案
4. **对话记忆**: 实现会话管理和多轮对话
5. **权限控制**: 添加用户认证和文档访问权限

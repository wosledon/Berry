using Berry.Abstractions.Embeddings;
using Berry.Modules.Rag;
using Berry.Modules.VectorStore;
using Microsoft.AspNetCore.Mvc;

namespace Berry.RagDemo.Controllers;

/// <summary>
/// RAG核心功能控制器：文档管理、检索、问答
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class RagController : ControllerBase
{
    private readonly IRagService _ragService;
    private readonly IVectorStore _vectorStore;
    private readonly IEmbeddingProvider _embeddingProvider;
    private readonly IEmbeddingTokenizer _tokenizer;
    private readonly ILogger<RagController> _logger;
    private readonly Berry.Modules.Rag.RagOptions _ragOptions;

    public RagController(
        IRagService ragService,
        IVectorStore vectorStore,
        IEmbeddingProvider embeddingProvider,
        IEmbeddingTokenizer tokenizer,
        Microsoft.Extensions.Options.IOptions<Berry.Modules.Rag.RagOptions> ragOptions,
        ILogger<RagController> logger)
    {
        _ragService = ragService;
        _vectorStore = vectorStore;
        _embeddingProvider = embeddingProvider;
        _tokenizer = tokenizer;
        _logger = logger;
        _ragOptions = ragOptions.Value;
    }

    /// <summary>
    /// 上传文档内容并建立索引（JSON格式）
    /// </summary>
    [HttpPost("documents")]
    public async Task<ActionResult<DocumentUploadResponse>> UploadDocument(
        [FromBody] DocumentUploadRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var startTime = DateTime.UtcNow;
            
            // 使用RAG服务直接摄入内容
            await _ragService.IngestAsync(request.Content, request.DocumentId, ct);

            var processingTime = (DateTime.UtcNow - startTime).TotalMilliseconds;

            return Ok(new DocumentUploadResponse
            {
                DocumentId = request.DocumentId,
                DocumentName = request.DocumentName,
                Message = "文档上传并索引成功",
                ProcessingTimeMs = processingTime
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "文档上传失败");
            return StatusCode(500, new { error = "文档上传失败", details = ex.Message });
        }
    }

    /// <summary>
    /// 上传文件并建立索引（支持 .txt, .md 等文本文件）
    /// </summary>
    [HttpPost("upload-file")]
    public async Task<ActionResult<DocumentUploadResponse>> UploadFile(
        IFormFile file,
        CancellationToken ct = default)
    {
        try
        {
            if (file == null || file.Length == 0)
            {
                return BadRequest(new { error = "未选择文件或文件为空" });
            }

            // 检查文件类型
            var allowedExtensions = new[] { ".txt", ".md", ".markdown", ".json", ".xml", ".csv" };
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            if (!allowedExtensions.Contains(extension))
            {
                return BadRequest(new { error = $"不支持的文件类型: {extension}。支持的类型: {string.Join(", ", allowedExtensions)}" });
            }

            var startTime = DateTime.UtcNow;
            
            // 读取文件内容
            string content;
            using (var reader = new StreamReader(file.OpenReadStream()))
            {
                content = await reader.ReadToEndAsync(ct);
            }

            if (string.IsNullOrWhiteSpace(content))
            {
                return BadRequest(new { error = "文件内容为空" });
            }

            // 生成文档ID
            var documentId = $"{Path.GetFileNameWithoutExtension(file.FileName)}_{DateTime.UtcNow:yyyyMMddHHmmss}";
            
            // 使用RAG服务摄入内容
            await _ragService.IngestAsync(content, documentId, ct);

            var processingTime = (DateTime.UtcNow - startTime).TotalMilliseconds;

            return Ok(new DocumentUploadResponse
            {
                DocumentId = documentId,
                DocumentName = file.FileName,
                Message = $"文件上传成功，大小: {file.Length / 1024.0:F2} KB",
                ProcessingTimeMs = processingTime
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "文件上传失败");
            return StatusCode(500, new { error = "文件上传失败", details = ex.Message });
        }
    }

    /// <summary>
    /// 批量上传多个文件并建立索引
    /// </summary>
    [HttpPost("upload-files")]
    public async Task<ActionResult<BulkUploadResponse>> UploadFiles(
        List<IFormFile> files,
        CancellationToken ct = default)
    {
        try
        {
            if (files == null || !files.Any())
            {
                return BadRequest(new { error = "未选择文件" });
            }

            var startTime = DateTime.UtcNow;
            var allowedExtensions = new[] { ".txt", ".md", ".markdown", ".json", ".xml", ".csv" };
            var results = new List<FileUploadResult>();

            foreach (var file in files)
            {
                try
                {
                    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
                    if (!allowedExtensions.Contains(extension))
                    {
                        results.Add(new FileUploadResult
                        {
                            FileName = file.FileName,
                            Success = false,
                            Error = $"不支持的文件类型: {extension}"
                        });
                        continue;
                    }

                    // 读取文件内容
                    string content;
                    using (var reader = new StreamReader(file.OpenReadStream()))
                    {
                        content = await reader.ReadToEndAsync(ct);
                    }

                    if (string.IsNullOrWhiteSpace(content))
                    {
                        results.Add(new FileUploadResult
                        {
                            FileName = file.FileName,
                            Success = false,
                            Error = "文件内容为空"
                        });
                        continue;
                    }

                    var documentId = $"{Path.GetFileNameWithoutExtension(file.FileName)}_{DateTime.UtcNow:yyyyMMddHHmmss}";
                    await _ragService.IngestAsync(content, documentId, ct);

                    results.Add(new FileUploadResult
                    {
                        FileName = file.FileName,
                        DocumentId = documentId,
                        Success = true,
                        FileSize = file.Length
                    });
                }
                catch (Exception ex)
                {
                    results.Add(new FileUploadResult
                    {
                        FileName = file.FileName,
                        Success = false,
                        Error = ex.Message
                    });
                }
            }

            var processingTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
            var successCount = results.Count(r => r.Success);

            return Ok(new BulkUploadResponse
            {
                TotalFiles = files.Count,
                SuccessCount = successCount,
                FailedCount = files.Count - successCount,
                Results = results,
                ProcessingTimeMs = processingTime
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "批量文件上传失败");
            return StatusCode(500, new { error = "批量文件上传失败", details = ex.Message });
        }
    }

    /// <summary>
    /// 语义检索 - 返回最相关的文档片段
    /// </summary>
    [HttpPost("search")]
    public async Task<ActionResult<SearchResponse>> Search(
        [FromBody] SearchRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var startTime = DateTime.UtcNow;

            // 生成查询嵌入
            var queryEmbedding = await _embeddingProvider.EmbedAsync(request.Query, ct);
            
            // 执行向量检索
            var threshold = request.MinScore ?? _ragOptions.SimilarityThreshold;
            var topK = request.TopK ?? _ragOptions.MaxRetrieve;
            var enableHybrid = request.EnableHybrid ?? _ragOptions.EnableHybrid;
            var candidateK = enableHybrid ? topK * _ragOptions.HybridCandidateMultiplier : topK;
            var loweredThreshold = enableHybrid ? Math.Min(threshold, 0.15) : threshold;
            var initial = await _vectorStore.SearchAsync(
                queryEmbedding,
                candidateK,
                loweredThreshold,
                ct);

            IReadOnlyList<Berry.Modules.VectorStore.RetrievedChunk> finalResults = initial;
            if (enableHybrid && initial.Count > 0)
            {
                var qTokens = ExtractTokens(request.Query);
                var scored = new List<Berry.Modules.VectorStore.RetrievedChunk>(initial.Count);
                foreach (var chunk in initial)
                {
                    var dTokens = ExtractTokens(chunk.Content);
                    int overlap = 0; foreach (var tk in qTokens) if (dTokens.Contains(tk)) overlap++;
                    double boost = overlap * _ragOptions.LexicalPerTokenBoost;
                    if (overlap > 0 && overlap == qTokens.Count) boost += _ragOptions.LexicalExactBoost;
                    if (overlap == 0) boost -= _ragOptions.PenaltyNoLexical;
                    scored.Add(new Berry.Modules.VectorStore.RetrievedChunk
                    {
                        Id = chunk.Id,
                        Content = chunk.Content,
                        Score = chunk.Score + boost
                    });
                }
                finalResults = scored
                    .OrderByDescending(r => r.Score)
                    .Take(topK)
                    .Where(r => r.Score >= threshold * 0.5)
                    .ToList();
            }

            var processingTime = (DateTime.UtcNow - startTime).TotalMilliseconds;

            return Ok(new SearchResponse
            {
                Query = request.Query,
                Results = finalResults.Select(r => new SearchResult
                {
                    Content = r.Content,
                    Score = r.Score
                }).ToList(),
                ProcessingTimeMs = processingTime
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "检索失败");
            return StatusCode(500, new { error = "检索失败", details = ex.Message });
        }
    }

    /// <summary>
    /// 问答 - 基于检索结果回答问题（简化版，返回最相关片段）
    /// </summary>
    [HttpPost("ask")]
    public async Task<ActionResult<AskResponse>> Ask(
        [FromBody] AskRequest request,
        CancellationToken ct = default)
    {
        try
        {
            var startTime = DateTime.UtcNow;

            // 使用RAG服务查询
            var result = await _ragService.QueryAsync(
                "demo-user",
                request.Question,
                ct);

            if (!result.Contexts.Any())
            {
                return Ok(new AskResponse
                {
                    Question = request.Question,
                    Answer = "未找到相关信息。",
                    Context = new List<string>(),
                    ProcessingTimeMs = (DateTime.UtcNow - startTime).TotalMilliseconds
                });
            }

            // 构建上下文
            var context = result.Contexts.Select(c => c.Content).ToList();
            
            // 简化版答案：返回最相关的片段
            var answer = $"基于文档内容，最相关的信息如下：\n\n{result.Contexts[0].Content}";

            var processingTime = (DateTime.UtcNow - startTime).TotalMilliseconds;

            return Ok(new AskResponse
            {
                Question = request.Question,
                Answer = answer,
                Context = context,
                RetrievedChunks = result.Contexts.Select(r => new SearchResult
                {
                    Content = r.Content,
                    Score = r.Score
                }).ToList(),
                WasCached = result.WasCached,
                ProcessingTimeMs = processingTime
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "问答失败");
            return StatusCode(500, new { error = "问答失败", details = ex.Message });
        }
    }

    /// <summary>
    /// 批量上传目录中的文档（服务器端目录，仅用于开发/测试）
    /// </summary>
    [HttpPost("bulk-ingest-directory")]
    public async Task<ActionResult> BulkIngestDirectory([FromBody] BulkIngestRequest request, CancellationToken ct = default)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(request.Directory))
            {
                return BadRequest(new { error = "目录路径不能为空" });
            }

            if (!Directory.Exists(request.Directory))
            {
                return BadRequest(new { error = $"目录不存在: {request.Directory}" });
            }

            await _ragService.BulkIngestDirectoryAsync(request.Directory, ct);
            return Ok(new { message = "批量上传成功", directory = request.Directory });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "批量上传失败");
            return StatusCode(500, new { error = "批量上传失败", details = ex.Message });
        }
    }

    /// <summary>
    /// 获取RAG统计信息
    /// </summary>
    [HttpGet("stats")]
    public ActionResult<StatsResponse> GetStats()
    {
        var stats = _ragService.GetStats();
        return Ok(new StatsResponse
        {
            TotalQueries = stats.TotalQueries,
            CacheHits = stats.CacheHits,
            RetrievalMisses = stats.RetrievalMisses,
            CacheHitRate = stats.TotalQueries > 0 
                ? (double)stats.CacheHits / stats.TotalQueries * 100 
                : 0,
            StorageType = "InMemory",
            EmbeddingModel = "MiniLM-L6-v2",
            EmbeddingDimension = 384
        });
    }

    /// <summary>
    /// 分词调试: 返回 token/ids/UNK比例
    /// </summary>
    [HttpPost("debug-tokens")]
    public ActionResult<DebugTokensResponse> DebugTokens([FromBody] DebugTokensRequest request)
    {
        if (request == null || string.IsNullOrWhiteSpace(request.Text)) return BadRequest(new { error = "文本不能为空" });
        int max = request.MaxTokens ?? 128;
        if (_tokenizer is Berry.Embeddings.MiniLmL6v2.TokenizerBridge bridge)
        {
            var dbg = bridge.DebugTokenize(request.Text, max);
            return Ok(new DebugTokensResponse
            {
                Original = dbg.Original,
                Tokens = dbg.Tokens,
                Ids = dbg.Ids,
                UnkRatio = dbg.UnkRatio,
                UsedNative = dbg.UsedNative
            });
        }
        return StatusCode(501, new { error = "当前分词器不支持调试输出" });
    }

    // 词汇分割：空白 + 标点 + 中文整串 + 中文单字；与服务端 Hybrid 保持一致
    private static HashSet<string> ExtractTokens(string text)
    {
        var set = new HashSet<string>(StringComparer.Ordinal);
        if (string.IsNullOrWhiteSpace(text)) return set;
        var raw = System.Text.RegularExpressions.Regex.Split(text.Trim(), "[\r\n\t ]+");
        var punct = new System.Text.RegularExpressions.Regex("([\\p{P}])", System.Text.RegularExpressions.RegexOptions.Compiled);
        foreach (var part in raw)
        {
            if (string.IsNullOrWhiteSpace(part)) continue;
            var segs = punct.Split(part).Where(s => !string.IsNullOrWhiteSpace(s));
            foreach (var seg in segs)
            {
                if (IsAllCjk(seg))
                {
                    set.Add(seg);
                    foreach (var ch in seg) set.Add(ch.ToString());
                }
                else
                {
                    set.Add(seg.ToLowerInvariant());
                }
            }
        }
        return set;
    }
    private static bool IsAllCjk(string s)
    {
        if (string.IsNullOrEmpty(s)) return false;
        foreach (var ch in s) if (!(ch >= '\u4e00' && ch <= '\u9fff')) return false;
        return true;
    }
}

#region Request/Response Models

public record DocumentUploadRequest
{
    public string DocumentId { get; init; } = Guid.NewGuid().ToString();
    public string? DocumentName { get; init; }
    public string Content { get; init; } = string.Empty;
}

public record DocumentUploadResponse
{
    public string DocumentId { get; init; } = string.Empty;
    public string? DocumentName { get; init; }
    public string Message { get; init; } = string.Empty;
    public double ProcessingTimeMs { get; init; }
}

public record SearchRequest
{
    public string Query { get; init; } = string.Empty;
    public int? TopK { get; init; }
    public double? MinScore { get; init; }
    public bool? EnableHybrid { get; init; }
}

public record SearchResponse
{
    public string Query { get; init; } = string.Empty;
    public List<SearchResult> Results { get; init; } = new();
    public double ProcessingTimeMs { get; init; }
}

public record SearchResult
{
    public string Content { get; init; } = string.Empty;
    public double Score { get; init; }
}

public record AskRequest
{
    public string Question { get; init; } = string.Empty;
    public int? TopK { get; init; }
}

public record AskResponse
{
    public string Question { get; init; } = string.Empty;
    public string Answer { get; init; } = string.Empty;
    public List<string> Context { get; init; } = new();
    public List<SearchResult>? RetrievedChunks { get; init; }
    public bool WasCached { get; init; }
    public double ProcessingTimeMs { get; init; }
}

public record BulkIngestRequest
{
    public string Directory { get; init; } = string.Empty;
}

public record FileUploadResult
{
    public string FileName { get; init; } = string.Empty;
    public string? DocumentId { get; init; }
    public bool Success { get; init; }
    public string? Error { get; init; }
    public long FileSize { get; init; }
}

public record BulkUploadResponse
{
    public int TotalFiles { get; init; }
    public int SuccessCount { get; init; }
    public int FailedCount { get; init; }
    public List<FileUploadResult> Results { get; init; } = new();
    public double ProcessingTimeMs { get; init; }
}

public record StatsResponse
{
    public int TotalQueries { get; init; }
    public int CacheHits { get; init; }
    public int RetrievalMisses { get; init; }
    public double CacheHitRate { get; init; }
    public string StorageType { get; init; } = string.Empty;
    public string EmbeddingModel { get; init; } = string.Empty;
    public int EmbeddingDimension { get; init; }
}

public record DebugTokensRequest
{
    public string Text { get; init; } = string.Empty;
    public int? MaxTokens { get; init; }
}

public record DebugTokensResponse
{
    public string Original { get; init; } = string.Empty;
    public IReadOnlyList<string> Tokens { get; init; } = Array.Empty<string>();
    public IReadOnlyList<long> Ids { get; init; } = Array.Empty<long>();
    public double UnkRatio { get; init; }
    public bool UsedNative { get; init; }
}

#endregion

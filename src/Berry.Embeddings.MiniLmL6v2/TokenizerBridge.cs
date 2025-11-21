using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Berry.Abstractions.Embeddings;
using Microsoft.Extensions.Logging;
using Tokenizers.DotNet; // 引入第三方 tokenizer 支持 (tokenizer.json 优先)

namespace Berry.Embeddings.MiniLmL6v2;

/// <summary>
/// TokenizerBridge: 优先使用 tokenizer.json (Tokenizers.DotNet)；否则使用基于 vocab.txt 的简化 WordPiece。
/// 改进要点:
/// 1. 支持完整 tokenizer.json 加载，最大程度还原原始训练配置（规范化/预分词/特殊符号）。
/// 2. 当仅有 vocab.txt 时，执行改进版 WordPiece：
///    - 正确识别 [CLS],[SEP],[UNK],[PAD] (若存在)
///    - 中文 (CJK) 连续字符串: 同时保留整串尝试匹配 + 单字拆分，降低语义碎片化
///    - 子词最长匹配，失败时仅该子片段 UNK，不整词全 UNK
/// 3. 统计并日志输出 UNK 比例，便于质量监控。
/// 4. Fallback (无 tokenizer.json 且无 vocab.txt): 返回空 token 列表，避免伪造 ID 污染嵌入。
/// </summary>
public sealed class TokenizerBridge : IEmbeddingTokenizer
{
    private readonly ILogger<TokenizerBridge> _logger;
    private readonly Dictionary<string, long> _vocab = new(StringComparer.Ordinal);
    private readonly bool _hasVocab;
    private readonly bool _hasNative;
    private readonly long _clsId;
    private readonly long _sepId;
    private long _unkId; // 允许在缺失时合成插入
    private readonly long _padId;
    private readonly Regex _basicTokenSplit = new(@"[\s]+", RegexOptions.Compiled);
    // 使用 Unicode 标点分类匹配所有标点字符
    private readonly Regex _punctSplit = new(@"([\p{P}])", RegexOptions.Compiled);
    private readonly Tokenizer? _nativeTokenizer;
    private readonly bool _tokenizeChineseChars = true;
    private int _modelMaxLength = 512;
    private bool _doLowerCase = true; // 将由配置文件覆盖

    public TokenizerBridge(ILogger<TokenizerBridge> logger, IEmbeddingModelResolver resolver, Microsoft.Extensions.Configuration.IConfiguration config)
    {
        if (logger is null) throw new ArgumentNullException(nameof(logger));
        if (resolver is null) throw new ArgumentNullException(nameof(resolver));
        if (config is null) throw new ArgumentNullException(nameof(config));
        _logger = logger;
        var modelInfo = resolver.ResolveModel(config);
        // 1. 优先尝试加载 tokenizer.json
        var tokenizerJson = Path.Combine(modelInfo.ModelDirectory, "tokenizer.json");
        if (File.Exists(tokenizerJson))
        {
            try
            {
                _nativeTokenizer = new Tokenizer(vocabPath: tokenizerJson);
                _hasNative = true;
                _logger.LogInformation("TokenizerBridge 使用 tokenizer.json: {Path}", tokenizerJson);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "加载 tokenizer.json 失败, 回退到 vocab.txt 逻辑");
                _hasNative = false;
            }
        }
        else
        {
            _hasNative = false;
            _nativeTokenizer = null;
            _logger.LogDebug("未找到 tokenizer.json ({Path})，尝试使用 vocab.txt", tokenizerJson);
        }

        var vocabPath = Path.Combine(modelInfo.ModelDirectory, "vocab.txt");
        // 解析 tokenizer_config.json / sentence_bert_config.json 以更新行为
        try
        {
            var tokenizerConfig = Path.Combine(modelInfo.ModelDirectory, "tokenizer_config.json");
            if (File.Exists(tokenizerConfig))
            {
                using var doc = System.Text.Json.JsonDocument.Parse(File.ReadAllText(tokenizerConfig));
                var root = doc.RootElement;
                if (root.TryGetProperty("do_lower_case", out var lc))
                {
                    if (lc.ValueKind == System.Text.Json.JsonValueKind.True) _doLowerCase = true;
                    if (lc.ValueKind == System.Text.Json.JsonValueKind.False) _doLowerCase = false;
                }
                if (root.TryGetProperty("model_max_length", out var mml) && mml.ValueKind == System.Text.Json.JsonValueKind.Number)
                {
                    var val = mml.GetInt32();
                    if (val > 0) _modelMaxLength = val;
                }
            }
            var sbertConfig = Path.Combine(modelInfo.ModelDirectory, "sentence_bert_config.json");
            if (File.Exists(sbertConfig))
            {
                using var doc2 = System.Text.Json.JsonDocument.Parse(File.ReadAllText(sbertConfig));
                var root2 = doc2.RootElement;
                if (root2.TryGetProperty("do_lower_case", out var lc2))
                {
                    if (lc2.ValueKind == System.Text.Json.JsonValueKind.True) _doLowerCase = true;
                    if (lc2.ValueKind == System.Text.Json.JsonValueKind.False) _doLowerCase = false;
                }
                if (root2.TryGetProperty("max_seq_length", out var msl) && msl.ValueKind == System.Text.Json.JsonValueKind.Number)
                {
                    var v = msl.GetInt32();
                    if (v > 0 && v < _modelMaxLength) _modelMaxLength = v;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "解析 tokenizer 配置失败，使用默认选项");
        }
        if (File.Exists(vocabPath))
        {
            try
            {
                long idx = 0;
                foreach (var line in File.ReadLines(vocabPath))
                {
                    var token = line.Trim();
                    if (token.Length == 0) continue;
                    if (!_vocab.ContainsKey(token))
                        _vocab[token] = idx++;
                }
                _hasVocab = _vocab.Count > 0;
                _clsId = TryGet("[CLS]");
                _sepId = TryGet("[SEP]");
                _unkId = TryGet("[UNK]");
                _padId = TryGet("[PAD]");
                _logger.LogInformation("TokenizerBridge 已加载 vocab.txt, 词条数: {Count}", _vocab.Count);

                if (_unkId < 0)
                {
                    // 合成 [UNK]
                    _unkId = _vocab.Count;
                    _vocab["[UNK]"] = _unkId;
                    _logger.LogWarning("vocab.txt 缺失 [UNK]，已合成插入 ID={Id}", _unkId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "加载 vocab.txt 失败, 回退到简化分词");
                _hasVocab = false;
                _clsId = _sepId = _unkId = _padId = -1;
            }
        }
        else
        {
            _logger.LogWarning("未找到 vocab.txt ({Path}), 使用简化分词回退实现", vocabPath);
            _hasVocab = false;
            _clsId = _sepId = _unkId = _padId = -1;
        }
    }

    public Task<TokenizedInput> TokenizeAsync(string text, int maxTokens, CancellationToken ct = default)
    {
        if (_hasNative)
        {
            return Task.FromResult(NativeTokenize(text, maxTokens));
        }
        return Task.FromResult(_hasVocab ? WordPieceTokenize(text, maxTokens) : FallbackTokenize(text, maxTokens));
    }

    public Task<IReadOnlyList<TokenizedInput>> TokenizeBatchAsync(IReadOnlyList<string> texts, int maxTokens, CancellationToken ct = default)
    {
        if (_hasNative)
        {
            var native = texts.Select(t => NativeTokenize(t, maxTokens)).ToArray();
            return Task.FromResult<IReadOnlyList<TokenizedInput>>(native);
        }
        if (_hasVocab)
        {
            var arr = texts.Select(t => WordPieceTokenize(t, maxTokens)).ToArray();
            return Task.FromResult<IReadOnlyList<TokenizedInput>>(arr);
        }
        var fb = texts.Select(t => FallbackTokenize(t, maxTokens)).ToArray();
        return Task.FromResult<IReadOnlyList<TokenizedInput>>(fb);
    }

    /// <summary>
    /// 提供检索用分词（不返回 ID），便于后续构建 lexical filter / hybrid 检索。
    /// </summary>
    public string[] TokenizeForSearch(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return Array.Empty<string>();
        if (_hasNative)
        {
            try
            {
                var ids = _nativeTokenizer!.Encode(text);
                // 无法直接获取 token 字符串，采取与 demo 类似的混合策略：回退到简易规则
            }
            catch { /* ignore */ }
        }
        // 简易策略：按空白/标点拆分 + 中文单字与整串保留
        var segments = _basicTokenSplit.Split(text.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .SelectMany(t => _punctSplit.Split(t))
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .ToList();
        var results = new HashSet<string>();
        foreach (var seg in segments)
        {
            if (IsAllCjk(seg))
            {
                results.Add(seg); // 整串
                foreach (var ch in seg) results.Add(ch.ToString());
            }
            else
            {
                results.Add(seg.ToLowerInvariant());
            }
        }
        return results.ToArray();
    }

    private TokenizedInput NativeTokenize(string text, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(text)) return new TokenizedInput(new List<long>(), new List<long>(), null);
        try
        {
            var encoded = _nativeTokenizer!.Encode(text);
            var list = encoded.Select(e => (long)e).ToList();
            if (maxLength > 0 && list.Count > maxLength)
            {
                // 截断保留前 maxLength-1，再尝试保留末尾 [SEP] (如果存在)
                list = list.Take(maxLength).ToList();
            }
            var attention = Enumerable.Repeat(1L, list.Count).ToList();
            return new TokenizedInput(list, attention, null);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Native tokenizer 编码失败，回退到 vocab 路径");
            return _hasVocab ? WordPieceTokenize(text, maxLength) : FallbackTokenize(text, maxLength);
        }
    }

    private TokenizedInput WordPieceTokenize(string text, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(text)) return new TokenizedInput(new List<long>(), new List<long>(), null);
        // 基础归一化: 小写 + 去除多余空白
        text = text.Trim();
        var basicTokens = _basicTokenSplit.Split(text)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .SelectMany(t => _punctSplit.Split(t))
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => _doLowerCase ? t.ToLowerInvariant() : t)
            .ToList();

        var ids = new List<long>();
        ids.Add(_clsId >= 0 ? _clsId : 0);
        int unkCount = 0;
        int totalSubTokens = 0;

        foreach (var token in basicTokens)
        {
            if (ids.Count >= maxLength - 1 || ids.Count >= _modelMaxLength - 1) break; // 预留 [SEP] 并遵守模型长度
            // 改进 CJK：整串尝试匹配，失败后单字拆分
            if (_tokenizeChineseChars && IsAllCjk(token))
            {
                if (_vocab.TryGetValue(token, out var cjkWhole))
                {
                    ids.Add(cjkWhole);
                    continue;
                }
                foreach (var ch in token)
                {
                    if (ids.Count >= maxLength - 1) break;
                    var str = ch.ToString();
                    if (_vocab.TryGetValue(str, out var cid))
                    {
                        ids.Add(cid);
                    }
                    else
                    {
                        if (_unkId >= 0)
                        {
                            ids.Add(_unkId);
                            unkCount++;
                        }
                    }
                    totalSubTokens++;
                }
                continue;
            }

            if (_vocab.TryGetValue(token, out var directId))
            {
                ids.Add(directId);
                continue;
            }
            // WordPiece 子词拆分
            var subTokens = new List<long>();
            int start = 0;
            // anyBad 标记已不再用于逻辑分支，仅保留局部变量说明，可移除以减少警告
            while (start < token.Length)
            {
                int end = token.Length;
                long found = -1;
                string currentPiece = string.Empty;
                while (start < end)
                {
                    var piece = token.Substring(start, end - start);
                    if (start > 0) piece = "##" + piece;
                    if (_vocab.TryGetValue(piece, out var pid))
                    {
                        found = pid;
                        currentPiece = piece;
                        break; // 最长匹配 (逆向可改进)
                    }
                    end--;
                }
                if (found == -1)
                {
                    // 未匹配该剩余部分：仅该部分记为 UNK，移动一字符继续，避免整词丢失
                    if (_unkId >= 0)
                    {
                        subTokens.Add(_unkId);
                        unkCount++;
                        // 未匹配子片段记为 UNK（若存在），继续细粒度推进
                    }
                    start++; // 跳过一个字符继续匹配剩余
                    continue;
                }
                subTokens.Add(found);
                start += currentPiece.StartsWith("##", StringComparison.Ordinal) ? currentPiece.Length - 2 : currentPiece.Length;
            }
            foreach (var st in subTokens)
            {
                if (ids.Count >= maxLength - 1) break;
                ids.Add(st);
            }
            totalSubTokens += subTokens.Count;
        }

        ids.Add(_sepId >= 0 ? _sepId : 0);

        var attention = Enumerable.Repeat(1L, ids.Count).ToList();
        if (totalSubTokens > 0)
        {
            var unkRatio = (double)unkCount / totalSubTokens;
            if (unkRatio > 0.3)
            {
                _logger.LogWarning("分词 UNK 比例过高 ({Ratio:P2})，文本: {Sample}", unkRatio, TruncateForLog(text));
            }
            else
            {
                _logger.LogDebug("分词完成，总子词: {Total}, UNK: {Unk} ({Ratio:P2})", totalSubTokens, unkCount, unkRatio);
            }
        }
        return new TokenizedInput(ids, attention, null);
    }

    private static bool IsAllCjk(string s)
    {
        if (string.IsNullOrEmpty(s)) return false;
        foreach (var ch in s)
        {
            if (!(ch >= '\u4e00' && ch <= '\u9fff')) return false;
        }
        return true;
    }

    private static TokenizedInput FallbackTokenize(string text, int maxLength)
    {
        // 彻底回退：不伪造 ID，直接返回空，调用方可按需处理或使用哈希降级。
        return new TokenizedInput(new List<long>(), new List<long>(), null);
    }

    private long TryGet(string token) => _vocab.TryGetValue(token, out var v) ? v : -1;

    private static string TruncateForLog(string text, int max = 120)
    {
        if (text.Length <= max) return text;
        return text.Substring(0, max) + "...";
    }

    /// <summary>
    /// 调试分词输出：token字符串、ID序列、UNK比例
    /// </summary>
    public TokenizationDebug DebugTokenize(string text, int maxTokens)
    {
        if (text is null) throw new ArgumentNullException(nameof(text));
        var dbg = new TokenizationDebug { Original = text };
        if (_hasNative)
        {
            try
            {
                var encoded = _nativeTokenizer!.Encode(text);
                dbg.SetIds(encoded.Select(e => (long)e).ToList());
                dbg.SetTokens(new List<string>());
                dbg.UsedNative = true;
                return dbg;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Native DebugTokenize 失败，回退 WordPiece");
            }
        }
        if (!_hasVocab) return dbg; // 空
        string norm = text.Trim();
        var basicTokens = _basicTokenSplit.Split(norm)
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .SelectMany(t => _punctSplit.Split(t))
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => _doLowerCase ? t.ToLowerInvariant() : t)
            .ToList();
        var ids = new List<long>(); var toks = new List<string>();
        ids.Add(_clsId >= 0 ? _clsId : 0); toks.Add("[CLS]");
        int unk = 0; int total = 0;
        foreach (var token in basicTokens)
        {
            if (ids.Count >= maxTokens - 1 || ids.Count >= _modelMaxLength - 1) break;
            if (_tokenizeChineseChars && IsAllCjk(token))
            {
                if (_vocab.TryGetValue(token, out var whole)) { ids.Add(whole); toks.Add(token); continue; }
                foreach (var ch in token)
                {
                    if (ids.Count >= maxTokens - 1) break;
                    var s = ch.ToString();
                    if (_vocab.TryGetValue(s, out var cid)) { ids.Add(cid); toks.Add(s); }
                    else { ids.Add(_unkId); toks.Add("[UNK]"); unk++; }
                    total++;
                }
                continue;
            }
            if (_vocab.TryGetValue(token, out var direct)) { ids.Add(direct); toks.Add(token); continue; }
            int start = 0;
            while (start < token.Length)
            {
                int end = token.Length; long found = -1; string piece = string.Empty;
                while (start < end)
                {
                    var sub = token.Substring(start, end - start);
                    var sp = start > 0 ? "##" + sub : sub;
                    if (_vocab.TryGetValue(sp, out var pid)) { found = pid; piece = sp; break; }
                    end--;
                }
                if (found == -1)
                {
                    ids.Add(_unkId); toks.Add("[UNK]"); unk++; start++; total++; continue;
                }
                ids.Add(found); toks.Add(piece); total++;
                start += piece.StartsWith("##", StringComparison.Ordinal) ? piece.Length - 2 : piece.Length;
                if (ids.Count >= maxTokens - 1) break;
            }
        }
        ids.Add(_sepId >= 0 ? _sepId : 0); toks.Add("[SEP]");
        dbg.SetIds(ids); dbg.SetTokens(toks); dbg.UnkRatio = total > 0 ? (double)unk / total : 0; dbg.UsedNative = false;
        return dbg;
    }
}

public sealed class TokenizationDebug
{
    public string Original { get; set; } = string.Empty;
    public IReadOnlyList<string> Tokens { get; private set; } = Array.Empty<string>();
    public IReadOnlyList<long> Ids { get; private set; } = Array.Empty<long>();
    public double UnkRatio { get; set; }
    public bool UsedNative { get; set; }

    internal void SetTokens(List<string> toks) => Tokens = toks;
    internal void SetIds(List<long> ids) => Ids = ids;
}

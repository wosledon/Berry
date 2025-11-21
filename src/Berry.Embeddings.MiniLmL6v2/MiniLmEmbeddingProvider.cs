using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Berry.Abstractions.Embeddings;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Microsoft.ML.OnnxRuntime;
using Microsoft.ML.OnnxRuntime.Tensors;

namespace Berry.Embeddings.MiniLmL6v2;

/// <summary>
/// MiniLM-L6-v2 ONNX 嵌入提供者
/// 支持批量嵌入、动态输入适配、回退哈希模式
/// </summary>
public class MiniLmEmbeddingProvider : IEmbeddingProvider
{
    private readonly ILogger<MiniLmEmbeddingProvider> _logger;
    private readonly IEmbeddingModelResolver _resolver;
    private readonly IEmbeddingTokenizer _tokenizer;
    private readonly ConcurrentDictionary<string, float[]> _cache = new();
    private readonly EmbeddingModelInfo _modelInfo;
    private readonly InferenceSession? _session;
    private readonly bool _useFallback;

    public int Dimension => _modelInfo.EmbeddingDimension;

    public MiniLmEmbeddingProvider(
        ILogger<MiniLmEmbeddingProvider> logger,
        IConfiguration config,
        IEmbeddingModelResolver resolver,
        IEmbeddingTokenizer tokenizer)
    {
        _logger = logger;
        _resolver = resolver;
        _tokenizer = tokenizer;
        _modelInfo = _resolver.ResolveModel(config);

        if (_modelInfo.ModelFilePath != null && File.Exists(_modelInfo.ModelFilePath))
        {
            try
            {
                _session = new InferenceSession(_modelInfo.ModelFilePath);
                _useFallback = false;
                _logger.LogInformation("MiniLM ONNX 模型已加载: {Path}", _modelInfo.ModelFilePath);
                
                // 打印输入元数据以便调试
                foreach (var kv in _session.InputMetadata)
                {
                    _logger.LogDebug("ONNX 输入: {Name} - {Type} {Dims}",
                        kv.Key, kv.Value.ElementType, string.Join('x', kv.Value.Dimensions ?? Array.Empty<int>()));
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "MiniLM ONNX 初始化失败，切换到哈希降级模式");
                _session = null;
                _useFallback = true;
            }
        }
        else
        {
            _logger.LogInformation("模型文件缺失，使用哈希降级嵌入。目录: {Dir}", _modelInfo.ModelDirectory);
            _useFallback = true;
        }
    }

    public async Task<float[]> EmbedAsync(string text, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(text)) return new float[Dimension];
        if (_cache.TryGetValue(text, out var cached)) return cached;

        float[] vector;
        if (_useFallback || _session == null)
        {
            vector = HashEmbedding(text, Dimension);
        }
        else
        {
            try
            {
                vector = await EmbedWithOnnxAsync(text, ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "ONNX 推理失败，回退哈希模式: {Text}", text.Substring(0, Math.Min(50, text.Length)));
                vector = HashEmbedding(text, Dimension);
            }
        }

        _cache[text] = vector;
        return vector;
    }

    public async Task<float[][]> EmbedBatchAsync(IReadOnlyList<string> texts, CancellationToken ct = default)
    {
        if (_useFallback || _session == null)
        {
            return texts.Select(t => HashEmbedding(t, Dimension)).ToArray();
        }

        try
        {
            // 批量 tokenize
            var tokenized = await _tokenizer.TokenizeBatchAsync(texts, _modelInfo.MaxTokenLength, ct);
            if (tokenized.Count == 0) return texts.Select(t => HashEmbedding(t, Dimension)).ToArray();

            int batch = texts.Count;
            int maxLen = tokenized.Max(t => t.InputIds.Count);
            maxLen = Math.Min(maxLen, _modelInfo.MaxTokenLength);

            var inputMeta = _session.InputMetadata;
            var inputs = new List<NamedOnnxValue>();

            // 动态适配模型输入名称
            foreach (var name in inputMeta.Keys)
            {
                var lower = name.ToLowerInvariant();
                if (lower.Contains("input"))
                {
                    var tensor = new DenseTensor<long>(new[] { batch, maxLen });
                    for (int b = 0; b < batch; b++)
                    {
                        var ids = tokenized[b].InputIds;
                        for (int i = 0; i < maxLen; i++)
                            tensor[b, i] = i < ids.Count ? ids[i] : 0L;
                    }
                    inputs.Add(NamedOnnxValue.CreateFromTensor(name, tensor));
                }
                else if (lower.Contains("attention"))
                {
                    var tensor = new DenseTensor<long>(new[] { batch, maxLen });
                    for (int b = 0; b < batch; b++)
                    {
                        var mask = tokenized[b].AttentionMask;
                        for (int i = 0; i < maxLen; i++)
                            tensor[b, i] = i < mask.Count ? mask[i] : 1L;
                    }
                    inputs.Add(NamedOnnxValue.CreateFromTensor(name, tensor));
                }
                else if (lower.Contains("token_type") || lower.Contains("segment"))
                {
                    var tensor = new DenseTensor<long>(new[] { batch, maxLen });
                    for (int b = 0; b < batch; b++)
                    {
                        var types = tokenized[b].TokenTypeIds ?? Array.Empty<long>();
                        for (int i = 0; i < maxLen; i++)
                            tensor[b, i] = i < types.Count ? types[i] : 0L;
                    }
                    inputs.Add(NamedOnnxValue.CreateFromTensor(name, tensor));
                }
            }

            using var results = _session.Run(inputs);
            var output = results.First().Value as Tensor<float>;
            if (output == null) throw new InvalidOperationException("ONNX 输出为空");

            var embeddings = new float[batch][];
            var dims = output.Dimensions.ToArray();

            if (dims.Length == 3) // [batch, seq, hidden]
            {
                int seq = dims[1];
                int hidden = dims[2];
                for (int b = 0; b < batch; b++)
                {
                    embeddings[b] = new float[hidden];
                    if (string.Equals(_modelInfo.PoolingStrategy, "cls", StringComparison.OrdinalIgnoreCase))
                    {
                        for (int d = 0; d < hidden; d++)
                            embeddings[b][d] = output[b, 0, d];
                    }
                    else // mean pooling
                    {
                        for (int t = 0; t < seq; t++)
                            for (int d = 0; d < hidden; d++)
                                embeddings[b][d] += output[b, t, d];
                        for (int d = 0; d < hidden; d++)
                            embeddings[b][d] /= seq;
                    }
                    NormalizeInPlace(embeddings[b]);
                }
            }
            else if (dims.Length == 2) // [batch, hidden]
            {
                int hidden = dims[1];
                for (int b = 0; b < batch; b++)
                {
                    embeddings[b] = new float[hidden];
                    for (int d = 0; d < hidden; d++)
                        embeddings[b][d] = output[b, d];
                    NormalizeInPlace(embeddings[b]);
                }
            }
            else
            {
                throw new InvalidOperationException($"不支持的输出维度: {string.Join('x', dims)}");
            }

            return embeddings;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "批量 ONNX 推理失败，回退单文本模式");
            return texts.Select(t => HashEmbedding(t, Dimension)).ToArray();
        }
    }

    private async Task<float[]> EmbedWithOnnxAsync(string text, CancellationToken ct)
    {
        var tokenized = await _tokenizer.TokenizeAsync(text, _modelInfo.MaxTokenLength, ct);
        if (tokenized.InputIds.Count == 0) return HashEmbedding(text, Dimension);

        int seqLen = Math.Min(tokenized.InputIds.Count, _modelInfo.MaxTokenLength);
        var inputMeta = _session!.InputMetadata;
        var inputs = new List<NamedOnnxValue>();

        foreach (var name in inputMeta.Keys)
        {
            var lower = name.ToLowerInvariant();
            if (lower.Contains("input"))
            {
                var tensor = new DenseTensor<long>(new[] { 1, seqLen });
                for (int i = 0; i < seqLen; i++)
                    tensor[0, i] = tokenized.InputIds[i];
                inputs.Add(NamedOnnxValue.CreateFromTensor(name, tensor));
            }
            else if (lower.Contains("attention"))
            {
                var tensor = new DenseTensor<long>(new[] { 1, seqLen });
                for (int i = 0; i < seqLen; i++)
                    tensor[0, i] = tokenized.AttentionMask[i];
                inputs.Add(NamedOnnxValue.CreateFromTensor(name, tensor));
            }
            else if (lower.Contains("token_type") || lower.Contains("segment"))
            {
                var tensor = new DenseTensor<long>(new[] { 1, seqLen });
                var types = tokenized.TokenTypeIds ?? Array.Empty<long>();
                for (int i = 0; i < seqLen; i++)
                    tensor[0, i] = i < types.Count ? types[i] : 0L;
                inputs.Add(NamedOnnxValue.CreateFromTensor(name, tensor));
            }
        }

        using var results = _session.Run(inputs);
        var output = results.First().Value as Tensor<float>;
        if (output == null) throw new InvalidOperationException("ONNX 输出为空");

        var dims = output.Dimensions.ToArray();
        float[] vector;

        if (dims.Length == 3) // [1, seq, hidden]
        {
            int seq = dims[1];
            int hidden = dims[2];
            vector = new float[hidden];
            if (string.Equals(_modelInfo.PoolingStrategy, "cls", StringComparison.OrdinalIgnoreCase))
            {
                for (int d = 0; d < hidden; d++)
                    vector[d] = output[0, 0, d];
            }
            else // mean pooling
            {
                for (int t = 0; t < seq; t++)
                    for (int d = 0; d < hidden; d++)
                        vector[d] += output[0, t, d];
                for (int d = 0; d < hidden; d++)
                    vector[d] /= seq;
            }
        }
        else if (dims.Length == 2) // [1, hidden]
        {
            int hidden = dims[1];
            vector = new float[hidden];
            for (int d = 0; d < hidden; d++)
                vector[d] = output[0, d];
        }
        else
        {
            throw new InvalidOperationException($"不支持的输出维度: {string.Join('x', dims)}");
        }

        NormalizeInPlace(vector);
        return vector;
    }

    private static float[] HashEmbedding(string text, int dim)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(text));
        var res = new float[dim];
        for (int i = 0; i < dim; i++)
        {
            var b = bytes[i % bytes.Length];
            res[i] = (b / 255f) * 2f - 1f;
        }
        NormalizeInPlace(res);
        return res;
    }

    private static void NormalizeInPlace(float[] v)
    {
        double sumSq = 0;
        for (int i = 0; i < v.Length; i++) sumSq += v[i] * v[i];
        var norm = Math.Sqrt(sumSq);
        if (norm > 1e-12)
        {
            for (int i = 0; i < v.Length; i++) v[i] = (float)(v[i] / norm);
        }
    }
}

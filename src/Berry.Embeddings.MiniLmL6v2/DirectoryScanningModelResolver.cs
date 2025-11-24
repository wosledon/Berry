using System;
using System.IO;
using Berry.Abstractions.Embeddings;
using Microsoft.Extensions.Configuration;

namespace Berry.Embeddings.MiniLmL6v2;

/// <summary>
/// 扫描模型目录的默认解析器
/// 约定: 模型资源放在 all-MiniLM-L6-v2/ 子目录
/// </summary>
public class DirectoryScanningModelResolver : IEmbeddingModelResolver
{
    public EmbeddingModelInfo ResolveModel(IConfiguration config)
    {
        var baseDir = config["Embeddings:ModelDirectory"] 
            ?? Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "all-MiniLM-L6-v2");

        var modelFile = Path.Combine(baseDir, "model.onnx");
        var tokenizerFile = Path.Combine(baseDir, "tokenizer.json");
        var pooling = config["Embeddings:PoolingStrategy"] ?? "mean";
        var maxTokens = int.Parse(config["Embeddings:MaxTokenLength"] ?? "512");
        var dimension = int.Parse(config["Embeddings:EmbeddingDimension"] ?? "384");

        return new EmbeddingModelInfo(
            ModelDirectory: baseDir,
            ModelFilePath: modelFile,
            TokenizerFilePath: tokenizerFile,
            EmbeddingDimension: dimension,
            MaxTokenLength: maxTokens,
            PoolingStrategy: pooling
        );
    }
}

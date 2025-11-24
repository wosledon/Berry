# Berry RAG Demo - 测试脚本
# 使用PowerShell运行此脚本

$baseUrl = "http://localhost:5000"

Write-Host "=== Berry RAG Demo 测试 ===" -ForegroundColor Cyan
Write-Host ""

# 1. 检查健康状态
Write-Host "1. 检查健康状态..." -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method Get
Write-Host "状态: $($health.status)" -ForegroundColor Green
Write-Host ""

# 2. 获取应用信息
Write-Host "2. 获取应用信息..." -ForegroundColor Yellow
$info = Invoke-RestMethod -Uri "$baseUrl/api/info" -Method Get
Write-Host "应用: $($info.name)" -ForegroundColor Green
Write-Host "版本: $($info.version)" -ForegroundColor Green
Write-Host "功能:"
$info.features | ForEach-Object { Write-Host "  - $_" }
Write-Host ""

# 3. 上传示例文档
Write-Host "3. 上传示例文档..." -ForegroundColor Yellow
$sampleDoc = Get-Content -Path "Data/sample-document.md" -Raw -Encoding UTF8
$uploadBody = @{
    documentId = "berry-framework-guide"
    documentName = "Berry框架完整指南"
    content = $sampleDoc
    chunkSize = 500
    chunkOverlap = 50
} | ConvertTo-Json -Depth 10

$uploadResult = Invoke-RestMethod -Uri "$baseUrl/api/rag/documents" `
    -Method Post `
    -ContentType "application/json" `
    -Body $uploadBody

Write-Host "文档ID: $($uploadResult.documentId)" -ForegroundColor Green
Write-Host "分块数量: $($uploadResult.chunkCount)" -ForegroundColor Green
Write-Host "处理时间: $($uploadResult.processingTimeMs)ms" -ForegroundColor Green
Write-Host ""

# 4. 语义检索测试
Write-Host "4. 语义检索测试..." -ForegroundColor Yellow
$searchBody = @{
    query = "Berry框架有哪些模块？"
    topK = 3
} | ConvertTo-Json

$searchResult = Invoke-RestMethod -Uri "$baseUrl/api/rag/search" `
    -Method Post `
    -ContentType "application/json" `
    -Body $searchBody

Write-Host "查询: $($searchResult.query)" -ForegroundColor Green
Write-Host "找到 $($searchResult.results.Count) 个结果:" -ForegroundColor Green
$searchResult.results | ForEach-Object {
    Write-Host "  - 相似度: $([math]::Round($_.score, 3))" -ForegroundColor Cyan
    Write-Host "    内容: $($_.content.Substring(0, [Math]::Min(100, $_.content.Length)))..." -ForegroundColor White
}
Write-Host "处理时间: $($searchResult.processingTimeMs)ms" -ForegroundColor Green
Write-Host ""

# 5. 知识问答测试
Write-Host "5. 知识问答测试..." -ForegroundColor Yellow
$questions = @(
    "什么是Berry框架？",
    "Berry支持哪些数据库？",
    "如何创建自定义模块？",
    "Berry的核心理念是什么？"
)

foreach ($question in $questions) {
    $askBody = @{
        question = $question
        topK = 3
    } | ConvertTo-Json

    $askResult = Invoke-RestMethod -Uri "$baseUrl/api/rag/ask" `
        -Method Post `
        -ContentType "application/json" `
        -Body $askBody

    Write-Host "问题: $question" -ForegroundColor Cyan
    Write-Host "答案: $($askResult.answer.Substring(0, [Math]::Min(200, $askResult.answer.Length)))..." -ForegroundColor White
    Write-Host "处理时间: $($askResult.processingTimeMs)ms" -ForegroundColor Green
    Write-Host ""
}

# 6. 对话测试
Write-Host "6. 对话测试（带上下文记忆）..." -ForegroundColor Yellow
$conversationId = [Guid]::NewGuid().ToString()

$chatMessages = @(
    "Berry有RBAC模块吗？",
    "它有哪些功能？",
    "如何使用权限注解？"
)

foreach ($message in $chatMessages) {
    $chatBody = @{
        conversationId = $conversationId
        message = $message
        topK = 2
    } | ConvertTo-Json

    $chatResult = Invoke-RestMethod -Uri "$baseUrl/api/rag/chat" `
        -Method Post `
        -ContentType "application/json" `
        -Body $chatBody

    Write-Host "用户: $message" -ForegroundColor Cyan
    Write-Host "助手: $($chatResult.response.Substring(0, [Math]::Min(150, $chatResult.response.Length)))..." -ForegroundColor White
    Write-Host "对话轮次: $($chatResult.conversationHistory.Count)" -ForegroundColor Green
    Write-Host ""
}

# 7. 获取统计信息
Write-Host "7. 获取统计信息..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "$baseUrl/api/rag/stats" -Method Get
Write-Host "总片段数: $($stats.totalChunks)" -ForegroundColor Green
Write-Host "存储类型: $($stats.storageType)" -ForegroundColor Green
Write-Host "嵌入模型: $($stats.embeddingModel)" -ForegroundColor Green
Write-Host "向量维度: $($stats.embeddingDimension)" -ForegroundColor Green
Write-Host ""

# 8. 性能测试
Write-Host "8. 性能测试（连续10次检索）..." -ForegroundColor Yellow
$times = @()
for ($i = 1; $i -le 10; $i++) {
    $perfBody = @{
        query = "Berry框架特性"
        topK = 5
    } | ConvertTo-Json

    $perfResult = Invoke-RestMethod -Uri "$baseUrl/api/rag/search" `
        -Method Post `
        -ContentType "application/json" `
        -Body $perfBody
    
    $times += $perfResult.processingTimeMs
    Write-Host "  第 $i 次: $($perfResult.processingTimeMs)ms" -NoNewline
    if ($i % 5 -eq 0) { Write-Host "" }
}
Write-Host ""
$avgTime = ($times | Measure-Object -Average).Average
$minTime = ($times | Measure-Object -Minimum).Minimum
$maxTime = ($times | Measure-Object -Maximum).Maximum
Write-Host "平均响应时间: $([math]::Round($avgTime, 2))ms" -ForegroundColor Green
Write-Host "最快响应时间: $([math]::Round($minTime, 2))ms" -ForegroundColor Green
Write-Host "最慢响应时间: $([math]::Round($maxTime, 2))ms" -ForegroundColor Green
Write-Host ""

Write-Host "=== 测试完成 ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "提示：使用以下命令清空数据：" -ForegroundColor Yellow
Write-Host "Invoke-RestMethod -Uri '$baseUrl/api/rag/clear' -Method Delete" -ForegroundColor White

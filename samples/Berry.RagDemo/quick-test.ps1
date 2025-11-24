$baseUrl = "http://localhost:5000"

Write-Host "==========测试 Berry RAG Demo ==========" -ForegroundColor Cyan

# 测试1: 健康检查
Write-Host "`n[1] 健康检查..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# 测试2: 获取信息
Write-Host "`n[2] 获取API信息..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/info" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# 测试3: 上传示例文档
Write-Host "`n[3] 上传示例文档..." -ForegroundColor Yellow
$document = @{
    documentId = "doc001"
    documentName = "Berry框架简介"
    content = @"
Berry框架是一个企业级的.NET 8模块化开发框架。

核心特性：
1. 模块化架构设计，支持动态加载和热插拔
2. 内置权限管理、多租户、审计日志等企业功能
3. 集成RAG（检索增强生成）和向量检索功能
4. 支持MiniLM-L6-v2嵌入模型
5. 内存或Redis缓存支持

技术栈：
- ASP.NET Core 8.0
- Entity Framework Core
- ONNX Runtime（用于嵌入模型推理）
- Serilog日志
"@
}

try {
    $body = $document | ConvertTo-Json -Depth 10
    $response = Invoke-WebRequest -Uri "$baseUrl/api/rag/documents" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host $reader.ReadToEnd()
    }
}

# 测试4: 语义检索
Write-Host "`n[4] 语义检索测试..." -ForegroundColor Yellow
$searchRequest = @{
    query = "Berry框架有什么特性？"
    topK = 3
}

try {
    $body = $searchRequest | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/rag/search" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# 测试5: 知识问答
Write-Host "`n[5] 知识问答测试..." -ForegroundColor Yellow
$askRequest = @{
    question = "Berry框架使用什么嵌入模型？"
    topK = 2
}

try {
    $body = $askRequest | ConvertTo-Json
    $response = Invoke-WebRequest -Uri "$baseUrl/api/rag/ask" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body `
        -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

# 测试6: 获取统计信息
Write-Host "`n[6] 获取统计信息..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/rag/stats" -UseBasicParsing
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host $response.Content
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host "`n========== 测试完成 ==========" -ForegroundColor Cyan

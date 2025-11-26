短描述（中文）：
Berry — 可扩展的 .NET 模块化 RAG 与向量检索框架，包含 Embeddings、VectorStore、RAG 示例与前端演示。

Short description (English):
Berry — A modular, extensible .NET framework for Retrieval-Augmented Generation (RAG) and vector search, with built-in Embeddings, VectorStore, RAG samples and a front-end demo.

详细介绍（中文）：
Berry 是一个面向研发与生产的模块化 .NET 框架，专注于检索增强生成（RAG）、向量存储和嵌入（embeddings）能力。它把常见的向量检索、embedder、模块管理、审计与缓存等功能模块化为可插拔组件，便于在不同业务场景中快速集成与扩展。仓库同时包含后端服务（ASP.NET Core）、示例项目、前端（Vite + TypeScript）演示与多个可复用模块（如 VectorStore、Rag、Embeddings、RBAC、Tenant 等）。

Detailed introduction (English):
Berry is a modular .NET framework designed for both R&D and production scenarios, focusing on Retrieval-Augmented Generation (RAG), vector storage and embeddings. It modularizes common components—embedders, vector stores, module management, auditing, and caching—into pluggable units to simplify integration and extension across different business scenarios. The repository includes backend services (ASP.NET Core), sample apps, a front-end demo (Vite + TypeScript), and reusable modules such as VectorStore, RAG, Embeddings, RBAC, and Tenant.

核心亮点（中文）：
- 模块化：采用模块与依赖注入（DI）设计，模块可独立开发、注册与替换。
- RAG 与向量检索：内置 Embeddings 接口、向量存储适配与检索流程，便于搭建检索增强的生成式应用。
- 可扩展性：提供扫描与解析模型、分层抽象（Providers / Modules）以便添加自定义实现。
- 示例与演示：包含 `samples/`、`demos/` 与 `front/`，可快速体验端到端流程（向量化 → 存储 → 检索 → 生成）。
- 工程成熟度：遵守 .NET 最佳实践，包含构建、测试与 CI 验证范例。

Key highlights (English):
- Modular architecture: Modules built with dependency injection (DI) can be developed, registered, and replaced independently.
- RAG & vector search: Built-in Embeddings interfaces, vector store adapters and retrieval workflows make it easy to build RAG applications.
- Extensibility: Scanning/model-resolving and layered abstractions (Providers/Modules) enable custom implementations.
- Samples & demos: Contains `samples/`, `demos/`, and `front/` for quick end-to-end experience (embedding → store → retrieve → generate).
- Engineering maturity: Follows .NET best practices and includes build/test/CI examples.

快速开始（中文）（在仓库根目录运行）：
```powershell
# 后端
dotnet restore
dotnet build -c Release
# 运行样例服务（如 samples/Berry.RagDemo）
cd samples/Berry.RagDemo
dotnet run

# 前端（如果需要）
npm ci --prefix front
npm run dev --prefix front
```

Quick start (English) — run in repository root:
```powershell
# Backend
dotnet restore
dotnet build -c Release
# Run a sample service (e.g. samples/Berry.RagDemo)
cd samples/Berry.RagDemo
dotnet run

# Frontend (optional)
npm ci --prefix front
npm run dev --prefix front
```

推荐 Topics（中文 / English suggested GitHub topics）：
- .net / .net
- aspnet-core / aspnet-core
- rag / rag
- embeddings / embeddings
- vector-database / vector-database
- vector-search / vector-search
- semantic-search / semantic-search
- retrieval-augmented-generation / retrieval-augmented-generation
- vite / vite
- typescript / typescript

适合人群（中文）：
- 希望快速构建 RAG/语义检索 PoC 的工程师
- 需要在 .NET 平台上集成 embeddings 与向量检索的后端工程团队
- 希望研究向量存储、嵌入器适配与模块化架构的开发者

Target audience (English):
- Engineers building RAG/semantic search PoCs
- Backend teams integrating embeddings and vector search on .NET
- Developers researching vector stores, embedder adapters and modular architecture

使用与贡献（中文）：
欢迎通过 Issues 提供反馈、提交 PR 增强模块兼容性、提供新的 embeddings 适配器或向量存储实现。请参考仓库中的 CONTRIBUTING 指南（若存在）以及本项目内的 `AGENTS.md` 来了解自动化智能体与协作规范。

Contributing (English):
Contributions via Issues and PRs are welcome—adding module compatibility, new embedding adapters, or vector store implementations is encouraged. Please follow any existing CONTRIBUTING guidelines in the repo and refer to `AGENTS.md` for automation/agent collaboration rules.

许可（中文 / License）：
仓库中未明确许可文件时，请在创建公开仓库或发布前确认授权许可（例如 MIT / Apache-2.0）。

License (English):
If no LICENSE file is present in the repository, confirm and add an explicit license (e.g. MIT or Apache-2.0) before publishing publicly.

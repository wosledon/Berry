# Berry Framework NuGet Package Management

## 版本控制

Berry 框架使用 `Directory.Build.props` 文件来集中管理所有 NuGet 包的版本信息。

### 当前版本管理方式

- **版本定义**：在 `Directory.Build.props` 中定义主版本号
- **包版本管理**：所有包使用统一的版本号
- **依赖版本管理**：通过 `PackageReference Update` 统一管理依赖包版本

### 如何更新版本

#### 方法1：使用 PowerShell 脚本（推荐）

```powershell
# 补丁版本更新 (1.0.0 -> 1.0.1)
.\update-version.ps1 -Action patch

# 次版本更新 (1.0.0 -> 1.1.0)
.\update-version.ps1 -Action minor

# 主版本更新 (1.0.0 -> 2.0.0)
.\update-version.ps1 -Action major

# 设置特定版本
.\update-version.ps1 -Action set -Version "2.1.0"
```

#### 方法2：手动编辑 Directory.Build.props

编辑 `Directory.Build.props` 文件中的版本号：

```xml
<PropertyGroup>
  <Version>1.0.1</Version>  <!-- 修改此版本号 -->
  <AssemblyVersion>1.0.1.0</AssemblyVersion>
  <FileVersion>1.0.1.0</FileVersion>
</PropertyGroup>
```

### 依赖包版本管理

在 `Directory.Build.props` 中使用 `PackageReference Update` 来统一管理依赖包版本：

```xml
<ItemGroup>
  <!-- Microsoft Extensions -->
  <PackageReference Update="Microsoft.Extensions.DependencyInjection" Version="8.0.0" />
  <PackageReference Update="Microsoft.Extensions.Options" Version="8.0.2" />

  <!-- 其他包... -->
</ItemGroup>
```

这样可以确保所有项目使用相同版本的依赖包。

## NuGet 包发布

### 自动发布流程

项目配置了 GitHub Actions 自动发布流程：

1. **触发条件**：
   - 推送到 `main` 或 `master` 分支
   - 修改了 `src/` 目录或 `Directory.Build.props` 文件

2. **发布流程**：
   - 构建和测试所有项目
   - 生成 NuGet 包
   - 检查版本是否变更
   - 如果版本变更，自动发布到 NuGet.org
   - 创建 Git 标签和 GitHub Release

### 发布的包

- `Berry.Shared` - 共享组件和基础类型
- `Berry.Infrastructure` - 基础设施层（EF Core、数据库等）
- `Berry.Modules.Rbac` - RBAC 权限管理模块
- `Berry.Modules.Tenant` - 多租户模块
- `Berry.Modules.Audit` - 审计模块
- `Berry.Modules.Caching` - 缓存模块
- `Berry.Modules.Messaging` - 消息队列模块

### 手动发布

如果需要手动发布，可以使用以下命令：

```bash
# 构建所有包
dotnet pack --configuration Release --output ./packages

# 发布特定包
dotnet nuget push "packages/Berry.Shared.1.0.0.nupkg" \
  --api-key YOUR_API_KEY \
  --source https://api.nuget.org/v3/index.json
```

## 配置要求

### NuGet API Key

需要在 GitHub 仓库设置中添加 `NUGET_API_KEY` 秘密：

1. 前往 [NuGet.org](https://www.nuget.org/) 创建 API Key
2. 在 GitHub 仓库的 Settings > Secrets and variables > Actions 中添加
3. 变量名：`NUGET_API_KEY`
4. 值：你的 NuGet API Key

### 包元数据

所有包元数据都在 `Directory.Build.props` 中定义：

- **PackageId**：包的唯一标识符
- **Version**：版本号
- **Authors**：作者
- **Description**：描述
- **PackageTags**：标签
- **RepositoryUrl**：代码仓库地址

## 版本策略

### 语义化版本

遵循 [SemVer](https://semver.org/) 规范：

- **MAJOR**：破坏性变更
- **MINOR**：新增功能，向后兼容
- **PATCH**：修复，向后兼容

### 预发布版本

对于预发布版本，可以在版本号后添加后缀：

```xml
<Version>1.0.0-beta.1</Version>
<Version>1.0.0-rc.1</Version>
```

## 故障排除

### 版本冲突

如果遇到依赖版本冲突：

1. 检查 `Directory.Build.props` 中的版本定义
2. 确保所有项目都引用了正确的包版本
3. 使用 `dotnet list package --outdated` 检查过时的包

### 发布失败

如果自动发布失败：

1. 检查 GitHub Actions 日志
2. 验证 NuGet API Key 是否正确
3. 确认版本号是否递增
4. 检查包是否已经存在于 NuGet.org

### 本地测试

在发布前本地测试包：

```bash
# 构建包
dotnet pack --configuration Release

# 在本地项目中测试
dotnet add package Berry.Shared --source ./packages --version 1.0.0
```
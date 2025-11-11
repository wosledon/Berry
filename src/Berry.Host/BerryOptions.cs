using Berry.Shared.Modules;

namespace Berry.Host;

/// <summary>
/// Berry 框架配置选项
/// </summary>
public sealed class BerryOptions
{
    /// <summary>
    /// 是否优先注册内置模块清单（默认：true）
    /// 设为 true 时，框架将显式实例化并注册内置模块，减少反射扫描成本
    /// </summary>
    public bool UseBuiltinModules { get; set; } = true;

    /// <summary>
    /// 是否仅扫描入口程序集（默认：true）
    /// true: 仅扫描调用 AddBerry() 的程序集，开发者无需配置任何前缀
    /// false: 扫描所有已加载的程序集（可配合 AssemblyPrefixes 过滤）
    /// </summary>
    public bool ScanEntryAssemblyOnly { get; set; } = true;

    /// <summary>
    /// 程序集名称前缀过滤（仅在 ScanEntryAssemblyOnly=false 时生效）
    /// 留空表示扫描所有程序集，配置后仅扫描匹配前缀的程序集
    /// </summary>
    public List<string> AssemblyPrefixes { get; set; } = new();

    /// <summary>
    /// 排除的程序集名称（黑名单）
    /// </summary>
    public HashSet<string> ExcludedAssemblies { get; set; } = new();

    /// <summary>
    /// 排除的模块类型
    /// </summary>
    public HashSet<Type> ExcludedModules { get; set; } = new();

    /// <summary>
    /// 是否启用自动扫描（默认：true）
    /// </summary>
    public bool EnableAutoDiscovery { get; set; } = true;
}

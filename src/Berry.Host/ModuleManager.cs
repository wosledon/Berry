using Berry.Shared.Modules;
using Berry.Infrastructure;
using Berry.Modules.Caching;
using Berry.Modules.Messaging;
using Berry.Modules.Tenant;
using Berry.Modules.Rbac;
using Berry.Modules.Audit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Berry.Host;

/// <summary>
/// 模块管理器 - 管理 Berry 框架模块的生命周期
/// </summary>
public interface IModuleManager
{
    IReadOnlyList<IModule> Modules { get; }
    void RegisterModule(IModule module);
    void DiscoverModules(BerryOptions options);
}

internal sealed class ModuleManager : IModuleManager
{
    private readonly List<IModule> _modules = new();
    private readonly ILogger<ModuleManager> _logger;
    private static readonly Type[] BuiltinModuleTypes = new[]
    {
        typeof(DataModule),
        typeof(TenantModule),
        typeof(CachingModule),
        typeof(MessagingModule),
        typeof(RbacModule),
        typeof(AuditModule)
    };

    public IReadOnlyList<IModule> Modules => _modules.AsReadOnly();

    public ModuleManager(ILogger<ModuleManager> logger)
    {
        _logger = logger;
    }

    public void RegisterModule(IModule module)
    {
        if (_modules.Any(m => m.GetType() == module.GetType()))
        {
            _logger.LogWarning("Module {ModuleName} already registered, skipping.", module.Name);
            return;
        }

        _modules.Add(module);
        _logger.LogDebug("Registered module: {ModuleName} (Order: {Order})", module.Name, module.Order);
    }

    public void DiscoverModules(BerryOptions options)
    {
    _logger.LogInformation("Options => UseBuiltinModules={UseBuiltinModules}, EnableAutoDiscovery={EnableAutoDiscovery}, ScanEntryAssemblyOnly={ScanEntryAssemblyOnly}",
        options.UseBuiltinModules, options.EnableAutoDiscovery, options.ScanEntryAssemblyOnly);
        // 先显式注册内置模块，减少反射扫描，且便于按类型排除
        if (options.UseBuiltinModules)
        {
            RegisterBuiltinModules(options);
        }

        var assemblies = options.EnableAutoDiscovery
            ? GetAssembliesToScan(options)
            : Enumerable.Empty<System.Reflection.Assembly>();

        foreach (var assembly in assemblies)
        {
            var moduleTypes = assembly.GetTypes()
                .Where(t => typeof(IModule).IsAssignableFrom(t) &&
                           t is { IsAbstract: false, IsInterface: false, IsClass: true } &&
                           !options.ExcludedModules.Contains(t));

            foreach (var type in moduleTypes)
            {
                try
                {
                    var module = (IModule)Activator.CreateInstance(type)!;
                    RegisterModule(module);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to create module instance: {ModuleType}", type.FullName);
                }
            }
        }

        // 按 Order 排序
        _modules.Sort((a, b) => a.Order.CompareTo(b.Order));
        _logger.LogInformation("Discovered {Count} modules.", _modules.Count);
    }

    private void RegisterBuiltinModules(BerryOptions options)
    {
        var before = _modules.Count;
        foreach (var type in BuiltinModuleTypes)
        {
            if (options.ExcludedModules.Contains(type))
            {
                _logger.LogDebug("Builtin module {ModuleType} is excluded.", type.Name);
                continue;
            }

            try
            {
                var module = (IModule)Activator.CreateInstance(type)!;
                RegisterModule(module);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to create builtin module instance: {ModuleType}", type.FullName);
            }
        }
        var added = _modules.Count - before;
        _logger.LogInformation("Registered {Count} builtin modules.", added);
    }

    private IEnumerable<System.Reflection.Assembly> GetAssembliesToScan(BerryOptions options)
    {
        // 1. 始终扫描入口程序集(调用者的程序集),让开发者的模块自动注册
        var entryAssembly = System.Reflection.Assembly.GetEntryAssembly();
        if (entryAssembly != null)
        {
            _logger.LogDebug("Scanning entry assembly: {AssemblyName}", entryAssembly.GetName().Name);
            yield return entryAssembly;
        }

        // 2. 如果不是仅扫描入口程序集,则扫描所有已加载的程序集
        if (!options.ScanEntryAssemblyOnly)
        {
            var allAssemblies = AppDomain.CurrentDomain.GetAssemblies()
                .Where(a =>
                {
                    var name = a.GetName().Name;
                    if (name == null || a == entryAssembly) return false;

                    // 排除系统程序集和黑名单
                    if (options.ExcludedAssemblies.Contains(name)) return false;

                    // 如果配置了前缀过滤,则应用前缀匹配
                    if (options.AssemblyPrefixes.Count > 0)
                    {
                        return options.AssemblyPrefixes.Any(prefix =>
                            name.StartsWith(prefix, StringComparison.Ordinal));
                    }

                    return true;
                });

            foreach (var assembly in allAssemblies)
            {
                _logger.LogDebug("Scanning assembly: {AssemblyName}", assembly.GetName().Name);
                yield return assembly;
            }
        }
    }
}

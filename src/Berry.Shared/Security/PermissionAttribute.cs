using System.Reflection;

namespace Berry.Shared.Security;

/// <summary>
/// 表示该方法需要具备指定权限（全部满足，逻辑 AND）。
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = true)]
public sealed class PermissionAttribute : Attribute
{
    public PermissionAttribute(string name) => Name = name;
    public string Name { get; }
    public string? Description { get; set; }
}

/// <summary>
/// 表示该方法需要具备给定集合中任意一个权限（逻辑 OR）。
/// </summary>
[AttributeUsage(AttributeTargets.Method, AllowMultiple = false)]
public sealed class AnyPermissionAttribute : Attribute
{
    public AnyPermissionAttribute(params string[] names) => Names = names;
    public IReadOnlyList<string> Names { get; }
    public string? Description { get; set; }
}

public static class PermissionScanner
{
    public static IEnumerable<(string Name, string? Description)> Scan(params Assembly[] assemblies)
    {
        foreach (var asm in assemblies)
        {
            foreach (var type in asm.GetTypes())
            {
                foreach (var method in type.GetMethods(BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly | BindingFlags.Static))
                {
                    var attrs = method.GetCustomAttributes<PermissionAttribute>();
                    foreach (var a in attrs)
                        yield return (a.Name, a.Description);
                    // AnyPermissionAttribute 中的每一个权限也需要登记
                    var any = method.GetCustomAttributes<AnyPermissionAttribute>();
                    foreach (var a in any)
                    {
                        foreach (var n in a.Names)
                            yield return (n, a.Description);
                    }
                }
            }
        }
    }
}

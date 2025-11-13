namespace Berry.Infrastructure.Entities;

/// <summary>
/// 系统租户定义（不继承 BaseEntity，避免被多租户过滤）
/// Id 即为租户标识。
/// </summary>
public sealed class SystemTenant
{
    public string Id { get; set; } = string.Empty; // 与多租户上下文租户标识一致
    public string? Name { get; set; }
    public string? Description { get; set; }
    public bool IsDisabled { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

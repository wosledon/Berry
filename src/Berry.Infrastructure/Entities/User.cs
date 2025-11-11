namespace Berry.Infrastructure.Entities;

public sealed class User : BaseEntity
{
    public required string Username { get; set; }
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
    // 密码哈希（PBKDF2 / BCrypt 等）
    public string? PasswordHash { get; set; }
    // 是否禁用
    public bool IsDisabled { get; set; }
}

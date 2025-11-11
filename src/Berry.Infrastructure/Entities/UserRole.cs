namespace Berry.Infrastructure.Entities;

public sealed class UserRole : BaseEntity
{
    public required string UserId { get; set; }
    public required string RoleId { get; set; }
}

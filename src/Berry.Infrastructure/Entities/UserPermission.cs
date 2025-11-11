namespace Berry.Infrastructure.Entities;

public sealed class UserPermission : BaseEntity
{
    public required string UserId { get; set; }
    public required string PermissionName { get; set; }
}

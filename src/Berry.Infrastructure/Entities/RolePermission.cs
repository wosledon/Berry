namespace Berry.Infrastructure.Entities;

public sealed class RolePermission : BaseEntity
{
    public required string RoleId { get; set; }
    public required string PermissionName { get; set; }
}

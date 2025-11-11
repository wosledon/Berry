namespace Berry.Infrastructure.Entities;

public sealed class Permission : BaseEntity
{
    public required string Name { get; set; }
    public string? Description { get; set; }
}

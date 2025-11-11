namespace Berry.Infrastructure.Entities;

public sealed class Role : BaseEntity
{
    public required string Name { get; set; }
    public string? Description { get; set; }
}

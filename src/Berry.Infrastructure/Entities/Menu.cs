namespace Berry.Infrastructure.Entities;

public sealed class Menu : BaseEntity
{
    public required string Name { get; set; }
    public string? Path { get; set; }
    public string? Icon { get; set; }
    public int Order { get; set; }
    public string? Permission { get; set; }
    public string? ParentId { get; set; }
}

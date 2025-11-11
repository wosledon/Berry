namespace Berry.Infrastructure.Entities;

public sealed class User : BaseEntity
{
    public required string Username { get; set; }
    public string? DisplayName { get; set; }
    public string? Email { get; set; }
}

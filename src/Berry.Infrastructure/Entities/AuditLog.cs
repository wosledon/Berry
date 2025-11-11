namespace Berry.Infrastructure.Entities;

public sealed class AuditLog : BaseEntity
{
    public required string Method { get; set; }
    public required string Path { get; set; }
    public int StatusCode { get; set; }
    public long ElapsedMs { get; set; }
    public string? UserId { get; set; }
    public string? Ip { get; set; }
    public string? UserAgent { get; set; }
}

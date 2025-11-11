using System;

namespace Berry.Infrastructure.Entities;

public abstract class BaseEntity
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N");
    public string? TenantId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
}

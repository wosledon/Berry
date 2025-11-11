using Berry.Infrastructure.Entities;

namespace Berry.Modules.Audit;

public interface IAuditLogWriter
{
    Task WriteAsync(AuditLog log, CancellationToken ct = default);
}

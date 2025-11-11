using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;

namespace Berry.Modules.Audit;

public sealed class EfCoreAuditLogWriter(BerryDbContext db) : IAuditLogWriter
{
    public async Task WriteAsync(AuditLog log, CancellationToken ct = default)
    {
        await db.AuditLogs.AddAsync(log, ct);
        await db.SaveChangesAsync(ct);
    }
}

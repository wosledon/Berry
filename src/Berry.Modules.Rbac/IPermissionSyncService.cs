using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Shared.Security;
using Microsoft.EntityFrameworkCore;

namespace Berry.Modules.Rbac;

public interface IPermissionSyncService
{
    Task<(int added, int updated)> SyncAsync(CancellationToken ct = default);
}

internal sealed class PermissionSyncService(BerryDbContext db) : IPermissionSyncService
{
    public async Task<(int added, int updated)> SyncAsync(CancellationToken ct = default)
    {
        var asms = AppDomain.CurrentDomain.GetAssemblies();
        // 仅按 Name 去重，合并描述（优先使用第一个非空描述）
        var scanned = PermissionScanner
            .Scan(asms)
            .GroupBy(p => p.Name, StringComparer.OrdinalIgnoreCase)
            .Select(g => (Name: g.Key, Description: g.Select(x => x.Description).FirstOrDefault(d => !string.IsNullOrWhiteSpace(d))))
            .ToList();

        var existing = await db.Permissions.AsNoTracking().ToListAsync(ct);
        var map = existing.ToDictionary(p => p.Name, StringComparer.OrdinalIgnoreCase);
        var added = 0; var updated = 0;

        foreach (var p in scanned)
        {
            if (!map.TryGetValue(p.Name, out var entity))
            {
                await db.Permissions.AddAsync(new Permission
                {
                    Name = p.Name,
                    Description = p.Description
                }, ct);
                added++;
            }
            else if (!string.Equals(entity.Description, p.Description, StringComparison.Ordinal))
            {
                entity.Description = p.Description;
                db.Permissions.Update(entity);
                updated++;
            }
        }

        if (added > 0 || updated > 0)
            await db.SaveChangesAsync(ct);

        return (added, updated);
    }
}

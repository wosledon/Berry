using Berry.Infrastructure;
using Berry.Shared.Caching;
using Microsoft.EntityFrameworkCore;

namespace Berry.Modules.Rbac;

public interface IPermissionsCacheInvalidator
{
    Task InvalidateUserAsync(string userId, CancellationToken ct = default);
    Task InvalidateUsersForRoleAsync(string roleId, CancellationToken ct = default);
    Task InvalidateUsersForPermissionAsync(string permissionName, CancellationToken ct = default);
}

internal sealed class PermissionsCacheInvalidator(ICacheProvider cache, BerryDbContext db) : IPermissionsCacheInvalidator
{
    private static string Key(string userId) => $"user:perms:{userId}";

    public Task InvalidateUserAsync(string userId, CancellationToken ct = default)
        => cache.RemoveAsync(Key(userId), ct);

    public async Task InvalidateUsersForRoleAsync(string roleId, CancellationToken ct = default)
    {
        var userIds = await db.UserRoles.Where(ur => ur.RoleId == roleId).Select(ur => ur.UserId).ToListAsync(ct);
        foreach (var uid in userIds) await cache.RemoveAsync(Key(uid), ct);
    }

    public async Task InvalidateUsersForPermissionAsync(string permissionName, CancellationToken ct = default)
    {
        var directUsers = await db.UserPermissions.Where(up => up.PermissionName == permissionName).Select(up => up.UserId).ToListAsync(ct);
        var roleIds = await db.RolePermissions.Where(rp => rp.PermissionName == permissionName).Select(rp => rp.RoleId).ToListAsync(ct);
        var roleUsers = new List<string>();
        if (roleIds.Count > 0)
        {
            roleUsers = await db.UserRoles.Where(ur => roleIds.Contains(ur.RoleId)).Select(ur => ur.UserId).ToListAsync(ct);
        }
        foreach (var uid in directUsers.Concat(roleUsers).Distinct()) await cache.RemoveAsync(Key(uid), ct);
    }
}

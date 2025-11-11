using System.Security.Claims;
using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;

namespace Berry.Modules.Rbac;

internal sealed class PermissionsEnrichmentMiddleware
{
    private readonly RequestDelegate _next;
    public PermissionsEnrichmentMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ICurrentUserAccessor currentUser, BerryDbContext db, Berry.Shared.Caching.ICacheProvider cache)
    {
        var principal = context.User;
        if (principal?.Identity?.IsAuthenticated == true)
        {
            // 如果已存在 perm 声明，则跳过
            if (!principal.Claims.Any(c => c.Type == "perm"))
            {
                var userId = currentUser.UserId;
                if (!string.IsNullOrEmpty(userId))
                {
                    var cacheKey = $"user:perms:{userId}";
                    var all = await cache.GetOrSetAsync(cacheKey, async () =>
                    {
                        var ups = await db.UserPermissions
                            .Where(p => p.UserId == userId)
                            .Select(p => p.PermissionName)
                            .ToListAsync();
                        var roleIds = await db.UserRoles
                            .Where(ur => ur.UserId == userId)
                            .Select(ur => ur.RoleId)
                            .ToListAsync();
                        var rps = new List<string>();
                        if (roleIds.Count > 0)
                        {
                            rps = await db.RolePermissions
                                .Where(rp => roleIds.Contains(rp.RoleId))
                                .Select(rp => rp.PermissionName)
                                .ToListAsync();
                        }
                        return ups.Concat(rps).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
                    }, TimeSpan.FromMinutes(5));
                    if (all.Count > 0)
                    {
                        var id = principal.Identity as ClaimsIdentity;
                        if (id != null)
                        {
                            foreach (var p in all)
                                id.AddClaim(new Claim("perm", p));
                        }
                    }
                }
            }
        }

        await _next(context);
    }
}

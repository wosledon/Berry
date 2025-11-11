using Berry.Host.Controllers;
using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Modules.Rbac;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Berry.Host.Controllers;

public sealed class PermissionsController(BerryDbContext db, IPermissionSyncService sync, IPermissionsCacheInvalidator cacheInvalidator) : ApiControllerBase
{
    // 分页 + 搜索：page>=1,size<=200
    [HttpGet]
    [Permission(name: "permissions.view")]
    public async Task<ActionResult<object>> Get([FromQuery] int page = 1, [FromQuery] int size = 20, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        size = size is < 1 or > 200 ? 20 : size;
        var query = db.Permissions.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            query = query.Where(p => p.Name.Contains(search) || (p.Description != null && p.Description.Contains(search)));
        }
        var total = await query.CountAsync(ct);
        var items = await query
            .OrderBy(p => p.Name)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);
        return Ok(new { items, total, page, size });
    }

    // 同步扫描权限到数据库：需要 permissions.manage
    [HttpPost("sync")]
    [Permission("permissions.manage")]
    public async Task<ActionResult<object>> Sync(CancellationToken ct)
    {
        var result = await sync.SyncAsync(ct);
        return Ok(new { result.added, result.updated });
    }

    // 为权限设置描述
    [HttpPut("{name}")]
    [Permission("permissions.manage")]
    public async Task<ActionResult<Permission>> Upsert(string name, [FromBody] Permission input, CancellationToken ct)
    {
        var p = await db.Permissions.FirstOrDefaultAsync(x => x.Name == name, ct);
        if (p == null)
        {
            input.Id = Guid.NewGuid().ToString("N");
            input.Name = name;
            await db.Permissions.AddAsync(input, ct);
            await db.SaveChangesAsync(ct);
            // 新增权限后失效所有使用该权限的用户缓存
            await cacheInvalidator.InvalidateUsersForPermissionAsync(name, ct);
            return Created($"/api/permissions/{name}", input);
        }
        p.Description = input.Description;
        await db.SaveChangesAsync(ct);
        // 更新权限描述后也失效缓存（虽然描述不影响授权，但保持一致性）
        await cacheInvalidator.InvalidateUsersForPermissionAsync(name, ct);
        return Ok(p);
    }
}

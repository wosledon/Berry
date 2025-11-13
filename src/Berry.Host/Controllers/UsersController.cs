using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Shared.Security;
using Berry.Shared.Tenancy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Berry.Modules.Rbac;

namespace Berry.Host.Controllers;

public sealed class UsersController(BerryDbContext db, IPermissionsCacheInvalidator cacheInvalidator, ITenantContextAccessor tenantAccessor) : ApiControllerBase
{
    [HttpGet]
    [Permission("users.view")]
    public async Task<ActionResult<object>> List(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] string? search = null,
        [FromQuery] string? roleId = null,
        [FromQuery] string? hasPermission = null,
        [FromQuery] bool includeDeleted = false,
        CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page; size = size is < 1 or > 200 ? 20 : size;
        var tenantId = tenantAccessor.Context.TenantId;
        var q = includeDeleted
            ? db.Users.AsNoTracking().IgnoreQueryFilters().Where(u => tenantId == null || u.TenantId == tenantId)
            : db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(u => u.Username.Contains(search) || (u.DisplayName != null && u.DisplayName.Contains(search)) || (u.Email != null && u.Email.Contains(search)));
        if (!string.IsNullOrWhiteSpace(roleId))
            q = q.Where(u => db.UserRoles.Any(ur => ur.UserId == u.Id && ur.RoleId == roleId));
        if (!string.IsNullOrWhiteSpace(hasPermission))
        {
            var perm = hasPermission;
            q = q.Where(u => db.UserPermissions.Any(up => up.UserId == u.Id && up.PermissionName == perm)
                             || db.UserRoles.Any(ur => ur.UserId == u.Id && db.RolePermissions.Any(rp => rp.RoleId == ur.RoleId && rp.PermissionName == perm)));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(u => u.Username).Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return Ok(new { items, total, page, size });
    }

    // 用户详情（含角色与有效权限）
    [HttpGet("{id}")]
    [Permission("users.view")]
    public async Task<ActionResult<object>> Detail(string id, CancellationToken ct)
    {
        var user = await db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null) return NotFound();

        var roleIds = await db.UserRoles.AsNoTracking().Where(ur => ur.UserId == id).Select(ur => ur.RoleId).ToListAsync(ct);
        var roles = await db.Roles.AsNoTracking().Where(r => roleIds.Contains(r.Id)).OrderBy(r => r.Name).ToListAsync(ct);

        var directPerms = await db.UserPermissions.AsNoTracking().Where(up => up.UserId == id)
            .Select(up => up.PermissionName).ToListAsync(ct);
        var rolePerms = roleIds.Count == 0 ? new List<string>() : await db.RolePermissions.AsNoTracking()
            .Where(rp => roleIds.Contains(rp.RoleId)).Select(rp => rp.PermissionName).ToListAsync(ct);

        var effectivePerms = directPerms.Concat(rolePerms).Distinct(StringComparer.OrdinalIgnoreCase)
            .OrderBy(p => p).ToList();

        return Ok(new
        {
            user,
            roles,
            directPermissions = directPerms.OrderBy(p => p).ToList(),
            effectivePermissions = effectivePerms
        });
    }

    [HttpPost]
    [Permission("users.manage", Description = "创建用户")]
    public async Task<ActionResult<User>> Create([FromBody] User input, CancellationToken ct)
    {
        // 幂等：用户名唯一
        var exists = await db.Users.AnyAsync(u => u.Username == input.Username, ct);
        if (exists) return Conflict(new { message = "Username already exists" });
        input.Id = Guid.NewGuid().ToString("N");
        await db.Users.AddAsync(input, ct);
        await db.SaveChangesAsync(ct);
        return Created($"/api/users/{input.Id}", input);
    }

    [HttpPut("{id}")]
    [Permission("users.manage")]
    public async Task<ActionResult<User>> Update(string id, [FromBody] User input, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null) return NotFound();
        user.Username = input.Username; user.DisplayName = input.DisplayName; user.Email = input.Email;
        // 允许管理员修改用户所属租户
        if (!string.IsNullOrWhiteSpace(input.TenantId) && !string.Equals(user.TenantId, input.TenantId, StringComparison.Ordinal))
            user.TenantId = input.TenantId;
        await db.SaveChangesAsync(ct);
        return Ok(user);
    }

    [HttpDelete("{id}")]
    [Permission("users.manage")]
    public async Task<ActionResult<object>> Delete(string id, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null) return NotFound();
        user.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return Ok(new { affected = 1 });
    }

    // 为用户直接授予权限
    [HttpPost("{id}/permissions")]
    [Permission("users.manage")]
    public async Task<ActionResult<object>> GrantPermissions(string id, [FromBody] IEnumerable<string> permissions, CancellationToken ct)
    {
        var names = permissions.Where(p => !string.IsNullOrWhiteSpace(p)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (names.Count == 0) return Ok(new { added = 0 });
        var existing = await db.UserPermissions.Where(up => up.UserId == id).Select(up => up.PermissionName).ToListAsync(ct);
        var toAdd = names.Except(existing, StringComparer.OrdinalIgnoreCase).ToList();
        foreach (var p in toAdd)
        {
            await db.UserPermissions.AddAsync(new UserPermission { Id = Guid.NewGuid().ToString("N"), UserId = id, PermissionName = p }, ct);
        }
    if (toAdd.Count > 0) await db.SaveChangesAsync(ct);
    await cacheInvalidator.InvalidateUserAsync(id, ct);
        return Ok(new { added = toAdd.Count });
    }

    // 为用户移除直接权限
    [HttpDelete("{id}/permissions")]
    [Permission("users.manage")]
    public async Task<ActionResult<object>> RevokePermissions(string id, [FromBody] IEnumerable<string> permissions, CancellationToken ct)
    {
        var names = permissions.Where(p => !string.IsNullOrWhiteSpace(p)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (names.Count == 0) return Ok(new { affected = 0 });
        var toRemove = await db.UserPermissions.Where(up => up.UserId == id && names.Contains(up.PermissionName)).ToListAsync(ct);
        foreach (var up in toRemove) up.IsDeleted = true;
    if (toRemove.Count > 0) await db.SaveChangesAsync(ct);
    await cacheInvalidator.InvalidateUserAsync(id, ct);
        return Ok(new { affected = toRemove.Count });
    }

    // 为用户绑定角色
    [HttpPost("{id}/roles")]
    [Permission("users.manage")]
    public async Task<ActionResult<object>> BindRoles(string id, [FromBody] IEnumerable<string> roleIds, CancellationToken ct)
    {
        var ids = roleIds.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToList();
        if (ids.Count == 0) return Ok(new { added = 0, reactivated = 0 });

        // 查找所有已存在（包含软删除）的关系，避免唯一键冲突
        var existingAll = await db.UserRoles
            .IgnoreQueryFilters()
            .Where(ur => ur.UserId == id && ids.Contains(ur.RoleId))
            .ToListAsync(ct);

        // 恢复软删除的关系
        var toReactivate = existingAll.Where(ur => ur.IsDeleted).ToList();
        foreach (var ur in toReactivate) ur.IsDeleted = false;

        // 仅为完全不存在的关系新增记录
        var existingIds = existingAll.Select(ur => ur.RoleId).ToHashSet();
        var toAddIds = ids.Where(rid => !existingIds.Contains(rid)).ToList();
        foreach (var rid in toAddIds)
        {
            await db.UserRoles.AddAsync(new UserRole { Id = Guid.NewGuid().ToString("N"), UserId = id, RoleId = rid }, ct);
        }

        var affected = toReactivate.Count + toAddIds.Count;
        if (affected > 0) await db.SaveChangesAsync(ct);
        await cacheInvalidator.InvalidateUserAsync(id, ct);
        return Ok(new { added = toAddIds.Count, reactivated = toReactivate.Count });
    }

    // 为用户解绑角色
    [HttpDelete("{id}/roles")]
    [Permission("users.manage")]
    public async Task<ActionResult<object>> UnbindRoles(string id, [FromBody] IEnumerable<string> roleIds, CancellationToken ct)
    {
        var ids = roleIds.Where(r => !string.IsNullOrWhiteSpace(r)).Distinct().ToList();
        if (ids.Count == 0) return Ok(new { affected = 0 });
        var toRemove = await db.UserRoles.Where(ur => ur.UserId == id && ids.Contains(ur.RoleId)).ToListAsync(ct);
        foreach (var ur in toRemove) ur.IsDeleted = true;
    if (toRemove.Count > 0) await db.SaveChangesAsync(ct);
    await cacheInvalidator.InvalidateUserAsync(id, ct);
        return Ok(new { affected = toRemove.Count });
    }

    // 重置密码（置空哈希）
    [HttpPost("{id}")]
    [Permission("users.manage")]
    public async Task<ActionResult<object>> ResetPassword(string id, CancellationToken ct)
    {
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null) return NotFound();
        user.PasswordHash = null;
        await db.SaveChangesAsync(ct);
        await cacheInvalidator.InvalidateUserAsync(id, ct);
        return Ok(new { affected = 1 });
    }

    public sealed record SetPasswordRequest(string Password);
    [HttpPost("{id}")]
    [Permission("users.manage")]
    public async Task<ActionResult<object>> SetPassword(string id, [FromBody] SetPasswordRequest input, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.Password) || input.Password.Length < 6)
            return BadRequest(new { message = "Password too short" });
        var user = await db.Users.FirstOrDefaultAsync(u => u.Id == id, ct);
        if (user == null) return NotFound();
        user.PasswordHash = PasswordHasher.Hash(input.Password);
        await db.SaveChangesAsync(ct);
        await cacheInvalidator.InvalidateUserAsync(id, ct);
        return Ok(new { affected = 1 });
    }
}

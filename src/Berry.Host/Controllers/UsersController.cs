using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Berry.Modules.Rbac;

namespace Berry.Host.Controllers;

public sealed class UsersController(BerryDbContext db, IPermissionsCacheInvalidator cacheInvalidator) : ApiControllerBase
{
    [HttpGet]
    [Permission("users.view")]
    public async Task<ActionResult<object>> List([FromQuery] int page = 1, [FromQuery] int size = 20, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page; size = size is < 1 or > 200 ? 20 : size;
        var q = db.Users.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(u => u.Username.Contains(search) || (u.DisplayName != null && u.DisplayName.Contains(search)) || (u.Email != null && u.Email.Contains(search)));
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
    [Permission("users.manage")]
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
        if (ids.Count == 0) return Ok(new { added = 0 });
        var existing = await db.UserRoles.Where(ur => ur.UserId == id).Select(ur => ur.RoleId).ToListAsync(ct);
        var toAdd = ids.Except(existing).ToList();
        foreach (var rid in toAdd)
        {
            await db.UserRoles.AddAsync(new UserRole { Id = Guid.NewGuid().ToString("N"), UserId = id, RoleId = rid }, ct);
        }
    if (toAdd.Count > 0) await db.SaveChangesAsync(ct);
    await cacheInvalidator.InvalidateUserAsync(id, ct);
        return Ok(new { added = toAdd.Count });
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
}

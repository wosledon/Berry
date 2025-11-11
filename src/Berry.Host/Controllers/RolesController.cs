using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Berry.Modules.Rbac;

namespace Berry.Host.Controllers;

public sealed class RolesController(BerryDbContext db, IPermissionsCacheInvalidator cacheInvalidator) : ApiControllerBase
{
    // 列出角色
    [HttpGet]
    [Permission("roles.view")]
    public async Task<ActionResult<object>> List([FromQuery] int page = 1, [FromQuery] int size = 20, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page; size = size is < 1 or > 200 ? 20 : size;
        var q = db.Roles.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search)) q = q.Where(r => r.Name.Contains(search) || (r.Description != null && r.Description.Contains(search)));
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(r => r.Name).Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return Ok(new { items, total, page, size });
    }

    // 角色详情（含权限列表）
    [HttpGet("{id}")]
    [Permission("roles.view")]
    public async Task<ActionResult<object>> Detail(string id, CancellationToken ct)
    {
        var role = await db.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role == null) return NotFound();
        var perms = await db.RolePermissions.AsNoTracking().Where(rp => rp.RoleId == id)
            .Select(rp => rp.PermissionName).OrderBy(n => n).ToListAsync(ct);
        return Ok(new { role, permissions = perms });
    }

    // 创建角色
    [HttpPost]
    [Permission("roles.manage")]
    public async Task<ActionResult<Role>> Create([FromBody] Role input, CancellationToken ct)
    {
        // 幂等：角色名唯一
        var exists = await db.Roles.AnyAsync(r => r.Name == input.Name, ct);
        if (exists) return Conflict(new { message = "Role name already exists" });
        input.Id = Guid.NewGuid().ToString("N");
        await db.Roles.AddAsync(input, ct);
        await db.SaveChangesAsync(ct);
        return Created($"/api/roles/{input.Id}", input);
    }

    // 更新角色
    [HttpPut("{id}")]
    [Permission("roles.manage")]
    public async Task<ActionResult<Role>> Update(string id, [FromBody] Role input, CancellationToken ct)
    {
        var role = await db.Roles.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role == null) return NotFound();
        role.Name = input.Name; role.Description = input.Description;
        await db.SaveChangesAsync(ct);
        return Ok(role);
    }

    // 软删除角色
    [HttpDelete("{id}")]
    [Permission("roles.manage")]
    public async Task<ActionResult<object>> Delete(string id, CancellationToken ct)
    {
        var role = await db.Roles.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role == null) return NotFound();
        role.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return Ok(new { affected = 1 });
    }

    // 绑定权限到角色
    [HttpPost("{id}/permissions")]
    [Permission("roles.manage")]
    public async Task<ActionResult<object>> BindPermissions(string id, [FromBody] IEnumerable<string> permissions, CancellationToken ct)
    {
        var role = await db.Roles.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role == null) return NotFound();
        var names = permissions.Where(p => !string.IsNullOrWhiteSpace(p)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (names.Count == 0) return Ok(new { affected = 0 });
        var existing = await db.RolePermissions.Where(rp => rp.RoleId == id).Select(rp => rp.PermissionName).ToListAsync(ct);
        var toAdd = names.Except(existing, StringComparer.OrdinalIgnoreCase).ToList();
        foreach (var p in toAdd)
        {
            await db.RolePermissions.AddAsync(new RolePermission { Id = Guid.NewGuid().ToString("N"), RoleId = id, PermissionName = p }, ct);
        }
    if (toAdd.Count > 0) await db.SaveChangesAsync(ct);
    await cacheInvalidator.InvalidateUsersForRoleAsync(id, ct);
        return Ok(new { added = toAdd.Count });
    }

    // 移除角色上的权限
    [HttpDelete("{id}/permissions")]
    [Permission("roles.manage")]
    public async Task<ActionResult<object>> UnbindPermissions(string id, [FromBody] IEnumerable<string> permissions, CancellationToken ct)
    {
        var names = permissions.Where(p => !string.IsNullOrWhiteSpace(p)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        if (names.Count == 0) return Ok(new { affected = 0 });
        var toRemove = await db.RolePermissions.Where(rp => rp.RoleId == id && names.Contains(rp.PermissionName)).ToListAsync(ct);
        foreach (var rp in toRemove) rp.IsDeleted = true; // 软删除
    if (toRemove.Count > 0) await db.SaveChangesAsync(ct);
    await cacheInvalidator.InvalidateUsersForRoleAsync(id, ct);
        return Ok(new { affected = toRemove.Count });
    }
}

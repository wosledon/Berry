using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Modules.Rbac;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Berry.Host.Controllers;

public sealed class MenusController(BerryDbContext db) : ApiControllerBase
{
    // 分页查询菜单
    [HttpGet]
    [Permission("menus.view")]
    public async Task<ActionResult<object>> List([FromQuery] int page = 1, [FromQuery] int size = 20, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page; size = size is < 1 or > 200 ? 20 : size;
        var q = db.Menus.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(search))
        {
            q = q.Where(m => m.Name.Contains(search) || (m.Path != null && m.Path.Contains(search)) || (m.Permission != null && m.Permission.Contains(search)));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(m => m.Order).ThenBy(m => m.Name).Skip((page - 1) * size).Take(size).ToListAsync(ct);
        return Ok(new { items, total, page, size });
    }

    // 创建菜单
    [HttpPost]
    [Permission("menus.manage")]
    public async Task<ActionResult<Menu>> Create([FromBody] Menu input, CancellationToken ct)
    {
        input.Id = Guid.NewGuid().ToString("N");
        await db.Menus.AddAsync(input, ct);
        await db.SaveChangesAsync(ct);
        return Created($"/api/menus/{input.Id}", input);
    }

    // 更新菜单
    [HttpPut("{id}")]
    [Permission("menus.manage")]
    public async Task<ActionResult<Menu>> Update(string id, [FromBody] Menu input, CancellationToken ct)
    {
        var entity = await db.Menus.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (entity == null) return NotFound();
        entity.Name = input.Name;
        entity.Path = input.Path;
        entity.Icon = input.Icon;
        entity.Order = input.Order;
        entity.Permission = input.Permission;
        entity.ParentId = input.ParentId;
        await db.SaveChangesAsync(ct);
        return Ok(entity);
    }

    // 删除菜单（软删除）
    [HttpDelete("{id}")]
    [Permission("menus.manage")]
    public async Task<ActionResult<object>> Delete(string id, CancellationToken ct)
    {
        var entity = await db.Menus.FirstOrDefaultAsync(m => m.Id == id, ct);
        if (entity == null) return NotFound();
        entity.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return Ok(new { affected = 1 });
    }
}

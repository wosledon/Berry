using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Modules.Rbac;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Berry.Host.Controllers;

/// <summary>
/// 菜单管理接口。
/// 路由模板采用 api/[controller]/[action]，因此例如导入接口为 POST /api/Menus/Import。
/// 权限点：
/// - menus.view：查询/分页
/// - menus.manage：增删改/导入
/// </summary>
public sealed class MenusController(BerryDbContext db) : ApiControllerBase
{
    /// <summary>
    /// 分页查询菜单（按 order 升序，其次按 name 升序）。
    /// 支持 name/path/permission 模糊搜索。
    /// </summary>
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

    /// <summary>
    /// 创建菜单。由服务端生成主键 Id。
    /// </summary>
    [HttpPost]
    [Permission("menus.manage")]
    public async Task<ActionResult<Menu>> Create([FromBody] Menu input, CancellationToken ct)
    {
        input.Id = Guid.NewGuid().ToString("N");
        await db.Menus.AddAsync(input, ct);
        await db.SaveChangesAsync(ct);
        return Created($"/api/menus/{input.Id}", input);
    }

    /// <summary>
    /// 更新菜单。
    /// </summary>
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

    /// <summary>
    /// 删除菜单（软删除）。
    /// </summary>
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

    /// <summary>
    /// 从静态路由上报/同步菜单（幂等：按 Path 匹配）。
    /// 第一轮按 Path Upsert 基本信息（Name/Icon/Order/Permission）；
    /// 第二轮设置 ParentId：优先使用客户端传入的 ParentPath；若未提供，基于自身 Path 推断父级路径（如 /a/b/c -> /a/b）。
    /// </summary>
    public sealed record ReportMenuItem(string Name, string Path, string? Icon, int? Order, string? Permission, string? ParentPath);

    [HttpPost]
    [Permission("menus.manage")]
    public async Task<ActionResult<object>> Import([FromBody] IEnumerable<ReportMenuItem> items, CancellationToken ct)
    {
        var list = items?.ToList() ?? [];
        if (list.Count == 0) return Ok(new { added = 0, updated = 0 });

        // 预加载当前租户下所有菜单
        var existing = await db.Menus.ToListAsync(ct);
        var mapByPath = existing.ToDictionary(m => m.Path ?? string.Empty, StringComparer.OrdinalIgnoreCase);
        var added = 0; var updated = 0;

        // 第一轮：按 Path upsert（不处理 ParentId）
        foreach (var it in list)
        {
            if (string.IsNullOrWhiteSpace(it.Path) || string.IsNullOrWhiteSpace(it.Name)) continue;
            if (!mapByPath.TryGetValue(it.Path, out var entity))
            {
                entity = new Menu
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Name = it.Name,
                    Path = it.Path,
                    Icon = it.Icon,
                    Order = it.Order ?? 0,
                    Permission = it.Permission,
                };
                await db.Menus.AddAsync(entity, ct);
                mapByPath[it.Path] = entity;
                added++;
            }
            else
            {
                bool changed = false;
                if (entity.Name != it.Name) { entity.Name = it.Name; changed = true; }
                if (entity.Icon != it.Icon) { entity.Icon = it.Icon; changed = true; }
                var ord = it.Order ?? 0; if (entity.Order != ord) { entity.Order = ord; changed = true; }
                if (entity.Permission != it.Permission) { entity.Permission = it.Permission; changed = true; }
                if (changed) { db.Menus.Update(entity); updated++; }
            }
        }
        if (added + updated > 0) await db.SaveChangesAsync(ct);

        // 第二轮：处理 ParentId（根据 ParentPath 查找；若未提供则按路径推断上级 /a/b/c -> /a/b）
        string? GetGuessedParentPath(string path)
        {
            if (string.IsNullOrWhiteSpace(path)) return null;
            var idx = path.LastIndexOf('/')
                ;
            if (idx <= 0) return null; // 根级或无父级
            var guess = path[..idx];
            // 规范化：空则返回 null
            return string.IsNullOrWhiteSpace(guess) ? null : guess;
        }

        foreach (var it in list)
        {
            if (string.IsNullOrWhiteSpace(it.Path)) continue;
            if (!mapByPath.TryGetValue(it.Path, out var entity)) continue;

            string? desiredParentPath = it.ParentPath;
            if (string.IsNullOrWhiteSpace(desiredParentPath))
            {
                desiredParentPath = GetGuessedParentPath(it.Path);
            }

            string? parentId = null;
            if (!string.IsNullOrWhiteSpace(desiredParentPath) && mapByPath.TryGetValue(desiredParentPath!, out var parent))
            {
                parentId = parent.Id;
            }

            if (entity.ParentId != parentId)
            {
                entity.ParentId = parentId;
            }
        }
        await db.SaveChangesAsync(ct);

        return Ok(new { added, updated });
    }
}

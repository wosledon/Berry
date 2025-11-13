using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Modules.Rbac;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Berry.Host.Controllers;

public sealed class TenantsController(BerryDbContext db) : ApiControllerBase
{
    public sealed record TenantDto(string TenantId, string? Name, string? Description, bool IsDisabled, bool IsDeleted, DateTime CreatedAt);

    private static TenantDto Map(SystemTenant t) => new(t.Id, t.Name, t.Description, t.IsDisabled, t.IsDeleted, t.CreatedAt);

    [HttpGet]
    [Permission("tenants.view")]
    public async Task<ActionResult<object>> List([FromQuery] int page = 1, [FromQuery] int size = 20, [FromQuery] string? search = null, CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page; size = size is < 1 or > 200 ? 20 : size;
        var q = db.SystemTenants.AsNoTracking().Where(t => !t.IsDeleted);
        if (!string.IsNullOrWhiteSpace(search))
        {
            q = q.Where(t => t.Id.Contains(search) || (t.Name != null && t.Name.Contains(search)));
        }
        var total = await q.CountAsync(ct);
        var items = await q.OrderBy(t => t.Id).Skip((page - 1) * size).Take(size).Select(t => Map(t)).ToListAsync(ct);
        return Ok(new { items, total, page, size });
    }

    public sealed record CreateTenantRequest(string TenantId, string? Name, string? Description, bool IsDisabled);

    [HttpPost]
    [Permission("tenants.manage")]
    public async Task<ActionResult<TenantDto>> Create([FromBody] CreateTenantRequest input, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.TenantId)) return BadRequest(new { message = "TenantId is required" });
        var exists = await db.SystemTenants.AnyAsync(t => t.Id == input.TenantId, ct);
        if (exists) return Conflict(new { message = "Tenant already exists" });
        var entity = new SystemTenant
        {
            Id = input.TenantId,
            Name = input.Name,
            Description = input.Description,
            IsDisabled = input.IsDisabled,
            IsDeleted = false,
            CreatedAt = DateTime.UtcNow
        };
        await db.SystemTenants.AddAsync(entity, ct);
        await db.SaveChangesAsync(ct);
        return Created($"/api/tenants/{entity.Id}", Map(entity));
    }

    public sealed record UpdateTenantRequest(string? Name, string? Description, bool? IsDisabled, bool? IsDeleted);

    [HttpPut("{id}")]
    [Permission("tenants.manage")]
    public async Task<ActionResult<TenantDto>> Update(string id, [FromBody] UpdateTenantRequest input, CancellationToken ct)
    {
        var entity = await db.SystemTenants.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (entity == null) return NotFound();
        if (input.Name != null) entity.Name = input.Name;
        if (input.Description != null) entity.Description = input.Description;
        if (input.IsDisabled.HasValue) entity.IsDisabled = input.IsDisabled.Value;
        if (input.IsDeleted.HasValue) entity.IsDeleted = input.IsDeleted.Value;
        await db.SaveChangesAsync(ct);
        return Ok(Map(entity));
    }

    [HttpDelete("{id}")]
    [Permission("tenants.manage")]
    public async Task<ActionResult<object>> Delete(string id, CancellationToken ct)
    {
        var entity = await db.SystemTenants.FirstOrDefaultAsync(t => t.Id == id, ct);
        if (entity == null) return NotFound();
        entity.IsDeleted = true;
        await db.SaveChangesAsync(ct);
        return Ok(new { affected = 1 });
    }
}

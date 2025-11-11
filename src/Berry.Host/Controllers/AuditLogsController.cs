using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Berry.Host.Controllers;

public sealed class AuditLogsController(BerryDbContext db) : ApiControllerBase
{
    [HttpGet]
    [Permission("audit.view")]
    public async Task<ActionResult<object>> Get(
        [FromQuery] int page = 1,
        [FromQuery] int size = 20,
        [FromQuery] DateTime? from = null,
        [FromQuery] DateTime? to = null,
        [FromQuery] int? status = null,
        [FromQuery] string? tenant = null,
        [FromQuery] string? method = null,
        [FromQuery] string? pathContains = null,
        CancellationToken ct = default)
    {
        page = page < 1 ? 1 : page;
        size = size is < 1 or > 200 ? 20 : size;

        var q = db.AuditLogs.AsNoTracking();
        if (from.HasValue) q = q.Where(a => a.CreatedAt >= from.Value);
        if (to.HasValue) q = q.Where(a => a.CreatedAt <= to.Value);
        if (status.HasValue) q = q.Where(a => a.StatusCode == status.Value);
        if (!string.IsNullOrWhiteSpace(tenant)) q = q.Where(a => a.TenantId == tenant);
        if (!string.IsNullOrWhiteSpace(method)) q = q.Where(a => a.Method == method);
        if (!string.IsNullOrWhiteSpace(pathContains)) q = q.Where(a => a.Path.Contains(pathContains));

        var total = await q.CountAsync(ct);
        var items = await q.OrderByDescending(a => a.CreatedAt)
            .Skip((page - 1) * size)
            .Take(size)
            .ToListAsync(ct);
        return Ok(new { items, total, page, size });
    }

    // 批量软删除指定时间之前的日志，保留最近 keepDays 天
    [HttpDelete("retention")]
    [Permission("audit.manage")]
    public async Task<ActionResult<object>> Retention([FromQuery] int keepDays = 30, CancellationToken ct = default)
    {
        keepDays = keepDays < 1 ? 30 : keepDays;
        var threshold = DateTime.UtcNow.AddDays(-keepDays);
        var toDelete = await db.AuditLogs.Where(a => a.CreatedAt < threshold && !a.IsDeleted).ToListAsync(ct);
        foreach (var log in toDelete) log.IsDeleted = true; // 软删除标记
        if (toDelete.Count > 0) await db.SaveChangesAsync(ct);
        return Ok(new { affected = toDelete.Count, keepDays });
    }

    // 按 ID 列表软删除
    [HttpDelete]
    [Permission("audit.manage")]
    public async Task<ActionResult<object>> BulkDelete([FromBody] IEnumerable<string> ids, CancellationToken ct = default)
    {
        var list = ids.Where(id => !string.IsNullOrWhiteSpace(id)).Distinct().ToList();
        if (list.Count == 0) return Ok(new { affected = 0 });
        var logs = await db.AuditLogs.Where(a => list.Contains(a.Id) && !a.IsDeleted).ToListAsync(ct);
        foreach (var log in logs) log.IsDeleted = true;
        if (logs.Count > 0) await db.SaveChangesAsync(ct);
        return Ok(new { affected = logs.Count });
    }

    // 物理删除：按时间阈值 (不可逆)，需拥有 audit.purge
    [HttpDelete("purge")]
    [Permission("audit.purge")]
    public async Task<ActionResult<object>> Purge([FromQuery] DateTime? before = null, CancellationToken ct = default)
    {
        var threshold = before ?? DateTime.UtcNow.AddDays(-90);
        var affected = await db.AuditLogs.IgnoreQueryFilters()
            .Where(a => a.CreatedAt < threshold)
            .ExecuteDeleteAsync(ct);
        return Ok(new { affected, before = threshold });
    }

    // 物理删除：按 ID 列表 (不可逆)
    [HttpPost("purge")] // body: ["id1","id2",...]
    [Permission("audit.purge")]
    public async Task<ActionResult<object>> PurgeByIds([FromBody] IEnumerable<string> ids, CancellationToken ct = default)
    {
        var list = ids.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct().ToList();
        if (list.Count == 0) return Ok(new { affected = 0 });
        var affected = await db.AuditLogs.IgnoreQueryFilters().Where(a => list.Contains(a.Id)).ExecuteDeleteAsync(ct);
        return Ok(new { affected });
    }
}

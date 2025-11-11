using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Shared.Security;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Berry.Host;

/// <summary>
/// 启动后进行一次种子：如无任何用户则创建管理员账号与 admin 角色并授予全部权限。
/// 仅开发场景使用，生产应改为迁移或显式脚本。
/// </summary>
internal sealed class StartupSeedHostedService : IHostedService
{
    private readonly IServiceProvider _sp;
    private readonly IConfiguration _cfg;
    private readonly ILogger<StartupSeedHostedService> _logger;
    public StartupSeedHostedService(IServiceProvider sp, IConfiguration cfg, ILogger<StartupSeedHostedService> logger)
    { _sp = sp; _cfg = cfg; _logger = logger; }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BerryDbContext>();
        // 如果已有用户则跳过
        var anyUser = await db.Users.IgnoreQueryFilters().AnyAsync(cancellationToken);
        if (anyUser)
        {
            _logger.LogInformation("Startup seed skipped: users already exist.");
            return;
        }

        var tenantId = _cfg["Seed:TenantId"] ?? "public";
        var adminUser = _cfg["Seed:AdminUser"] ?? "admin";
        var adminPassword = _cfg["Seed:AdminPassword"] ?? "ChangeMe123!";

        var user = new User
        {
            Id = Guid.NewGuid().ToString("N"),
            Username = adminUser,
            DisplayName = "Administrator",
            TenantId = tenantId,
            PasswordHash = PasswordHasher.Hash(adminPassword)
        };
        await db.Users.AddAsync(user, cancellationToken);

        // 创建 admin 角色
        var role = new Role
        {
            Id = Guid.NewGuid().ToString("N"),
            Name = "admin",
            Description = "System Administrator",
            TenantId = tenantId
        };
        await db.Roles.AddAsync(role, cancellationToken);

        // 绑定用户角色
        await db.UserRoles.AddAsync(new UserRole
        {
            Id = Guid.NewGuid().ToString("N"),
            UserId = user.Id,
            RoleId = role.Id,
            TenantId = tenantId
        }, cancellationToken);

        // 授予角色全部权限（假设权限同步已完成）
        var perms = await db.Permissions.AsNoTracking().Select(p => p.Name).ToListAsync(cancellationToken);
        foreach (var p in perms)
        {
            await db.RolePermissions.AddAsync(new RolePermission
            {
                Id = Guid.NewGuid().ToString("N"),
                RoleId = role.Id,
                PermissionName = p,
                TenantId = tenantId
            }, cancellationToken);
        }

        await db.SaveChangesAsync(cancellationToken);
        _logger.LogInformation("Startup seed completed: admin user '{AdminUser}' created with {PermCount} permissions in tenant '{TenantId}'.", adminUser, perms.Count, tenantId);
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

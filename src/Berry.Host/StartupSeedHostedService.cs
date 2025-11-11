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
    private readonly IHostEnvironment _env;
    public StartupSeedHostedService(IServiceProvider sp, IConfiguration cfg, ILogger<StartupSeedHostedService> logger, IHostEnvironment env)
    { _sp = sp; _cfg = cfg; _logger = logger; _env = env; }

    public async Task StartAsync(CancellationToken cancellationToken)
    {
        using var scope = _sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<BerryDbContext>();
        var tenantId = _cfg["Seed:TenantId"] ?? "public";
        var adminUser = _cfg["Seed:AdminUser"] ?? "admin";
        var adminPassword = _cfg["Seed:AdminPassword"] ?? "ChangeMe123!";

        // 是否已有任一用户
        var anyUser = await db.Users.IgnoreQueryFilters().AnyAsync(cancellationToken);
        if (!anyUser)
        {
            // 完整种子
            var user = new User
            {
                Id = Guid.NewGuid().ToString("N"),
                Username = adminUser,
                DisplayName = "Administrator",
                TenantId = tenantId,
                PasswordHash = PasswordHasher.Hash(adminPassword)
            };
            await db.Users.AddAsync(user, cancellationToken);

            var role = new Role
            {
                Id = Guid.NewGuid().ToString("N"),
                Name = "admin",
                Description = "System Administrator",
                TenantId = tenantId
            };
            await db.Roles.AddAsync(role, cancellationToken);

            await db.UserRoles.AddAsync(new UserRole
            {
                Id = Guid.NewGuid().ToString("N"),
                UserId = user.Id,
                RoleId = role.Id,
                TenantId = tenantId
            }, cancellationToken);

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
            return;
        }

        // 已存在用户：开发环境进行最小化修复/确保 admin 可用
        if (_env.IsDevelopment())
        {
            var user = await db.Users.IgnoreQueryFilters().FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Username == adminUser, cancellationToken);
            if (user == null)
            {
                user = new User
                {
                    Id = Guid.NewGuid().ToString("N"),
                    Username = adminUser,
                    DisplayName = "Administrator",
                    TenantId = tenantId,
                    PasswordHash = PasswordHasher.Hash(adminPassword)
                };
                await db.Users.AddAsync(user, cancellationToken);
            }
            else
            {
                bool changed = false;
                if (string.IsNullOrEmpty(user.PasswordHash)) { user.PasswordHash = PasswordHasher.Hash(adminPassword); changed = true; }
                if (user.IsDeleted) { user.IsDeleted = false; changed = true; }
                if (user.IsDisabled) { user.IsDisabled = false; changed = true; }
                if (changed) db.Users.Update(user);
            }

            var role = await db.Roles.IgnoreQueryFilters().FirstOrDefaultAsync(r => r.TenantId == tenantId && r.Name == "admin", cancellationToken);
            if (role == null)
            {
                role = new Role { Id = Guid.NewGuid().ToString("N"), Name = "admin", Description = "System Administrator", TenantId = tenantId };
                await db.Roles.AddAsync(role, cancellationToken);
            }

            var hasUserRole = await db.UserRoles.IgnoreQueryFilters().AnyAsync(ur => ur.UserId == user.Id && ur.RoleId == role.Id, cancellationToken);
            if (!hasUserRole)
            {
                await db.UserRoles.AddAsync(new UserRole { Id = Guid.NewGuid().ToString("N"), UserId = user.Id, RoleId = role.Id, TenantId = tenantId }, cancellationToken);
            }

            // 确保角色具备所有权限（缺失的补齐）
            var allPerms = await db.Permissions.AsNoTracking().Select(p => p.Name).ToListAsync(cancellationToken);
            var existingPerms = await db.RolePermissions.AsNoTracking().Where(rp => rp.RoleId == role.Id).Select(rp => rp.PermissionName).ToListAsync(cancellationToken);
            foreach (var p in allPerms.Except(existingPerms))
            {
                await db.RolePermissions.AddAsync(new RolePermission { Id = Guid.NewGuid().ToString("N"), RoleId = role.Id, PermissionName = p, TenantId = tenantId }, cancellationToken);
            }

            await db.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Startup dev ensure-admin completed for tenant '{TenantId}'.", tenantId);
        }
        else
        {
            _logger.LogInformation("Startup seed skipped: users already exist.");
        }
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

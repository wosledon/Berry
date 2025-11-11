using Berry.Shared.Modules;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Berry.Modules.Rbac;

internal sealed class PermissionScanHostedService(ILogger<PermissionScanHostedService> logger, IWebHostEnvironment env, IPermissionSyncService sync) : IHostedService
{
    public async Task StartAsync(CancellationToken cancellationToken)
    {
        var (added, updated) = await sync.SyncAsync(cancellationToken);
        logger.LogInformation("Permission sync completed: Added={Added}, Updated={Updated} in {Env}.", added, updated, env.EnvironmentName);
        // 输出每个权限（调试）
        // (同步服务中未列出具体权限，这里可扩展)
        await Task.CompletedTask;
    }

    public Task StopAsync(CancellationToken cancellationToken) => Task.CompletedTask;
}

public sealed class RbacModule : IModule
{
    public string Name => "RBAC";
    public int Order => 30;

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IPermissionSyncService, PermissionSyncService>();
        services.AddScoped<IPermissionsCacheInvalidator, PermissionsCacheInvalidator>();
        services.AddHostedService<PermissionScanHostedService>();
    }

    public void ConfigureApplication(WebApplication app)
    {
        // 注入权限声明中间件（基于用户/角色聚合）
        app.UseMiddleware<PermissionsEnrichmentMiddleware>();
    }
}

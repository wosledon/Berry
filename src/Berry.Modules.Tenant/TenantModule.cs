using Berry.Shared.Modules;
using Berry.Shared.Tenancy;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Berry.Modules.Tenant;

public sealed class TenantModule : IModule
{
    public string Name => "Tenant";
    public int Order => 5; // 早于其他需要租户上下文的模块

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpContextAccessor();
        services.AddSingleton<ITenantContextAccessor, TenantContextAccessor>();
        services.AddSingleton<ITenantResolver, HeaderTenantResolver>();
        services.AddScoped<ICurrentUserAccessor, HttpContextCurrentUserAccessor>();
    }

    public void ConfigureApplication(WebApplication app)
    {
        app.UseMiddleware<TenantMiddleware>();
    }
}

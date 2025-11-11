using Berry.Shared.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Berry.Host;

public static class BerryExtensions
{
    /// <summary>
    /// 添加 Berry 框架模块到服务容器
    /// </summary>
    public static IServiceCollection AddBerry(this IServiceCollection services, IConfiguration configuration, Action<BerryOptions>? configure = null)
    {
        var options = new BerryOptions();
        configure?.Invoke(options);

        // 创建临时日志用于模块发现
        var loggerFactory = LoggerFactory.Create(builder => builder.AddConsole().SetMinimumLevel(LogLevel.Information));
        var logger = loggerFactory.CreateLogger<ModuleManager>();
        
        var manager = new ModuleManager(logger);
        manager.DiscoverModules(options);

        // 注册模块管理器为单例
        services.AddSingleton<IModuleManager>(manager);

        // 执行所有模块的 ConfigureServices
        foreach (var module in manager.Modules)
        {
            module.ConfigureServices(services, configuration);
        }

        // 框架内置控制器与授权
        services.AddControllers(options =>
        {
            options.Filters.Add(typeof(Berry.Host.Authorization.PermissionAuthorizationFilter));
        })
        .AddApplicationPart(typeof(Berry.Host.Controllers.ApiControllerBase).Assembly); // 引入本程序集内置控制器

        services.AddAuthentication(options =>
        {
            options.DefaultAuthenticateScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
            options.DefaultChallengeScheme = Microsoft.AspNetCore.Authentication.JwtBearer.JwtBearerDefaults.AuthenticationScheme;
        }).AddJwtBearer(options =>
        {
            var cfg = configuration.GetSection("Jwt");
            var key = cfg.GetValue<string>("Key") ?? "Dev_Insecure_Key_ChangeMe_123456";
            var issuer = cfg.GetValue<string>("Issuer") ?? "berry.dev";
            var audience = cfg.GetValue<string>("Audience") ?? "berry.clients";
            options.TokenValidationParameters = new Microsoft.IdentityModel.Tokens.TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidateIssuerSigningKey = true,
                ValidateLifetime = true,
                ValidIssuer = issuer,
                ValidAudience = audience,
                IssuerSigningKey = new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(System.Text.Encoding.UTF8.GetBytes(key)),
                ClockSkew = TimeSpan.FromMinutes(2)
            };
        });

        services.AddAuthorization();
        services.AddSingleton<Microsoft.AspNetCore.Authorization.IAuthorizationHandler, Berry.Host.Authorization.PermissionAuthorizationHandler>();

        // 开发场景：注册启动种子
        services.AddHostedService<Berry.Host.StartupSeedHostedService>();

        return services;
    }

    /// <summary>
    /// 显式注册单个模块
    /// </summary>
    public static IServiceCollection AddBerryModule<TModule>(this IServiceCollection services, IConfiguration configuration)
        where TModule : IModule, new()
    {
        var module = new TModule();
        module.ConfigureServices(services, configuration);

        // 如果已有 ModuleManager，注册到其中
        var sp = services.BuildServiceProvider();
        if (sp.GetService<IModuleManager>() is IModuleManager manager)
        {
            manager.RegisterModule(module);
        }

        return services;
    }

    /// <summary>
    /// 应用 Berry 框架模块中间件
    /// </summary>
    public static WebApplication UseBerry(this WebApplication app)
    {
        var manager = app.Services.GetRequiredService<IModuleManager>();

        // 认证与授权
        app.UseAuthentication();
        app.UseAuthorization();

        foreach (var module in manager.Modules)
        {
            module.ConfigureApplication(app);
        }

        // 映射内置及应用控制器
        app.MapControllers();

        return app;
    }
}



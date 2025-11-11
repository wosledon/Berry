using Berry.Shared.Caching;
using Berry.Shared.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using StackExchange.Redis;

namespace Berry.Modules.Caching;

public sealed class CachingModule : IModule
{
    public string Name => "Caching";
    public int Order => 10;

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddMemoryCache();
        services.Configure<CachingOptions>(configuration.GetSection("Caching"));

        var options = new CachingOptions();
        configuration.GetSection("Caching").Bind(options);

        if (string.Equals(options.Provider, "Redis", StringComparison.OrdinalIgnoreCase) && !string.IsNullOrWhiteSpace(options.RedisConnectionString))
        {
            try
            {
                var mux = ConnectionMultiplexer.Connect(options.RedisConnectionString);
                services.AddSingleton<IConnectionMultiplexer>(mux);
                services.AddSingleton<ICacheProvider, RedisCacheProvider>();
            }
            catch
            {
                // 降级到内存
                services.AddSingleton<ICacheProvider, MemoryCacheProvider>();
            }
        }
        else
        {
            services.AddSingleton<ICacheProvider, MemoryCacheProvider>();
        }
    }

    public void ConfigureApplication(WebApplication app)
    {
        // 无需特定中间件
    }
}

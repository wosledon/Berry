using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.AspNetCore.Builder;

namespace Berry.Shared.Modules;

public interface IModule
{
    string Name { get; }
    int Order => 0; // 可用于拓扑排序或显示顺序
    void ConfigureServices(IServiceCollection services, IConfiguration configuration);
    void ConfigureApplication(WebApplication app);
}

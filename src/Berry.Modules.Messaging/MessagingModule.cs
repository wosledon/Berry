using Berry.Shared.Messaging;
using Berry.Shared.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Berry.Modules.Messaging;

public sealed class MessagingModule : IModule
{
    public string Name => "Messaging";
    public int Order => 20;

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        // 初期仅内存总线，后续可根据配置启用 RabbitMQ
        services.AddSingleton<IMessageBus, InMemoryChannelBus>();
    }

    public void ConfigureApplication(WebApplication app)
    {
        // 无专用中间件
    }
}

using Berry.Shared.Modules;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Berry.Sample.Modules;

/// <summary>
/// 示例自定义模块 - 无需 Berry. 前缀,会被自动发现
/// </summary>
public class CustomBusinessModule : IModule
{
    public string Name => "CustomBusiness";
    public int Order => 200; // 在框架模块(Order < 100)之后加载

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        // 注册业务服务
        services.AddScoped<IOrderService, OrderService>();
        services.AddScoped<IPaymentService, PaymentService>();

        Console.WriteLine("[CustomBusinessModule] Services registered.");
    }

    public void ConfigureApplication(WebApplication app)
    {
        // 配置业务路由
        app.MapGet("/api/custom/health", () => Results.Ok(new
        {
            Module = "CustomBusinessModule",
            Status = "Running",
            Message = "此模块由开发者定义,框架自动发现并加载"
        }));

        Console.WriteLine("[CustomBusinessModule] Endpoints configured.");
    }
}

// 示例业务服务
public interface IOrderService
{
    Task<string> CreateOrderAsync(string productId, int quantity);
}

public class OrderService : IOrderService
{
    public Task<string> CreateOrderAsync(string productId, int quantity)
    {
        return Task.FromResult($"Order created: {productId} x {quantity}");
    }
}

public interface IPaymentService
{
    Task<bool> ProcessPaymentAsync(string orderId, decimal amount);
}

public class PaymentService : IPaymentService
{
    public Task<bool> ProcessPaymentAsync(string orderId, decimal amount)
    {
        Console.WriteLine($"Processing payment for order {orderId}: ${amount}");
        return Task.FromResult(true);
    }
}

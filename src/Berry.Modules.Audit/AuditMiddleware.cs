using Berry.Shared.Modules;
using Berry.Infrastructure.Entities;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Berry.Modules.Audit;

public sealed class AuditMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuditMiddleware> _logger;
    private readonly IAuditLogWriter _writer;
    public AuditMiddleware(RequestDelegate next, ILogger<AuditMiddleware> logger, IAuditLogWriter writer)
    { _next = next; _logger = logger; _writer = writer; }

    public async Task InvokeAsync(HttpContext context)
    {
        var sw = System.Diagnostics.Stopwatch.StartNew();
        await _next(context);
        sw.Stop();
        _logger.LogInformation("AUDIT {Method} {Path} {Status} {Elapsed}ms", context.Request.Method, context.Request.Path, context.Response.StatusCode, sw.ElapsedMilliseconds);
        try
        {
            await _writer.WriteAsync(new AuditLog
            {
                Method = context.Request.Method,
                Path = context.Request.Path,
                StatusCode = context.Response.StatusCode,
                ElapsedMs = sw.ElapsedMilliseconds,
                Ip = context.Connection.RemoteIpAddress?.ToString(),
                UserAgent = context.Request.Headers.UserAgent.ToString(),
                UserId = context.User?.Identity?.IsAuthenticated == true ? context.User.Identity!.Name : null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist audit log");
        }
    }
}

public sealed class AuditModule : IModule
{
    public string Name => "Audit";
    public int Order => 40;

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        services.AddScoped<IAuditLogWriter, EfCoreAuditLogWriter>();
    }

    public void ConfigureApplication(WebApplication app)
    {
        app.UseMiddleware<AuditMiddleware>();
    }
}

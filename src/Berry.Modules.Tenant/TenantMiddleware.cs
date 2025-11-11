using Berry.Shared.Tenancy;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Berry.Modules.Tenant;

public sealed class TenantMiddleware
{
    private readonly RequestDelegate _next;
    public TenantMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context, ITenantContextAccessor accessor, ITenantResolver resolver)
    {
        var id = resolver.ResolveTenantId(context);
        accessor.Context = new TenantContext{ TenantId = id };
        await _next(context);
    }
}

public sealed class HeaderTenantResolver : ITenantResolver
{
    public string? ResolveTenantId(HttpContext httpContext)
    {
        // 1. Header
        if (httpContext.Request.Headers.TryGetValue("X-Tenant", out var vals))
            return vals.FirstOrDefault();
        // 2. 子域名：tenant.example.com -> tenant
        var host = httpContext.Request.Host.Host;
        if (!string.IsNullOrWhiteSpace(host) && host.Contains('.'))
        {
            var first = host.Split('.')[0];
            if (!string.IsNullOrWhiteSpace(first) && !first.Equals("www", StringComparison.OrdinalIgnoreCase))
                return first;
        }
        // 3. JWT Claim
        return httpContext.User?.FindFirst("tenant")?.Value;
    }
}

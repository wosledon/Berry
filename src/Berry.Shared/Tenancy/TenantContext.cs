using Microsoft.AspNetCore.Http;

namespace Berry.Shared.Tenancy;

public sealed class TenantContext
{
    public string? TenantId { get; init; }
}

public interface ITenantContextAccessor
{
    TenantContext Context { get; set; }
}

public sealed class TenantContextAccessor : ITenantContextAccessor
{
    public TenantContext Context { get; set; } = new();
}

public interface ITenantResolver
{
    string? ResolveTenantId(HttpContext httpContext);
}

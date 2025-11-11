using Microsoft.AspNetCore.Http;

namespace Berry.Shared.Security;

public interface ICurrentUserAccessor
{
    string? UserId { get; }
}

public sealed class HttpContextCurrentUserAccessor : ICurrentUserAccessor
{
    private readonly IHttpContextAccessor _http;
    public HttpContextCurrentUserAccessor(IHttpContextAccessor http) => _http = http;

    public string? UserId
    {
        get
        {
            var ctx = _http.HttpContext;
            if (ctx?.User?.Identity?.IsAuthenticated != true) return null;
            // 优先 sub / nameidentifier，再退回 Identity.Name
            return ctx.User.FindFirst("sub")?.Value
                   ?? ctx.User.FindFirst("nameidentifier")?.Value
                   ?? ctx.User.Identity!.Name;
        }
    }
}

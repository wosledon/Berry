using Berry.Shared.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Security.Claims;

namespace Berry.Host.Authorization;

/// <summary>
/// 基于 PermissionAttribute/AnyPermissionAttribute 的授权过滤器：
/// - 多个 PermissionAttribute 时，全部满足（AND）
/// - AnyPermissionAttribute 中列出任意一个满足（OR）
/// 二者同时存在时：AND 块 与 OR 块 都需满足（组合策略）。
/// </summary>
internal sealed class PermissionAuthorizationFilter(IAuthorizationService authorization) : IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var action = context.ActionDescriptor;
        var allAttrs = action.EndpointMetadata.OfType<PermissionAttribute>().Select(a => a.Name).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
        var anyAttrs = action.EndpointMetadata.OfType<AnyPermissionAttribute>().SelectMany(a => a.Names).Distinct(StringComparer.OrdinalIgnoreCase).ToList();

        if (allAttrs.Count == 0 && anyAttrs.Count == 0) return; // 未声明权限则放行

        var user = context.HttpContext.User;
        if (user?.Identity?.IsAuthenticated != true)
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        var policyBuilder = new AuthorizationPolicyBuilder();
        if (allAttrs.Count > 0)
            policyBuilder.AddRequirements(new PermissionRequirement(allAttrs, requireAll: true));
        if (anyAttrs.Count > 0)
            policyBuilder.AddRequirements(new PermissionRequirement(anyAttrs, requireAll: false));
        var policy = policyBuilder.Build();

        var result = await authorization.AuthorizeAsync(user, resource: null, policy);
        if (!result.Succeeded)
        {
            context.HttpContext.Response.StatusCode = StatusCodes.Status403Forbidden;
        }
    }
}

using Microsoft.AspNetCore.Authorization;

namespace Berry.Host.Authorization;

public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public PermissionRequirement(IEnumerable<string> permissions, bool requireAll)
    {
        Permissions = permissions.Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        RequireAll = requireAll;
    }

    public IReadOnlyList<string> Permissions { get; }
    public bool RequireAll { get; }
}

public sealed class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        if (requirement.Permissions.Count == 0)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }
        var userPerms = context.User.FindAll("perm").Select(c => c.Value).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var has = requirement.RequireAll
            ? requirement.Permissions.All(p => userPerms.Contains(p))
            : requirement.Permissions.Any(p => userPerms.Contains(p));
        if (has) context.Succeed(requirement);
        return Task.CompletedTask;
    }
}

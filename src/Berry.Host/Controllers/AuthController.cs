using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Berry.Infrastructure;
using Berry.Infrastructure.Entities;
using Berry.Shared.Security;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;

namespace Berry.Host.Controllers;

[ApiController]
[Route("api/[controller]")]
public sealed class AuthController(BerryDbContext db, IConfiguration configuration) : ControllerBase
{
    public sealed record LoginRequest(string Username, string Password, string? TenantId);
    public sealed record LoginResponse(string Token, string UserId, string? TenantId, DateTime ExpiresAt);

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest input, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.Username) || string.IsNullOrWhiteSpace(input.Password))
            return BadRequest(new { message = "Username and password are required" });

        var tenantId = input.TenantId;
        if (string.IsNullOrWhiteSpace(tenantId))
        {
            // 尝试从 Header 取
            if (Request.Headers.TryGetValue("X-Tenant", out var vals)) tenantId = vals.FirstOrDefault();
        }
        if (string.IsNullOrWhiteSpace(tenantId))
        {
            // 再次回退到配置默认租户（开发体验友好）
            tenantId = configuration["Seed:TenantId"] ?? "public";
        }

        var user = await db.Users.AsNoTracking().IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.TenantId == tenantId && u.Username == input.Username, ct);
        if (user == null || user.IsDeleted || user.IsDisabled)
            return Unauthorized(new { message = "Invalid credentials" });

        if (string.IsNullOrEmpty(user.PasswordHash) || !PasswordHasher.Verify(input.Password, user.PasswordHash))
            return Unauthorized(new { message = "Invalid credentials" });

        var cfg = configuration.GetSection("Jwt");
        var key = cfg.GetValue<string>("Key") ?? "Dev_Insecure_Key_ChangeMe_123456";
        var issuer = cfg.GetValue<string>("Issuer") ?? "berry.dev";
        var audience = cfg.GetValue<string>("Audience") ?? "berry.clients";
        var expiresMinutes = cfg.GetValue<int?>("ExpiresMinutes") ?? 120;

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id),
            new(JwtRegisteredClaimNames.UniqueName, user.Username),
            new("tenant", tenantId!)
        };

        var signingKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(key));
        var creds = new SigningCredentials(signingKey, SecurityAlgorithms.HmacSha256);
        var expires = DateTime.UtcNow.AddMinutes(expiresMinutes);

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: expires,
            signingCredentials: creds);
        var tokenStr = new JwtSecurityTokenHandler().WriteToken(token);

        return Ok(new LoginResponse(tokenStr, user.Id, tenantId, expires));
    }

    public sealed record RegisterRequest(string Username, string Password, string TenantId, string? DisplayName, string? Email);
    [HttpPost("register")]
    [AllowAnonymous]
    public async Task<ActionResult<object>> Register([FromBody] RegisterRequest input, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(input.Username) || string.IsNullOrWhiteSpace(input.Password) || string.IsNullOrWhiteSpace(input.TenantId))
            return BadRequest(new { message = "Username, password and tenantId are required" });

        // 校验租户是否被禁用（如存在租户表）
        var tenant = await db.SystemTenants.AsNoTracking().FirstOrDefaultAsync(t => t.Id == input.TenantId && !t.IsDeleted, ct);
        if (tenant != null && tenant.IsDisabled)
            return BadRequest(new { message = "Tenant disabled" });

        var exists = await db.Users.IgnoreQueryFilters().AnyAsync(u => u.TenantId == input.TenantId && u.Username == input.Username, ct);
        if (exists) return Conflict(new { message = "Username already exists" });

        var user = new User
        {
            Id = Guid.NewGuid().ToString("N"),
            Username = input.Username,
            DisplayName = input.DisplayName,
            Email = input.Email,
            PasswordHash = PasswordHasher.Hash(input.Password),
            TenantId = input.TenantId
        };
        await db.Users.AddAsync(user, ct);
        await db.SaveChangesAsync(ct);
        return Created($"/api/users/{user.Id}", new { user.Id, user.Username, user.DisplayName, user.Email, user.TenantId });
    }
}

using Berry.Shared.Modules;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace Berry.Infrastructure;

public sealed class DataModule : IModule
{
    public string Name => "Data";
    public int Order => 3; // 在 Tenant 之后之前均可，这里较早注册

    public void ConfigureServices(IServiceCollection services, IConfiguration configuration)
    {
        var provider = configuration["Database:Provider"] ?? "Sqlite";
        var connStr = configuration.GetConnectionString("Default") ?? "Data Source=App_Data/berry.db";
        if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            // SQLite 文件路径预创建由 ConfigureApplication 处理
            services.AddDbContext<BerryDbContext>(opt => opt.UseSqlite(connStr));
        }
        else if (provider.Equals("Postgres", StringComparison.OrdinalIgnoreCase) || provider.Equals("PostgreSQL", StringComparison.OrdinalIgnoreCase))
        {
            services.AddDbContext<BerryDbContext>(opt => opt.UseNpgsql(connStr));
        }
        else
        {
            throw new InvalidOperationException($"Unsupported database provider: {provider}");
        }
    }

    public void ConfigureApplication(WebApplication app)
    {
        // 确保 SQLite 数据目录存在
        var provider = app.Configuration["Database:Provider"] ?? "Sqlite";
        if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
        {
            var connStr = app.Configuration.GetConnectionString("Default") ?? "Data Source=App_Data/berry.db";
            var dbPath = connStr.Replace("Data Source=", "").Trim();
            var dir = Path.GetDirectoryName(dbPath);
            if (!string.IsNullOrWhiteSpace(dir) && !Path.IsPathRooted(dbPath))
            {
                var fullDir = Path.Combine(app.Environment.ContentRootPath, dir);
                Directory.CreateDirectory(fullDir);
            }
        }

        // 确保数据库创建（无迁移时使用 EnsureCreated，生产环境建议改用迁移）
        using (var scope = app.Services.CreateScope())
        {
            var db = scope.ServiceProvider.GetRequiredService<BerryDbContext>();
            db.Database.EnsureCreated();
        }
    }
}

using Berry.Infrastructure.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;
using Berry.Shared.Tenancy;
using Berry.Shared.Security;

namespace Berry.Infrastructure;

public sealed class BerryDbContext : DbContext
{
    private readonly string? _tenantId;
    private readonly string? _userId;

    public BerryDbContext(
        DbContextOptions<BerryDbContext> options,
        ITenantContextAccessor tenantAccessor,
        ICurrentUserAccessor currentUserAccessor) : base(options)
    {
        _tenantId = tenantAccessor.Context.TenantId;
        _userId = currentUserAccessor.UserId;
    }

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<Permission> Permissions => Set<Permission>();
    public DbSet<Role> Roles => Set<Role>();
    public DbSet<User> Users => Set<User>();
    public DbSet<UserRole> UserRoles => Set<UserRole>();
    public DbSet<RolePermission> RolePermissions => Set<RolePermission>();
    public DbSet<UserPermission> UserPermissions => Set<UserPermission>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 动态遍历所有继承 BaseEntity 的实体，添加软删除与租户过滤
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(BaseEntity).IsAssignableFrom(entityType.ClrType))
            {
                var method = typeof(BerryDbContext).GetMethod(nameof(ConfigureBaseEntity), System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
                method.MakeGenericMethod(entityType.ClrType).Invoke(this, new object[] { modelBuilder });
            }
        }

        // 专属实体配置
        modelBuilder.Entity<AuditLog>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.CreatedAt);
            b.Property(x => x.Method).HasMaxLength(16).IsRequired();
            b.Property(x => x.Path).HasMaxLength(512).IsRequired();
            b.Property(x => x.UserAgent).HasMaxLength(256);
            b.Property(x => x.Ip).HasMaxLength(64);
            b.HasIndex(x => x.Path);
            b.HasIndex(x => new { x.StatusCode, x.CreatedAt });
            b.HasIndex(x => new { x.TenantId, x.CreatedAt });
            b.HasIndex(x => new { x.Method, x.CreatedAt });
        });

        modelBuilder.Entity<Permission>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.Name).IsUnique();
            b.Property(x => x.Name).HasMaxLength(128).IsRequired();
            b.Property(x => x.Description).HasMaxLength(256);
        });

        modelBuilder.Entity<Role>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.Name).IsUnique();
            b.Property(x => x.Name).HasMaxLength(128).IsRequired();
            b.Property(x => x.Description).HasMaxLength(256);
        });

        modelBuilder.Entity<User>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => x.Username).IsUnique();
            b.Property(x => x.Username).HasMaxLength(128).IsRequired();
            b.Property(x => x.DisplayName).HasMaxLength(128);
            b.Property(x => x.Email).HasMaxLength(256);
        });

        modelBuilder.Entity<UserRole>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.RoleId }).IsUnique();
            b.Property(x => x.UserId).HasMaxLength(64).IsRequired();
            b.Property(x => x.RoleId).HasMaxLength(64).IsRequired();
        });

        modelBuilder.Entity<RolePermission>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.RoleId, x.PermissionName }).IsUnique();
            b.Property(x => x.RoleId).HasMaxLength(64).IsRequired();
            b.Property(x => x.PermissionName).HasMaxLength(128).IsRequired();
        });

        modelBuilder.Entity<UserPermission>(b =>
        {
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.UserId, x.PermissionName }).IsUnique();
            b.Property(x => x.UserId).HasMaxLength(64).IsRequired();
            b.Property(x => x.PermissionName).HasMaxLength(128).IsRequired();
        });
    }

    private void ConfigureBaseEntity<T>(ModelBuilder modelBuilder) where T : BaseEntity
    {
        modelBuilder.Entity<T>().HasQueryFilter(e => !e.IsDeleted && (_tenantId == null || e.TenantId == _tenantId));
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyAuditing();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ApplyAuditing();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void ApplyAuditing()
    {
        var utcNow = DateTime.UtcNow;
        foreach (var entry in ChangeTracker.Entries())
        {
            if (entry.Entity is not BaseEntity be) continue;

            switch (entry.State)
            {
                case EntityState.Added:
                    be.CreatedAt = utcNow;
                    if (string.IsNullOrEmpty(be.CreatedBy) && _userId != null)
                        be.CreatedBy = _userId;
                    if (string.IsNullOrEmpty(be.TenantId) && _tenantId != null)
                        be.TenantId = _tenantId;
                    be.UpdatedAt = null; // 新建无更新时间
                    be.UpdatedBy = null;
                    break;
                case EntityState.Modified:
                    be.UpdatedAt = utcNow;
                    if (_userId != null) be.UpdatedBy = _userId;
                    // 防止外部覆盖 CreatedAt/CreatedBy
                    entry.Property(nameof(BaseEntity.CreatedAt)).IsModified = false;
                    entry.Property(nameof(BaseEntity.CreatedBy)).IsModified = false;
                    break;
                case EntityState.Deleted:
                    // 软删除转换
                    entry.State = EntityState.Modified;
                    be.IsDeleted = true;
                    be.UpdatedAt = utcNow;
                    if (_userId != null) be.UpdatedBy = _userId;
                    entry.Property(nameof(BaseEntity.CreatedAt)).IsModified = false;
                    entry.Property(nameof(BaseEntity.CreatedBy)).IsModified = false;
                    break;
            }
        }
    }
}

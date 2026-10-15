using System.Linq.Expressions;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    // DbSet'ler her aşamada ilgili tablolarla birlikte eklenir.

    // ---- Kimlik & sistem (aşama 2) ----
    public DbSet<AdminUser> AdminUsers => Set<AdminUser>();
    public DbSet<Student> Students => Set<Student>();
    public DbSet<StudentGuardian> StudentGuardians => Set<StudentGuardian>();
    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();
    public DbSet<MediaAsset> MediaAssets => Set<MediaAsset>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // Para: her yerde decimal(18,2). Metin enum'lar string olarak saklanır (okunabilir, sıra değişse bozulmaz).
        builder.Properties<decimal>().HavePrecision(18, 2);
        builder.Properties<decimal?>().HavePrecision(18, 2);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Soft delete: DeletedAt dolu olan düzenlenebilir kayıtlar tüm sorgulardan otomatik elenir
        foreach (var entityType in modelBuilder.Model.GetEntityTypes()
                     .Where(t => typeof(BaseEntity).IsAssignableFrom(t.ClrType) && t.BaseType is null))
        {
            var param = Expression.Parameter(entityType.ClrType, "e");
            var deletedAt = Expression.Property(param, nameof(BaseEntity.DeletedAt));
            var body = Expression.Equal(deletedAt, Expression.Constant(null, typeof(DateTime?)));
            entityType.SetQueryFilter(Expression.Lambda(body, param));
        }
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyRules();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ApplyRules();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    private void ApplyRules()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = now;
                    break;

                case EntityState.Modified:
                    entry.Entity.UpdatedAt = now;
                    break;

                case EntityState.Deleted:
                    // Hard delete yok: silme isteğini soft delete'e çevir
                    entry.State = EntityState.Modified;
                    entry.Entity.DeletedAt = now;
                    entry.Entity.IsActive = false;
                    break;
            }
        }

        foreach (var entry in ChangeTracker.Entries<EntryEntity>())
        {
            if (entry.State == EntityState.Added)
                entry.Entity.CreatedAt = now;
            else if (entry.State == EntityState.Deleted)
                // Muhasebe ve denetim kayıtları silinemez: hata ters kayıtla düzeltilir
                throw new InvalidOperationException($"{entry.Metadata.ClrType.Name} kaydı silinemez (append-only).");
        }
    }
}

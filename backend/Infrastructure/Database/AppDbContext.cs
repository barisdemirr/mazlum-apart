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

    // ---- Yapı, dönem & içerik (aşama 3) ----
    public DbSet<RoomType> RoomTypes => Set<RoomType>();
    public DbSet<Apartment> Apartments => Set<Apartment>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<ApartmentMedia> ApartmentMedia => Set<ApartmentMedia>();
    public DbSet<Period> Periods => Set<Period>();
    public DbSet<RoomTypePrice> RoomTypePrices => Set<RoomTypePrice>();
    public DbSet<SiteSetting> SiteSettings => Set<SiteSetting>();
    public DbSet<Slide> Slides => Set<Slide>();
    public DbSet<StaticPage> StaticPages => Set<StaticPage>();
    public DbSet<MessageTemplate> MessageTemplates => Set<MessageTemplate>();

    // ---- Kayıt & muhasebe defteri (aşama 4) ----
    public DbSet<Application> Applications => Set<Application>();
    public DbSet<Enrollment> Enrollments => Set<Enrollment>();
    public DbSet<Placement> Placements => Set<Placement>();
    public DbSet<Charge> Charges => Set<Charge>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<PaymentAllocation> PaymentAllocations => Set<PaymentAllocation>();
    public DbSet<Account> Accounts => Set<Account>();
    public DbSet<AccountTransaction> AccountTransactions => Set<AccountTransaction>();

    protected override void ConfigureConventions(ModelConfigurationBuilder builder)
    {
        // Para: her yerde decimal(18,2). Metin enum'lar string olarak saklanır (okunabilir, sıra değişse bozulmaz).
        builder.Properties<decimal>().HavePrecision(18, 2);
        builder.Properties<decimal?>().HavePrecision(18, 2);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // Başvuru numarası (MA-2026-0001) için sıra: eşzamanlı başvurularda bile tekrar etmez
        modelBuilder.HasSequence<int>(AppSequences.ApplicationNumbers).StartsAt(1);

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

public static class AppSequences
{
    public const string ApplicationNumbers = "ApplicationNumbers";

    /// <summary>Sıradan bir sonraki numarayı alır</summary>
    public static async Task<int> NextAsync(AppDbContext db, string sequence, CancellationToken ct) =>
    (await db.Database.SqlQuery<int>($"SELECT NEXT VALUE FOR [dbo].[{sequence}] AS [Value]").ToListAsync(ct)).Single();
}

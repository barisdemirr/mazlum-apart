using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;

namespace MazlumApart.Infrastructure.Database;

/// <summary>
/// Hiç yönetici yoksa (silinmişler dahil) "Seed" ayarındaki ilk yöneticiyi oluşturur.
/// İlk girişten sonra şifreyi panelden değiştirin; ayardaki şifre bir daha kullanılmaz.
/// </summary>
public static class AdminSeeder
{
    public static async Task SeedAsync(IServiceProvider services, IConfiguration config)
    {
        var email = config["Seed:AdminEmail"]?.Trim().ToLowerInvariant();
        var password = config["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password)) return;
        if (password.Length < 10)
            throw new InvalidOperationException("Seed:AdminPassword en az 10 karakter olmalı.");

        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        // Veritabanı yoksa ya da bekleyen migration varsa sessizce geç (önce "dotnet ef database update")
        if (!await db.Database.CanConnectAsync()) return;
        if ((await db.Database.GetPendingMigrationsAsync()).Any()) return;
        if (await db.AdminUsers.IgnoreQueryFilters().AnyAsync()) return;

        var hasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher<AdminUser>>();
        var admin = new AdminUser { Email = email, FullName = config["Seed:AdminFullName"] ?? "Yönetici" };
        admin.PasswordHash = hasher.HashPassword(admin, password);

        db.AdminUsers.Add(admin);
        await db.SaveChangesAsync();
    }
}

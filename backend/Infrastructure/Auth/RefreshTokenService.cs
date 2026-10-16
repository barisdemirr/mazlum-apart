using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Auth;

/// <summary>
/// Yenileme anahtarı yaşam döngüsü: verme, döndürme (rotation) ve iptal.
/// Güvenlik: veritabanında yalnızca SHA-256 özeti; her yenilemede yeni anahtar; döndürülmüş eski anahtar yeniden kullanılırsa
/// (çalınma belirtisi) tüm aile iptal edilir. Aynı anda gelen iki yenileme isteği (sekmeler, paralel çağrılar) için kısa bir tolerans penceresi vardır.
/// Kullanıcı pasifse ya da şifresi değişmişse (SecurityStamp) yenileme reddedilir ve aile kapanır.
/// SaveChanges: Issue için çağırana aittir; Rotate/Revoke kendi kaydını yapar.
/// </summary>
public class RefreshTokenService(AppDbContext db, TokenService tokens)
{
    private static readonly TimeSpan ReuseGrace = TimeSpan.FromSeconds(15);

    public record Issued(string Token, DateTime ExpiresAt, bool Persistent);

    public record Rotated(string AccessToken, DateTime ExpiresAt, string RefreshToken, DateTime RefreshExpiresAt, bool Persistent);

    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public Issued Issue(string role, Guid userId, Guid stamp, TimeSpan lifetime, bool persistent, Guid? familyId = null)
    {
        var plain = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).Replace('+', '-').Replace('/', '_').TrimEnd('=');
        var now = DateTime.UtcNow;
        db.RefreshTokens.Add(new RefreshToken
        {
            Role = role,
            UserId = userId,
            Stamp = stamp,
            FamilyId = familyId ?? Guid.CreateVersion7(),
            TokenHash = Hash(plain),
            Persistent = persistent,
            LifetimeSeconds = (int)lifetime.TotalSeconds,
            CreatedAt = now,
            ExpiresAt = now.Add(lifetime)
        });
        return new Issued(plain, now.Add(lifetime), persistent);
    }

    public async Task<Result<Rotated>> Rotate(string? plain, CancellationToken ct)
    {
        var invalid = Error.Unauthorized("Oturum geçersiz.");
        if (string.IsNullOrWhiteSpace(plain) || plain.Length > 100) return invalid;

        var now = DateTime.UtcNow;
        var hash = Hash(plain);
        var row = await db.RefreshTokens.FirstOrDefaultAsync(x => x.TokenHash == hash, ct);
        if (row is null || row.ExpiresAt <= now) return invalid;

        // Döndürülmüş eski anahtar tolerans süresinden sonra yeniden kullanıldı: çalınmış olabilir, aile kapatılır
        if (row.RevokedAt is { } revokedAt && now - revokedAt > ReuseGrace)
        {
            await RevokeFamily(row.FamilyId, now, ct);
            return invalid;
        }

        string accessToken;
        DateTime accessExpires;
        if (row.Role == AppRoles.Admin)
        {
            var admin = await db.AdminUsers.FirstOrDefaultAsync(x => x.Id == row.UserId && x.IsActive && x.SecurityStamp == row.Stamp, ct);
            if (admin is null) { await RevokeFamily(row.FamilyId, now, ct); return invalid; }
            (accessToken, accessExpires) = tokens.CreateForAdmin(admin);
        }
        else
        {
            var student = await db.Students.FirstOrDefaultAsync(
                x => x.Id == row.UserId && x.IsActive && x.PasswordHash != null && x.SecurityStamp == row.Stamp, ct);
            if (student is null) { await RevokeFamily(row.FamilyId, now, ct); return invalid; }
            (accessToken, accessExpires) = tokens.CreateForStudent(student);
        }

        row.RevokedAt ??= now;
        var next = Issue(row.Role, row.UserId, row.Stamp, TimeSpan.FromSeconds(row.LifetimeSeconds), row.Persistent, row.FamilyId);
        await db.SaveChangesAsync(ct);

        // Süresi bir günden uzun süre önce dolmuş kayıtlar temizlenir (tablo şişmesin)
        await db.RefreshTokens.Where(x => x.ExpiresAt < now.AddDays(-1)).ExecuteDeleteAsync(ct);

        return new Rotated(accessToken, accessExpires, next.Token, next.ExpiresAt, next.Persistent);
    }

    /// <summary>Çıkış: anahtarın ailesi (bu cihazın oturumu) iptal edilir. Bilinmeyen anahtar sessizce yok sayılır.</summary>
    public async Task Revoke(string? plain, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(plain) || plain.Length > 100) return;
        var hash = Hash(plain);
        var familyId = await db.RefreshTokens.Where(x => x.TokenHash == hash).Select(x => (Guid?)x.FamilyId).FirstOrDefaultAsync(ct);
        if (familyId is { } id) await RevokeFamily(id, DateTime.UtcNow, ct);
    }

    private Task<int> RevokeFamily(Guid familyId, DateTime now, CancellationToken ct) =>
        db.RefreshTokens.Where(x => x.FamilyId == familyId && x.RevokedAt == null)
            .ExecuteUpdateAsync(s => s.SetProperty(x => x.RevokedAt, now), ct);
}

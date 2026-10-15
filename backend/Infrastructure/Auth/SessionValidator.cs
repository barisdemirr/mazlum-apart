using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Auth;

/// <summary>
/// İmzası geçerli bir token bile şu durumlarda reddedilir: kullanıcı silinmiş / pasif, ya da şifre değişmiş
/// (SecurityStamp token'dakinden farklı). Böylece "çıkış yap her yerden" ve hesap kapatma anında etkili olur.
/// </summary>
public class SessionValidator(AppDbContext db)
{
    public async Task<bool> IsValidAsync(ClaimsPrincipal principal, CancellationToken ct)
    {
        if (!Guid.TryParse(principal.FindFirstValue(AppClaims.Subject), out var id)) return false;
        if (!Guid.TryParseExact(principal.FindFirstValue(AppClaims.Stamp), "N", out var stamp)) return false;

        return principal.FindFirstValue(AppClaims.Role) switch
        {
            AppRoles.Admin => await db.AdminUsers.AnyAsync(x => x.Id == id && x.IsActive && x.SecurityStamp == stamp, ct),
            AppRoles.Student => await db.Students.AnyAsync(
                x => x.Id == id && x.IsActive && x.PasswordHash != null && x.SecurityStamp == stamp, ct),
            _ => false
        };
    }
}

using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Services;

/// <summary>
/// Çift gönderim koruması (bkz. IdempotencyKey). Kullanım — doğrulamalar BİTTİKTEN sonra, değişiklikten hemen önce:
///   if (await idempotency.BeginAsync(key, "payment.create", adminId, ct) is { } dup) return dup;
/// Anahtar, işin SaveChanges'i ile birlikte yazılır; iş başarısız olursa anahtar da yazılmaz ve aynı anahtarla tekrar denenebilir.
/// </summary>
public class IdempotencyGuard(AppDbContext db)
{
    public const string Header = "Idempotency-Key";

    public async Task<Error?> BeginAsync(Guid? key, string scope, Guid? actorId, CancellationToken ct)
    {
        if (key is not { } value || value == Guid.Empty)
            return Error.Field(Header, "İşlem anahtarı (Idempotency-Key başlığı) eksik.");

        if (await db.IdempotencyKeys.AsNoTracking().AnyAsync(x => x.Key == value, ct))
            return Error.Conflict("Bu işlem zaten kaydedildi (aynı istek ikinci kez gönderildi). Sayfayı yenileyin.");

        db.IdempotencyKeys.Add(new IdempotencyKey { Key = value, Scope = scope, ActorId = actorId, CreatedAt = DateTime.UtcNow });
        return null;
    }
}

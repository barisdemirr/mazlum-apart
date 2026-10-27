using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Accounting;

/*
 * KALEM DÜZELTMELERİ (kalemler değişmez kayıt olduğu için ters kayıt + yeni kalem ile yapılır; hiçbir satır silinmez)
 *  - Aylık indirim: depozito ve kira/yaz taksitlerinin her birinden aynı tutar düşülür.
 * İşlemi yapan yönetici, tarih, tutar ve gerekçe denetim kaydına (işlem geçmişine) yazılır.
 */

/// <summary>
/// Öğrenci hesabına aylık indirim. Her depozito / kira / yaz taksidi için eski kalem ters kayıtla kapanır, tutarı
/// (aylık indirim kadar) düşük yeni kalem açılır (taksit en az 1 ₺ kalır). Varsayılan olarak yalnızca ödemesi tamamlanmamış taksitlere uygulanır;
/// includePaid açıksa ödenmiş taksitlere de uygulanır, fazla ödenen kısım avansa döner ve açık taksitlere otomatik mahsup edilir.
/// </summary>
public static class ApplyMonthlyDiscount
{
    public record Command(decimal Amount, bool IncludePaid, string? Reason);

    public record Response(int Applied, decimal TotalReduction);

    private static readonly ChargeKind[] Targets = [ChargeKind.Deposit, ChargeKind.Rent, ChargeKind.Summer];

    public class Handler(AppDbContext db, LedgerService ledgers, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(Guid enrollmentId, Command cmd, Guid adminId, Guid? key, CancellationToken ct)
        {
            var reason = cmd.Reason?.Trim() ?? "";
            var v = new Validator().Required("reason", reason, "İndirim gerekçesini yazın.").MaxLength("reason", reason, 200);
            if (Money.Check(cmd.Amount) is { } money) v.AddError("amount", money);
            if (!v.IsValid) return v.ToFailure<Response>();

            var ledger = await ledgers.LoadAsync(enrollmentId, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == ledger.Enrollment.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "İndirim uygulama") is { } closed) return closed;

            var targets = ledger.Items()
                .Where(i => Targets.Contains(i.Kind) && i.Net > 0 && (cmd.IncludePaid || i.Remaining > 0))
                .OrderBy(i => i.DueDate).ThenBy(i => i.CreatedAt)
                .ToList();
            if (targets.Count == 0) return Error.Conflict("İndirim uygulanacak taksit yok.");

            if (await idempotency.BeginAsync(key, "charge.monthly-discount", adminId, ct) is { } dup) return dup;

            var amount = decimal.Round(cmd.Amount, 2);
            var applied = 0;
            var total = 0m;
            foreach (var item in targets)
            {
                var fresh = Math.Max(LedgerMath.Round(item.Net - amount), 1m);
                if (fresh >= item.Net) continue;

                var reversed = ledger.Reverse(item.Id, $"Aylık indirim −{amount:N2} ₺: {reason}", adminId);
                if (!reversed.IsSuccess) return reversed.Error!;

                var original = ledger.Charges.First(c => c.Id == item.Id);
                var note = $"{(string.IsNullOrWhiteSpace(original.Note) ? "" : original.Note + " · ")}Aylık indirim −{amount:N2} ₺";
                ledger.AddCharge(original.Kind, original.Month, fresh, original.DueDate, note.Length > 500 ? note[..500] : note, adminId);

                applied++;
                total += item.Net - fresh;
            }
            if (applied == 0) return Error.Conflict("İndirim, taksitleri değiştirmedi.");

            ledger.AutoAllocate();

            audit.Add("enrollment.discount", "enrollment", enrollmentId, period.Id,
                after: new { monthlyAmount = amount, includePaid = cmd.IncludePaid, installments = applied, totalReduction = LedgerMath.Round(total), date = TurkeyClock.Today },
                note: $"Aylık −{amount:N2} ₺ · {applied} kalem · {reason}");
            await db.SaveChangesAsync(ct);
            return new Response(applied, LedgerMath.Round(total));
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/enrollments/{id:guid}/monthly-discount", async (Guid id, Command cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), key, ct)).ToOk());
    }
}

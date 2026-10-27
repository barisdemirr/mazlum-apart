using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Enrollments;

/// <summary>
/// Kayıt süresini (tam dönem ↔ 1. yarı) kaydı İPTAL ETMEDEN değiştirir: ödeme planı, yerleşim ve oda müsaitliği birlikte güncellenir.
///  - Ödeme planı: yeni süreye göre olması gereken kira ayları hesaplanır. Fazla aylar ters kayıtla kapanır (silinmez; ödenmiş kısım avansa döner),
///    eksik aylar yeni kalem olarak eklenir. Depozito değişmez (son ay kirası yerine sayılmaya devam eder). Diğer kalemlere dokunulmaz.
///  - Yerleşim: 1. yarıya kısalırken yerleşim yarı sonunda biter (oda 2. yarı için boşalır); tam döneme uzarken yerleşim dönem sonuna uzar
///    (oda o tarihlerde doluysa işlem durur, önce odayı değiştirin).
///  - 2. yarı kayıtları ve 12 aylık / yaz kayıtları bu işlemle değiştirilemez.
/// </summary>
public static class ChangeEnrollmentTerm
{
    public record Command(StayTerm Term, string? Reason);

    public record Response(int ReversedRents, int AddedRents, int PlacementsChanged);

    public class Handler(AppDbContext db, LedgerService ledgers, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(Guid id, Guid adminId, Command cmd, CancellationToken ct)
        {
            var reason = cmd.Reason?.Trim() ?? "";
            var v = new Validator().Required("reason", reason, "Değişiklik nedenini yazın.").MaxLength("reason", reason, 300);
            if (!v.IsValid) return v.ToFailure<Response>();
            if (cmd.Term == StayTerm.Second) return Error.Field("term", "Süre yalnızca tam dönem ile 1. yarı arasında değiştirilebilir.");

            var ledger = await ledgers.LoadAsync(id, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");
            var enrollment = ledger.Enrollment;
            if (enrollment.Status is EnrollmentStatus.Cancelled or EnrollmentStatus.Left) return Error.Conflict("Kapatılmış kaydın süresi değiştirilemez.");
            if (enrollment.Term == StayTerm.Second) return Error.Conflict("2. yarı kayıtlarında süre değiştirilemez.");
            if (enrollment.Term == cmd.Term) return Error.Field("term", "Kayıt zaten bu sürede.");
            if (enrollment.StayPlan != StayPlan.Academic) return Error.Conflict("Süre değişikliği yalnızca akademik dönem kayıtlarında yapılabilir (12 aylık ve yaz kayıtlarında yapılamaz).");

            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == enrollment.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Süre değişikliği") is { } closed) return closed;
            if (!period.HalfTermEnabled || period.HalfTermFirstEnd is not { } firstEnd)
                return Error.Conflict("Bu dönemde yarım dönem kapalı. Önce Dönemler sayfasından açın.");
            if (cmd.Term == StayTerm.First && enrollment.EntryDate > firstEnd)
                return Error.Conflict("Giriş tarihi 1. yarının bitişinden sonra; kayıt 1. yarıya çevrilemez.");

            // Yeni sürenin ödeme planı: kira ayları
            var planEnd = cmd.Term == StayTerm.First ? firstEnd : period.EndDate;
            var desired = PaymentPlan.Generate(enrollment.EntryDate, enrollment.PayWindow, enrollment.MonthlyPrice, enrollment.DepositPrice, planEnd, period.RentStart)
                .Where(d => d.Kind == ChargeKind.Rent)
                .ToDictionary(d => d.Month);

            var current = ledger.Items().Where(i => i.Kind == ChargeKind.Rent && i.Net > 0).ToList();
            var currentMonths = current.Select(i => i.Month).ToHashSet();
            var toReverse = current.Where(i => !desired.ContainsKey(i.Month)).ToList();
            var toAdd = desired.Values.Where(d => !currentMonths.Contains(d.Month)).OrderBy(d => d.Month, StringComparer.Ordinal).ToList();

            // Yerleşim: kısalırken yarı sonunda biter; uzarken dönem sonuna uzar (oda dolu değilse)
            var placements = await db.Placements.Where(x => x.EnrollmentId == id).ToListAsync(ct);
            var changed = 0;
            if (cmd.Term == StayTerm.First)
            {
                foreach (var p in placements.Where(x => x.EndDate > firstEnd))
                {
                    p.EndDate = firstEnd < p.StartDate ? p.StartDate : firstEnd;
                    changed++;
                }
            }
            else
            {
                foreach (var p in placements.Where(x => x.EndDate == firstEnd))
                {
                    var room = await db.Rooms.IgnoreQueryFilters().FirstAsync(x => x.Id == p.RoomId, ct);
                    var existing = await PlacementRules.RoomPlacementsAsync(db, room.Id, ct);
                    if (PlacementRules.Peak(existing, room.Id, firstEnd.AddDays(1), period.EndDate, p.Id) >= room.Beds)
                        return Error.Conflict($"{room.Name} 2. yarı için dolu; süre uzatılamadı. Önce öğrenciyi “Odayı değiştir” ile müsait bir odaya alın.");
                    p.EndDate = period.EndDate;
                    changed++;
                }
            }

            await using var tx = await db.Database.BeginTransactionAsync(ct);

            foreach (var item in toReverse)
            {
                var reversed = ledger.Reverse(item.Id, $"Süre değişikliği ({TermLabel(cmd.Term)}): {reason}", adminId);
                if (!reversed.IsSuccess) return Result<Response>.Fail(reversed.Error!);
            }
            foreach (var draft in toAdd)
                ledger.AddCharge(ChargeKind.Rent, draft.Month, draft.Amount, draft.DueDate, $"Süre değişikliği ({TermLabel(cmd.Term)})", adminId);
            ledger.AutoAllocate();

            var before = enrollment.Term;
            enrollment.Term = cmd.Term;

            audit.Add("enrollment.term", "enrollment", id, enrollment.PeriodId,
                before: new { term = before }, after: new { term = cmd.Term, reversedRents = toReverse.Count, addedRents = toAdd.Count, placements = changed }, note: reason);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return new Response(toReverse.Count, toAdd.Count, changed);
        }

        private static string TermLabel(StayTerm term) => term == StayTerm.First ? "1. yarı" : "tam dönem";
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/enrollments/{id:guid}/term", async (Guid id, Command cmd, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, user.GetUserId(), cmd, ct)).ToOk());
    }
}

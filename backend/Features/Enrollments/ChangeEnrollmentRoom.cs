using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Enrollments;

/// <summary>
/// Değişiklik için seçilebilecek daire türü / oda tipleri ve bu dönemdeki fiyatları (öğrenci detayındaki "Daire / oda değiştir" penceresi).
/// </summary>
public static class GetRoomChangeOptions
{
    public record Option(Guid RoomTypeId, string Name, Guid? ApartmentTypeId, string ApartmentTypeName, decimal? Monthly, decimal? Deposit, decimal? SummerMonthly, bool Current, bool Selectable, string? Hint);

    public record Response(Guid CurrentRoomTypeId, decimal MonthlyPrice, decimal DepositPrice, decimal? SummerMonthlyPrice, List<Option> Options);

    public class Handler(AppDbContext db)
    {
        public async Task<Result<Response>> Handle(Guid enrollmentId, CancellationToken ct)
        {
            var enrollment = await db.Enrollments.AsNoTracking().FirstOrDefaultAsync(x => x.Id == enrollmentId, ct);
            if (enrollment is null) return Error.NotFound("Kayıt bulunamadı.");

            var types = await db.RoomTypes.AsNoTracking().Where(x => x.IsActive || x.Id == enrollment.RoomTypeId)
                .OrderBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt).ToListAsync(ct);
            var aptTypes = await db.ApartmentTypes.AsNoTracking().OrderBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt).ToListAsync(ct);
            var prices = await db.RoomTypePrices.AsNoTracking().Where(x => x.PeriodId == enrollment.PeriodId).ToListAsync(ct);
            var yearly = enrollment.StayPlan == StayPlan.Yearly;

            // Daire türü sırası, onun altında oda tipi sırası
            var aptOrder = aptTypes.Select((a, i) => (a.Id, i)).ToDictionary(x => x.Id, x => x.i);
            var options = types
                .OrderBy(t => t.ApartmentTypeId is { } a && aptOrder.TryGetValue(a, out var ix) ? ix : int.MaxValue)
                .ThenBy(t => t.OrderIndex)
                .Select(t =>
                {
                    var price = prices.FirstOrDefault(p => p.RoomTypeId == t.Id);
                    var apt = aptTypes.FirstOrDefault(a => a.Id == t.ApartmentTypeId);
                    string? hint = price is null ? "bu dönem fiyatı tanımlı değil" : yearly && price.SummerMonthly is null ? "yaz fiyatı tanımlı değil" : null;
                    return new Option(t.Id, t.Name.Tr, t.ApartmentTypeId, apt?.Name.Tr ?? "", price?.Monthly, price?.Deposit, price?.SummerMonthly,
                        t.Id == enrollment.RoomTypeId, hint is null || t.Id == enrollment.RoomTypeId, hint);
                }).ToList();

            return new Response(enrollment.RoomTypeId, enrollment.MonthlyPrice, enrollment.DepositPrice, enrollment.SummerMonthlyPrice, options);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/enrollments/{id:guid}/room-change-options", async (Guid id, Handler h, CancellationToken ct) => (await h.Handle(id, ct)).ToOk());
    }
}

/// <summary>
/// Mevcut kayıtta daire türü / oda tipi / oda değişikliği — kayıt iptal edilip yeniden açılmaz.
///  - Kayıt aynı kalır; RoomTypeId (daire türü oda tipi üzerinden gelir) ve yerleşim güncellenir. Tahsilatlar, hesap hareketleri ve geçmiş korunur.
///  - Yerleşim: değişiklik günü mevcut yerleşimin başlangıcından sonraysa eski oda bir gün önce biter, yenisi o gün başlar (oda doluluğu iki tarafta da güncellenir).
///    Gün, yerleşimin başlangıcına denk geliyorsa (ilk yanlış atama) yerleşim yerinde düzeltilir.
///  - Fiyat farkı: yalnızca yönetici "ödeme planını güncelle" derse uygulanır. Değişiklik gününden itibarenki ödenmemiş/ödenmiş fark gözetmeksizin
///    kira (ve 12 aylıkta yaz) taksitleri ile depozito, ters kayıt + yeni tutarlı kalem ile yenilenir; ödenmiş kısım kaybolmaz (avansa döner, otomatik mahsup edilir).
///    Geçmiş aylar dokunulmaz.
/// </summary>
public static class ChangeEnrollmentRoom
{
    public record Command(Guid RoomTypeId, Guid? RoomId, DateOnly Date, bool UpdatePaymentPlan, string? Reason);

    public record Response(bool RoomTypeChanged, bool RoomChanged, int RevisedCharges, decimal MonthlyBefore, decimal MonthlyAfter);

    private static readonly ChargeKind[] Targets = [ChargeKind.Deposit, ChargeKind.Rent, ChargeKind.Summer];

    public class Handler(AppDbContext db, LedgerService ledgers, IdempotencyGuard idempotency, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(Guid enrollmentId, Command cmd, Guid adminId, Guid? key, CancellationToken ct)
        {
            var reason = cmd.Reason?.Trim() ?? "";
            var v = new Validator().Required("reason", reason, "Değişiklik nedenini yazın.").MaxLength("reason", reason, 300);
            if (!v.IsValid) return v.ToFailure<Response>();

            var ledger = await ledgers.LoadAsync(enrollmentId, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");
            var enrollment = ledger.Enrollment;
            if (enrollment.Status is EnrollmentStatus.Cancelled or EnrollmentStatus.Left) return Error.Conflict("Kapatılmış kaydın odası değiştirilemez.");
            var period = await db.Periods.AsNoTracking().FirstAsync(x => x.Id == enrollment.PeriodId, ct);
            if (PeriodRules.RequireOpen(period, "Oda değişikliği") is { } closed) return closed;
            if (cmd.Date < period.StartDate || cmd.Date > period.EndDate) return Error.Field("date", "Değişiklik tarihi dönemin içinde olmalı.");

            var typeChanged = cmd.RoomTypeId != enrollment.RoomTypeId;
            var newType = await db.RoomTypes.AsNoTracking().FirstOrDefaultAsync(x => x.Id == cmd.RoomTypeId, ct);
            if (newType is null) return Error.Field("roomTypeId", "Oda tipi bulunamadı.");
            if (typeChanged && !newType.IsActive) return Error.Field("roomTypeId", "Bu oda tipi şu an kapalı.");

            // Fiyat (yalnızca tip değişiyorsa ve plan güncellenecekse)
            RoomTypePrice? price = null;
            if (typeChanged)
            {
                price = await db.RoomTypePrices.AsNoTracking().FirstOrDefaultAsync(x => x.PeriodId == enrollment.PeriodId && x.RoomTypeId == cmd.RoomTypeId, ct);
                if (price is null && cmd.UpdatePaymentPlan) return Error.Conflict("Seçilen oda tipinin bu dönem için fiyatı tanımlı değil.");
                if (cmd.UpdatePaymentPlan && enrollment.StayPlan == StayPlan.Yearly && price!.SummerMonthly is null)
                    return Error.Conflict("Seçilen oda tipinin yaz fiyatı tanımlı değil (12 aylık kayıt).");
            }

            // Yerleşim
            Room? room = null;
            Placement? current = null;
            if (cmd.RoomId is { } roomId)
            {
                room = await db.Rooms.Include(x => x.Apartment).FirstOrDefaultAsync(x => x.Id == roomId, ct);
                if (room is null) return Error.NotFound("Oda bulunamadı.");
                if (room.Status != RoomStatus.Active) return Error.Conflict("Bu oda şu an kullanıma kapalı.");
                if (room.RoomTypeId != cmd.RoomTypeId) return Error.Field("roomId", "Oda, seçilen oda tipine ait değil.");
            }

            var placements = await db.Placements.Where(x => x.EnrollmentId == enrollmentId).ToListAsync(ct);
            current = placements.Where(x => x.EndDate >= cmd.Date).OrderByDescending(x => x.StartDate).FirstOrDefault();
            if (typeChanged && current is not null && room is null) return Error.Field("roomId", "Oda tipi değişirken yeni odayı da seçin.");
            if (current is not null && room is not null && current.RoomId == room.Id && !typeChanged) return Error.Conflict("Öğrenci zaten bu odada.");
            if (!typeChanged && room is null) return Error.Conflict("Değişiklik yok: farklı bir oda tipi ya da oda seçin.");
            if (current is null && room is not null && placements.Count > 0) return Error.Conflict("Bu tarihte değiştirilecek bir yerleşim yok.");

            var roomChanged = false;
            if (room is not null)
            {
                var all = await PlacementRules.RoomPlacementsAsync(db, room.Id, ct);
                if (current is null)
                {
                    // Hiç yerleşimi yok: ilk yerleşim
                    var start = cmd.Date < enrollment.EntryDate ? enrollment.EntryDate : cmd.Date;
                    var end = PlacementRules.LastDay(enrollment, period);
                    if (PlacementRules.Peak(all, room.Id, start, end) >= room.Beds) return Error.Conflict($"{room.Name} o tarihlerde dolu.");
                    db.Placements.Add(new Placement { PeriodId = enrollment.PeriodId, EnrollmentId = enrollmentId, RoomId = room.Id, StartDate = start, EndDate = end, Room = room });
                    if (enrollment.Status == EnrollmentStatus.Approved) enrollment.Status = EnrollmentStatus.Active;
                    roomChanged = true;
                }
                else if (cmd.Date <= current.StartDate)
                {
                    // Yanlış atamanın düzeltilmesi: yerleşim yerinde başka odaya alınır
                    if (PlacementRules.Peak(all, room.Id, current.StartDate, current.EndDate, current.Id) >= room.Beds) return Error.Conflict($"{room.Name} o tarihlerde dolu.");
                    current.RoomId = room.Id;
                    current.Room = room;
                    roomChanged = true;
                }
                else
                {
                    if (PlacementRules.Peak(all, room.Id, cmd.Date, current.EndDate) >= room.Beds) return Error.Conflict($"{room.Name} o tarihlerde dolu.");
                    var next = new Placement { PeriodId = enrollment.PeriodId, EnrollmentId = enrollmentId, RoomId = room.Id, StartDate = cmd.Date, EndDate = current.EndDate, Room = room };
                    current.EndDate = cmd.Date.AddDays(-1);
                    db.Placements.Add(next);
                    roomChanged = true;
                }
            }

            var monthlyBefore = enrollment.MonthlyPrice;
            var revised = 0;
            if (typeChanged && cmd.UpdatePaymentPlan && price is not null)
            {
                if (await idempotency.BeginAsync(key, "enrollment.room-change", adminId, ct) is { } dup) return dup;

                var monthDiff = LedgerMath.Round(price.Monthly - enrollment.MonthlyPrice);
                var summerDiff = LedgerMath.Round((price.SummerMonthly ?? price.Monthly) - (enrollment.SummerMonthlyPrice ?? enrollment.MonthlyPrice));
                var depositDiff = LedgerMath.Round(price.Deposit - enrollment.DepositPrice);
                var fromMonth = $"{cmd.Date.Year:D4}-{cmd.Date.Month:D2}";

                var targets = ledger.Items()
                    .Where(i => Targets.Contains(i.Kind) && i.Net > 0 && (i.Kind == ChargeKind.Deposit || string.CompareOrdinal(i.Month, fromMonth) >= 0))
                    .OrderBy(i => i.DueDate).ThenBy(i => i.CreatedAt)
                    .ToList();

                foreach (var item in targets)
                {
                    var diff = item.Kind == ChargeKind.Deposit ? depositDiff : item.Kind == ChargeKind.Summer ? summerDiff : monthDiff;
                    if (diff == 0) continue;
                    var fresh = Math.Max(LedgerMath.Round(item.Net + diff), 1m);
                    if (fresh == item.Net) continue;

                    var reversed = ledger.Reverse(item.Id, $"Oda tipi değişikliği: {reason}", adminId);
                    if (!reversed.IsSuccess) return reversed.Error!;

                    var original = ledger.Charges.First(c => c.Id == item.Id);
                    var note = $"{(string.IsNullOrWhiteSpace(original.Note) ? "" : original.Note + " · ")}Oda tipi değişikliği ({item.Net:N2} → {fresh:N2} ₺)";
                    ledger.AddCharge(original.Kind, original.Month, fresh, original.DueDate, note.Length > 500 ? note[..500] : note, adminId);
                    revised++;
                }
                ledger.AutoAllocate();

                enrollment.MonthlyPrice = price.Monthly;
                enrollment.DepositPrice = price.Deposit;
                enrollment.SummerMonthlyPrice = enrollment.StayPlan == StayPlan.Yearly ? price.SummerMonthly : enrollment.SummerMonthlyPrice;
            }

            var oldTypeId = enrollment.RoomTypeId;
            enrollment.RoomTypeId = cmd.RoomTypeId;

            audit.Add("enrollment.room-change", "enrollment", enrollmentId, enrollment.PeriodId,
                before: new { roomTypeId = oldTypeId, monthly = monthlyBefore },
                after: new { roomTypeId = cmd.RoomTypeId, roomId = room?.Id, date = cmd.Date, updatePaymentPlan = cmd.UpdatePaymentPlan && typeChanged, revisedCharges = revised, monthly = enrollment.MonthlyPrice },
                note: reason);
            await db.SaveChangesAsync(ct);

            return new Response(typeChanged, roomChanged, revised, monthlyBefore, enrollment.MonthlyPrice);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/enrollments/{id:guid}/room-change", async (Guid id, Command cmd, [FromHeader(Name = IdempotencyGuard.Header)] Guid? key,
                    ClaimsPrincipal user, Handler h, CancellationToken ct) =>
                (await h.Handle(id, cmd, user.GetUserId(), key, ct)).ToOk());
    }
}

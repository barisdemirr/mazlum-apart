using System.Security.Claims;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Enrollments;

public static class PlacementRules
{
    /// <summary>
    /// Kaydın konaklamasının son günü: 1. yarı kaydında yarının bitişi (oda 2. yarı için boşalır), 12 aylıkta 31 Ağustos, diğerlerinde dönem sonu.
    /// Yerleşim süresi ve oda uygunluğu bu güne göre hesaplanır.
    /// </summary>
    public static DateOnly LastDay(Enrollment enrollment, Period period) =>
        enrollment.Term == StayTerm.First && period.HalfTermFirstEnd is { } firstEnd ? firstEnd
        : enrollment.StayPlan == StayPlan.Yearly ? PaymentPlan.SummerEnd(period.EndDate)
        : period.EndDate;

    /// <summary>Bir odada [start, end] aralığında aynı anda en çok kaç kişi kalıyor? (frontend peakOccupancy ile aynı)</summary>
    public static int Peak(IEnumerable<Placement> placements, Guid roomId, DateOnly start, DateOnly end, Guid? ignoreId = null)
    {
        var list = placements.Where(p => p.RoomId == roomId && p.Id != ignoreId && p.StartDate <= end && p.EndDate >= start).ToList();
        var points = list.Select(p => p.StartDate > start ? p.StartDate : start).Append(start).Distinct();
        return points.Select(day => list.Count(p => p.StartDate <= day && p.EndDate >= day)).DefaultIfEmpty(0).Max();
    }

    /// <summary>
    /// Odanın yerleşimleri (YALNIZCA okuma / kapasite hesabı için: izlenmeyen kayıtlardır, değiştirilip kaydedilmez).
    /// Yönetici girişli ya da onaylı çıkışı olan öğrencinin yerleşimi çıkış gününün bir gün öncesinde biter sayılır;
    /// böylece 2. yarıyıl öğrencisi, çıkış yapacak öğrencinin odasına yerleştirilebilir.
    /// </summary>
    public static async Task<List<Placement>> RoomPlacementsAsync(AppDbContext db, Guid roomId, CancellationToken ct) =>
        await TrimByExitsAsync(db, await db.Placements.AsNoTracking().Where(x => x.RoomId == roomId).ToListAsync(ct), ct);

    /// <summary>Çıkışı girilmiş kayıtların yerleşim bitişini çıkıştan bir gün öncesine çeker (izlenmeyen kayıtlar üzerinde); çıkışla başlangıcı aşılan yerleşim listeden düşer</summary>
    public static async Task<List<Placement>> TrimByExitsAsync(AppDbContext db, List<Placement> placements, CancellationToken ct)
    {
        if (placements.Count == 0) return placements;

        var enrollmentIds = placements.Select(p => p.EnrollmentId).Distinct().ToList();
        var exits = await db.EnrollmentExits.AsNoTracking()
            .Where(x => enrollmentIds.Contains(x.EnrollmentId) && (x.ConfirmedAt != null || x.ReportedByType == ActorType.Admin))
            .ToDictionaryAsync(x => x.EnrollmentId, x => x.ExitDate, ct);
        if (exits.Count == 0) return placements;

        var result = new List<Placement>(placements.Count);
        foreach (var p in placements)
        {
            if (exits.TryGetValue(p.EnrollmentId, out var exitDate))
            {
                var lastDay = exitDate.AddDays(-1);
                if (lastDay < p.StartDate) continue; // çıkış, yerleşim başlamadan önce
                if (lastDay < p.EndDate) p.EndDate = lastDay;
            }
            result.Add(p);
        }
        return result;
    }
}

/// <summary>
/// Odaya yerleştirme: { roomId, start?, end? } (varsayılan: giriş tarihi → dönem sonu; 12 aylık kayıtta 31 Ağustos).
/// Kurallar: kapalı dönemde yapılamaz; oda aktif ve kaydın oda tipinde olmalı; tarihler dönem içinde; öğrenci aynı anda iki odada olamaz;
/// oda kapasitesi (yatak sayısı) aşılamaz. İlk yerleşimde kayıt "aktif konaklama" olur.
/// </summary>
public static class PlaceStudent
{
    public record Command(Guid RoomId, DateOnly? Start, DateOnly? End);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<RoomRef>> Handle(Guid enrollmentId, Command cmd, CancellationToken ct)
        {
            var enrollment = await db.Enrollments.FirstOrDefaultAsync(x => x.Id == enrollmentId, ct);
            if (enrollment is null) return Error.NotFound("Kayıt bulunamadı.");
            var period = await db.Periods.FirstAsync(x => x.Id == enrollment.PeriodId, ct);
            if (period.Status == PeriodStatus.Closed) return Error.Conflict("Kapalı dönemde yerleşim yapılamaz.");
            if (enrollment.Status is not (EnrollmentStatus.Approved or EnrollmentStatus.Active)) return Error.Conflict("Yalnızca onaylı kayıtlar yerleştirilebilir.");

            var room = await db.Rooms.Include(x => x.Apartment).FirstOrDefaultAsync(x => x.Id == cmd.RoomId, ct);
            if (room is null) return Error.NotFound("Oda bulunamadı.");
            if (room.Status != RoomStatus.Active) return Error.Conflict("Bu oda şu an kullanıma kapalı (kapalı ya da bakımda).");
            if (room.RoomTypeId != enrollment.RoomTypeId) return Error.Conflict("Oda, öğrencinin kayıtlı oda tipine uygun değil.");

            // 12 ay kalan öğrenci yaz aylarında da odasındadır (31 Ağustos); 1. yarı kaydında yerleşim yarı sonunda biter, oda 2. yarıya boşalır
            var lastDay = PlacementRules.LastDay(enrollment, period);
            var start = cmd.Start ?? enrollment.EntryDate;
            var end = cmd.End ?? lastDay;
            if (start > end) return Error.Field("start", "Başlangıç tarihi bitişten sonra olamaz.");
            if (start < period.StartDate || end > lastDay) return Error.Conflict("Yerleşim tarihleri dönemin dışına çıkamaz.");

            if (await db.Placements.AnyAsync(x => x.EnrollmentId == enrollmentId && x.StartDate <= end && x.EndDate >= start, ct))
                return Error.Conflict("Bu öğrenci o tarihlerde başka bir odaya yerleşmiş. Oda değişikliği için “Odayı değiştir”i kullanın.");

            var existing = await PlacementRules.RoomPlacementsAsync(db, room.Id, ct);
            if (PlacementRules.Peak(existing, room.Id, start, end) >= room.Beds)
                return Error.Conflict($"{room.Name} o tarihlerde dolu: {room.Beds} yataklı oda, kapasite aşılamaz.");

            var placement = new Placement { PeriodId = enrollment.PeriodId, EnrollmentId = enrollmentId, RoomId = room.Id, StartDate = start, EndDate = end, Room = room };
            db.Placements.Add(placement);
            if (enrollment.Status == EnrollmentStatus.Approved) enrollment.Status = EnrollmentStatus.Active;

            audit.Add("placement.create", "placement", placement.Id, enrollment.PeriodId, after: new { room = room.Name, start, end, enrollmentId });
            await db.SaveChangesAsync(ct);
            return EnrollmentQueryHandler.ToRef(placement);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/enrollments/{id:guid}/placements", async (Guid id, Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, cmd, ct)).ToOk());
    }
}

/// <summary>Oda değişikliği: { roomId, date } — eski yerleşim değişiklik gününden bir gün önce biter, yenisi o gün başlar</summary>
public static class MovePlacement
{
    public record Command(Guid RoomId, DateOnly Date);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<RoomRef>> Handle(Guid enrollmentId, Command cmd, CancellationToken ct)
        {
            var enrollment = await db.Enrollments.FirstOrDefaultAsync(x => x.Id == enrollmentId, ct);
            if (enrollment is null) return Error.NotFound("Kayıt bulunamadı.");
            var period = await db.Periods.FirstAsync(x => x.Id == enrollment.PeriodId, ct);
            if (period.Status == PeriodStatus.Closed) return Error.Conflict("Kapalı dönemde yerleşim değiştirilemez.");

            var current = await db.Placements.Include(x => x.Room)
                .Where(x => x.EnrollmentId == enrollmentId && x.EndDate >= cmd.Date)
                .OrderByDescending(x => x.StartDate).FirstOrDefaultAsync(ct);
            if (current is null) return Error.Conflict("Bu öğrencinin değiştirilecek bir yerleşimi yok.");
            if (current.RoomId == cmd.RoomId) return Error.Conflict("Öğrenci zaten bu odada.");
            if (cmd.Date <= current.StartDate) return Error.Field("date", "Değişiklik tarihi mevcut yerleşimin başlangıcından sonra olmalı.");

            var room = await db.Rooms.Include(x => x.Apartment).FirstOrDefaultAsync(x => x.Id == cmd.RoomId, ct);
            if (room is null) return Error.NotFound("Oda bulunamadı.");
            if (room.Status != RoomStatus.Active) return Error.Conflict("Bu oda şu an kullanıma kapalı.");
            if (room.RoomTypeId != enrollment.RoomTypeId) return Error.Conflict("Oda, öğrencinin kayıtlı oda tipine uygun değil.");

            var existing = await PlacementRules.RoomPlacementsAsync(db, room.Id, ct);
            if (PlacementRules.Peak(existing, room.Id, cmd.Date, current.EndDate) >= room.Beds) return Error.Conflict($"{room.Name} o tarihlerde dolu.");

            var next = new Placement { PeriodId = enrollment.PeriodId, EnrollmentId = enrollmentId, RoomId = room.Id, StartDate = cmd.Date, EndDate = current.EndDate, Room = room };
            current.EndDate = cmd.Date.AddDays(-1);
            db.Placements.Add(next);

            audit.Add("placement.move", "placement", next.Id, enrollment.PeriodId, before: new { roomId = current.RoomId }, after: new { roomId = room.Id, date = cmd.Date });
            await db.SaveChangesAsync(ct);
            return EnrollmentQueryHandler.ToRef(next);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/enrollments/{id:guid}/move", async (Guid id, Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, cmd, ct)).ToOk());
    }
}

/// <summary>
/// İptal / ayrılış: { status: cancelled | left, effectiveDate, reason }.
/// Ayrılış ayından SONRAKİ kiralar ters kayıtla kapatılır (silinmez); ödenmiş kısımları avansa döner (iade edilebilir).
/// Yerleşim ayrılış gününe kısalır. Depozito kalemi kendiliğinden kapanmaz: iade edilecekse ayrıca iptal edilir.
/// </summary>
public static class EndEnrollment
{
    public record Command(EnrollmentStatus Status, DateOnly EffectiveDate, string? Reason);

    public record Response(int ReversedRents);

    public class Handler(AppDbContext db, LedgerService ledgers, AuditWriter audit)
    {
        public async Task<Result<Response>> Handle(Guid id, Guid adminId, Command cmd, CancellationToken ct)
        {
            var reason = cmd.Reason?.Trim() ?? "";
            if (cmd.Status is not (EnrollmentStatus.Cancelled or EnrollmentStatus.Left)) return Error.Field("status", "Durum seçin (iptal ya da ayrıldı).");
            if (reason.Length == 0) return Error.Field("reason", "Nedenini yazın.");
            if (reason.Length > 500) return Error.Field("reason", "Neden en fazla 500 karakter olabilir.");

            var ledger = await ledgers.LoadAsync(id, ct);
            if (ledger is null) return Error.NotFound("Kayıt bulunamadı.");
            var enrollment = ledger.Enrollment;
            if (enrollment.Status is EnrollmentStatus.Cancelled or EnrollmentStatus.Left) return Error.Conflict("Bu kayıt zaten kapatılmış.");

            var cutoff = $"{cmd.EffectiveDate.Year:D4}-{cmd.EffectiveDate.Month:D2}";
            var future = ledger.Items().Where(i => i.Kind == ChargeKind.Rent && i.Net > 0 && string.CompareOrdinal(i.Month, cutoff) > 0).ToList();

            await using var tx = await db.Database.BeginTransactionAsync(ct);

            foreach (var item in future)
            {
                var reversed = ledger.Reverse(item.Id, $"Ayrılış: {reason}", adminId);
                if (!reversed.IsSuccess) return Result<Response>.Fail(reversed.Error!);
            }

            var placements = await db.Placements.Where(x => x.EnrollmentId == id && x.EndDate > cmd.EffectiveDate).ToListAsync(ct);
            foreach (var p in placements) p.EndDate = cmd.EffectiveDate < p.StartDate ? p.StartDate : cmd.EffectiveDate;

            var before = enrollment.Status;
            enrollment.Status = cmd.Status;
            enrollment.EndedAt = cmd.EffectiveDate;
            enrollment.EndReason = reason;

            audit.Add("enrollment.end", "enrollment", id, enrollment.PeriodId, before: new { status = before },
                after: new { status = cmd.Status, effectiveDate = cmd.EffectiveDate, reversedRents = future.Count }, note: reason);
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return new Response(future.Count);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/enrollments/{id:guid}/end", async (Guid id, Command cmd, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, user.GetUserId(), cmd, ct)).ToOk());
    }
}

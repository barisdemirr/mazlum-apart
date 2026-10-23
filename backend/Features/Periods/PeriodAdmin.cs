using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Periods;

public record HalfTermDto(bool Enabled, DateOnly? FirstEnd, DateOnly? SecondStart);

/// <summary>Frontend MOCK_PERIODS şekli: { id, name, type, start, end, status, applicationsOpen, halfTerm }</summary>
public record PeriodDto(
    Guid Id, string Name, PeriodType Type, DateOnly Start, DateOnly End, PeriodStatus Status, bool ApplicationsOpen, HalfTermDto HalfTerm, DateTime? ClosedAt)
{
    public static PeriodDto From(Period p) => new(
        p.Id, p.Name, p.Type, p.StartDate, p.EndDate, p.Status, p.ApplicationsOpen,
        new HalfTermDto(p.HalfTermEnabled, p.HalfTermFirstEnd, p.HalfTermSecondStart), p.ClosedAt);
}

public static class GetPeriods
{
    /// <summary>Dönem + sayılar (dönemler sayfası kartları): iptal edilmemiş kayıt sayısı ve bekleyen başvuru sayısı</summary>
    public record Item(PeriodDto Period, int Enrollments, int PendingApplications);

    public class Handler(AppDbContext db)
    {
        public async Task<List<PeriodDto>> Handle(CancellationToken ct) =>
            (await db.Periods.AsNoTracking().OrderByDescending(x => x.StartDate).ToListAsync(ct)).Select(PeriodDto.From).ToList();

        public async Task<List<Item>> WithCounts(CancellationToken ct)
        {
            var periods = await Handle(ct);
            var enrollments = await db.Enrollments.AsNoTracking().Where(x => x.Status != EnrollmentStatus.Cancelled)
                .GroupBy(x => x.PeriodId).Select(g => new { PeriodId = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.PeriodId, x => x.Count, ct);
            var pending = await db.Applications.AsNoTracking().Where(x => x.Status == ApplicationStatus.Pending)
                .GroupBy(x => x.PeriodId).Select(g => new { PeriodId = g.Key, Count = g.Count() }).ToDictionaryAsync(x => x.PeriodId, x => x.Count, ct);
            return periods.Select(p => new Item(p, enrollments.GetValueOrDefault(p.Id), pending.GetValueOrDefault(p.Id))).ToList();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            app.MapGet("/api/admin/periods", async (Handler handler, CancellationToken ct) => Results.Ok(await handler.Handle(ct)));
            app.MapGet("/api/admin/periods/overview", async (Handler handler, CancellationToken ct) => Results.Ok(await handler.WithCounts(ct)));
        }
    }
}

/// <summary>
/// Yeni dönem: AYNI TÜRDEKİ aktif dönem KAPANIR, yeni dönem aktif başlar; hiçbir kayıt ya da muhasebe hareketi kopyalanmaz.
/// Akademik ve yaz dönemi aynı anda açık olabilir (yaz kayıtları sürerken yeni akademik dönemin kayıtları da sürer).
/// copyFromPeriodId verilirse yalnızca o dönemin fiyatları kopyalanır. Akademik dönem varsayılanı 1 Eylül – 30 Haziran.
/// </summary>
public static class CreatePeriod
{
    public record Command(string? Name, PeriodType Type, DateOnly Start, DateOnly End, Guid? CopyFromPeriodId);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<PeriodDto>> Handle(Command cmd, CancellationToken ct)
        {
            var name = (cmd.Name ?? "").Trim();
            var validator = new Validator()
                .Required("name", name, "Dönem adını yazın.").MaxLength("name", name, 80)
                .Must("type", Enum.IsDefined(cmd.Type), "Dönem tipini seçin.")
                .Must("end", cmd.Start < cmd.End, "Bitiş tarihi başlangıçtan sonra olmalı.")
                .Must("end", cmd.End.DayNumber - cmd.Start.DayNumber <= 400, "Bir dönem en fazla 13 ay olabilir.");
            if (!validator.IsValid) return validator.ToFailure<PeriodDto>();

            if (await db.Periods.AnyAsync(x => x.Name == name, ct)) return Error.Conflict("Bu adda bir dönem zaten var.");
            if (cmd.CopyFromPeriodId is { } source && !await db.Periods.AnyAsync(x => x.Id == source, ct))
                return Error.Field("copyFromPeriodId", "Fiyatların kopyalanacağı dönem bulunamadı.");

            await using var tx = await db.Database.BeginTransactionAsync(ct);

            var closing = await db.Periods.Where(x => x.Status == PeriodStatus.Active && x.Type == cmd.Type).ToListAsync(ct);
            foreach (var p in closing)
            {
                p.Status = PeriodStatus.Closed;
                p.ApplicationsOpen = false;
                p.ClosedAt = DateTime.UtcNow;
            }

            var period = new Period { Name = name, Type = cmd.Type, StartDate = cmd.Start, EndDate = cmd.End };
            db.Periods.Add(period);

            var copied = 0;
            if (cmd.CopyFromPeriodId is { } from)
            {
                var prices = await db.RoomTypePrices.AsNoTracking().Where(x => x.PeriodId == from).ToListAsync(ct);
                foreach (var p in prices)
                    db.RoomTypePrices.Add(new RoomTypePrice
                    {
                        PeriodId = period.Id, RoomTypeId = p.RoomTypeId, Monthly = p.Monthly, Deposit = p.Deposit,
                        SummerMonthly = cmd.Type == PeriodType.Academic ? p.SummerMonthly : null
                    });
                copied = prices.Count;
            }

            audit.Add("period.create", "period", period.Id, period.Id,
                after: new { period.Name, period.Type, start = period.StartDate, end = period.EndDate, closed = closing.Select(x => x.Name), copiedPrices = copied });
            await db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            return PeriodDto.From(period);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/periods", async (Command cmd, Handler handler, CancellationToken ct) => (await handler.Handle(cmd, ct)).ToOk());
    }
}

/// <summary>
/// Dönem ayarları: ad, tarihler, başvuruya açık mı, yarım dönem (açıkken iki tarih zorunlu). Kapalı dönem düzenlenemez.
/// Dönem dışında kalacak kayıt / yerleşim / bekleyen başvuru varsa tarih daraltma engellenir.
/// </summary>
public static class UpdatePeriod
{
    public record Command(string? Name, DateOnly Start, DateOnly End, bool ApplicationsOpen, HalfTermDto? HalfTerm);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<PeriodDto>> Handle(Guid id, Command cmd, CancellationToken ct)
        {
            var period = await db.Periods.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            if (period.Status == PeriodStatus.Closed) return Error.Conflict("Kapalı dönem düzenlenemez.");

            var name = (cmd.Name ?? "").Trim();
            var half = cmd.HalfTerm ?? new HalfTermDto(period.HalfTermEnabled, period.HalfTermFirstEnd, period.HalfTermSecondStart);

            var validator = new Validator()
                .Required("name", name, "Dönem adını yazın.").MaxLength("name", name, 80)
                .Must("end", cmd.Start < cmd.End, "Bitiş tarihi başlangıçtan sonra olmalı.");
            if (half.Enabled)
            {
                validator
                    .Must("halfTerm.firstEnd", half.FirstEnd is not null && half.SecondStart is not null,
                        "Yarım dönemi açmak için 1. yarının bitişini ve 2. yarının başlangıcını girin.")
                    .Must("halfTerm.secondStart", half.FirstEnd is null || half.SecondStart is null || half.FirstEnd < half.SecondStart,
                        "2. yarı, 1. yarı bittikten sonra başlamalı.")
                    .Must("halfTerm.firstEnd", half.FirstEnd is null || (half.FirstEnd > cmd.Start && half.FirstEnd < cmd.End),
                        "1. yarının bitişi dönemin içinde olmalı.")
                    .Must("halfTerm.secondStart", half.SecondStart is null || (half.SecondStart > cmd.Start && half.SecondStart < cmd.End),
                        "2. yarının başlangıcı dönemin içinde olmalı.");
            }
            if (!validator.IsValid) return validator.ToFailure<PeriodDto>();

            if (await db.Periods.AnyAsync(x => x.Name == name && x.Id != id, ct)) return Error.Conflict("Bu adda bir dönem zaten var.");

            // Dönem dışında kalacak kayıt ya da yerleşim oluşmasın
            if (await db.Enrollments.AnyAsync(x => x.PeriodId == id && x.EntryDate < cmd.Start, ct))
                return Error.Conflict("Bu tarihten önce giriş yapan kayıtlar var; başlangıç tarihi ileri alınamaz.");
            // 12 ay kalanların yerleşimi yaz sonuna (31 Ağustos) kadar sürebilir
            var yearly = db.Enrollments.Where(e => e.PeriodId == id && e.StayPlan == StayPlan.Yearly).Select(e => e.Id);
            var summerEnd = PaymentPlan.SummerEnd(cmd.End);
            if (await db.Placements.AnyAsync(x => x.PeriodId == id &&
                    ((yearly.Contains(x.EnrollmentId) && x.EndDate > summerEnd) || (!yearly.Contains(x.EnrollmentId) && x.EndDate > cmd.End)), ct))
                return Error.Conflict("Bitiş tarihinden sonrasına uzanan yerleşimler var.");
            if (await db.Applications.AnyAsync(x => x.PeriodId == id && x.Status == ApplicationStatus.Pending && (x.EntryDate < cmd.Start || x.EntryDate > cmd.End), ct))
                return Error.Conflict("Giriş tarihi yeni aralığın dışında kalan bekleyen başvurular var.");

            var before = PeriodDto.From(period);
            period.Name = name;
            period.StartDate = cmd.Start;
            period.EndDate = cmd.End;
            period.ApplicationsOpen = cmd.ApplicationsOpen;
            period.HalfTermEnabled = half.Enabled;
            period.HalfTermFirstEnd = half.FirstEnd;
            period.HalfTermSecondStart = half.SecondStart;

            audit.Add("period.update", "period", period.Id, period.Id, before: before, after: PeriodDto.From(period));
            await db.SaveChangesAsync(ct);
            return PeriodDto.From(period);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/periods/{id:guid}", async (Guid id, Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, cmd, ct)).ToOk());
    }
}

/// <summary>Dönemi kapatır (bekleyen başvuru varken kapatılamaz). Kapalı dönemde yalnızca eski borç tahsilatı yapılabilir.</summary>
public static class ClosePeriod
{
    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<PeriodDto>> Handle(Guid id, CancellationToken ct)
        {
            var period = await db.Periods.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            if (period.Status == PeriodStatus.Closed) return Error.Conflict("Dönem zaten kapalı.");

            var pending = await db.Applications.CountAsync(x => x.PeriodId == id && x.Status == ApplicationStatus.Pending, ct);
            if (pending > 0) return Error.Conflict($"{pending} bekleyen başvuru var. Önce onaylayın ya da reddedin.");

            period.Status = PeriodStatus.Closed;
            period.ApplicationsOpen = false;
            period.ClosedAt = DateTime.UtcNow;

            audit.Add("period.close", "period", period.Id, period.Id);
            await db.SaveChangesAsync(ct);
            return PeriodDto.From(period);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/periods/{id:guid}/close", async (Guid id, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, ct)).ToOk());
    }
}

/// <summary>summerMonthly: akademik dönemde 12 ay kalanların Temmuz–Ağustos aylık kirası (boşsa 12 aylık kayıt alınmaz)</summary>
public record PriceDto(Guid RoomTypeId, decimal Monthly, decimal Deposit, decimal? SummerMonthly);

public static class GetPeriodPrices
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/periods/{id:guid}/prices", async (Guid id, AppDbContext db, CancellationToken ct) =>
                Results.Ok(await db.RoomTypePrices.AsNoTracking().Where(x => x.PeriodId == id)
                    .Select(x => new PriceDto(x.RoomTypeId, x.Monthly, x.Deposit, x.SummerMonthly)).ToListAsync(ct)));
    }
}

/// <summary>
/// Dönem fiyatı (aylık kira + depozito; akademik dönemde isteğe bağlı yaz aylık fiyatı). Kapalı dönemin fiyatı değişmez;
/// değişiklik yalnızca yeni başvuruları etkiler (kayıtlar fiyatın kopyasını taşır, sonradan kalem kalem düzeltilebilir).
/// </summary>
public static class SavePeriodPrice
{
    public record Command(decimal Monthly, decimal Deposit, decimal? SummerMonthly);

    public class Handler(AppDbContext db, AuditWriter audit)
    {
        public async Task<Result<PriceDto>> Handle(Guid periodId, Guid roomTypeId, Command cmd, CancellationToken ct)
        {
            var period = await db.Periods.FirstOrDefaultAsync(x => x.Id == periodId, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            if (period.Status == PeriodStatus.Closed) return Error.Conflict("Kapalı dönemin fiyatları değiştirilemez.");
            if (!await db.RoomTypes.AnyAsync(x => x.Id == roomTypeId, ct)) return Error.NotFound("Oda tipi bulunamadı.");

            var validator = new Validator()
                .Positive("monthly", cmd.Monthly, "Aylık kira sıfırdan büyük olmalı.")
                .Must("deposit", cmd.Deposit >= 0, "Depozito eksi olamaz.")
                .Must("monthly", cmd.Monthly < 10_000_000 && cmd.Deposit < 10_000_000, "Tutar çok büyük.")
                .Must("summerMonthly", cmd.SummerMonthly is null || cmd.SummerMonthly > 0, "Yaz fiyatı sıfırdan büyük olmalı (12 ay kaydı almayacaksanız boş bırakın).")
                .Must("summerMonthly", cmd.SummerMonthly is null || cmd.SummerMonthly < 10_000_000, "Tutar çok büyük.")
                .Must("summerMonthly", cmd.SummerMonthly is null || period.Type == PeriodType.Academic, "Yaz fiyatı yalnızca akademik dönemde girilir; yaz döneminde aylık kira kullanılır.");
            if (!validator.IsValid) return validator.ToFailure<PriceDto>();

            var monthly = decimal.Round(cmd.Monthly, 2);
            var deposit = decimal.Round(cmd.Deposit, 2);
            var summer = cmd.SummerMonthly is { } sm ? decimal.Round(sm, 2) : (decimal?)null;

            var price = await db.RoomTypePrices.FirstOrDefaultAsync(x => x.PeriodId == periodId && x.RoomTypeId == roomTypeId, ct);
            var before = price is null ? null : new PriceDto(roomTypeId, price.Monthly, price.Deposit, price.SummerMonthly);
            if (price is null)
            {
                price = new RoomTypePrice { PeriodId = periodId, RoomTypeId = roomTypeId };
                db.RoomTypePrices.Add(price);
            }
            price.Monthly = monthly;
            price.Deposit = deposit;
            price.SummerMonthly = summer;

            var after = new PriceDto(roomTypeId, monthly, deposit, summer);
            audit.Add("price.update", "price", $"{periodId}:{roomTypeId}", periodId, before: before, after: after);
            await db.SaveChangesAsync(ct);
            return after;
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/periods/{id:guid}/prices/{roomTypeId:guid}", async (Guid id, Guid roomTypeId, Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, roomTypeId, cmd, ct)).ToOk());
    }
}

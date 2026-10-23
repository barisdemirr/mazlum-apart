using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Accounting;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Periods;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Applications;

/// <summary>
/// Başvuru formunun ayarları (frontend getApplicationConfig):
///  - period / halfTerm / applicationsOpen: başvuruya açık AKADEMİK dönem (yoksa period null, applicationsOpen false);
///    9 aylık dönemde period.start = Ekim başı ve nineMonth = true
///  - yearly: 12 aylık kayıt — bitiş (31 Ağustos) ve oda tipi başına Temmuz–Ağustos aylık fiyatı (fiyatı olmayan oda tipinde 12 ay seçilemez)
///  - summer: başvuruya açık YAZ dönemi ve fiyatları (yoksa null → formda "sadece yaz" seçilemez)
/// </summary>
public static class GetApplicationConfig
{
    public record PeriodRef(Guid Id, string Name, DateOnly Start, DateOnly End);

    public record RoomPrice(Guid RoomTypeId, decimal Monthly, decimal Deposit);

    public record YearlyConfig(DateOnly End, Dictionary<Guid, decimal> SummerPrices);

    public record SummerConfig(PeriodRef Period, List<RoomPrice> Prices);

    /// <summary>nineMonth: 9 aylık dönem açık (Eylül kirası yok); period.start bu durumda kiranın/girişin başladığı ilk gün (Ekim)</summary>
    public record Response(PeriodRef? Period, HalfTermDto HalfTerm, bool ApplicationsOpen, YearlyConfig? Yearly, SummerConfig? Summer, bool NineMonth = false);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/applications/config", async (AppDbContext db, CancellationToken ct) =>
            {
                var open = await db.Periods.AsNoTracking()
                    .Where(x => x.Status == PeriodStatus.Active && x.ApplicationsOpen)
                    .OrderByDescending(x => x.StartDate)
                    .ToListAsync(ct);
                var p = open.FirstOrDefault(x => x.Type == PeriodType.Academic);
                var s = open.FirstOrDefault(x => x.Type == PeriodType.Summer);

                var ids = open.Select(x => x.Id).ToList();
                var prices = await db.RoomTypePrices.AsNoTracking().Where(x => ids.Contains(x.PeriodId)).ToListAsync(ct);

                YearlyConfig? yearly = p is null ? null : new YearlyConfig(PaymentPlan.SummerEnd(p.EndDate),
                    prices.Where(x => x.PeriodId == p.Id && x.SummerMonthly != null).ToDictionary(x => x.RoomTypeId, x => x.SummerMonthly!.Value));
                SummerConfig? summer = s is null ? null : new SummerConfig(new PeriodRef(s.Id, s.Name, s.StartDate, s.EndDate),
                    prices.Where(x => x.PeriodId == s.Id).Select(x => new RoomPrice(x.RoomTypeId, x.Monthly, x.Deposit)).ToList());

                return Results.Ok(p is null
                    ? new Response(null, new HalfTermDto(false, null, null), false, null, summer)
                    : new Response(new PeriodRef(p.Id, p.Name, p.RentStart, p.EndDate),
                        p.HalfTermEnabled ? new HalfTermDto(true, p.HalfTermFirstEnd, p.HalfTermSecondStart) : new HalfTermDto(false, null, null),
                        true, yearly, summer, p.NineMonthTerm));
            }).AllowAnonymous();
    }
}

/// <summary>Web sitesinden başvuru. IP başına 10 dakikada 5 istek. Dönüş: { applicationNo }</summary>
public static class SubmitApplication
{
    public record Response(string ApplicationNo);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/applications", async (ApplicationInput input, HttpContext http, ApplicationCreateHandler handler, CancellationToken ct) =>
                    (await handler.Create(input with { PeriodId = null, RoomTypeId = null }, ApplicationSource.Online, ClientIp.Get(http), ct))
                    .ToHttp(created => Results.Ok(new Response(created.ApplicationNo))))
                .AllowAnonymous()
                .RequireRateLimiting(RatePolicies.PublicForm);
    }
}

/// <summary>İl / ilçe listesi (formdaki seçimler için)</summary>
public static class GetLocations
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/locations", () => Results.Ok(TurkeyLocations.All))
                .AllowAnonymous()
                .CacheOutputIfAvailable();
    }
}

internal static class EndpointExtensions
{
    /// <summary>Yanıta tarayıcı önbelleği başlığı ekler (değişmeyen referans verisi)</summary>
    public static RouteHandlerBuilder CacheOutputIfAvailable(this RouteHandlerBuilder builder) =>
        builder.AddEndpointFilter(async (context, next) =>
        {
            context.HttpContext.Response.Headers.CacheControl = "public,max-age=86400";
            return await next(context);
        });
}

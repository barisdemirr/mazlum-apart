using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Periods;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Applications;

/// <summary>
/// Başvuru formunun ayarları (frontend getApplicationConfig): açık dönem + yarım dönem durumu.
/// Yarım dönem kapalıyken (varsayılan) form yalnızca tam dönemdir. Açık dönem yoksa period null ve applicationsOpen false.
/// </summary>
public static class GetApplicationConfig
{
    public record PeriodRef(Guid Id, string Name, DateOnly Start, DateOnly End);

    public record Response(PeriodRef? Period, HalfTermDto HalfTerm, bool ApplicationsOpen);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/applications/config", async (AppDbContext db, CancellationToken ct) =>
            {
                var p = await db.Periods.AsNoTracking()
                    .Where(x => x.Status == PeriodStatus.Active && x.ApplicationsOpen)
                    .OrderBy(x => x.Type == PeriodType.Academic ? 0 : 1).ThenByDescending(x => x.StartDate)
                    .FirstOrDefaultAsync(ct);

                return Results.Ok(p is null
                    ? new Response(null, new HalfTermDto(false, null, null), false)
                    : new Response(new PeriodRef(p.Id, p.Name, p.StartDate, p.EndDate),
                        p.HalfTermEnabled ? new HalfTermDto(true, p.HalfTermFirstEnd, p.HalfTermSecondStart) : new HalfTermDto(false, null, null),
                        true));
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

using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Health;

public static class GetHealth
{
    public record Response(string Status, bool Database, DateTime UtcNow, DateOnly TurkeyToday);

    public class Handler(AppDbContext db)
    {
        public async Task<Response> Handle(CancellationToken ct)
        {
            var database = await db.Database.CanConnectAsync(ct);
            return new Response(database ? "ok" : "degraded", database, DateTime.UtcNow, TurkeyClock.Today);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/health", async (Handler handler, CancellationToken ct) =>
                {
                    var result = await handler.Handle(ct);
                    return result.Database ? Results.Ok(result) : Results.Json(result, statusCode: 503);
                })
                .AllowAnonymous();
    }
}

using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Audit;

/// <summary>
/// İşlem geçmişi (Sistem > İşlem geçmişi). Filtreler: periodId, entity, action (önek: "payment" -> payment.*), from/to (UTC gün).
/// before/after JSON nesnesi olarak döner.
/// </summary>
public static class GetAuditLogs
{
    public record Item(
        Guid Id, DateTime At, ActorType ActorType, string By, string Action, string Entity, string? EntityId,
        Guid? PeriodId, JsonElement? Before, JsonElement? After, string? Note);

    public record Filter(Guid? PeriodId, string? Entity, string? Action, DateOnly? From, DateOnly? To);

    public class Handler(AppDbContext db)
    {
        public async Task<PagedResult<Item>> Handle(Filter f, int page, int size, CancellationToken ct)
        {
            var query = db.AuditLogs.AsNoTracking();

            if (f.PeriodId is not null) query = query.Where(x => x.PeriodId == f.PeriodId);
            if (!string.IsNullOrWhiteSpace(f.Entity)) query = query.Where(x => x.Entity == f.Entity);
            if (!string.IsNullOrWhiteSpace(f.Action)) query = query.Where(x => x.Action.StartsWith(f.Action));
            if (f.From is not null) query = query.Where(x => x.CreatedAt >= f.From.Value.ToDateTime(TimeOnly.MinValue));
            if (f.To is not null) query = query.Where(x => x.CreatedAt < f.To.Value.AddDays(1).ToDateTime(TimeOnly.MinValue));

            var total = await query.CountAsync(ct);
            var rows = await query
                .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
                .Skip((page - 1) * size).Take(size)
                .ToListAsync(ct);

            var items = rows.Select(x => new Item(
                x.Id, x.CreatedAt, x.ActorType, x.ActorName, x.Action, x.Entity, x.EntityId, x.PeriodId,
                Parse(x.Before), Parse(x.After), x.Note)).ToList();

            return new PagedResult<Item>(items, total, page, size);
        }

        private static JsonElement? Parse(string? json)
        {
            if (string.IsNullOrWhiteSpace(json)) return null;
            using var doc = JsonDocument.Parse(json);
            return doc.RootElement.Clone();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/audit", async (Guid? periodId, string? entity, string? action, DateOnly? from, DateOnly? to,
                int? page, int? pageSize, Handler handler, CancellationToken ct) =>
            {
                var (p, s) = Paging.Normalize(page, pageSize, 50, 200);
                return Results.Ok(await handler.Handle(new Filter(periodId, entity, action, from, to), p, s, ct));
            });
    }
}

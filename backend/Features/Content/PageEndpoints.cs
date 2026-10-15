using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Content;

/// <summary>Sabit sayfa: { key, title, body, updatedAt } — key: about | contact | kvkk</summary>
public record PageDto(string Key, LocalizedText Title, LocalizedText Body, DateTime? UpdatedAt);

public static class GetPagesAdmin
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/pages", async (AppDbContext db, CancellationToken ct) =>
                Results.Ok((await db.StaticPages.AsNoTracking().OrderBy(x => x.Key).ToListAsync(ct))
                    .Select(x => new PageDto(x.Key, x.Title, x.Body ?? new LocalizedText(), x.UpdatedAt))));
    }
}

public static class GetPublicPage
{
    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/pages/{key}", async (string key, AppDbContext db, CancellationToken ct) =>
            {
                var page = await db.StaticPages.AsNoTracking().FirstOrDefaultAsync(x => x.Key == key, ct);
                return page is null
                    ? Error.NotFound("Sayfa bulunamadı.").ToProblem()
                    : Results.Ok(new PageDto(page.Key, page.Title, page.Body ?? new LocalizedText(), page.UpdatedAt));
            }).AllowAnonymous();
    }
}

public static class UpdatePage
{
    public record Command(LocalizedText? Title, LocalizedText? Body);

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/pages/{key}", async (string key, Command cmd, AppDbContext db, AuditWriter audit, CancellationToken ct) =>
            {
                var page = await db.StaticPages.FirstOrDefaultAsync(x => x.Key == key, ct);
                if (page is null) return Error.NotFound("Sayfa bulunamadı.").ToProblem();

                var validator = new Validator().LocalizedRequired("title", cmd.Title, 120).LocalizedOptional("body", cmd.Body, 20000);
                if (!validator.IsValid) return validator.ToFailure().Error!.ToProblem();

                page.Title = cmd.Title!.Trimmed();
                page.Body = cmd.Body.OrNull();
                audit.Add("page.update", "page", key);
                await db.SaveChangesAsync(ct);
                return Results.Ok(new PageDto(page.Key, page.Title, page.Body ?? new LocalizedText(), page.UpdatedAt));
            });
    }
}

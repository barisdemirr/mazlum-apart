using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Media;

/// <summary>Medya kitaplığı (en yeni üstte). kind: image | video (boşsa hepsi)</summary>
public static class GetMedia
{
    public class Handler(AppDbContext db)
    {
        public async Task<PagedResult<MediaAssetDto>> Handle(MediaKind? kind, int page, int size, CancellationToken ct)
        {
            var query = db.MediaAssets.AsNoTracking();
            if (kind is not null) query = query.Where(x => x.Kind == kind);

            var total = await query.CountAsync(ct);
            var items = await query
                .OrderByDescending(x => x.CreatedAt).ThenByDescending(x => x.Id)
                .Skip((page - 1) * size).Take(size)
                .ToListAsync(ct);

            return new PagedResult<MediaAssetDto>(items.Select(MediaAssetDto.From).ToList(), total, page, size);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/media", async (string? kind, int? page, int? pageSize, Handler handler, CancellationToken ct) =>
            {
                MediaKind? parsed = null;
                if (!string.IsNullOrWhiteSpace(kind))
                {
                    if (!QueryParsing.TryParseEnum<MediaKind>(kind, out var value))
                        return Error.Field("kind", "kind: image ya da video olmalı.").ToProblem();
                    parsed = value;
                }

                var (p, s) = Paging.Normalize(page, pageSize, 48, 100);
                return Results.Ok(await handler.Handle(parsed, p, s, ct));
            });
    }
}

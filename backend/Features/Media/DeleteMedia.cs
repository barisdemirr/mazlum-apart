using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Media;

/// <summary>
/// Medya silme. Kullanımdaysa (kapak, galeri, slayt...) silinmez ve nerede kullanıldığı söylenir.
/// Kayıt soft delete olur; dosyalar diskten silinir (paylaşımlı hostingde disk kotası için).
/// </summary>
public static class DeleteMedia
{
    public class Handler(AppDbContext db, MediaUsageChecker usage, ImageService images, VideoService videos, AuditWriter audit)
    {
        public async Task<Result> Handle(Guid id, CancellationToken ct)
        {
            var asset = await db.MediaAssets.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (asset is null) return Error.NotFound("Medya bulunamadı.");

            var usages = await usage.FindUsagesAsync(id, ct);
            if (usages.Count > 0)
            {
                var shown = string.Join(", ", usages.Take(5));
                var more = usages.Count > 5 ? $" ve {usages.Count - 5} yer daha" : "";
                return Error.Conflict($"Bu dosya kullanımda, silinemez: {shown}{more}.");
            }

            db.MediaAssets.Remove(asset); // soft delete'e çevrilir
            audit.Add("media.delete", "media", asset.Id, before: new { asset.FileName, asset.Kind });
            await db.SaveChangesAsync(ct);

            if (asset.Kind == MediaKind.Video)
            {
                videos.Delete(asset.FilePath);
                if (asset.PosterPath is not null) images.Delete(asset.PosterPath);
            }
            else
            {
                images.Delete(asset.FilePath);
            }

            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapDelete("/api/admin/media/{id:guid}", async (Guid id, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, ct)).ToNoContent());
    }
}

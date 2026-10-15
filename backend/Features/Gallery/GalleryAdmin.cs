using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Gallery;

/// <summary>Panel galeri öğesi (frontend GalleryDialog): sıra dizideki konumdur</summary>
public record GalleryAdminItem(
    Guid Id, Guid MediaId, string Type, string Url, string? Poster, string Name, long Size, TagDto? Tag, LocalizedText Caption, int Order);

/// <summary>Bir dairenin galerisi (fotoğraflar + en fazla 1 video). Dosyalar önce /api/admin/media(/videos) ile yüklenir, sonra buraya eklenir.</summary>
public static class GalleryLimits
{
    public const int MaxItems = 30;
}

public static class GetApartmentGallery
{
    public class Handler(AppDbContext db)
    {
        public async Task<Result<List<GalleryAdminItem>>> Handle(Guid apartmentId, CancellationToken ct)
        {
            if (!await db.Apartments.AnyAsync(x => x.Id == apartmentId, ct)) return Error.NotFound("Daire bulunamadı.");

            var rooms = await db.Rooms.AsNoTracking().Where(x => x.ApartmentId == apartmentId).ToDictionaryAsync(x => x.Id, ct);
            var items = await db.ApartmentMedia.AsNoTracking().Include(x => x.MediaAsset)
                .Where(x => x.ApartmentId == apartmentId)
                .OrderBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt)
                .ToListAsync(ct);

            return items.Where(x => x.MediaAsset is not null).Select(x => new GalleryAdminItem(
                x.Id, x.MediaAssetId, x.IsVideo ? "video" : "image", x.MediaAsset!.FilePath, x.MediaAsset.PosterPath,
                x.MediaAsset.FileName, x.MediaAsset.FileSize, GalleryTags.ToDto(x, rooms), x.Caption ?? new LocalizedText(), x.OrderIndex)).ToList();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/apartments/{id:guid}/gallery", async (Guid id, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, ct)).ToOk());
    }
}

/// <summary>Galeriye medya ekler: { mediaIds: [...], tag? }. Kural: daire başına en fazla 1 video, toplam en fazla 30 öğe.</summary>
public static class AddGalleryItems
{
    public record Command(List<Guid>? MediaIds, TagInput? Tag);

    public class Handler(AppDbContext db, AuditWriter audit, GetApartmentGallery.Handler reader)
    {
        public async Task<Result<List<GalleryAdminItem>>> Handle(Guid apartmentId, Command cmd, CancellationToken ct)
        {
            if (!await db.Apartments.AnyAsync(x => x.Id == apartmentId, ct)) return Error.NotFound("Daire bulunamadı.");

            var ids = (cmd.MediaIds ?? []).Distinct().ToList();
            if (ids.Count == 0) return Error.Field("mediaIds", "Eklenecek dosyayı seçin.");

            var assets = await db.MediaAssets.Where(x => ids.Contains(x.Id)).ToListAsync(ct);
            if (assets.Count != ids.Count) return Error.Field("mediaIds", "Dosyalardan biri bulunamadı ya da silinmiş.");

            var existing = await db.ApartmentMedia.Where(x => x.ApartmentId == apartmentId).ToListAsync(ct);
            if (existing.Any(x => ids.Contains(x.MediaAssetId))) return Error.Conflict("Bu dosya zaten galeride.");
            if (existing.Count + ids.Count > GalleryLimits.MaxItems)
                return Error.Conflict($"Bir dairede en fazla {GalleryLimits.MaxItems} dosya olabilir.");

            var incomingVideos = assets.Count(x => x.Kind == MediaKind.Video);
            if (incomingVideos > 1) return Error.Field("mediaIds", "Her daireye yalnızca 1 video eklenebilir.");
            if (incomingVideos == 1 && existing.Any(x => x.IsVideo))
                return Error.Conflict("Bu dairede zaten bir video var. Yenisini eklemek için önce mevcut videoyu silin.");

            var roomIds = await db.Rooms.Where(x => x.ApartmentId == apartmentId).Select(x => x.Id).ToListAsync(ct);
            var validator = new Validator();
            var order = existing.Count == 0 ? 0 : existing.Max(x => x.OrderIndex) + 1;

            foreach (var asset in ids.Select(id => assets.First(a => a.Id == id)))
            {
                var item = new ApartmentMedia
                {
                    ApartmentId = apartmentId,
                    MediaAssetId = asset.Id,
                    IsVideo = asset.Kind == MediaKind.Video,
                    OrderIndex = order++
                };
                GalleryTags.Apply(item, cmd.Tag, roomIds, validator, "tag");
                db.ApartmentMedia.Add(item);
            }

            if (!validator.IsValid) return validator.ToFailure<List<GalleryAdminItem>>();

            audit.Add("apartment.gallery.add", "apartment", apartmentId, after: new { media = ids });
            await db.SaveChangesAsync(ct);
            return await reader.Handle(apartmentId, ct);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPost("/api/admin/apartments/{id:guid}/gallery", async (Guid id, Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, cmd, ct)).ToOk());
    }
}

/// <summary>Etiket ve açıklama güncelleme: { tag: { key, tr?, en? } | null, caption: { tr, en } | null }</summary>
public static class UpdateGalleryItem
{
    public record Command(TagInput? Tag, LocalizedText? Caption);

    public class Handler(AppDbContext db, GetApartmentGallery.Handler reader)
    {
        public async Task<Result<List<GalleryAdminItem>>> Handle(Guid apartmentId, Guid itemId, Command cmd, CancellationToken ct)
        {
            var item = await db.ApartmentMedia.FirstOrDefaultAsync(x => x.Id == itemId && x.ApartmentId == apartmentId, ct);
            if (item is null) return Error.NotFound("Galeri öğesi bulunamadı.");

            var roomIds = await db.Rooms.Where(x => x.ApartmentId == apartmentId).Select(x => x.Id).ToListAsync(ct);
            var validator = new Validator().LocalizedOptional("caption", cmd.Caption, 120);
            GalleryTags.Apply(item, cmd.Tag, roomIds, validator, "tag");
            if (!validator.IsValid) return validator.ToFailure<List<GalleryAdminItem>>();

            item.Caption = cmd.Caption.OrNull();
            await db.SaveChangesAsync(ct);
            return await reader.Handle(apartmentId, ct);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/apartments/{id:guid}/gallery/{itemId:guid}", async (Guid id, Guid itemId, Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, itemId, cmd, ct)).ToOk());
    }
}

/// <summary>Sıralama: { itemIds: [...] } galerinin TAMAMI yeni sırasıyla gönderilir</summary>
public static class ReorderGallery
{
    public record Command(List<Guid>? ItemIds);

    public class Handler(AppDbContext db, GetApartmentGallery.Handler reader)
    {
        public async Task<Result<List<GalleryAdminItem>>> Handle(Guid apartmentId, Command cmd, CancellationToken ct)
        {
            var items = await db.ApartmentMedia.Where(x => x.ApartmentId == apartmentId).ToListAsync(ct);
            var ids = cmd.ItemIds ?? [];
            if (ids.Count != items.Count || ids.Distinct().Count() != ids.Count || items.Any(x => !ids.Contains(x.Id)))
                return Error.Field("itemIds", "Sıralama listesi galerinin tüm öğelerini birer kez içermeli.");

            foreach (var item in items) item.OrderIndex = ids.IndexOf(item.Id);
            await db.SaveChangesAsync(ct);
            return await reader.Handle(apartmentId, ct);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/apartments/{id:guid}/gallery/order", async (Guid id, Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, cmd, ct)).ToOk());
    }
}

/// <summary>
/// Galeriden çıkarma. deleteFile=true (varsayılan) ise dosya başka hiçbir yerde kullanılmıyorsa medya kitaplığından ve diskten de silinir
/// (galeri için yüklenen fotoğraflar kitaplıkta yer tutmasın).
/// </summary>
public static class RemoveGalleryItem
{
    public class Handler(AppDbContext db, MediaUsageChecker usage, ImageService images, VideoService videos, AuditWriter audit)
    {
        public async Task<Result> Handle(Guid apartmentId, Guid itemId, bool deleteFile, CancellationToken ct)
        {
            var item = await db.ApartmentMedia.Include(x => x.MediaAsset)
                .FirstOrDefaultAsync(x => x.Id == itemId && x.ApartmentId == apartmentId, ct);
            if (item is null) return Error.NotFound("Galeri öğesi bulunamadı.");

            db.ApartmentMedia.Remove(item);
            audit.Add("apartment.gallery.remove", "apartment", apartmentId, before: new { item.MediaAssetId, item.IsVideo });
            await db.SaveChangesAsync(ct);

            var asset = item.MediaAsset;
            if (!deleteFile || asset is null) return Result.Success();
            if ((await usage.FindUsagesAsync(asset.Id, ct)).Count > 0) return Result.Success(); // başka yerde kullanılıyor: dosya kalır

            db.MediaAssets.Remove(asset);
            await db.SaveChangesAsync(ct);
            if (asset.Kind == MediaKind.Video)
            {
                videos.Delete(asset.FilePath);
                if (asset.PosterPath is not null) images.Delete(asset.PosterPath);
            }
            else images.Delete(asset.FilePath);

            return Result.Success();
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapDelete("/api/admin/apartments/{id:guid}/gallery/{itemId:guid}", async (Guid id, Guid itemId, bool? deleteFile, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, itemId, deleteFile ?? true, ct)).ToNoContent());
    }
}

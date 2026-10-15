using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Media;

/// <summary>Medya açıklaması (alt metin, TR/EN). Dosya değişmez; yeni dosya için yeni yükleme yapılır.</summary>
public static class UpdateMedia
{
    public record Command(LocalizedText? Alt);

    public class Handler(AppDbContext db)
    {
        public async Task<Result<MediaAssetDto>> Handle(Guid id, Command cmd, CancellationToken ct)
        {
            var validator = new Validator().LocalizedOptional("alt", cmd.Alt, 200);
            if (!validator.IsValid) return validator.ToFailure<MediaAssetDto>();

            var asset = await db.MediaAssets.FirstOrDefaultAsync(x => x.Id == id, ct);
            if (asset is null) return Error.NotFound("Medya bulunamadı.");

            asset.AltText = cmd.Alt.OrNull();
            await db.SaveChangesAsync(ct);
            return MediaAssetDto.From(asset);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapPut("/api/admin/media/{id:guid}", async (Guid id, Command cmd, Handler handler, CancellationToken ct) =>
                (await handler.Handle(id, cmd, ct)).ToOk());
    }
}

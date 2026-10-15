using System.Security.Claims;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Media;

/// <summary>
/// Görsel yükleme (multipart/form-data): file, altTr?, altEn?
/// Görsel WebP'ye çevrilir ve 3 boyutta saklanır (thumb/md/lg); orijinal saklanmaz.
/// </summary>
public static class UploadImage
{
    public record Command(IFormFile? File, LocalizedText? Alt);

    public class Handler(AppDbContext db, ImageService images, IOptions<UploadOptions> options)
    {
        public async Task<Result<MediaAssetDto>> Handle(Command cmd, Guid userId, CancellationToken ct)
        {
            var validator = new Validator()
                .Must("file", cmd.File is { Length: > 0 }, "Bir görsel seçin.")
                .Must("file", cmd.File is null || cmd.File.Length <= options.Value.MaxImageBytes,
                    $"Görsel en fazla {options.Value.MaxImageMb} MB olabilir.")
                .LocalizedOptional("alt", cmd.Alt, 200);
            if (!validator.IsValid) return validator.ToFailure<MediaAssetDto>();

            await using var stream = cmd.File!.OpenReadStream();
            var processed = await images.SaveAsync(stream, StorageArea.Public, ct);
            if (!processed.IsSuccess) return Result<MediaAssetDto>.Fail(processed.Error!);

            var image = processed.Value!;
            var asset = new MediaAsset
            {
                Kind = MediaKind.Image,
                FileName = UploadNames.Sanitize(cmd.File.FileName, "gorsel"),
                FilePath = image.Path,
                MimeType = "image/webp",
                FileSize = image.StoredBytes,
                Width = image.Width,
                Height = image.Height,
                AltText = cmd.Alt.OrNull(),
                UploadedById = userId
            };

            try
            {
                db.MediaAssets.Add(asset);
                await db.SaveChangesAsync(ct);
            }
            catch
            {
                images.Delete(image.Path); // DB kaydı olmayan dosya kalmasın
                throw;
            }

            return MediaAssetDto.From(asset);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app)
        {
            var limits = app.ServiceProvider.GetRequiredService<IOptions<UploadOptions>>().Value;

            app.MapPost("/api/admin/media", async (IFormCollection form, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                {
                    var cmd = new Command(form.Files.GetFile("file"), UploadNames.Alt(form));
                    return (await handler.Handle(cmd, user.GetUserId(), ct)).ToOk();
                })
                .DisableAntiforgery() // kimlik doğrulama Authorization başlığıyla, çerez yok: CSRF söz konusu değil
                .WithMetadata(new RequestSizeLimitAttribute(limits.MaxImageBytes + 1024 * 1024))
                .RequireAuthorization(AppPolicies.AdminUpload) // oturum token'ı ya da yükleme bileti
                .RequireRateLimiting(RatePolicies.Upload);
        }
    }
}

/// <summary>Yükleme formlarında ortak küçük yardımcılar</summary>
public static class UploadNames
{
    public static string Sanitize(string? name, string fallback)
    {
        var fileName = Path.GetFileName(name ?? "");
        if (string.IsNullOrWhiteSpace(fileName)) fileName = fallback;
        return fileName.Length > 255 ? fileName[..255] : fileName;
    }

    public static string? Clean(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    public static LocalizedText? Alt(IFormCollection form)
    {
        var tr = Clean(form["altTr"]);
        var en = Clean(form["altEn"]);
        return tr is null && en is null ? null : new LocalizedText { Tr = tr ?? "", En = en };
    }
}

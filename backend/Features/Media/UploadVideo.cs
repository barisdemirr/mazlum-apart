using System.Globalization;
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
/// Video yükleme (multipart/form-data): file (MP4/WebM), poster (kapak karesi görseli), durationSeconds, width, height, altTr?, altEn?
/// Video frontend'de 720p / ~1,5 Mbps'e sıkıştırılmış gelir (lib/admin/videoCompress.js); sunucu yalnızca doğrular ve saklar.
/// Kapak karesini de frontend üretir (lib/admin/videoPoster.js); sunucu onu WebP varyantlarına çevirir.
/// </summary>
public static class UploadVideo
{
    public record Command(IFormFile? File, IFormFile? Poster, int? DurationSeconds, int? Width, int? Height, LocalizedText? Alt);

    public class Handler(AppDbContext db, VideoService videos, ImageService images, IOptions<UploadOptions> options)
    {
        public async Task<Result<MediaAssetDto>> Handle(Command cmd, Guid userId, CancellationToken ct)
        {
            var o = options.Value;
            var validator = new Validator()
                .Must("file", cmd.File is { Length: > 0 }, "Bir video seçin.")
                .Must("file", cmd.File is null || cmd.File.Length <= o.MaxVideoBytes, $"Video en fazla {o.MaxVideoMb} MB olabilir.")
                .Must("poster", cmd.Poster is { Length: > 0 }, "Videonun kapak karesi eksik.")
                .Must("durationSeconds", cmd.DurationSeconds is > 0 && cmd.DurationSeconds <= o.MaxVideoSeconds,
                    $"Video en fazla {o.MaxVideoSeconds / 60} dakika olabilir.")
                // 720p hedefi: kısa kenar en fazla 720 (küçük toleransla); dikey video da olabilir
                .Must("width", cmd.Width is > 0 and <= 4096 && cmd.Height is > 0 and <= 4096, "Video boyutları geçersiz.")
                .Must("width", cmd.Width is null || cmd.Height is null || Math.Min(cmd.Width.Value, cmd.Height.Value) <= 1080,
                    "Video sıkıştırılmadan gönderilmiş görünüyor (en fazla 720p beklenir).")
                .LocalizedOptional("alt", cmd.Alt, 200);
            if (!validator.IsValid) return validator.ToFailure<MediaAssetDto>();

            // Önce kapak (küçük, hızlı); sonra video
            await using var posterStream = cmd.Poster!.OpenReadStream();
            var poster = await images.SaveAsync(posterStream, StorageArea.Public, ct);
            if (!poster.IsSuccess) return Error.Field("poster", poster.Error!.Details?.Values.FirstOrDefault()?.FirstOrDefault() ?? "Kapak görseli geçersiz.");

            Result<StoredVideo> saved;
            try
            {
                await using var videoStream = cmd.File!.OpenReadStream();
                saved = await videos.SaveAsync(videoStream, ct);
            }
            catch
            {
                images.Delete(poster.Value!.Path);
                throw;
            }

            if (!saved.IsSuccess)
            {
                images.Delete(poster.Value!.Path);
                return Result<MediaAssetDto>.Fail(saved.Error!);
            }

            var video = saved.Value!;
            var asset = new MediaAsset
            {
                Kind = MediaKind.Video,
                FileName = UploadNames.Sanitize(cmd.File!.FileName, "video"),
                FilePath = video.Path,
                MimeType = video.MimeType,
                FileSize = video.Bytes + poster.Value!.StoredBytes,
                Width = cmd.Width!.Value,
                Height = cmd.Height!.Value,
                DurationSeconds = cmd.DurationSeconds,
                PosterPath = poster.Value.Path,
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
                videos.Delete(video.Path);
                images.Delete(poster.Value.Path);
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

            app.MapPost("/api/admin/media/videos", async (IFormCollection form, ClaimsPrincipal user, Handler handler, CancellationToken ct) =>
                {
                    var cmd = new Command(
                        form.Files.GetFile("file"),
                        form.Files.GetFile("poster"),
                        Int(form["durationSeconds"]),
                        Int(form["width"]),
                        Int(form["height"]),
                        UploadNames.Alt(form));
                    return (await handler.Handle(cmd, user.GetUserId(), ct)).ToOk();
                })
                .DisableAntiforgery()
                .WithMetadata(new RequestSizeLimitAttribute(limits.MaxVideoBytes + limits.MaxImageBytes + 1024 * 1024))
                .RequireRateLimiting(RatePolicies.Upload);
        }

        // Tarayıcı süreyi ondalıklı gönderebilir ("37.48"): yukarı yuvarlanır
        private static int? Int(string? value) =>
            double.TryParse(value, NumberStyles.Float, CultureInfo.InvariantCulture, out var d) && d > 0 ? (int)Math.Ceiling(d) : null;
    }
}

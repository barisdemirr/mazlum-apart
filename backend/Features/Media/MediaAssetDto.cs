using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Features.Media;

/// <summary>
/// Medya kitaplığı öğesi. url: görselde lg varyantı (/uploads/.._lg.webp), videoda video dosyası.
/// posterUrl: yalnızca videoda kapak karesinin lg varyantı. Frontend md/thumb'ı "_lg.webp" kuralıyla türetir.
/// </summary>
public record MediaAssetDto(
    Guid Id,
    MediaKind Kind,
    string Name,
    string Url,
    string? PosterUrl,
    int Width,
    int Height,
    long Size,
    int? DurationSeconds,
    LocalizedText Alt,
    DateTime CreatedAt)
{
    public static MediaAssetDto From(MediaAsset x) => new(
        x.Id, x.Kind, x.FileName, x.FilePath, x.PosterPath, x.Width, x.Height, x.FileSize, x.DurationSeconds,
        x.AltText ?? new LocalizedText(), x.CreatedAt);
}

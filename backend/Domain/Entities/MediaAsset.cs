using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;

namespace MazlumApart.Domain.Entities;

/// <summary>
/// Medya kitaplığı kaydı.
///  Görsel: yalnızca WebP varyantları saklanır (thumb 320, md 800, lg 1600 px genişlik). FilePath = lg varyantı:
///          /uploads/2026/10/{ad}_lg.webp  -> frontend lib/media.js "_lg.webp" kısmını "_md"/"_thumb" ile değiştirir.
///  Video : frontend'de 720p / ~1,5 Mbps'e sıkıştırılmış MP4 ya da WebM. FilePath = video dosyası,
///          PosterPath = kapak karesinin lg varyantı (aynı WebP kuralı).
/// </summary>
public class MediaAsset : BaseEntity
{
    public MediaKind Kind { get; set; } = MediaKind.Image;
    public string FileName { get; set; } = "";     // yüklenen dosyanın adı (yalnızca gösterim)
    public string FilePath { get; set; } = "";
    public string MimeType { get; set; } = "";
    public long FileSize { get; set; }             // sunucuda kaplanan toplam bayt (tüm varyantlar)
    public int Width { get; set; }
    public int Height { get; set; }
    public int? DurationSeconds { get; set; }      // yalnızca video
    public string? PosterPath { get; set; }        // yalnızca video
    public LocalizedText? AltText { get; set; }
    public Guid? UploadedById { get; set; }
}

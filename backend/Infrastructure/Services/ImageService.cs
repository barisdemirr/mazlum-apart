using Microsoft.Extensions.Options;
using MazlumApart.Shared;
using SkiaSharp;

namespace MazlumApart.Infrastructure.Services;

/// <summary>Dosyanın nereye yazılacağı: herkese açık (wwwroot/uploads) ya da özel (App_Data/private, yalnızca yetkili uçtan okunur)</summary>
public enum StorageArea { Public, Private }

public record ProcessedImage(string Path, long StoredBytes, int Width, int Height);

/// <summary>
/// Görsel işleme (SkiaSharp). Yüklenen görsel doğrulanır, EXIF yönü düzeltilir ve YALNIZCA WebP varyantları saklanır:
///   thumb 320 px · md 800 px · lg 1600 px (genişlik; küçük görsel büyütülmez). Orijinal dosya saklanmaz (disk tasarrufu).
/// Dönen yol lg varyantıdır: /uploads/2026/10/{ad}_lg.webp (frontend lib/media.js bu kurala göre md/thumb üretir).
/// </summary>
public class ImageService(IWebHostEnvironment env, IOptions<UploadOptions> options)
{
    private const int MaxDimension = 12000;
    private const long MaxPixels = 50_000_000;

    public static readonly (string Suffix, int Width, int Quality)[] Variants =
    [
        ("thumb", 320, 75),
        ("md", 800, 80),
        ("lg", 1600, 82)
    ];

    /// <summary>"/uploads/2026/10/abc_lg.webp" + "md" -> "/uploads/2026/10/abc_md.webp"</summary>
    public static string VariantPath(string lgPath, string suffix) =>
        lgPath.EndsWith("_lg.webp", StringComparison.Ordinal) ? lgPath[..^"_lg.webp".Length] + $"_{suffix}.webp" : lgPath;

    public async Task<Result<ProcessedImage>> SaveAsync(Stream input, StorageArea area, CancellationToken ct)
    {
        var maxBytes = options.Value.MaxImageBytes;

        using var buffer = new MemoryStream();
        await CopyLimitedAsync(input, buffer, maxBytes, ct);
        if (buffer.Length == 0 || buffer.Length > maxBytes)
            return Invalid($"Dosya boş ya da {options.Value.MaxImageMb} MB sınırını aşıyor.");

        buffer.Position = 0;

        // Uzantıya değil içeriğe bakılır: dosya gerçekten bir görsel mi?
        using var codec = SKCodec.Create(buffer);
        if (codec is null) return Invalid("Dosya geçerli bir görsel değil.");

        if (codec.EncodedFormat is not (SKEncodedImageFormat.Jpeg or SKEncodedImageFormat.Png or SKEncodedImageFormat.Webp))
            return Invalid("Yalnızca JPEG, PNG ve WebP görseller kabul edilir.");

        var info = codec.Info;
        if (info.Width <= 0 || info.Height <= 0 || info.Width > MaxDimension || info.Height > MaxDimension ||
            (long)info.Width * info.Height > MaxPixels)
            return Invalid("Görsel çok büyük (en fazla 12000 px ve 50 megapiksel).");

        using var decoded = SKBitmap.Decode(codec);
        if (decoded is null) return Invalid("Görsel okunamadı.");

        // Telefon fotoğraflarındaki EXIF yönünü uygula (null: döndürmeye gerek yok)
        using var oriented = Orient(decoded, codec.EncodedOrigin);
        var source = oriented ?? decoded;

        var (directory, urlPrefix) = Folder(area);
        var name = Guid.CreateVersion7().ToString("N");
        var created = new List<string>();
        long total = 0;

        try
        {
            foreach (var (suffix, width, quality) in Variants)
            {
                var targetWidth = Math.Min(width, source.Width);
                var targetHeight = Math.Max(1, (int)Math.Round(source.Height * (double)targetWidth / source.Width));

                using var resized = targetWidth < source.Width
                    ? source.Resize(new SKImageInfo(targetWidth, targetHeight), new SKSamplingOptions(SKCubicResampler.Mitchell))
                      ?? throw new InvalidOperationException("Görsel yeniden boyutlandırılamadı.")
                    : null;

                using var image = SKImage.FromBitmap(resized ?? source);
                using var data = image.Encode(SKEncodedImageFormat.Webp, quality);

                var file = Path.Combine(directory, $"{name}_{suffix}.webp");
                created.Add(file);
                await using var fs = File.Create(file);
                data.SaveTo(fs);
                total += data.Size;
            }
        }
        catch
        {
            foreach (var file in created) TryDelete(file); // yarım kalan dosyaları temizle
            throw;
        }

        return Result<ProcessedImage>.Success(new ProcessedImage($"{urlPrefix}/{name}_lg.webp", total, source.Width, source.Height));
    }

    /// <summary>Bir görselin tüm varyantlarını diskten siler (lg yolu verilir)</summary>
    public void Delete(string lgPath)
    {
        foreach (var (suffix, _, _) in Variants)
            TryDelete(ToPhysicalPath(VariantPath(lgPath, suffix)));
    }

    /// <summary>Saklanan yolu diskteki tam yola çevirir. "/uploads/..." -> wwwroot, "private/..." -> App_Data</summary>
    public string ToPhysicalPath(string storedPath)
    {
        var relative = storedPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        var root = storedPath.StartsWith("private/", StringComparison.Ordinal)
            ? Path.Combine(env.ContentRootPath, "App_Data")
            : env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot");

        var full = Path.GetFullPath(Path.Combine(root, relative));
        // Yol kökün dışına çıkamaz ("../" ile başka klasöre erişim engeli)
        if (!full.StartsWith(Path.GetFullPath(root), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Geçersiz dosya yolu.");
        return full;
    }

    /// <summary>Bugünün klasörü: (disk yolu, saklanacak yol öneki). Yoksa oluşturulur.</summary>
    public (string Directory, string UrlPrefix) Folder(StorageArea area)
    {
        var now = DateTime.UtcNow;
        var (root, prefix) = area == StorageArea.Public
            ? (Path.Combine(env.WebRootPath ?? Path.Combine(env.ContentRootPath, "wwwroot"), "uploads"), "/uploads")
            : (Path.Combine(env.ContentRootPath, "App_Data", "private"), "private");

        var directory = Path.Combine(root, now.ToString("yyyy"), now.ToString("MM"));
        Directory.CreateDirectory(directory);
        return (directory, $"{prefix}/{now:yyyy}/{now:MM}");
    }

    /// <summary>Akışı en fazla max+1 bayt okuyarak kopyalar (dev dosyayı belleğe almadan reddetmek için)</summary>
    private static async Task CopyLimitedAsync(Stream input, Stream output, long max, CancellationToken ct)
    {
        var chunk = new byte[81920];
        long total = 0;
        int read;
        while ((read = await input.ReadAsync(chunk, ct)) > 0)
        {
            total += read;
            if (total > max) { output.SetLength(max + 1); return; }
            await output.WriteAsync(chunk.AsMemory(0, read), ct);
        }
    }

    internal static void TryDelete(string path)
    {
        try { File.Delete(path); } catch { /* temizlik başarısız olursa yut */ }
    }

    private static Result<ProcessedImage> Invalid(string message) =>
        Result<ProcessedImage>.Fail(Error.Field("file", message));

    private static SKBitmap? Orient(SKBitmap src, SKEncodedOrigin origin)
    {
        float w = src.Width, h = src.Height;
        SKMatrix matrix;
        var swap = false;

        switch (origin)
        {
            case SKEncodedOrigin.TopRight: matrix = new SKMatrix(-1, 0, w, 0, 1, 0, 0, 0, 1); break;
            case SKEncodedOrigin.BottomRight: matrix = new SKMatrix(-1, 0, w, 0, -1, h, 0, 0, 1); break;
            case SKEncodedOrigin.BottomLeft: matrix = new SKMatrix(1, 0, 0, 0, -1, h, 0, 0, 1); break;
            case SKEncodedOrigin.LeftTop: matrix = new SKMatrix(0, 1, 0, 1, 0, 0, 0, 0, 1); swap = true; break;
            case SKEncodedOrigin.RightTop: matrix = new SKMatrix(0, -1, h, 1, 0, 0, 0, 0, 1); swap = true; break;
            case SKEncodedOrigin.RightBottom: matrix = new SKMatrix(0, -1, h, -1, 0, w, 0, 0, 1); swap = true; break;
            case SKEncodedOrigin.LeftBottom: matrix = new SKMatrix(0, 1, 0, -1, 0, w, 0, 0, 1); swap = true; break;
            default: return null; // TopLeft
        }

        var dst = new SKBitmap(swap ? src.Height : src.Width, swap ? src.Width : src.Height);
        using var canvas = new SKCanvas(dst);
        canvas.SetMatrix(matrix);
        canvas.DrawBitmap(src, 0, 0);
        return dst;
    }
}

using System.Text;
using Microsoft.Extensions.Options;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Services;

public record StoredVideo(string Path, string MimeType, long Bytes);

/// <summary>
/// Video kaydı. Paylaşımlı hostingde ffmpeg olmadığı için video SUNUCUDA İŞLENMEZ: frontend 720p / ~1,5 Mbps'e sıkıştırıp gönderir.
/// Sunucu yalnızca doğrular:
///  - boyut sınırı (Uploads:MaxVideoMb)
///  - içerik gerçekten MP4/MOV (ISO-BMFF "ftyp" kutusu) ya da WebM (EBML başlığı + "webm" türü) mi — uzantıya güvenilmez
/// Dosya diske parça parça yazılır (belleğe alınmaz); sınır aşılırsa yarım dosya silinir.
/// </summary>
public class VideoService(ImageService images, IOptions<UploadOptions> options)
{
    private static readonly byte[] Ebml = [0x1A, 0x45, 0xDF, 0xA3];

    public async Task<Result<StoredVideo>> SaveAsync(Stream input, CancellationToken ct)
    {
        var max = options.Value.MaxVideoBytes;

        // İlk 64 bayt: biçim tespiti için
        var head = new byte[64];
        var headLength = await ReadAtLeastAsync(input, head, ct);
        var format = Detect(head.AsSpan(0, headLength));
        if (format is null)
            return Invalid("Yalnızca MP4 ya da WebM video kabul edilir.");

        var (directory, prefix) = images.Folder(StorageArea.Public);
        var name = Guid.CreateVersion7().ToString("N");
        var file = Path.Combine(directory, $"{name}{format.Value.Extension}");

        long total = 0;
        try
        {
            await using var fs = File.Create(file);
            await fs.WriteAsync(head.AsMemory(0, headLength), ct);
            total = headLength;

            var chunk = new byte[81920];
            int read;
            while ((read = await input.ReadAsync(chunk, ct)) > 0)
            {
                total += read;
                if (total > max) break;
                await fs.WriteAsync(chunk.AsMemory(0, read), ct);
            }
        }
        catch
        {
            ImageService.TryDelete(file);
            throw;
        }

        if (total > max)
        {
            ImageService.TryDelete(file);
            return Invalid($"Video en fazla {options.Value.MaxVideoMb} MB olabilir. Sıkıştırma tamamlanmadan yüklenmiş olabilir.");
        }

        if (total < 1024)
        {
            ImageService.TryDelete(file);
            return Invalid("Video dosyası boş ya da bozuk.");
        }

        return Result<StoredVideo>.Success(new StoredVideo($"{prefix}/{name}{format.Value.Extension}", format.Value.Mime, total));
    }

    public void Delete(string path) => ImageService.TryDelete(images.ToPhysicalPath(path));

    private static (string Extension, string Mime)? Detect(ReadOnlySpan<byte> head)
    {
        // MP4 / MOV: 4-8. baytlar "ftyp"
        if (head.Length >= 12 && Encoding.ASCII.GetString(head.Slice(4, 4)) == "ftyp")
        {
            var brand = Encoding.ASCII.GetString(head.Slice(8, 4));
            return brand == "qt  " ? (".mov", "video/quicktime") : (".mp4", "video/mp4");
        }

        // WebM: EBML başlığı ve ilk baytlarda "webm" belge türü (Matroska .mkv kabul edilmez)
        if (head.Length >= 4 && head[..4].SequenceEqual(Ebml) && Encoding.ASCII.GetString(head).Contains("webm"))
            return (".webm", "video/webm");

        return null;
    }

    private static async Task<int> ReadAtLeastAsync(Stream input, byte[] buffer, CancellationToken ct)
    {
        var filled = 0;
        while (filled < buffer.Length)
        {
            var read = await input.ReadAsync(buffer.AsMemory(filled), ct);
            if (read == 0) break;
            filled += read;
        }
        return filled;
    }

    private static Result<StoredVideo> Invalid(string message) => Result<StoredVideo>.Fail(Error.Field("file", message));
}

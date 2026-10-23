using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Services;

/// <summary>Saklanan belge: yol (App_Data altında, istemciye hiç gösterilmez), temizlenmiş özgün ad, boyut, SHA-256</summary>
public record StoredDocument(string Path, string FileName, long Size, string Sha256);

/// <summary>
/// Öğrenci belgesi (yalnızca PDF). Güvenlik katmanları:
///  - Boyut sınırı (Uploads:MaxDocumentMb) akış okunurken uygulanır: büyük dosya belleğe alınmadan reddedilir.
///  - Uzantı .pdf olmalı; içerik İMZAYLA doğrulanır (%PDF- başlığı + %%EOF sonu). İstemcinin bildirdiği Content-Type'a güvenilmez.
///  - HTML/script ile başlayan "çok dilli" (polyglot) dosyalar ve betik/gömülü dosya içeren PDF'ler reddedilir
///    (/JavaScript, /JS, /Launch, /EmbeddedFile, /RichMedia; #xx kaçışlı yazımlar da çözülerek bakılır).
///  - Dosya wwwroot DIŞINDA (App_Data/private/documents/yyyy/MM) rastgele GUID adıyla yazılır: adresi tahmin edilemez,
///    statik olarak sunulmaz; yalnızca yönetici ucu okur. Kullanıcının verdiği ad yola hiç karışmaz.
/// </summary>
public partial class DocumentStorage(IWebHostEnvironment env, IOptions<UploadOptions> options, ILogger<DocumentStorage> logger)
{
    private const string Prefix = "private/documents";

    [GeneratedRegex(@"#([0-9A-Fa-f]{2})")]
    private static partial Regex NameEscape();

    [GeneratedRegex(@"/(JavaScript|JS|Launch|EmbeddedFiles?|RichMedia)(?![A-Za-z0-9])")]
    private static partial Regex Dangerous();

    public async Task<Result<StoredDocument>> SavePdfAsync(IFormFile? file, CancellationToken ct)
    {
        var max = options.Value.MaxDocumentBytes;
        if (file is null || file.Length == 0) return Error.Field("document", "Öğrenci belgesini (PDF) yükleyin.");
        if (file.Length > max) return Error.Field("document", $"Belge en fazla {options.Value.MaxDocumentMb} MB olabilir.");
        if (!string.Equals(System.IO.Path.GetExtension(file.FileName), ".pdf", StringComparison.OrdinalIgnoreCase))
            return Error.Field("document", "Belge PDF biçiminde olmalı.");

        byte[] bytes;
        await using (var input = file.OpenReadStream())
        using (var buffer = new MemoryStream())
        {
            var chunk = new byte[81920];
            int read;
            while ((read = await input.ReadAsync(chunk, ct)) > 0)
            {
                if (buffer.Length + read > max) return Error.Field("document", $"Belge en fazla {options.Value.MaxDocumentMb} MB olabilir.");
                buffer.Write(chunk, 0, read);
            }
            bytes = buffer.ToArray();
        }

        if (Inspect(bytes) is { } problem) return Error.Field("document", problem);

        var now = DateTime.UtcNow;
        var stored = $"{Prefix}/{now:yyyy}/{now:MM}/{Guid.NewGuid():N}.pdf";
        var full = ToPhysicalPath(stored);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(full)!);
        await using (var output = new FileStream(full, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            await output.WriteAsync(bytes, ct);

        return new StoredDocument(stored, CleanName(file.FileName), bytes.LongLength, Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant());
    }

    /// <summary>İçerik denetimi: sorun yoksa null, varsa kullanıcıya gösterilecek mesaj</summary>
    private static string? Inspect(byte[] bytes)
    {
        const string notPdf = "Dosya geçerli bir PDF değil. e-Devlet'ten indirdiğin belgeyi olduğu gibi yükle.";
        if (bytes.Length < 64) return notPdf;

        var head = bytes.AsSpan(0, Math.Min(1024, bytes.Length));
        if (head.IndexOf("%PDF-"u8) < 0) return notPdf;
        var headText = Encoding.Latin1.GetString(head).ToLowerInvariant();
        if (headText.Contains("<html") || headText.Contains("<script") || headText.Contains("<svg")) return notPdf;

        var tail = bytes.AsSpan(Math.Max(0, bytes.Length - 2048));
        if (tail.IndexOf("%%EOF"u8) < 0) return notPdf;

        var text = NameEscape().Replace(Encoding.Latin1.GetString(bytes), m => ((char)Convert.ToInt32(m.Groups[1].Value, 16)).ToString());
        if (Dangerous().IsMatch(text))
            return "Belgede izin verilmeyen içerik (betik ya da gömülü dosya) var. Belgeyi e-Devlet'ten yeniden indirip yükle.";

        return null;
    }

    /// <summary>Özgün ad yalnızca gösterim içindir: yol ayırıcıları ve denetim karakterleri atılır, en fazla 120 karakter</summary>
    private static string CleanName(string? name)
    {
        var raw = System.IO.Path.GetFileName(name ?? "");
        var clean = new string(raw.Where(c => !char.IsControl(c) && "<>:\"/\\|?*".IndexOf(c) < 0).ToArray()).Trim();
        if (clean.Length == 0) clean = "ogrenci-belgesi.pdf";
        if (clean.Length > 120) clean = clean[..116] + ".pdf";
        return clean;
    }

    /// <summary>Saklanan yolu disk yoluna çevirir; yalnızca belge klasörünün içine izin verir</summary>
    public string ToPhysicalPath(string stored)
    {
        if (!stored.StartsWith(Prefix + "/", StringComparison.Ordinal)) throw new InvalidOperationException("Geçersiz belge yolu.");
        var root = System.IO.Path.GetFullPath(System.IO.Path.Combine(env.ContentRootPath, "App_Data", "private", "documents"));
        var full = System.IO.Path.GetFullPath(System.IO.Path.Combine(env.ContentRootPath, "App_Data", stored.Replace('/', System.IO.Path.DirectorySeparatorChar)));
        if (!full.StartsWith(root + System.IO.Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("Geçersiz belge yolu.");
        return full;
    }

    public void Delete(string? stored)
    {
        if (string.IsNullOrEmpty(stored)) return;
        try
        {
            var full = ToPhysicalPath(stored);
            if (File.Exists(full)) File.Delete(full);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Belge silinemedi: {Path}", stored);
        }
    }
}

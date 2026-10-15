using MazlumApart.Infrastructure.Database;

namespace MazlumApart.Infrastructure.Services;

/// <summary>
/// Bir medya kaydının kullanıldığı yerleri okunabilir metin olarak döndürür (kullanımdaysa silinemez).
/// Yeni bir entity medya kullanmaya başlayınca buraya bir sorgu eklenir:
///   aşama 3: oda tipi kapağı, daire galerisi, slaytlar.
/// </summary>
public class MediaUsageChecker(AppDbContext db)
{
    public Task<List<string>> FindUsagesAsync(Guid mediaId, CancellationToken ct)
    {
        _ = db;
        _ = mediaId;
        _ = ct;
        return Task.FromResult(new List<string>());
    }
}

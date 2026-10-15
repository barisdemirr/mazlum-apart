using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Infrastructure.Database;

namespace MazlumApart.Infrastructure.Services;

/// <summary>
/// Bir medya kaydının kullanıldığı yerleri okunabilir metin olarak döndürür (kullanımdaysa silinemez).
/// Yeni bir entity medya kullanmaya başlayınca buraya bir sorgu eklenir.
/// </summary>
public class MediaUsageChecker(AppDbContext db)
{
    public async Task<List<string>> FindUsagesAsync(Guid mediaId, CancellationToken ct)
    {
        var usages = new List<string>();

        usages.AddRange(await db.RoomTypes.AsNoTracking()
            .Where(x => x.CoverMediaId == mediaId)
            .Select(x => "Oda tipi kapağı: " + x.Slug)
            .ToListAsync(ct));

        usages.AddRange(await db.ApartmentMedia.AsNoTracking()
            .Where(x => x.MediaAssetId == mediaId)
            .Join(db.Apartments, m => m.ApartmentId, a => a.Id, (m, a) => "Daire galerisi: " + a.Name)
            .ToListAsync(ct));

        var slides = await db.Slides.AsNoTracking().CountAsync(x => x.MediaId == mediaId, ct);
        if (slides > 0) usages.Add($"Anasayfa slaytı ({slides})");

        var settings = await db.SiteSettings.AsNoTracking().FirstOrDefaultAsync(x => x.Id == SiteSetting.SingletonId, ct);
        if (settings?.HeroVideoMediaId == mediaId) usages.Add("Anasayfa videosu (site ayarları)");
        if (settings?.MapMediaId == mediaId) usages.Add("Konum görseli (site ayarları)");

        return usages;
    }
}

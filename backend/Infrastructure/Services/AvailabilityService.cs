using MazlumApart.Infrastructure.Database;

namespace MazlumApart.Infrastructure.Services;

/// <summary>Bir odanın seçilen dönemdeki yatak sayımları: dolu (yerleşmiş) ve ayrılmış (başvurusu bekleyen/onaylı ama yerleşmemiş)</summary>
public record RoomBedCounts(int Occupied, int Reserved);

/// <summary>
/// Yatak durumu HESAPLANIR, elle tutulmaz (MAZLUM_APART_DOLULUK_SISTEMI.md).
/// Panel öğrenciyi YATAĞA değil ODAYA yerleştirir; sitedeki yatak kutuları odanın yatak sayısından türetilir:
///   önce "dolu" kadar yatak, sonra "ayrılmış" kadar yatak, kalanı "boş".
/// Aşama 3: kayıt/yerleşim tabloları henüz yok, tüm yataklar boş görünür. Aşama 4'te yerleşim ve başvurulardan hesaplanır.
/// </summary>
public class AvailabilityService(AppDbContext db)
{
    public Task<Dictionary<Guid, RoomBedCounts>> GetRoomCountsAsync(Guid? periodId, IReadOnlyCollection<Guid> roomIds, CancellationToken ct)
    {
        _ = db;
        _ = periodId;
        _ = ct;
        return Task.FromResult(roomIds.ToDictionary(id => id, _ => new RoomBedCounts(0, 0)));
    }
}

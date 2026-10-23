using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Enums;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Infrastructure.Services;

/// <summary>Bir odanın yatak sayımları: dolu (yerleşmiş) ve ayrılmış (bekleyen başvuru / onaylı ama yerleşmemiş kayıt)</summary>
public record RoomBedCounts(int Occupied, int Reserved);

/// <summary>
/// Yatak durumu HESAPLANIR, elle tutulmaz (MAZLUM_APART_DOLULUK_SISTEMI.md).
/// Panel öğrenciyi YATAĞA değil ODAYA yerleştirir; sitedeki yatak kutuları odanın yatak sayısından türetilir:
///   önce "dolu" kadar yatak, sonra "ayrılmış" kadar yatak, kalanı "boş".
///   dolu     = o gün (bugün; dönem henüz başlamadıysa dönemin ilk günü) odada yerleşimi olan kayıtlar — HANGİ DÖNEMDEN olursa olsun
///              (yaz döneminde, akademik dönemden 12 ay kalan öğrenciler de odayı doldurur)
///   ayrılmış = bu odayı tercih eden bekleyen başvurular + bu odayı tercih edip onaylanmış ama henüz yerleşmemiş kayıtlar
/// </summary>
public class AvailabilityService(AppDbContext db)
{
    public async Task<Dictionary<Guid, RoomBedCounts>> GetRoomCountsAsync(Guid? periodId, IReadOnlyCollection<Guid> roomIds, CancellationToken ct)
    {
        var result = roomIds.ToDictionary(id => id, _ => new RoomBedCounts(0, 0));
        if (periodId is null || roomIds.Count == 0) return result;

        var period = await db.Periods.AsNoTracking().FirstOrDefaultAsync(x => x.Id == periodId, ct);
        if (period is null) return result;

        var today = TurkeyClock.Today;
        var day = today < period.StartDate ? period.StartDate : today > period.EndDate ? period.EndDate : today;

        var occupied = await db.Placements.AsNoTracking()
            .Where(x => roomIds.Contains(x.RoomId) && x.StartDate <= day && x.EndDate >= day)
            .GroupBy(x => x.RoomId)
            .Select(g => new { RoomId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        // Bekleyen başvurular
        var pending = await db.Applications.AsNoTracking()
            .Where(x => x.PeriodId == periodId && x.Status == ApplicationStatus.Pending && x.PreferredRoomId != null && roomIds.Contains(x.PreferredRoomId.Value))
            .GroupBy(x => x.PreferredRoomId!.Value)
            .Select(g => new { RoomId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        // Onaylı ama henüz hiçbir odaya yerleşmemiş kayıtlar (başvuruda tercih ettikleri oda için yer tutulur)
        var waiting = await (
                from e in db.Enrollments.AsNoTracking()
                join a in db.Applications.AsNoTracking() on e.ApplicationId equals a.Id
                where e.PeriodId == periodId && e.Status == EnrollmentStatus.Approved
                      && a.PreferredRoomId != null && roomIds.Contains(a.PreferredRoomId.Value)
                      && !db.Placements.Any(p => p.EnrollmentId == e.Id)
                group a by a.PreferredRoomId!.Value into g
                select new { RoomId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        foreach (var id in roomIds)
        {
            var o = occupied.FirstOrDefault(x => x.RoomId == id)?.Count ?? 0;
            var r = (pending.FirstOrDefault(x => x.RoomId == id)?.Count ?? 0) + (waiting.FirstOrDefault(x => x.RoomId == id)?.Count ?? 0);
            result[id] = new RoomBedCounts(o, r);
        }

        return result;
    }
}

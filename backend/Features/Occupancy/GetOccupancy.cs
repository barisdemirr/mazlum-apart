using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Enums;
using MazlumApart.Features.Departures;
using MazlumApart.Features.Enrollments;
using MazlumApart.Features.Structure;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Occupancy;

/// <summary>
/// Seçilen gündeki doluluk (Yerleşim & Doluluk sayfası). Bekleyen başvurular doluluğu DEĞİŞTİRMEZ; yalnızca yerleşimler sayılır.
/// Kapalı/bakımdaki oda kapasiteye sayılmaz. day boşsa: dönem içindeyse bugün, değilse dönemin ilk/son günü.
/// Çıkış / geçici ayrılış durumu (madde 18) YER SAYIMINI DEĞİŞTİRMEZ: ayrılan öğrenci yine odanın sakini sayılır, yatak sayıları aynı kalır.
/// Presence alanları yalnızca etiket / renk içindir ve seçilen güne göre hesaplanır.
/// </summary>
public static class GetOccupancy
{
    public record Occupant(Guid PlacementId, Guid EnrollmentId, Guid StudentId, string Name, string Phone, DateOnly Start, DateOnly End, OccupantPresence Presence);

    public record RoomOccupancy(Guid Id, string Name, Guid RoomTypeId, string RoomTypeName, int Beds, RoomStatus Status, bool Usable, int Free, List<Occupant> Occupants);

    public record ApartmentOccupancy(Guid Id, string Name, int Floor, int Beds, int Taken, int Free, int FullRooms, int EmptyRooms, List<RoomOccupancy> Rooms, ApartmentPresence Presence);

    public record Totals(int Beds, int Taken, int Free, decimal Rate);

    public record Response(DateOnly Day, List<ApartmentOccupancy> Apartments, Totals Totals, int WaitingPlacement);

    public class Handler(AppDbContext db, PresenceReader presence)
    {
        public async Task<Result<Response>> Handle(Guid periodId, DateOnly? day, CancellationToken ct)
        {
            var period = await db.Periods.AsNoTracking().FirstOrDefaultAsync(x => x.Id == periodId, ct);
            if (period is null) return Error.NotFound("Dönem bulunamadı.");
            var today = day ?? EnrollmentQueryHandler.DayIn(period);

            // Sıra: yöneticinin belirlediği daire türü sırası → dairenin kendi sırası; odalar da oda tipi sırasına göre
            var order = await StructureOrder.LoadAsync(db, ct);
            var apartments = (await db.Apartments.AsNoTracking()
                .Include(x => x.Rooms).ThenInclude(r => r.RoomType)
                .ToListAsync(ct))
                .OrderBy(x => order.ApartmentType(x.ApartmentTypeId)).ThenBy(x => x.OrderIndex).ThenBy(x => x.Name).ToList();

            var live = await (
                from p in db.Placements.AsNoTracking()
                join e in db.Enrollments.AsNoTracking() on p.EnrollmentId equals e.Id
                join s in db.Students.IgnoreQueryFilters().AsNoTracking() on e.StudentId equals s.Id
                // Gün bazlı: o gün odada kalan herkes (yaz döneminde akademik dönemden 12 ay kalanlar dahil)
                where p.StartDate <= today && p.EndDate >= today
                select new { p.Id, p.RoomId, EnrollmentId = e.Id, StudentId = s.Id, Name = s.FirstName + " " + s.LastName, s.Phone, p.StartDate, p.EndDate })
                .ToListAsync(ct);
            var byRoom = live.ToLookup(x => x.RoomId);

            // Çıkış / geçici ayrılış durumu: seçilen güne göre hesaplanır, hiçbir şey saklanmaz
            var presenceByEnrollment = await presence.ForEnrollmentsAsync(live.Select(x => x.EnrollmentId).Distinct().ToList(), today, ct);
            var statuses = await presence.StatusesAsync(ct);

            var waiting = await db.Enrollments.CountAsync(e => e.PeriodId == periodId && e.Status == EnrollmentStatus.Approved
                && !db.Placements.Any(p => p.EnrollmentId == e.Id), ct);

            var result = apartments.Select(a =>
            {
                var rooms = a.Rooms.OrderBy(r => order.RoomType(r.RoomTypeId)).ThenBy(r => r.OrderIndex).ThenBy(r => r.Name).Select(r =>
                {
                    var occupants = byRoom[r.Id].Select(o => new Occupant(o.Id, o.EnrollmentId, o.StudentId, o.Name, o.Phone, o.StartDate, o.EndDate, presenceByEnrollment[o.EnrollmentId])).ToList();
                    var usable = r.Status == RoomStatus.Active;
                    return new RoomOccupancy(r.Id, r.Name, r.RoomTypeId, r.RoomType?.Name.Tr ?? "", r.Beds, r.Status, usable,
                        usable ? Math.Max(0, r.Beds - occupants.Count) : 0, occupants);
                }).ToList();

                var beds = rooms.Where(r => r.Usable).Sum(r => r.Beds);
                var taken = rooms.Sum(r => r.Occupants.Count);
                var apartmentPresence = PresenceReader.ApartmentOf(
                    rooms.SelectMany(r => r.Occupants).Select(o => o.Presence).ToList(), statuses.GetValueOrDefault(a.Id));
                return new ApartmentOccupancy(a.Id, a.Name, a.Floor, beds, taken, Math.Max(0, beds - taken),
                    rooms.Count(r => r.Usable && r.Free == 0), rooms.Count(r => r.Usable && r.Occupants.Count == 0), rooms, apartmentPresence);
            }).ToList();

            var totalBeds = result.Sum(a => a.Beds);
            var totalTaken = result.Sum(a => a.Taken);
            return new Response(today, result,
                new Totals(totalBeds, totalTaken, Math.Max(0, totalBeds - totalTaken), totalBeds == 0 ? 0 : Math.Round((decimal)totalTaken / totalBeds, 2)),
                waiting);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/occupancy", async (Guid periodId, DateOnly? day, Handler handler, CancellationToken ct) =>
                (await handler.Handle(periodId, day, ct)).ToOk());
    }
}
using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Presence;
using MazlumApart.Features.Structure;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Shared;

namespace MazlumApart.Features.Departures;

/// <summary>
/// "Belirli tarihlerde boş kalacak daireler": seçilen tarih aralığında hangi dairenin hangi günler TAMAMEN boş kalacağını listeler.
/// GET /api/admin/apartments/vacancies?from=2026-12-20&amp;to=2027-01-10[&amp;includeUnoccupied=true]
/// Her gün, o gün dairede yerleşimi olan öğrencilerin durumundan hesaplanır (bildirilmiş ayrılış ve dönüş tarihleri esas alınır):
///   vacated      = hepsinin çıkışı onaylı (tamamen boşaldı)
///   temporary    = hepsi ayrıldı, en az biri geçici ayrılışta (geçici olarak tamamen boş)
///   exit_pending = hepsi ayrıldı, çıkışlar bildirilmiş ama onaylanmamış
///   unoccupied   = o gün kimse yerleşik değil (yalnızca includeUnoccupied=true iken)
/// Ardışık aynı türdeki günler tek aralık olur. Hiç boş günü olmayan daire listeye girmez.
/// İleri tarihli bir ayrılış daireyi bugünden boş göstermez; yalnızca kendi tarihinden itibaren sayılır.
/// Kimsenin yerleşik olmadığı daireler (hiç satılmamış) varsayılan olarak listelenmez.
/// </summary>
public static class ApartmentVacancies
{
    public record Run(DateOnly From, DateOnly To, int Days, string Kind);

    public record Row(Guid ApartmentId, string Name, int Floor, int TotalDays, List<Run> Runs);

    public record Response(DateOnly From, DateOnly To, List<Row> Apartments);

    public class Handler(AppDbContext db)
    {
        private const int MaxDays = 366;

        public async Task<Result<Response>> Handle(DateOnly? from, DateOnly? to, bool includeUnoccupied, CancellationToken ct)
        {
            var today = TurkeyClock.Today;
            var start = from ?? today;
            var end = to ?? start.AddDays(30);

            var v = new Validator()
                .Must("to", end >= start, "Bitiş tarihi başlangıçtan önce olamaz.")
                .Must("to", end.DayNumber - start.DayNumber < MaxDays, "En fazla bir yıllık aralık seçilebilir.");
            if (!v.IsValid) return v.ToFailure<Response>();

            var order = await StructureOrder.LoadAsync(db, ct);
            var apartments = (await db.Apartments.AsNoTracking().ToListAsync(ct))
                .OrderBy(a => order.ApartmentType(a.ApartmentTypeId)).ThenBy(a => a.OrderIndex).ThenBy(a => a.Name).ToList();

            // Aralıkla kesişen tüm yerleşimler (hangi dönemden olursa olsun)
            var placements = await (
                    from p in db.Placements.AsNoTracking()
                    join r in db.Rooms.AsNoTracking() on p.RoomId equals r.Id
                    where p.StartDate <= end && p.EndDate >= start
                    select new { r.ApartmentId, p.EnrollmentId, p.StartDate, p.EndDate })
                .ToListAsync(ct);

            var ids = placements.Select(p => p.EnrollmentId).Distinct().ToList();
            var exits = (await db.EnrollmentExits.AsNoTracking().Where(x => ids.Contains(x.EnrollmentId)).ToListAsync(ct))
                .ToDictionary(x => x.EnrollmentId, x => PresenceReader.ExitFactOf(x)!);
            var leaves = (await db.TemporaryLeaves.AsNoTracking().Where(x => ids.Contains(x.EnrollmentId)).ToListAsync(ct))
                .ToLookup(x => x.EnrollmentId, x => PresenceReader.LeaveFactOf(x));
            var byApartment = placements.ToLookup(p => p.ApartmentId);

            var rows = new List<Row>();
            foreach (var apartment in apartments)
            {
                var mine = byApartment[apartment.Id].ToList();
                if (mine.Count == 0 && !includeUnoccupied) continue;

                var runs = new List<Run>();
                string? currentKind = null;
                var runStart = start;

                for (var day = start; day <= end; day = day.AddDays(1))
                {
                    var states = mine
                        .Where(p => p.StartDate <= day && p.EndDate >= day)
                        .Select(p => PresenceMath.StateOf(exits.GetValueOrDefault(p.EnrollmentId), leaves[p.EnrollmentId], day, today))
                        .ToList();

                    var kind = PresenceMath.ApartmentStateOf(states) switch
                    {
                        ApartmentPresenceState.FullyVacated => "vacated",
                        ApartmentPresenceState.TemporarilyEmpty => "temporary",
                        ApartmentPresenceState.ExitPending => "exit_pending",
                        ApartmentPresenceState.Unoccupied when includeUnoccupied => "unoccupied",
                        _ => null
                    };

                    if (kind == currentKind) continue;
                    if (currentKind is not null) runs.Add(new Run(runStart, day.AddDays(-1), day.DayNumber - runStart.DayNumber, currentKind));
                    currentKind = kind;
                    runStart = day;
                }
                if (currentKind is not null) runs.Add(new Run(runStart, end, end.DayNumber - runStart.DayNumber + 1, currentKind));

                if (runs.Count > 0) rows.Add(new Row(apartment.Id, apartment.Name, apartment.Floor, runs.Sum(r => r.Days), runs));
            }

            return new Response(start, end, rows);
        }
    }

    public class Endpoint : IEndpoint
    {
        public void MapEndpoint(IEndpointRouteBuilder app) =>
            app.MapGet("/api/admin/apartments/vacancies", async (DateOnly? from, DateOnly? to, bool? includeUnoccupied, Handler h, CancellationToken ct) =>
                (await h.Handle(from, to, includeUnoccupied ?? false, ct)).ToOk());
    }
}

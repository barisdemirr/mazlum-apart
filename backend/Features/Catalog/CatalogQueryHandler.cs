using Microsoft.EntityFrameworkCore;
using MazlumApart.Domain.Entities;
using MazlumApart.Domain.Enums;
using MazlumApart.Domain.ValueObjects;
using MazlumApart.Features.Gallery;
using MazlumApart.Infrastructure.Database;
using MazlumApart.Infrastructure.Services;
using MazlumApart.Shared;

namespace MazlumApart.Features.Catalog;

/// <summary>
/// Herkese açık katalog sorguları (oda tipleri, daireler, galeri, doluluk). Öğrenci bilgisi ASLA dönmez.
/// Görünürlük: oda tipi aktif + daire yayında + oda aktif. Fiyatlar güncel (aktif) akademik dönemden.
/// Bir apartın veri hacmi küçük olduğu için yapı tek seferde belleğe alınıp burada şekillenir.
/// </summary>
public class CatalogQueryHandler(AppDbContext db, AvailabilityService availability)
{
    private sealed record Structure(List<RoomType> Types, List<Apartment> Apartments, Period? Period, List<RoomTypePrice> Prices);

    private sealed record FlatView(Apartment Apartment, List<Room> ActiveRooms, int Beds, int? PerKitchen, int? PerBathroom);

    /// <summary>Güncel dönem: aktif akademik dönem (yoksa herhangi bir aktif dönem)</summary>
    public async Task<Period?> CurrentPeriodAsync(CancellationToken ct) =>
        await db.Periods.AsNoTracking()
            .Where(x => x.Status == PeriodStatus.Active)
            .OrderBy(x => x.Type == PeriodType.Academic ? 0 : 1).ThenByDescending(x => x.StartDate)
            .FirstOrDefaultAsync(ct);

    private async Task<Structure> LoadAsync(CancellationToken ct)
    {
        var types = await db.RoomTypes.AsNoTracking().Include(x => x.CoverMedia)
            .Where(x => x.IsActive).OrderBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt).ToListAsync(ct);

        var apartments = await db.Apartments.AsNoTracking()
            .Where(x => x.IsPublished)
            .Include(x => x.Rooms.Where(r => r.Status == RoomStatus.Active))
            .Include(x => x.Media).ThenInclude(m => m.MediaAsset)
            .OrderBy(x => x.OrderIndex).ThenBy(x => x.Name)
            .AsSplitQuery()
            .ToListAsync(ct);

        var period = await CurrentPeriodAsync(ct);
        var prices = period is null
            ? new List<RoomTypePrice>()
            : await db.RoomTypePrices.AsNoTracking().Where(x => x.PeriodId == period.Id).ToListAsync(ct);

        return new Structure(types, apartments, period, prices);
    }

    private static FlatView View(Apartment apartment)
    {
        var rooms = apartment.Rooms.OrderBy(r => r.OrderIndex).ThenBy(r => r.Name).ToList();
        var beds = rooms.Sum(r => r.Beds);
        return new FlatView(apartment, rooms, beds,
            apartment.Kitchens > 0 ? (int)Math.Ceiling(beds / (double)apartment.Kitchens) : null,
            apartment.Bathrooms > 0 ? (int)Math.Ceiling(beds / (double)apartment.Bathrooms) : null);
    }

    private static List<FlatView> FlatsOf(Structure s, Guid roomTypeId) =>
        s.Apartments.Where(a => a.Rooms.Any(r => r.RoomTypeId == roomTypeId)).Select(View).ToList();

    private static IEnumerable<ApartmentMedia> LiveMedia(Apartment a) => a.Media.Where(m => m.MediaAsset is not null);

    private static int PhotoCount(Apartment a) => LiveMedia(a).Count(m => !m.IsVideo);
    private static bool HasVideo(Apartment a) => LiveMedia(a).Any(m => m.IsVideo);

    private static MediaRef? Cover(Apartment a)
    {
        var first = LiveMedia(a).Where(m => !m.IsVideo).OrderBy(m => m.OrderIndex).FirstOrDefault();
        return first is null ? null : new MediaRef(first.MediaAsset!.FilePath, first.MediaAsset.AltText);
    }

    private async Task<Dictionary<Guid, RoomBedCounts>> CountsAsync(Structure s, IEnumerable<FlatView> flats, CancellationToken ct) =>
        await availability.GetRoomCountsAsync(s.Period?.Id, flats.SelectMany(f => f.ActiveRooms).Select(r => r.Id).Distinct().ToList(), ct);

    private static int Free(IEnumerable<Room> rooms, Dictionary<Guid, RoomBedCounts> counts) =>
        rooms.Sum(r => counts.TryGetValue(r.Id, out var c) ? Math.Max(0, r.Beds - c.Occupied - c.Reserved) : r.Beds);

    // ───────── oda tipleri ─────────

    public async Task<List<RoomTypeCard>> RoomTypesAsync(CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var all = s.Types.SelectMany(t => FlatsOf(s, t.Id)).ToList();
        var counts = await CountsAsync(s, all, ct);
        return s.Types.Select(t => Card(s, t, counts)).ToList();
    }

    public async Task<RoomTypeDetail?> RoomTypeAsync(string slug, CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var type = s.Types.FirstOrDefault(x => x.Slug == slug);
        if (type is null) return null;

        var counts = await CountsAsync(s, FlatsOf(s, type.Id), ct);
        var c = Card(s, type, counts);
        return new RoomTypeDetail(c.Id, c.Slug, c.Name, c.Image, c.HasVideo, c.PhotoCount, c.PeopleInFlat, c.PeopleSharingKitchen,
            c.PeopleSharingBathroom, c.MonthlyPrice, c.DepositAmount, c.Currency, c.FlatCount, c.BedsFree, Paragraphs(type.Description),
            c.RoomCount, c.PeopleInFlatMax, c.PeopleSharingKitchenMax, c.PeopleSharingBathroomMax);
    }

    private static RoomTypeCard Card(Structure s, RoomType t, Dictionary<Guid, RoomBedCounts> counts)
    {
        var flats = FlatsOf(s, t.Id);
        var price = s.Prices.FirstOrDefault(p => p.RoomTypeId == t.Id);
        var image = t.CoverMedia is not null
            ? new MediaRef(t.CoverMedia.FilePath, t.CoverMedia.AltText)
            : flats.Select(f => Cover(f.Apartment)).FirstOrDefault(x => x is not null);

        return new RoomTypeCard(
            t.Id, t.Slug, t.Name, image,
            flats.Any(f => HasVideo(f.Apartment)),
            flats.Sum(f => PhotoCount(f.Apartment)),
            flats.Count > 0 ? flats.Min(f => f.Beds) : null,
            flats.Where(f => f.PerKitchen is not null).Select(f => f.PerKitchen).Min(),
            flats.Where(f => f.PerBathroom is not null).Select(f => f.PerBathroom).Min(),
            price?.Monthly, price?.Deposit, "TRY",
            flats.Count,
            flats.Sum(f => Free(f.ActiveRooms.Where(r => r.RoomTypeId == t.Id), counts)),
            flats.Sum(f => f.ActiveRooms.Count(r => r.RoomTypeId == t.Id)),
            flats.Count > 0 ? flats.Max(f => f.Beds) : null,
            flats.Where(f => f.PerKitchen is not null).Select(f => f.PerKitchen).Max(),
            flats.Where(f => f.PerBathroom is not null).Select(f => f.PerBathroom).Max());
    }

    private static LocalizedList Paragraphs(LocalizedText? text)
    {
        static List<string> Split(string? value) => string.IsNullOrWhiteSpace(value)
            ? []
            : value.Replace("\r\n", "\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

        return new LocalizedList(Split(text?.Tr), Split(text?.En));
    }

    // ───────── odalar (oda tipi sayfası) ─────────

    /// <summary>Tipin tüm odaları (yayındaki dairelerde, aktif). Boş yatağı olanlar önde; daire sırası korunur.</summary>
    public async Task<List<RoomListing>?> RoomsAsync(string typeSlug, CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var type = s.Types.FirstOrDefault(x => x.Slug == typeSlug);
        if (type is null) return null;

        var flats = FlatsOf(s, type.Id);
        var counts = await CountsAsync(s, flats, ct);
        var list = new List<RoomListing>();

        foreach (var f in flats)
        {
            var apartmentName = RoomNames.Apartment(f.Apartment.Name);
            var apartmentCover = Cover(f.Apartment);

            foreach (var r in f.ActiveRooms.Where(r => r.RoomTypeId == type.Id))
            {
                // Odanın kendi fotoğrafları: galeride bu odaya etiketlenenler
                var photos = LiveMedia(f.Apartment)
                    .Where(m => !m.IsVideo && m.TagKind == GalleryTagKind.Room && m.RoomId == r.Id)
                    .OrderBy(m => m.OrderIndex).ToList();
                var c = counts.TryGetValue(r.Id, out var value) ? value : new RoomBedCounts(0, 0);

                list.Add(new RoomListing(
                    r.Id, RoomNames.Room(r.Name), f.Apartment.Slug, apartmentName, f.Apartment.Floor,
                    r.Beds, Math.Max(0, r.Beds - c.Occupied - c.Reserved),
                    f.Beds, f.PerKitchen, f.PerBathroom, r.Features,
                    photos.Count > 0 ? new MediaRef(photos[0].MediaAsset!.FilePath, photos[0].MediaAsset!.AltText) : apartmentCover,
                    photos.Count));
            }
        }

        return list.OrderBy(x => x.BedsFree > 0 ? 0 : 1).ToList();
    }

    // ───────── daireler ─────────

    public async Task<List<ApartmentSummary>?> ApartmentsAsync(string typeSlug, CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var type = s.Types.FirstOrDefault(x => x.Slug == typeSlug);
        if (type is null) return null;

        var flats = FlatsOf(s, type.Id);
        var counts = await CountsAsync(s, flats, ct);
        return flats.Select(f => Summary(f, type.Id, counts)).ToList();
    }

    private static ApartmentSummary Summary(FlatView f, Guid typeId, Dictionary<Guid, RoomBedCounts> counts)
    {
        var typeRooms = f.ActiveRooms.Where(r => r.RoomTypeId == typeId).ToList();
        return new ApartmentSummary(
            f.Apartment.Id, f.Apartment.Slug, RoomNames.Apartment(f.Apartment.Name), f.Apartment.Floor,
            f.Beds, f.PerKitchen, f.PerBathroom,
            typeRooms.Sum(r => r.Beds), Free(typeRooms, counts),
            Cover(f.Apartment), HasVideo(f.Apartment), PhotoCount(f.Apartment));
    }

    public async Task<ApartmentDetail?> ApartmentAsync(string typeSlug, string apartmentSlug, CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var type = s.Types.FirstOrDefault(x => x.Slug == typeSlug);
        if (type is null) return null;

        var flat = FlatsOf(s, type.Id).FirstOrDefault(f => f.Apartment.Slug == apartmentSlug);
        if (flat is null) return null;

        var counts = await CountsAsync(s, [flat], ct);
        var summary = Summary(flat, type.Id, counts);
        var typeRooms = flat.ActiveRooms.Where(r => r.RoomTypeId == type.Id).ToList();

        // Galeri etiketlerinde dairenin tüm (aktif) odaları tanınır
        var roomMap = flat.ActiveRooms.ToDictionary(r => r.Id);
        var gallery = PublicGallery(flat.Apartment, roomMap);

        return new ApartmentDetail(
            summary.Id, summary.Slug, summary.Name, summary.Floor, summary.PeopleInFlat, summary.PeopleSharingKitchen,
            summary.PeopleSharingBathroom, summary.BedsTotal, summary.BedsFree, summary.Cover, summary.HasVideo, summary.PhotoCount,
            gallery,
            flat.Apartment.SharedAreas,
            typeRooms.Select(r => new PublicRoomInfo(r.Id, RoomNames.Room(r.Name), r.Features, r.Beds)).ToList(),
            new Availability(PeriodOf(s.Period), [AvailabilityOf(flat, typeRooms, counts)]));
    }

    private static List<PublicGalleryItem> PublicGallery(Apartment apartment, IReadOnlyDictionary<Guid, Room> rooms) =>
        LiveMedia(apartment)
            .OrderByDescending(m => m.IsVideo).ThenBy(m => m.OrderIndex)
            .Select(m =>
            {
                var tag = GalleryTags.ToDto(m, rooms);
                var label = !m.Caption.IsBlank()
                    ? new LocalizedText { Tr = m.Caption!.Tr, En = string.IsNullOrWhiteSpace(m.Caption.En) ? m.Caption.Tr : m.Caption.En }
                    : tag is not null
                        ? new LocalizedText { Tr = tag.Tr, En = tag.En }
                        : m.IsVideo ? new LocalizedText { Tr = "Video turu", En = "Video tour" } : new LocalizedText { Tr = "Fotoğraf", En = "Photo" };

                return new PublicGalleryItem(
                    m.Id, m.IsVideo ? "video" : "image", m.MediaAsset!.FilePath, m.MediaAsset.PosterPath, label,
                    m.IsVideo ? "video" : GalleryTags.Category(m, rooms), tag);
            })
            .ToList();

    // ───────── doluluk ─────────

    public async Task<Availability?> AvailabilityAsync(string typeSlug, CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var type = s.Types.FirstOrDefault(x => x.Slug == typeSlug);
        if (type is null) return null;

        var flats = FlatsOf(s, type.Id);
        var counts = await CountsAsync(s, flats, ct);
        return new Availability(PeriodOf(s.Period),
            flats.Select(f => AvailabilityOf(f, f.ActiveRooms.Where(r => r.RoomTypeId == type.Id).ToList(), counts)).ToList());
    }

    private static PeriodInfo? PeriodOf(Period? p) => p is null ? null : new PeriodInfo(p.Id, new LocalizedText { Tr = p.Name, En = p.Name });

    private static AvailabilityFlat AvailabilityOf(FlatView f, List<Room> rooms, Dictionary<Guid, RoomBedCounts> counts) =>
        new(f.Apartment.Id, f.Apartment.Slug, RoomNames.Apartment(f.Apartment.Name), f.Apartment.Floor,
            f.Beds, f.PerKitchen, f.PerBathroom,
            rooms.Select(r =>
            {
                var c = counts.TryGetValue(r.Id, out var value) ? value : new RoomBedCounts(0, 0);
                var beds = Enumerable.Range(0, r.Beds).Select(i => new BedDto(
                    $"{r.Id}-{i + 1}",
                    RoomNames.Bed(r.Beds, i),
                    i < c.Occupied ? "occupied" : i < c.Occupied + c.Reserved ? "reserved" : "available")).ToList();
                return new AvailabilityRoom(r.Id, RoomNames.Room(r.Name), $"{GalleryTags.RoomPrefix}{r.Id}", beds);
            }).ToList());
}

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
    private sealed record Structure(List<RoomType> Types, List<Apartment> Apartments, Period? Period, List<RoomTypePrice> Prices, List<ApartmentType> ApartmentTypes);

    private sealed record FlatView(Apartment Apartment, List<Room> ActiveRooms, int Beds, int? PerKitchen, int? PerBathroom);

    /// <summary>Güncel dönem: aktif akademik dönem (yoksa herhangi bir aktif dönem)</summary>
    public async Task<Period?> CurrentPeriodAsync(CancellationToken ct) =>
        await db.Periods.AsNoTracking()
            .Where(x => x.Status == PeriodStatus.Active)
            .OrderBy(x => x.Type == PeriodType.Academic ? 0 : 1).ThenByDescending(x => x.StartDate)
            .FirstOrDefaultAsync(ct);

    private async Task<Structure> LoadAsync(CancellationToken ct)
    {
        // Daire türleri: yalnızca sitede gösterilenler. Pasif türün oda seçenekleri de gizlenir.
        var apartmentTypes = await db.ApartmentTypes.AsNoTracking().Include(x => x.CoverMedia)
            .Where(x => x.IsActive).OrderBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt).ToListAsync(ct);
        var activeTypeIds = apartmentTypes.Select(x => (Guid?)x.Id).ToList();

        // Sıra yönetici panelindekiyle aynıdır: önce daire türü sırası, sonra türün altındaki oda tipi sırası
        var typeRank = apartmentTypes.Select((a, i) => (a.Id, i)).ToDictionary(x => x.Id, x => x.i);
        var types = (await db.RoomTypes.AsNoTracking().Include(x => x.CoverMedia)
            .Where(x => x.IsActive && (x.ApartmentTypeId == null || activeTypeIds.Contains(x.ApartmentTypeId)))
            .ToListAsync(ct))
            .OrderBy(x => x.ApartmentTypeId is { } a && typeRank.TryGetValue(a, out var r) ? r : int.MaxValue)
            .ThenBy(x => x.OrderIndex).ThenBy(x => x.CreatedAt).ToList();

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

        return new Structure(types, apartments, period, prices, apartmentTypes);
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
            c.RoomCount, c.PeopleInFlatMax, c.PeopleSharingKitchenMax, c.PeopleSharingBathroomMax, c.ApartmentTypeSlug, c.ApartmentTypeName);
    }

    private static RoomTypeCard Card(Structure s, RoomType t, Dictionary<Guid, RoomBedCounts> counts)
    {
        var flats = FlatsOf(s, t.Id);
        var owner = t.ApartmentTypeId is { } ownerId ? s.ApartmentTypes.FirstOrDefault(a => a.Id == ownerId) : null;
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
            flats.Where(f => f.PerBathroom is not null).Select(f => f.PerBathroom).Max(),
            owner?.Slug, owner?.Name);
    }

    private static LocalizedList Paragraphs(LocalizedText? text)
    {
        static List<string> Split(string? value) => string.IsNullOrWhiteSpace(value)
            ? []
            : value.Replace("\r\n", "\n").Split("\n\n", StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

        return new LocalizedList(Split(text?.Tr), Split(text?.En));
    }

    // ───────── daire türleri (ana sayfa) ─────────

    public async Task<List<ApartmentTypeCard>> ApartmentTypesAsync(CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var counts = await CountsAsync(s, s.Types.SelectMany(t => FlatsOf(s, t.Id)).ToList(), ct);
        return s.ApartmentTypes.Select(a => TypeCard(s, a, counts)).Where(c => c.Options.Count > 0).ToList();
    }

    public async Task<ApartmentTypeCard?> ApartmentTypeAsync(string slug, CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var type = s.ApartmentTypes.FirstOrDefault(x => x.Slug == slug);
        if (type is null) return null;
        var counts = await CountsAsync(s, s.Types.Where(t => t.ApartmentTypeId == type.Id).SelectMany(t => FlatsOf(s, t.Id)).ToList(), ct);
        return TypeCard(s, type, counts);
    }

    /// <summary>Fiyatı girilmemiş oda seçenekleri sitede listelenmez (öğrenci fiyatsız seçenek göremesin)</summary>
    private static ApartmentTypeCard TypeCard(Structure s, ApartmentType a, Dictionary<Guid, RoomBedCounts> counts)
    {
        var options = s.Types.Where(t => t.ApartmentTypeId == a.Id).Select(t => Card(s, t, counts)).Where(c => c.MonthlyPrice is not null).ToList();
        var flats = s.Apartments.Where(x => x.ApartmentTypeId == a.Id && x.Rooms.Count > 0).ToList();
        var image = a.CoverMedia is not null
            ? new MediaRef(a.CoverMedia.FilePath, a.CoverMedia.AltText)
            : options.Select(o => o.Image).FirstOrDefault(x => x is not null);

        return new ApartmentTypeCard(
            a.Id, a.Slug, a.Name, Paragraphs(a.Description), image,
            options.Any(o => o.HasVideo), options.Sum(o => o.PhotoCount),
            flats.Count, options.Sum(o => o.RoomCount), options.Sum(o => o.BedsFree),
            options.Count > 0 ? options.Min(o => o.MonthlyPrice) : null,
            options.Count > 0 ? options.Max(o => o.MonthlyPrice) : null,
            "TRY", options);
    }

    // ───────── odalar (oda tipi sayfası) ─────────

    /// <summary>Tipin tüm odaları (yayındaki dairelerde, aktif). Boş yatağı olanlar önde; daire sırası korunur.</summary>
    public async Task<List<RoomListing>?> RoomsAsync(string typeSlug, CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var type = s.Types.FirstOrDefault(x => x.Slug == typeSlug);
        if (type is null) return null;

        var counts = await CountsAsync(s, FlatsOf(s, type.Id), ct);
        return BuildRooms(s, type, counts).OrderBy(x => x.BedsFree > 0 ? 0 : 1).ToList();
    }

    /// <summary>Yayındaki daireler (/odalar sayfası). Görünür oda tipi olmayan daire listelenmez. Sıra: panelde verilen görüntüleme sırası, sonra ad.</summary>
    public async Task<List<ApartmentListing>> ApartmentListingsAsync(CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var aptRank = s.ApartmentTypes.Select((a, i) => (a.Id, i)).ToDictionary(x => x.Id, x => x.i);
        var flats = s.Apartments.Select(View).Where(f => f.ActiveRooms.Count > 0)
            .OrderBy(f => f.Apartment.ApartmentTypeId is { } a && aptRank.TryGetValue(a, out var rank) ? rank : int.MaxValue).ToList();
        var counts = await CountsAsync(s, flats, ct);
        var visible = s.Types.ToDictionary(t => t.Id);

        var list = new List<ApartmentListing>();
        foreach (var f in flats)
        {
            var typeIds = f.ActiveRooms.Select(r => r.RoomTypeId).Distinct().Where(visible.ContainsKey).ToList();
            if (typeIds.Count == 0) continue;
            var types = typeIds.Select(id => visible[id]).OrderBy(t => t.OrderIndex).ToList();
            var owner = f.Apartment.ApartmentTypeId is { } ownerId ? s.ApartmentTypes.FirstOrDefault(a => a.Id == ownerId) : null;
            var prices = types.Select(t => s.Prices.FirstOrDefault(p => p.RoomTypeId == t.Id)?.Monthly).Where(p => p is not null).ToList();

            list.Add(new ApartmentListing(
                f.Apartment.Id, f.Apartment.Slug, new LocalizedText { Tr = f.Apartment.Name, En = f.Apartment.Name }, f.Apartment.Description,
                f.Apartment.Floor, f.Beds, f.PerKitchen, f.PerBathroom,
                f.ActiveRooms.Count, Free(f.ActiveRooms, counts),
                Cover(f.Apartment), HasVideo(f.Apartment), PhotoCount(f.Apartment),
                types[0].Slug, types.Select(t => t.Name).ToList(),
                owner?.Slug, owner?.Name,
                prices.Count > 0 ? prices.Min() : null, "TRY"));
        }
        return list;
    }

    /// <summary>Tüm tiplerin tüm odaları (/odalar sayfası). Oda tipi sırası korunur; boş yatağı olanlar önde.</summary>
    public async Task<List<RoomListing>> AllRoomsAsync(CancellationToken ct)
    {
        var s = await LoadAsync(ct);
        var counts = await CountsAsync(s, s.Types.SelectMany(t => FlatsOf(s, t.Id)).ToList(), ct);
        return s.Types.SelectMany(t => BuildRooms(s, t, counts)).OrderBy(x => x.BedsFree > 0 ? 0 : 1).ToList();
    }

    private static List<RoomListing> BuildRooms(Structure s, RoomType type, Dictionary<Guid, RoomBedCounts> counts)
    {
        var price = s.Prices.FirstOrDefault(p => p.RoomTypeId == type.Id)?.Monthly;
        var list = new List<RoomListing>();

        foreach (var f in FlatsOf(s, type.Id))
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
                    photos.Count, type.Slug, type.Name, price, "TRY"));
            }
        }

        return list;
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

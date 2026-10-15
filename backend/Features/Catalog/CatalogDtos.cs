using MazlumApart.Domain.ValueObjects;
using MazlumApart.Features.Gallery;

namespace MazlumApart.Features.Catalog;

/// <summary>Görsel referansı: url = lg varyantı (frontend md/thumb'ı türetir)</summary>
public record MediaRef(string Url, LocalizedText? Alt);

/// <summary>Paragraf listesi: { tr: [...], en: [...] } (frontend DetailSections listOf ile okur)</summary>
public record LocalizedList(List<string> Tr, List<string> En);

/// <summary>Oda tipi kartı (anasayfa, /odalar, başvuru formu). Kişi sayıları bu tipteki dairelerden TÜRETİLİR (en küçük değer).</summary>
public record RoomTypeCard(
    Guid Id,
    string Slug,
    LocalizedText Name,
    MediaRef? Image,
    bool HasVideo,
    int PhotoCount,
    int? PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    decimal? MonthlyPrice,
    decimal? DepositAmount,
    string Currency,
    int FlatCount,
    int BedsFree);

public record RoomTypeDetail(
    Guid Id,
    string Slug,
    LocalizedText Name,
    MediaRef? Image,
    bool HasVideo,
    int PhotoCount,
    int? PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    decimal? MonthlyPrice,
    decimal? DepositAmount,
    string Currency,
    int FlatCount,
    int BedsFree,
    LocalizedList Description);

/// <summary>Daire kartı (oda tipi sayfası)</summary>
public record ApartmentSummary(
    Guid Id,
    string Slug,
    LocalizedText Name,
    int Floor,
    int PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    int BedsTotal,
    int BedsFree,
    MediaRef? Cover,
    bool HasVideo,
    int PhotoCount);

/// <summary>Herkese açık galeri öğesi: video her zaman başta</summary>
public record PublicGalleryItem(Guid Id, string Type, string Url, string? Poster, LocalizedText Label, string Category, TagDto? Tag);

public record PublicRoomInfo(Guid Id, LocalizedText Name, List<FeatureItem> Features, int BedCount);

public record BedDto(string Id, LocalizedText Label, string Status);

public record AvailabilityRoom(Guid Id, LocalizedText Name, string TagKey, List<BedDto> Beds);

public record AvailabilityFlat(
    Guid Id,
    string Slug,
    LocalizedText Name,
    int Floor,
    int PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    List<AvailabilityRoom> Rooms);

public record PeriodInfo(Guid Id, LocalizedText Name);

public record Availability(PeriodInfo? Period, List<AvailabilityFlat> Apartments);

public record ApartmentDetail(
    Guid Id,
    string Slug,
    LocalizedText Name,
    int Floor,
    int PeopleInFlat,
    int? PeopleSharingKitchen,
    int? PeopleSharingBathroom,
    int BedsTotal,
    int BedsFree,
    MediaRef? Cover,
    bool HasVideo,
    int PhotoCount,
    List<PublicGalleryItem> Gallery,
    List<FeatureItem> SharedAreas,
    List<PublicRoomInfo> Rooms,
    Availability Availability);
